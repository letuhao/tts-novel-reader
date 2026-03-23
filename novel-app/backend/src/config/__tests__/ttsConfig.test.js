/**
 * Unit Tests for TTS Config
 * Kiểm tra Đơn vị cho Cấu hình TTS
 */
import { describe, it, expect } from 'vitest';
import {
  TTS_BACKENDS,
  getDefaultBackend,
  getBackendConfig,
  getMappedVoice
} from '../ttsConfig.js';

describe('TTS Config', () => {
  describe('TTS_BACKENDS', () => {
    it('should have VietTTS backend', () => {
      expect(TTS_BACKENDS.VIETTTS).toBeDefined();
      expect(TTS_BACKENDS.VIETTTS.name).toBe('viettts');
      expect(TTS_BACKENDS.VIETTTS.defaultVoice).toBe('quynh');
    });

    it('should have VieNeu-TTS backend', () => {
      expect(TTS_BACKENDS.VIENEU_TTS).toBeDefined();
      expect(TTS_BACKENDS.VIENEU_TTS.name).toBe('vieneu-tts');
      expect(TTS_BACKENDS.VIENEU_TTS.defaultVoice).toBe('id_0004');
    });

    it('should have Coqui XTTS-v2 backend', () => {
      expect(TTS_BACKENDS.COQUI_XTTS_V2).toBeDefined();
      expect(TTS_BACKENDS.COQUI_XTTS_V2.name).toBe('coqui-xtts-v2');
      expect(TTS_BACKENDS.COQUI_XTTS_V2.defaultVoice).toBe('Claribel Dervla');
    });
  });

  describe('getBackendConfig', () => {
    it('should return VietTTS config', () => {
      const config = getBackendConfig('viettts');
      expect(config).toBe(TTS_BACKENDS.VIETTTS);
    });

    it('should return VieNeu-TTS config', () => {
      const config = getBackendConfig('vieneu-tts');
      expect(config).toBe(TTS_BACKENDS.VIENEU_TTS);
    });

    it('should return Coqui XTTS-v2 config', () => {
      const config = getBackendConfig('coqui-xtts-v2');
      expect(config).toBe(TTS_BACKENDS.COQUI_XTTS_V2);
    });

    it('should return Coqui config for coqui-tts alias', () => {
      const config = getBackendConfig('coqui-tts');
      expect(config).toBe(TTS_BACKENDS.COQUI_XTTS_V2);
    });

    it('should return Coqui config for xtts-v2 alias', () => {
      const config = getBackendConfig('xtts-v2');
      expect(config).toBe(TTS_BACKENDS.COQUI_XTTS_V2);
    });

    it('should return null for unknown backend', () => {
      const config = getBackendConfig('unknown-backend');
      expect(config).toBeNull();
    });
  });

  describe('getDefaultBackend', () => {
    it('should return VietTTS by default', () => {
      // Save original env
      const original = process.env.TTS_DEFAULT_MODEL;
      delete process.env.TTS_DEFAULT_MODEL;
      delete process.env.TTS_DEFAULT_BACKEND;
      
      const backend = getDefaultBackend();
      expect(backend).toBe(TTS_BACKENDS.VIETTTS);
      
      // Restore
      if (original) process.env.TTS_DEFAULT_MODEL = original;
    });

    it('should return VieNeu-TTS when TTS_DEFAULT_MODEL is vieneu-tts', () => {
      const original = process.env.TTS_DEFAULT_MODEL;
      process.env.TTS_DEFAULT_MODEL = 'vieneu-tts';
      
      const backend = getDefaultBackend();
      expect(backend).toBe(TTS_BACKENDS.VIENEU_TTS);
      
      // Restore
      if (original) process.env.TTS_DEFAULT_MODEL = original;
      else delete process.env.TTS_DEFAULT_MODEL;
    });

    it('should return Coqui XTTS-v2 when TTS_DEFAULT_MODEL is coqui-xtts-v2', () => {
      const original = process.env.TTS_DEFAULT_MODEL;
      process.env.TTS_DEFAULT_MODEL = 'coqui-xtts-v2';
      
      const backend = getDefaultBackend();
      expect(backend).toBe(TTS_BACKENDS.COQUI_XTTS_V2);
      
      // Restore
      if (original) process.env.TTS_DEFAULT_MODEL = original;
      else delete process.env.TTS_DEFAULT_MODEL;
    });
  });

  describe('getMappedVoice', () => {
    describe('Coqui XTTS-v2', () => {
      it('should return speaker name as-is', () => {
        const voice = getMappedVoice('Claribel Dervla', 'coqui-xtts-v2');
        expect(voice).toBe('Claribel Dervla');
      });

      it('should return any speaker name as-is', () => {
        const voice = getMappedVoice('Andrew Chipper', 'coqui-xtts-v2');
        expect(voice).toBe('Andrew Chipper');
      });

      it('should handle coqui-tts alias', () => {
        const voice = getMappedVoice('Daisy Studious', 'coqui-tts');
        expect(voice).toBe('Daisy Studious');
      });

      it('should handle xtts-v2 alias', () => {
        const voice = getMappedVoice('Gracie Wise', 'xtts-v2');
        expect(voice).toBe('Gracie Wise');
      });
    });

    describe('VieNeu-TTS', () => {
      it('should map VietTTS voice names to VieNeu-TTS IDs', () => {
        const voice = getMappedVoice('quynh', 'vieneu-tts');
        expect(voice).toBe('id_0004');
      });

      it('should return id_xxx as-is if valid', () => {
        const voice = getMappedVoice('id_0004', 'vieneu-tts');
        expect(voice).toBe('id_0004');
      });
    });

    describe('VietTTS', () => {
      it('should return voice name as-is', () => {
        const voice = getMappedVoice('quynh', 'viettts');
        expect(voice).toBe('quynh');
      });

      it('should map id_xxx to VietTTS voice names', () => {
        const voice = getMappedVoice('id_0004', 'viettts');
        expect(voice).toBe('quynh');
      });
    });

    describe('Edge Cases', () => {
      it('should return null for empty voice ID', () => {
        const voice = getMappedVoice('', 'viettts');
        expect(voice).toBeNull();
      });

      it('should return null for null voice ID', () => {
        const voice = getMappedVoice(null, 'viettts');
        expect(voice).toBeNull();
      });
    });
  });
});

