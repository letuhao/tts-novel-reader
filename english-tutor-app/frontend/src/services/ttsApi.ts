/**
 * TTS API Service
 */
import apiClient from './api.js';
import type { AxiosResponse } from 'axios';

export interface TTSSynthesizeRequest {
  text: string;
  voice?: string;
  speed?: number;
  model?: string;
  store?: boolean;
  expiryHours?: number;
}

export interface TTSSynthesizeResponse {
  success: boolean;
  data?: {
    fileId: string;
    audioUrl?: string;
    duration?: number;
    metadata?: {
      text: string;
      voice: string;
      speed: number;
      expiresAt?: string;
    };
  };
  error?: string;
}

export interface TTSVoicesResponse {
  success: boolean;
  data?: {
    voices: string[];
  };
  error?: string;
}

/**
 * Synthesize speech from text
 */
export async function synthesizeSpeech(request: TTSSynthesizeRequest): Promise<TTSSynthesizeResponse> {
  const response: AxiosResponse<TTSSynthesizeResponse> = await apiClient.post('/api/tts/synthesize', request);
  return response.data;
}

/**
 * Get available voices
 */
export async function getVoices(): Promise<TTSVoicesResponse> {
  const response: AxiosResponse<TTSVoicesResponse> = await apiClient.get('/api/tts/voices');
  return response.data;
}

/**
 * Get audio file by ID
 */
export async function getAudioFile(fileId: string): Promise<Blob> {
  const response = await apiClient.get(`/api/tts/audio/${fileId}`, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Check TTS health
 */
export async function checkTTSHealth(): Promise<{ success: boolean; data?: { available: boolean } }> {
  const response = await apiClient.get('/api/tts/health');
  return response.data;
}

