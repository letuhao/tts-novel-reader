/**
 * Unit Tests for TTS Service (Coqui XTTS-v2 Support)
 * Kiểm tra Đơn vị cho Dịch vụ TTS (Hỗ trợ Coqui XTTS-v2)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TTSService } from '../ttsService.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');

describe('TTSService - Coqui XTTS-v2 Support', () => {
  let service;

  beforeEach(() => {
    service = new TTSService();
    vi.clearAllMocks();
  });

  describe('mapVoiceId', () => {
    it('should map voice for Coqui XTTS-v2', () => {
      const voice = service.mapVoiceId('Claribel Dervla', 'coqui-xtts-v2');
      expect(voice).toBe('Claribel Dervla');
    });

    it('should map voice for coqui-tts alias', () => {
      const voice = service.mapVoiceId('Daisy Studious', 'coqui-tts');
      expect(voice).toBe('Daisy Studious');
    });

    it('should map voice for xtts-v2 alias', () => {
      const voice = service.mapVoiceId('Andrew Chipper', 'xtts-v2');
      expect(voice).toBe('Andrew Chipper');
    });
  });

  describe('generateAudio - Coqui XTTS-v2', () => {
    it('should build correct request body for Coqui XTTS-v2', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'x-file-id': 'test-file-id',
          'content-type': 'application/json'
        },
        data: {
          success: true,
          file_metadata: {
            file_id: 'test-file-id',
            expires_at: '2024-12-20T00:00:00'
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      await service.generateAudio('Hello world', {
        model: 'coqui-xtts-v2',
        voice: 'Claribel Dervla',
        language: 'en'
      });

      expect(axios.post).toHaveBeenCalled();
      const callArgs = axios.post.mock.calls[0];
      const requestBody = callArgs[1];

      expect(requestBody.model).toBe('coqui-xtts-v2');
      expect(requestBody.speaker).toBe('Claribel Dervla');
      expect(requestBody.language).toBe('en');
      expect(requestBody.text).toBe('Hello world');
    });

    it('should use default language (en) if not provided', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'x-file-id': 'test-file-id',
          'content-type': 'application/json'
        },
        data: {
          success: true,
          file_metadata: {
            file_id: 'test-file-id'
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      await service.generateAudio('Hello world', {
        model: 'coqui-xtts-v2',
        voice: 'Daisy Studious'
      });

      const callArgs = axios.post.mock.calls[0];
      const requestBody = callArgs[1];

      expect(requestBody.language).toBe('en');
    });

    it('should support different languages', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'x-file-id': 'test-file-id',
          'content-type': 'application/json'
        },
        data: {
          success: true,
          file_metadata: {
            file_id: 'test-file-id'
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      await service.generateAudio('Hola mundo', {
        model: 'coqui-xtts-v2',
        voice: 'Claribel Dervla',
        language: 'es'
      });

      const callArgs = axios.post.mock.calls[0];
      const requestBody = callArgs[1];

      expect(requestBody.language).toBe('es');
    });

    it('should include speaker_wav if refAudioPath provided', async () => {
      const mockResponse = {
        status: 200,
        headers: {
          'x-file-id': 'test-file-id',
          'content-type': 'application/json'
        },
        data: {
          success: true,
          file_metadata: {
            file_id: 'test-file-id'
          }
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      await service.generateAudio('Hello world', {
        model: 'coqui-xtts-v2',
        voice: 'Claribel Dervla',
        refAudioPath: '/path/to/reference.wav'
      });

      const callArgs = axios.post.mock.calls[0];
      const requestBody = callArgs[1];

      expect(requestBody.speaker_wav).toBe('/path/to/reference.wav');
    });
  });

  describe('getBackendURL', () => {
    it('should return Coqui backend URL', () => {
      const url = service.getBackendURL('coqui-xtts-v2');
      expect(url).toBeTruthy();
      expect(typeof url).toBe('string');
    });

    it('should return Coqui backend URL for coqui-tts alias', () => {
      const url = service.getBackendURL('coqui-tts');
      expect(url).toBeTruthy();
    });
  });
});

