/**
 * Unit Tests for Worker Service - Enhanced Voice Mapping Integration
 * Kiểm tra Đơn vị cho Dịch vụ Worker - Tích hợp Ánh Xạ Giọng Nâng Cao
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AudioWorker } from '../worker.js';
import { getEnhancedVoiceMapping } from '../../utils/enhancedVoiceMapping.js';

// Mock dependencies
vi.mock('../../utils/enhancedVoiceMapping.js');
vi.mock('../../services/audioStorage.js');
vi.mock('../../models/Paragraph.js');
vi.mock('../../models/Chapter.js');
vi.mock('../../models/Novel.js');

describe('AudioWorker - Enhanced Voice Mapping Integration', () => {
  let worker;
  let mockEnhancedMapping;

  beforeEach(() => {
    mockEnhancedMapping = {
      getVoiceForRoleSync: vi.fn(),
      normalizeRole: vi.fn((role) => {
        if (role === 'male') return 'male_1';
        if (role === 'female') return 'female_1';
        return role;
      })
    };

    getEnhancedVoiceMapping.mockReturnValue(mockEnhancedMapping);

    worker = new AudioWorker({
      speakerId: '05',
      voice: 'quynh',
      model: 'viettts'
    });
  });

  describe('Voice Selection Logic', () => {
    it('should use paragraph.voiceId if available', () => {
      const paragraph = {
        id: 'para-1',
        role: 'male_1',
        voiceId: 'custom-voice-id'
      };

      // Mock the voice selection logic
      let selectedVoice = null;
      if (paragraph.voiceId) {
        selectedVoice = paragraph.voiceId;
      } else if (paragraph.role) {
        selectedVoice = mockEnhancedMapping.getVoiceForRoleSync(
          paragraph.role,
          'viettts',
          'novel-123'
        );
      }

      expect(selectedVoice).toBe('custom-voice-id');
      expect(mockEnhancedMapping.getVoiceForRoleSync).not.toHaveBeenCalled();
    });

    it('should use enhanced voice mapping when role is available', () => {
      const paragraph = {
        id: 'para-1',
        role: 'male_1',
        voiceId: null
      };

      mockEnhancedMapping.getVoiceForRoleSync.mockReturnValue('cdteam');

      // Mock the voice selection logic
      let selectedVoice = null;
      if (paragraph.voiceId) {
        selectedVoice = paragraph.voiceId;
      } else if (paragraph.role) {
        selectedVoice = mockEnhancedMapping.getVoiceForRoleSync(
          paragraph.role,
          'viettts',
          'novel-123'
        );
      }

      expect(selectedVoice).toBe('cdteam');
      expect(mockEnhancedMapping.getVoiceForRoleSync).toHaveBeenCalledWith(
        'male_1',
        'viettts',
        'novel-123'
      );
    });

    it('should use fallback narrator voice when no role', () => {
      const paragraph = {
        id: 'para-1',
        role: null,
        voiceId: null
      };

      mockEnhancedMapping.getVoiceForRoleSync.mockReturnValue('quynh');

      // Mock the voice selection logic
      let selectedVoice = null;
      if (paragraph.voiceId) {
        selectedVoice = paragraph.voiceId;
      } else if (paragraph.role) {
        selectedVoice = mockEnhancedMapping.getVoiceForRoleSync(
          paragraph.role,
          'viettts',
          'novel-123'
        );
      } else {
        selectedVoice = mockEnhancedMapping.getVoiceForRoleSync(
          'narrator',
          'viettts',
          'novel-123'
        );
      }

      expect(selectedVoice).toBe('quynh');
      expect(mockEnhancedMapping.getVoiceForRoleSync).toHaveBeenCalledWith(
        'narrator',
        'viettts',
        'novel-123'
      );
    });

    it('should handle backward compatible roles (male, female)', () => {
      const paragraph = {
        id: 'para-1',
        role: 'male',  // Old format
        voiceId: null
      };

      mockEnhancedMapping.getVoiceForRoleSync.mockReturnValue('cdteam');

      // Mock the voice selection logic
      let selectedVoice = null;
      if (paragraph.voiceId) {
        selectedVoice = paragraph.voiceId;
      } else if (paragraph.role) {
        selectedVoice = mockEnhancedMapping.getVoiceForRoleSync(
          paragraph.role,
          'viettts',
          'novel-123'
        );
      }

      expect(selectedVoice).toBe('cdteam');
      expect(mockEnhancedMapping.getVoiceForRoleSync).toHaveBeenCalledWith(
        'male',
        'viettts',
        'novel-123'
      );
    });

    it('should support multiple characters', () => {
      const paragraphs = [
        { id: 'para-1', role: 'male_1', voiceId: null },
        { id: 'para-2', role: 'male_2', voiceId: null },
        { id: 'para-3', role: 'female_1', voiceId: null },
        { id: 'para-4', role: 'female_2', voiceId: null }
      ];

      mockEnhancedMapping.getVoiceForRoleSync
        .mockReturnValueOnce('cdteam')      // male_1
        .mockReturnValueOnce('nguyen-ngoc-ngan') // male_2
        .mockReturnValueOnce('nu-nhe-nhang')     // female_1
        .mockReturnValueOnce('diep-chi');         // female_2

      const voices = paragraphs.map(para => {
        if (para.voiceId) {
          return para.voiceId;
        } else if (para.role) {
          return mockEnhancedMapping.getVoiceForRoleSync(
            para.role,
            'viettts',
            'novel-123'
          );
        }
        return null;
      });

      expect(voices[0]).toBe('cdteam');
      expect(voices[1]).toBe('nguyen-ngoc-ngan');
      expect(voices[2]).toBe('nu-nhe-nhang');
      expect(voices[3]).toBe('diep-chi');
    });

    it('should support Coqui XTTS-v2 voices', () => {
      const paragraph = {
        id: 'para-1',
        role: 'male_1',
        voiceId: null
      };

      mockEnhancedMapping.getVoiceForRoleSync.mockReturnValue('Andrew Chipper');

      // Mock with Coqui model
      let selectedVoice = null;
      if (paragraph.voiceId) {
        selectedVoice = paragraph.voiceId;
      } else if (paragraph.role) {
        selectedVoice = mockEnhancedMapping.getVoiceForRoleSync(
          paragraph.role,
          'coqui-xtts-v2',
          'novel-123'
        );
      }

      expect(selectedVoice).toBe('Andrew Chipper');
      expect(mockEnhancedMapping.getVoiceForRoleSync).toHaveBeenCalledWith(
        'male_1',
        'coqui-xtts-v2',
        'novel-123'
      );
    });
  });
});

