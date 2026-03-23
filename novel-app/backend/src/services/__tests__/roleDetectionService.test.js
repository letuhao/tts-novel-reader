/**
 * Unit Tests for Enhanced Role Detection Service
 * Kiểm tra Đơn vị cho Dịch vụ Phát hiện Vai Diễn Nâng Cao
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoleDetectionService } from '../roleDetectionService.js';

// Mock Ollama provider
vi.mock('../ollamaProvider.js', () => ({
  getOllamaProvider: vi.fn(() => ({
    generateJSON: vi.fn(),
    isAvailable: vi.fn(() => Promise.resolve(true)),
    isModelAvailable: vi.fn(() => Promise.resolve(true))
  }))
}));

// Mock voice mapping
vi.mock('../../utils/voiceMapping.js', () => ({
  getVoiceMapping: vi.fn(() => ({
    getVoiceForRole: vi.fn((role) => {
      if (role === 'male') return 'cdteam';
      if (role === 'female') return 'nu-nhe-nhang';
      return 'quynh';
    })
  }))
}));

describe('RoleDetectionService - Enhanced Role Detection', () => {
  let service;

  beforeEach(() => {
    service = new RoleDetectionService('qwen3:8b');
  });

  describe('_buildClassificationPrompt', () => {
    it('should include narrator role', () => {
      const paragraphs = ['Paragraph 1', 'Paragraph 2'];
      const prompt = service._buildClassificationPrompt(paragraphs, '', {
        maxMaleCharacters: 5,
        maxFemaleCharacters: 5
      });
      
      expect(prompt).toContain('narrator');
    });

    it('should include multiple male roles', () => {
      const paragraphs = ['Paragraph 1'];
      const prompt = service._buildClassificationPrompt(paragraphs, '', {
        maxMaleCharacters: 5,
        maxFemaleCharacters: 5
      });
      
      expect(prompt).toContain('male_1');
      expect(prompt).toContain('male_2');
      expect(prompt).toContain('male_5');
    });

    it('should include multiple female roles', () => {
      const paragraphs = ['Paragraph 1'];
      const prompt = service._buildClassificationPrompt(paragraphs, '', {
        maxMaleCharacters: 5,
        maxFemaleCharacters: 5
      });
      
      expect(prompt).toContain('female_1');
      expect(prompt).toContain('female_2');
      expect(prompt).toContain('female_5');
    });

    it('should support unlimited characters', () => {
      const paragraphs = ['Paragraph 1'];
      const prompt = service._buildClassificationPrompt(paragraphs, '', {
        maxMaleCharacters: 20,
        maxFemaleCharacters: 20
      });
      
      expect(prompt).toContain('male_20');
      expect(prompt).toContain('female_20');
    });

    it('should include chapter context', () => {
      const paragraphs = ['Paragraph 1'];
      const chapterContext = 'This is chapter context';
      const prompt = service._buildClassificationPrompt(paragraphs, chapterContext, {
        maxMaleCharacters: 5,
        maxFemaleCharacters: 5
      });
      
      expect(prompt).toContain(chapterContext);
    });

    it('should format paragraphs correctly', () => {
      const paragraphs = ['First paragraph', 'Second paragraph'];
      const prompt = service._buildClassificationPrompt(paragraphs, '', {
        maxMaleCharacters: 5,
        maxFemaleCharacters: 5
      });
      
      expect(prompt).toContain('1. First paragraph');
      expect(prompt).toContain('2. Second paragraph');
    });
  });

  describe('_parseRoleResponse', () => {
    it('should parse valid role response', () => {
      const response = {
        '1': 'narrator',
        '2': 'male_1',
        '3': 'female_1',
        '4': 'male_2'
      };
      
      const roleMap = service._parseRoleResponse(response, 4);
      
      expect(roleMap[0]).toBe('narrator');
      expect(roleMap[1]).toBe('male_1');
      expect(roleMap[2]).toBe('female_1');
      expect(roleMap[3]).toBe('male_2');
    });

    it('should support backward compatible roles (male, female)', () => {
      const response = {
        '1': 'narrator',
        '2': 'male',  // Old format
        '3': 'female' // Old format
      };
      
      const roleMap = service._parseRoleResponse(response, 3);
      
      expect(roleMap[0]).toBe('narrator');
      expect(roleMap[1]).toBe('male');
      expect(roleMap[2]).toBe('female');
    });

    it('should support new multi-character roles', () => {
      const response = {
        '1': 'narrator',
        '2': 'male_1',
        '3': 'male_2',
        '4': 'female_1',
        '5': 'female_2'
      };
      
      const roleMap = service._parseRoleResponse(response, 5);
      
      expect(roleMap[0]).toBe('narrator');
      expect(roleMap[1]).toBe('male_1');
      expect(roleMap[2]).toBe('male_2');
      expect(roleMap[3]).toBe('female_1');
      expect(roleMap[4]).toBe('female_2');
    });

    it('should fill missing indices with narrator', () => {
      const response = {
        '1': 'narrator',
        '3': 'male_1'
        // Missing index 2
      };
      
      const roleMap = service._parseRoleResponse(response, 3);
      
      expect(roleMap[0]).toBe('narrator');
      expect(roleMap[1]).toBe('narrator'); // Filled
      expect(roleMap[2]).toBe('male_1');
    });

    it('should handle invalid roles by defaulting to narrator', () => {
      const response = {
        '1': 'invalid_role',
        '2': 'male_1'
      };
      
      const roleMap = service._parseRoleResponse(response, 2);
      
      expect(roleMap[0]).toBe('narrator'); // Invalid role → narrator
      expect(roleMap[1]).toBe('male_1');
    });

    it('should handle case insensitive roles', () => {
      const response = {
        '1': 'NARRATOR',
        '2': 'MALE_1',
        '3': 'FEMALE_1'
      };
      
      const roleMap = service._parseRoleResponse(response, 3);
      
      expect(roleMap[0]).toBe('narrator');
      expect(roleMap[1]).toBe('male_1');
      expect(roleMap[2]).toBe('female_1');
    });

    it('should handle many characters', () => {
      const response = {
        '1': 'narrator',
        '2': 'male_1',
        '3': 'male_2',
        '4': 'male_3',
        '5': 'male_4',
        '6': 'male_5',
        '7': 'female_1',
        '8': 'female_2',
        '9': 'female_3'
      };
      
      const roleMap = service._parseRoleResponse(response, 9);
      
      expect(roleMap[0]).toBe('narrator'); // Index 0 (key '1')
      expect(roleMap[1]).toBe('male_1');    // Index 1 (key '2')
      expect(roleMap[4]).toBe('male_4');    // Index 4 (key '5')
      expect(roleMap[6]).toBe('female_1');  // Index 6 (key '7')
      expect(roleMap[8]).toBe('female_3');  // Index 8 (key '9')
    });
  });

  describe('_mapRolesToVoices', () => {
    it('should map roles to voices', () => {
      const roleMap = {
        0: 'narrator',
        1: 'male_1',
        2: 'female_1'
      };
      
      const voiceMap = service._mapRolesToVoices(roleMap);
      
      expect(typeof voiceMap[0]).toBe('string');
      expect(typeof voiceMap[1]).toBe('string');
      expect(typeof voiceMap[2]).toBe('string');
    });

    it('should handle backward compatible roles', () => {
      const roleMap = {
        0: 'narrator',
        1: 'male',  // Old format
        2: 'female' // Old format
      };
      
      const voiceMap = service._mapRolesToVoices(roleMap);
      
      expect(voiceMap[0]).toBeTruthy();
      expect(voiceMap[1]).toBeTruthy();
      expect(voiceMap[2]).toBeTruthy();
    });
  });

  describe('detectRoles', () => {
    it('should return empty maps for empty paragraphs', async () => {
      const result = await service.detectRoles([], {});
      
      expect(result.role_map).toEqual({});
      expect(result.voice_map).toEqual({});
    });

    it('should handle maxBatchSize option', async () => {
      // Mock _detectRolesBatch to avoid actual API calls
      service._detectRolesBatch = vi.fn().mockResolvedValue({
        0: 'narrator',
        1: 'male_1'
      });
      
      const paragraphs = Array(100).fill('Test paragraph');
      const result = await service.detectRoles(paragraphs, {
        maxBatchSize: 50
      });
      
      // Should be called multiple times for batching
      expect(service._detectRolesBatch).toHaveBeenCalled();
    });

    it('should return empty maps for empty paragraphs', async () => {
      const result = await service.detectRoles([], {});
      
      expect(result.role_map).toEqual({});
      expect(result.voice_map).toEqual({});
    });
  });
});

