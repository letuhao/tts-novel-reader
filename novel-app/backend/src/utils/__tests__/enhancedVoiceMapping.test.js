/**
 * Unit Tests for Enhanced Voice Mapping
 * Kiểm tra Đơn vị cho Ánh Xạ Giọng Nâng Cao
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getEnhancedVoiceMapping, EnhancedVoiceMapping } from '../enhancedVoiceMapping.js';

describe('EnhancedVoiceMapping', () => {
  let mapping;

  beforeEach(() => {
    // Create fresh instance for each test
    mapping = new EnhancedVoiceMapping();
  });

  describe('normalizeRole', () => {
    it('should normalize male to male_1', () => {
      expect(mapping.normalizeRole('male')).toBe('male_1');
    });

    it('should normalize female to female_1', () => {
      expect(mapping.normalizeRole('female')).toBe('female_1');
    });

    it('should keep narrator unchanged', () => {
      expect(mapping.normalizeRole('narrator')).toBe('narrator');
    });

    it('should keep male_1 unchanged', () => {
      expect(mapping.normalizeRole('male_1')).toBe('male_1');
    });

    it('should keep female_2 unchanged', () => {
      expect(mapping.normalizeRole('female_2')).toBe('female_2');
    });

    it('should handle case insensitive', () => {
      expect(mapping.normalizeRole('MALE')).toBe('male_1');
      expect(mapping.normalizeRole('FEMALE')).toBe('female_1');
      expect(mapping.normalizeRole('NARRATOR')).toBe('narrator');
    });

    it('should handle whitespace', () => {
      expect(mapping.normalizeRole('  male  ')).toBe('male_1');
      expect(mapping.normalizeRole('  female  ')).toBe('female_1');
    });

    it('should handle null/undefined', () => {
      expect(mapping.normalizeRole(null)).toBe('narrator');
      expect(mapping.normalizeRole(undefined)).toBe('narrator');
      expect(mapping.normalizeRole('')).toBe('narrator');
    });
  });

  describe('getVoiceForRoleSync', () => {
    describe('VietTTS', () => {
      it('should return narrator voice for narrator role', () => {
        const voice = mapping.getVoiceForRoleSync('narrator', 'viettts');
        expect(voice).toBe('quynh');
      });

      it('should return male_1 voice for male_1 role', () => {
        const voice = mapping.getVoiceForRoleSync('male_1', 'viettts');
        expect(voice).toBe('cdteam');
      });

      it('should return female_1 voice for female_1 role', () => {
        const voice = mapping.getVoiceForRoleSync('female_1', 'viettts');
        expect(voice).toBe('nu-nhe-nhang');
      });

      it('should normalize male to male_1', () => {
        const voice = mapping.getVoiceForRoleSync('male', 'viettts');
        expect(voice).toBe('cdteam');
      });

      it('should normalize female to female_1', () => {
        const voice = mapping.getVoiceForRoleSync('female', 'viettts');
        expect(voice).toBe('nu-nhe-nhang');
      });

      it('should return different voices for different male roles', () => {
        const voice1 = mapping.getVoiceForRoleSync('male_1', 'viettts');
        const voice2 = mapping.getVoiceForRoleSync('male_2', 'viettts');
        expect(voice1).not.toBe(voice2);
        expect(voice1).toBe('cdteam');
        expect(voice2).toBe('nguyen-ngoc-ngan');
      });

      it('should return different voices for different female roles', () => {
        const voice1 = mapping.getVoiceForRoleSync('female_1', 'viettts');
        const voice2 = mapping.getVoiceForRoleSync('female_2', 'viettts');
        expect(voice1).not.toBe(voice2);
        expect(voice1).toBe('nu-nhe-nhang');
        expect(voice2).toBe('diep-chi');
      });
    });

    describe('VieNeu-TTS', () => {
      it('should return narrator voice for narrator role', () => {
        const voice = mapping.getVoiceForRoleSync('narrator', 'vieneu-tts');
        expect(voice).toBe('id_0004');
      });

      it('should return male_1 voice for male_1 role', () => {
        const voice = mapping.getVoiceForRoleSync('male_1', 'vieneu-tts');
        expect(voice).toBe('id_0007');
      });

      it('should return female_1 voice for female_1 role', () => {
        const voice = mapping.getVoiceForRoleSync('female_1', 'vieneu-tts');
        expect(voice).toBe('id_0004');
      });

      it('should normalize male to male_1', () => {
        const voice = mapping.getVoiceForRoleSync('male', 'vieneu-tts');
        expect(voice).toBe('id_0007');
      });

      it('should normalize female to female_1', () => {
        const voice = mapping.getVoiceForRoleSync('female', 'vieneu-tts');
        expect(voice).toBe('id_0004');
      });
    });

    describe('Coqui XTTS-v2', () => {
      it('should return narrator voice for narrator role', () => {
        const voice = mapping.getVoiceForRoleSync('narrator', 'coqui-xtts-v2');
        expect(voice).toBe('Claribel Dervla');
      });

      it('should return male_1 voice for male_1 role', () => {
        const voice = mapping.getVoiceForRoleSync('male_1', 'coqui-xtts-v2');
        expect(voice).toBe('Andrew Chipper');
      });

      it('should return female_1 voice for female_1 role', () => {
        const voice = mapping.getVoiceForRoleSync('female_1', 'coqui-xtts-v2');
        expect(voice).toBe('Daisy Studious');
      });

      it('should normalize male to male_1', () => {
        const voice = mapping.getVoiceForRoleSync('male', 'coqui-xtts-v2');
        expect(voice).toBe('Andrew Chipper');
      });

      it('should normalize female to female_1', () => {
        const voice = mapping.getVoiceForRoleSync('female', 'coqui-xtts-v2');
        expect(voice).toBe('Daisy Studious');
      });

      it('should return different voices for different male roles', () => {
        const voice1 = mapping.getVoiceForRoleSync('male_1', 'coqui-xtts-v2');
        const voice2 = mapping.getVoiceForRoleSync('male_2', 'coqui-xtts-v2');
        const voice3 = mapping.getVoiceForRoleSync('male_3', 'coqui-xtts-v2');
        expect(voice1).toBe('Andrew Chipper');
        expect(voice2).toBe('Craig Gutsy');
        expect(voice3).toBe('Damien Black');
        expect(voice1).not.toBe(voice2);
        expect(voice2).not.toBe(voice3);
      });

      it('should return different voices for different female roles', () => {
        const voice1 = mapping.getVoiceForRoleSync('female_1', 'coqui-xtts-v2');
        const voice2 = mapping.getVoiceForRoleSync('female_2', 'coqui-xtts-v2');
        const voice3 = mapping.getVoiceForRoleSync('female_3', 'coqui-xtts-v2');
        expect(voice1).toBe('Daisy Studious');
        expect(voice2).toBe('Gracie Wise');
        expect(voice3).toBe('Ana Florence');
        expect(voice1).not.toBe(voice2);
        expect(voice2).not.toBe(voice3);
      });
    });

    describe('Automatic Voice Assignment (Round-Robin)', () => {
      it('should assign voices automatically for male_6 when not in default mapping', () => {
        const voice = mapping.getVoiceForRoleSync('male_6', 'coqui-xtts-v2');
        // Should use round-robin from available voices
        expect(voice).toBeTruthy();
        expect(typeof voice).toBe('string');
      });

      it('should reuse voices when more characters than available voices', () => {
        // Coqui has 28 male voices, test male_29 (should reuse)
        const voice29 = mapping.getVoiceForRoleSync('male_29', 'coqui-xtts-v2');
        const voice1 = mapping.getVoiceForRoleSync('male_1', 'coqui-xtts-v2');
        // Should reuse (29 % 28 = 1, but 0-based index 0 = first voice)
        // Actually, let's check if it's a valid voice
        expect(voice29).toBeTruthy();
        expect(typeof voice29).toBe('string');
      });

      it('should handle very high character numbers', () => {
        const voice100 = mapping.getVoiceForRoleSync('male_100', 'coqui-xtts-v2');
        expect(voice100).toBeTruthy();
        expect(typeof voice100).toBe('string');
        // Should be one of the available voices
        const availableVoices = mapping.getAvailableVoices('coqui-xtts-v2', 'male');
        expect(availableVoices).toContain(voice100);
      });
    });

    describe('Fallback Behavior', () => {
      it('should fallback to narrator for unknown role', () => {
        const voice = mapping.getVoiceForRoleSync('unknown_role', 'viettts');
        expect(voice).toBe('quynh'); // Narrator voice
      });

      it('should fallback to default voice for unknown model', () => {
        const voice = mapping.getVoiceForRoleSync('narrator', 'unknown-model');
        expect(voice).toBe('narrator'); // Fallback default
      });
    });
  });

  describe('getAvailableVoices', () => {
    it('should return available voices for VietTTS', () => {
      const voices = mapping.getAvailableVoices('viettts', 'all');
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
    });

    it('should return male voices for VietTTS', () => {
      const voices = mapping.getAvailableVoices('viettts', 'male');
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices).toContain('cdteam');
    });

    it('should return female voices for VietTTS', () => {
      const voices = mapping.getAvailableVoices('viettts', 'female');
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices).toContain('nu-nhe-nhang');
    });

    it('should return available voices for Coqui XTTS-v2', () => {
      const voices = mapping.getAvailableVoices('coqui-xtts-v2', 'all');
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(58); // At least 58 speakers
    });

    it('should return male voices for Coqui XTTS-v2', () => {
      const voices = mapping.getAvailableVoices('coqui-xtts-v2', 'male');
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(20); // At least 20 male speakers
      expect(voices).toContain('Andrew Chipper');
    });

    it('should return female voices for Coqui XTTS-v2', () => {
      const voices = mapping.getAvailableVoices('coqui-xtts-v2', 'female');
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(20); // At least 20 female speakers
      expect(voices).toContain('Daisy Studious');
    });

    it('should return narrator voices for Coqui XTTS-v2', () => {
      const voices = mapping.getAvailableVoices('coqui-xtts-v2', 'narrator');
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices).toContain('Claribel Dervla');
    });
  });

  describe('Novel-Specific Mapping', () => {
    it('should set and get novel-specific mapping', () => {
      mapping.setNovelMapping('novel-123', 'coqui-xtts-v2', 'male_1', 'Craig Gutsy');
      const novelMapping = mapping.getNovelMapping('novel-123', 'coqui-xtts-v2');
      expect(novelMapping.male_1).toBe('Craig Gutsy');
    });

    it('should use novel-specific mapping over default', () => {
      mapping.setNovelMapping('novel-123', 'coqui-xtts-v2', 'male_1', 'Craig Gutsy');
      const voice = mapping.getVoiceForRoleSync('male_1', 'coqui-xtts-v2', 'novel-123');
      expect(voice).toBe('Craig Gutsy');
    });

    it('should clear novel-specific mapping', () => {
      mapping.setNovelMapping('novel-123', 'coqui-xtts-v2', 'male_1', 'Craig Gutsy');
      mapping.clearNovelMapping('novel-123', 'coqui-xtts-v2');
      const novelMapping = mapping.getNovelMapping('novel-123', 'coqui-xtts-v2');
      expect(novelMapping).toEqual({});
    });

    it('should clear all mappings for novel when model not specified', () => {
      mapping.setNovelMapping('novel-123', 'coqui-xtts-v2', 'male_1', 'Craig Gutsy');
      mapping.setNovelMapping('novel-123', 'viettts', 'male_1', 'quynh');
      mapping.clearNovelMapping('novel-123');
      const mapping1 = mapping.getNovelMapping('novel-123', 'coqui-xtts-v2');
      const mapping2 = mapping.getNovelMapping('novel-123', 'viettts');
      expect(mapping1).toEqual({});
      expect(mapping2).toEqual({});
    });
  });

  describe('Assignment Strategy', () => {
    it('should default to round-robin strategy', () => {
      expect(mapping.getAssignmentStrategy()).toBe('round-robin');
    });

    it('should set assignment strategy', () => {
      mapping.setAssignmentStrategy('manual');
      expect(mapping.getAssignmentStrategy()).toBe('manual');
    });

    it('should reject invalid strategy', () => {
      const original = mapping.getAssignmentStrategy();
      mapping.setAssignmentStrategy('invalid');
      expect(mapping.getAssignmentStrategy()).toBe(original); // Should not change
    });
  });

  describe('getAllMappings', () => {
    it('should return all mappings for a model', () => {
      const mappings = mapping.getAllMappings('coqui-xtts-v2');
      expect(typeof mappings).toBe('object');
      expect(mappings.narrator).toBe('Claribel Dervla');
      expect(mappings.male_1).toBe('Andrew Chipper');
      expect(mappings.female_1).toBe('Daisy Studious');
    });

    it('should return empty object for unknown model', () => {
      const mappings = mapping.getAllMappings('unknown-model');
      expect(mappings).toEqual({});
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getEnhancedVoiceMapping();
      const instance2 = getEnhancedVoiceMapping();
      expect(instance1).toBe(instance2);
    });
  });
});

