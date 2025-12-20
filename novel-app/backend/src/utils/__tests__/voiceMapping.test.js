/**
 * Unit Tests for Legacy Voice Mapping (Backward Compatibility)
 * Kiểm tra Đơn vị cho Ánh Xạ Giọng Cũ (Tương Thích Ngược)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getVoiceMapping, VoiceMapping } from '../voiceMapping.js';

describe('VoiceMapping - Legacy (Backward Compatibility)', () => {
  let mapping;

  beforeEach(() => {
    mapping = new VoiceMapping();
  });

  describe('getVoiceForRole', () => {
    it('should return voice for male role', () => {
      const voice = mapping.getVoiceForRole('male');
      expect(voice).toBe('cdteam');
    });

    it('should return voice for female role', () => {
      const voice = mapping.getVoiceForRole('female');
      expect(voice).toBe('nu-nhe-nhang');
    });

    it('should return voice for narrator role', () => {
      const voice = mapping.getVoiceForRole('narrator');
      expect(voice).toBe('quynh');
    });

    it('should fallback to narrator for unknown role', () => {
      const voice = mapping.getVoiceForRole('unknown');
      expect(voice).toBe('quynh');
    });

    it('should handle case insensitive', () => {
      expect(mapping.getVoiceForRole('MALE')).toBe('cdteam');
      expect(mapping.getVoiceForRole('FEMALE')).toBe('nu-nhe-nhang');
    });
  });

  describe('setVoiceForRole', () => {
    it('should set custom voice for role', () => {
      mapping.setVoiceForRole('male', 'custom-voice');
      expect(mapping.getVoiceForRole('male')).toBe('custom-voice');
    });

    it('should reject invalid roles', () => {
      const original = mapping.getVoiceForRole('male');
      mapping.setVoiceForRole('invalid', 'custom-voice');
      expect(mapping.getVoiceForRole('male')).toBe(original);
    });
  });

  describe('getAllMappings', () => {
    it('should return all mappings', () => {
      const mappings = mapping.getAllMappings();
      expect(mappings.male).toBe('cdteam');
      expect(mappings.female).toBe('nu-nhe-nhang');
      expect(mappings.narrator).toBe('quynh');
    });
  });

  describe('reset', () => {
    it('should reset to default mappings', () => {
      mapping.setVoiceForRole('male', 'custom-voice');
      mapping.reset();
      expect(mapping.getVoiceForRole('male')).toBe('cdteam');
    });
  });
});

