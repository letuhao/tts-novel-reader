/**
 * TTS Service - Integration with TTS Backend (Coqui AI)
 * Handles text-to-speech synthesis for English content
 */
import axios, { type AxiosInstance } from 'axios';
import { getSystemSettingsService } from '../settings/systemSettingsService.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger({ service: 'tts' });

export interface TTSRequest {
  text: string;
  voice?: string | undefined;
  speed?: number | undefined;
  model?: string | undefined;
  store?: boolean | undefined;
  expiryHours?: number | undefined;
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string | undefined;
  fileId?: string | undefined;
  duration?: number | undefined;
  metadata?: {
    text: string;
    voice: string;
    speed: number;
    expiresAt?: string | undefined;
  } | undefined;
  error?: string | undefined;
}

/**
 * TTS Service Class
 * Provides methods to interact with TTS backend service
 */
export class TTSService {
  private readonly client: AxiosInstance;
  private baseURL: string;
  private defaultVoice: string;
  private defaultSpeed: number;

  constructor() {
    // Will be initialized from system settings
    this.baseURL = process.env.TTS_BACKEND_URL ?? 'http://127.0.0.1:11111';
    this.defaultVoice = process.env.TTS_DEFAULT_VOICE ?? 'tutor_female';
    this.defaultSpeed = Number.parseFloat(process.env.TTS_DEFAULT_SPEED ?? '0.9');

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // 60 seconds for TTS generation
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Load settings from database (hot-reloadable)
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsService = getSystemSettingsService();
      const ttsUrl = await settingsService.getValue<string>('tts.backend_url', this.baseURL);
      const voice = await settingsService.getValue<string>('tts.default_voice', this.defaultVoice);
      const speed = await settingsService.getValue<number>('tts.default_speed', this.defaultSpeed);

      this.baseURL = ttsUrl;
      this.defaultVoice = voice;
      this.defaultSpeed = speed;

      // Update axios base URL
      this.client.defaults.baseURL = this.baseURL;
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to load TTS settings, using defaults');
    }
  }

  /**
   * Check if TTS service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'TTS service not available'
      );
      return false;
    }
  }

  /**
   * Synthesize speech from text
   */
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    try {
      // Load latest settings
      await this.loadSettings();

      const {
        text,
        voice = this.defaultVoice,
        speed = this.defaultSpeed,
        model = 'dia', // Default model
        store = true,
        expiryHours,
      } = request;

      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      logger.debug({ textLength: text.length, voice, speed }, 'Synthesizing speech');

      // Prepare request for XTTS backend (Coqui TTS)
      // XTTS API format: { text, model, speaker, speaker_wav, language, store, expiry_hours, return_audio }
      const ttsRequest: Record<string, unknown> = {
        text: text,
        model: model === 'dia' ? 'xtts-english' : model, // Map 'dia' to 'xtts-english'
        language: 'en', // Default to English
        store: store,
        return_audio: true, // Get audio in response
      };

      // Map voice parameter to speaker or speaker_wav
      if (voice) {
        // Check if it's a file path (voice cloning) or speaker name
        if (voice.startsWith('/') || voice.includes('\\') || voice.includes('.')) {
          // It's a file path - use speaker_wav for voice cloning
          ttsRequest.speaker_wav = voice;
        } else {
          // It's a speaker name - use speaker parameter
          ttsRequest.speaker = voice;
        }
      }

      if (expiryHours) {
        ttsRequest.expiry_hours = expiryHours;
      }

      // Note: XTTS doesn't support speed_factor directly
      // Speed control would require post-processing or different model
      // For now, we'll ignore the speed parameter

      const response = await this.client.post('/api/tts/synthesize', ttsRequest, {
        responseType: 'arraybuffer', // For binary audio data
        timeout: 120000, // 2 minutes for longer texts
      });

      // Extract metadata from headers (XTTS uses different header names)
      const requestId = response.headers['x-request-id'] as string | undefined;
      const duration = response.headers['x-duration'] as string | undefined;

      // Get file metadata by making a second call with return_audio: false
      // This gives us file_id and expires_at
      let fileId = requestId;
      let expiresAt: string | undefined;

      try {
        const metadataRequest = { ...ttsRequest, return_audio: false };
        const metadataResponse = await this.client.post('/api/tts/synthesize', metadataRequest, {
          timeout: 120000,
        });
        if (metadataResponse.data && metadataResponse.data.file_metadata) {
          fileId = metadataResponse.data.file_metadata.file_id;
          expiresAt = metadataResponse.data.file_metadata.expires_at;
        }
      } catch (metadataError) {
        // If metadata call fails, continue with request ID
        logger.debug({ err: metadataError }, 'Failed to get file metadata, using request ID');
      }

      const audioData = Buffer.from(response.data);

      logger.info({ 
        textLength: text.length, 
        fileId, 
        hasAudio: audioData.length > 0,
        duration: duration ? parseFloat(duration) : undefined
      }, 'Speech synthesized successfully');

      return {
        success: true,
        fileId,
        duration: duration ? parseFloat(duration) : undefined,
        metadata: {
          text,
          voice: voice || 'default',
          speed: speed || 1.0, // Note: XTTS doesn't support speed, this is for reference
          expiresAt: expiresAt ?? undefined,
        },
      };
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)), request }, 'TTS synthesis failed');
      
      if (axios.isAxiosError(error)) {
        if (error.response !== undefined) {
          return {
            success: false,
            error: `TTS API error: ${error.response.status} - ${(error.response.data as { detail?: string })?.detail ?? error.message}`,
          };
        }
        if (error.request !== undefined) {
          return {
            success: false,
            error: `TTS connection error: ${error.message}`,
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to synthesize speech',
      };
    }
  }

  /**
   * Get available voices (speakers)
   */
  async getVoices(): Promise<string[]> {
    try {
      await this.loadSettings();

      // Get speakers from TTS backend (XTTS uses /speakers endpoint)
      const response = await this.client.get('/api/tts/speakers', { timeout: 5000 });

      if (response.data && response.data.success && Array.isArray(response.data.speakers)) {
        return response.data.speakers as string[];
      }

      // Fallback: return default voices
      return ['tutor_female', 'tutor_male'];
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to get speakers, using defaults');
      return ['tutor_female', 'tutor_male'];
    }
  }

  /**
   * Get stored audio by file ID
   */
  async getAudio(fileId: string): Promise<Buffer | null> {
    try {
      await this.loadSettings();

      const response = await this.client.get(`/api/tts/audio/${fileId}`, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      return Buffer.from(response.data);
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)), fileId }, 'Failed to get audio');
      return null;
    }
  }
}

// Singleton instance
let ttsServiceInstance: TTSService | null = null;

/**
 * Get TTS service singleton
 */
export function getTTSService(): TTSService {
  if (ttsServiceInstance === null) {
    ttsServiceInstance = new TTSService();
  }
  return ttsServiceInstance;
}

