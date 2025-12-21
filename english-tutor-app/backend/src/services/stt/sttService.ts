/**
 * STT Service - Integration with STT Backend (faster-whisper)
 * Handles speech-to-text transcription for English content
 */
import axios, { type AxiosInstance } from 'axios';
import FormData from 'form-data';
import { getSystemSettingsService } from '../settings/systemSettingsService.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger({ service: 'stt' });

export interface STTRequest {
  audio: Buffer | File;
  language?: string | undefined;
  task?: 'transcribe' | 'translate' | undefined;
  beamSize?: number | undefined;
  vadFilter?: boolean | undefined;
  returnTimestamps?: boolean | undefined;
  wordTimestamps?: boolean | undefined;
}

export interface STTSegment {
  text: string;
  start: number;
  end: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    probability: number;
  }> | undefined;
}

export interface STTResponse {
  success: boolean;
  data?: {
    text: string;
    language: string;
    languageProbability?: number | undefined;
    segments: STTSegment[];
  } | undefined;
  error?: string | undefined;
}

/**
 * STT Service Class
 * Provides methods to interact with STT backend service
 */
export class STTService {
  private readonly client: AxiosInstance;
  private baseURL: string;
  private defaultLanguage: string;

  constructor() {
    // Will be initialized from system settings
    this.baseURL = process.env.STT_BACKEND_URL ?? 'http://127.0.0.1:11210';
    this.defaultLanguage = process.env.STT_LANGUAGE ?? 'en';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 300000, // 5 minutes for long audio files
    });
  }

  /**
   * Load settings from database (hot-reloadable)
   */
  private async loadSettings(): Promise<void> {
    try {
      const settingsService = getSystemSettingsService();
      const sttUrl = await settingsService.getValue<string>('stt.backend_url', this.baseURL);
      const language = await settingsService.getValue<string>('stt.language', this.defaultLanguage);

      this.baseURL = sttUrl;
      this.defaultLanguage = language;

      // Update axios base URL
      this.client.defaults.baseURL = this.baseURL;
    } catch (error) {
      logger.warn({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to load STT settings, using defaults');
    }
  }

  /**
   * Check if STT service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.loadSettings();
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'STT service not available'
      );
      return false;
    }
  }

  /**
   * Transcribe audio to text
   */
  async transcribe(request: STTRequest): Promise<STTResponse> {
    try {
      // Load latest settings
      await this.loadSettings();

      const {
        audio,
        language = this.defaultLanguage,
        task = 'transcribe',
        beamSize = 5,
        vadFilter = true,
        returnTimestamps = true,
        wordTimestamps = false,
      } = request;

      if (!audio || (audio instanceof Buffer && audio.length === 0)) {
        throw new Error('Audio data is required');
      }

      logger.debug({ 
        audioSize: audio instanceof Buffer ? audio.length : 'file',
        language,
        task,
        vadFilter 
      }, 'Transcribing audio');

      // Create form data
      const formData = new FormData();
      
      if (audio instanceof Buffer) {
        formData.append('audio', audio, {
          filename: 'audio.wav',
          contentType: 'audio/wav',
        });
      } else {
        formData.append('audio', audio);
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append('language', language);
      params.append('task', task);
      params.append('beam_size', beamSize.toString());
      params.append('vad_filter', vadFilter.toString());
      params.append('return_timestamps', returnTimestamps.toString());
      params.append('word_timestamps', wordTimestamps.toString());

      const response = await this.client.post(
        `/api/stt/transcribe?${params.toString()}`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 300000, // 5 minutes
        }
      );

      if (response.data.success && response.data.data) {
        logger.info({ 
          textLength: response.data.data.text.length,
          language: response.data.data.language,
          segments: response.data.data.segments.length
        }, 'Transcription completed successfully');

        return {
          success: true,
          data: response.data.data,
        };
      }

      throw new Error('Invalid response from STT service');
    } catch (error) {
      logger.error({ err: error instanceof Error ? error : new Error(String(error)), request }, 'STT transcription failed');
      
      if (axios.isAxiosError(error)) {
        if (error.response !== undefined) {
          return {
            success: false,
            error: `STT API error: ${error.response.status} - ${(error.response.data as { detail?: string })?.detail ?? error.message}`,
          };
        }
        if (error.request !== undefined) {
          return {
            success: false,
            error: `STT connection error: ${error.message}`,
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to transcribe audio',
      };
    }
  }
}

// Singleton instance
let sttServiceInstance: STTService | null = null;

/**
 * Get STT service singleton
 */
export function getSTTService(): STTService {
  if (sttServiceInstance === null) {
    sttServiceInstance = new STTService();
  }
  return sttServiceInstance;
}

