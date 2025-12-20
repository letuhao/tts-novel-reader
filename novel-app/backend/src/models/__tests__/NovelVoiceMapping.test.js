/**
 * Unit Tests for Novel Voice Mapping Model
 * Kiểm tra Đơn vị cho Mô hình Ánh Xạ Giọng Novel
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NovelVoiceMappingModel } from '../NovelVoiceMapping.js';
import Database from '../../database/db.js';

// Mock database
vi.mock('../../database/db.js', () => {
  const mockDb = {
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      get: vi.fn(() => null),
      run: vi.fn(() => ({ changes: 1 }))
    })),
    transaction: vi.fn((fn) => fn)
  };
  
  return {
    default: {
      getInstance: vi.fn(() => mockDb)
    }
  };
});

describe('NovelVoiceMappingModel', () => {
  let db;

  beforeEach(() => {
    db = Database.getInstance();
    vi.clearAllMocks();
  });

  describe('getByNovel', () => {
    it('should return empty object when no mappings exist', async () => {
      const mockAll = vi.fn().mockReturnValue([]);
      db.prepare.mockReturnValue({ all: mockAll });
      
      const mapping = await NovelVoiceMappingModel.getByNovel('novel-123');
      expect(mapping).toEqual({});
    });

    it('should return mapping for specific model', async () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          novel_id: 'novel-123',
          model: 'coqui-xtts-v2',
          role: 'male_1',
          voice_id: 'Andrew Chipper'
        }
      ]);
      db.prepare.mockReturnValue({ all: mockAll });
      
      const mapping = await NovelVoiceMappingModel.getByNovel('novel-123', 'coqui-xtts-v2');
      expect(mapping.male_1).toBe('Andrew Chipper');
    });

    it('should return all mappings when model not specified', async () => {
      const mockAll = vi.fn().mockReturnValue([
        {
          novel_id: 'novel-123',
          model: 'coqui-xtts-v2',
          role: 'male_1',
          voice_id: 'Andrew Chipper'
        },
        {
          novel_id: 'novel-123',
          model: 'viettts',
          role: 'male_1',
          voice_id: 'cdteam'
        }
      ]);
      db.prepare.mockReturnValue({ all: mockAll });
      
      const mapping = await NovelVoiceMappingModel.getByNovel('novel-123');
      expect(mapping['coqui-xtts-v2'].male_1).toBe('Andrew Chipper');
      expect(mapping['viettts'].male_1).toBe('cdteam');
    });
  });

  describe('setMapping', () => {
    it('should insert new mapping', async () => {
      const mockGet = vi.fn().mockReturnValue(null); // No existing mapping
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      db.prepare.mockReturnValueOnce({ get: mockGet })
                 .mockReturnValueOnce({ run: mockRun });
      
      await NovelVoiceMappingModel.setMapping(
        'novel-123',
        'coqui-xtts-v2',
        'male_1',
        'Andrew Chipper'
      );
      
      expect(db.prepare).toHaveBeenCalled();
    });

    it('should update existing mapping', async () => {
      const mockGet = vi.fn().mockReturnValue({ id: 1 }); // Existing mapping
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      db.prepare.mockReturnValueOnce({ get: mockGet })
                 .mockReturnValueOnce({ run: mockRun });
      
      await NovelVoiceMappingModel.setMapping(
        'novel-123',
        'coqui-xtts-v2',
        'male_1',
        'Craig Gutsy'
      );
      
      expect(db.prepare).toHaveBeenCalled();
    });
  });

  describe('setMappings', () => {
    it('should set multiple mappings', async () => {
      const mockGet = vi.fn().mockReturnValue(null);
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      // Each mapping needs 2 prepare calls (get + run), so 3 mappings = 6 calls
      db.prepare.mockReturnValue({ get: mockGet, run: mockRun });
      
      const mappings = {
        'male_1': 'Andrew Chipper',
        'female_1': 'Daisy Studious',
        'narrator': 'Claribel Dervla'
      };
      
      await NovelVoiceMappingModel.setMappings(
        'novel-123',
        'coqui-xtts-v2',
        mappings
      );
      
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe('clearMapping', () => {
    it('should clear mapping for specific model', async () => {
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      db.prepare.mockReturnValue({ run: mockRun });
      
      await NovelVoiceMappingModel.clearMapping('novel-123', 'coqui-xtts-v2');
      
      expect(db.prepare).toHaveBeenCalled();
    });

    it('should clear all mappings when model not specified', async () => {
      const mockRun = vi.fn().mockReturnValue({ changes: 2 });
      db.prepare.mockReturnValue({ run: mockRun });
      
      await NovelVoiceMappingModel.clearMapping('novel-123');
      
      expect(db.prepare).toHaveBeenCalled();
    });
  });

  describe('getAssignmentStrategy', () => {
    it('should return default strategy when not set', async () => {
      const mockGet = vi.fn().mockReturnValue(null);
      db.prepare.mockReturnValue({ get: mockGet });
      
      const strategy = await NovelVoiceMappingModel.getAssignmentStrategy('novel-123');
      expect(strategy).toBe('round-robin');
    });

    it('should return stored strategy', async () => {
      const mockGet = vi.fn().mockReturnValue({
        assignment_strategy: 'manual'
      });
      db.prepare.mockReturnValue({ get: mockGet });
      
      const strategy = await NovelVoiceMappingModel.getAssignmentStrategy('novel-123');
      expect(strategy).toBe('manual');
    });
  });

  describe('setAssignmentStrategy', () => {
    it('should set assignment strategy', async () => {
      const mockGet = vi.fn().mockReturnValue(null);
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      db.prepare.mockReturnValueOnce({ get: mockGet })
                 .mockReturnValueOnce({ run: mockRun });
      
      await NovelVoiceMappingModel.setAssignmentStrategy('novel-123', 'manual');
      
      expect(db.prepare).toHaveBeenCalled();
    });

    it('should update existing strategy', async () => {
      const mockGet = vi.fn().mockReturnValue({ id: 1 });
      const mockRun = vi.fn().mockReturnValue({ changes: 1 });
      db.prepare.mockReturnValueOnce({ get: mockGet })
                 .mockReturnValueOnce({ run: mockRun });
      
      await NovelVoiceMappingModel.setAssignmentStrategy('novel-123', 'round-robin');
      
      expect(db.prepare).toHaveBeenCalled();
    });

    it('should throw error for invalid strategy', async () => {
      await expect(
        NovelVoiceMappingModel.setAssignmentStrategy('novel-123', 'invalid')
      ).rejects.toThrow();
    });
  });
});

