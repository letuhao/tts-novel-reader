/**
 * STT API Service
 */
import apiClient from './api.js';
import type { AxiosResponse } from 'axios';

export interface STTTranscribeRequest {
  audio: File | Blob;
  language?: string;
  task?: 'transcribe' | 'translate';
  beamSize?: number;
  vadFilter?: boolean;
  returnTimestamps?: boolean;
  wordTimestamps?: boolean;
}

export interface STTTranscribeResponse {
  success: boolean;
  data?: {
    text: string;
    language: string;
    language_probability?: number;
    segments?: Array<{
      text: string;
      start: number;
      end: number;
      confidence?: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
      }>;
    }>;
  };
  error?: string;
}

/**
 * Transcribe audio to text
 */
export async function transcribeAudio(request: STTTranscribeRequest): Promise<STTTranscribeResponse> {
  const formData = new FormData();
  formData.append('audio', request.audio, 'audio.wav');

  // Add query parameters
  const params = new URLSearchParams();
  if (request.language) params.append('language', request.language);
  if (request.task) params.append('task', request.task);
  if (request.beamSize !== undefined) params.append('beam_size', request.beamSize.toString());
  if (request.vadFilter !== undefined) params.append('vad_filter', request.vadFilter.toString());
  if (request.returnTimestamps !== undefined) params.append('return_timestamps', request.returnTimestamps.toString());
  if (request.wordTimestamps !== undefined) params.append('word_timestamps', request.wordTimestamps.toString());

  const response: AxiosResponse<STTTranscribeResponse> = await apiClient.post(
    `/api/stt/transcribe?${params.toString()}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutes for longer audio
    }
  );
  return response.data;
}

/**
 * Check STT health
 */
export async function checkSTTHealth(): Promise<{ success: boolean; data?: { available: boolean } }> {
  const response = await apiClient.get('/api/stt/health');
  return response.data;
}

