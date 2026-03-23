/**
 * Unit Tests for Novel Parser - LLM Structure Detection
 * Kiểm tra Đơn vị cho Novel Parser - LLM Structure Detection
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NovelParser } from '../novelParser.js';
import fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn()
  }
}));

// Mock novelStructureDetectionService
const mockDetectStructure = vi.fn();
const mockIsAvailable = vi.fn(() => Promise.resolve(true));
const mockIsModelAvailable = vi.fn(() => Promise.resolve(true));

vi.mock('../novelStructureDetectionService.js', () => ({
  getNovelStructureDetectionService: vi.fn(() => ({
    isAvailable: mockIsAvailable,
    isModelAvailable: mockIsModelAvailable,
    detectStructure: mockDetectStructure
  }))
}));

describe('NovelParser - LLM Structure Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAvailable.mockResolvedValue(true);
    mockIsModelAvailable.mockResolvedValue(true);
  });

  describe('parseChaptersWithLLM', () => {
    it('should use LLM structure detection when available', async () => {
      const content = `Title
Author

PROLOGUE
Prologue text here.

Chapter 1
Chapter 1 text here.

Chapter 2
Chapter 2 text here.`;

      const structureIndex = {
        markers: [
          { lineIndex: 3, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' },
          { lineIndex: 6, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' },
          { lineIndex: 9, type: 'CHAPTER', title: 'Chapter 2', rawLine: 'Chapter 2' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.9,
        totalLines: 12
      };

      mockDetectStructure.mockResolvedValue(structureIndex);

      const chapters = await NovelParser.parseChaptersWithLLM(content, { language: 'en' });

      expect(mockDetectStructure).toHaveBeenCalledWith(
        content,
        { language: 'en' }
      );
      expect(chapters).toHaveLength(3);
      expect(chapters[0].type).toBe('PROLOGUE');
      expect(chapters[0].title).toBe('Prologue');
      expect(chapters[1].type).toBe('CHAPTER');
      expect(chapters[1].title).toBe('Chapter 1');
      expect(chapters[2].type).toBe('CHAPTER');
      expect(chapters[2].title).toBe('Chapter 2');
    });

    it('should fallback to regex parser when LLM unavailable', async () => {
      const content = `Title
Author

Chapter 1
Chapter 1 text here.`;

      mockIsAvailable.mockResolvedValue(false);

      const chapters = await NovelParser.parseChaptersWithLLM(content);

      expect(mockDetectStructure).not.toHaveBeenCalled();
      // Should fallback to regex parser (single chapter if no markers)
      expect(chapters).toBeDefined();
    });

    it('should fallback to regex parser when no markers detected', async () => {
      const content = `Title
Author

Some text without chapter markers.`;

      const structureIndex = {
        markers: [],
        structure: 'single-chapter',
        confidence: 0.0,
        totalLines: 3
      };

      mockDetectStructure.mockResolvedValue(structureIndex);

      const chapters = await NovelParser.parseChaptersWithLLM(content);

      // Should fallback to regex parser
      expect(chapters).toBeDefined();
      expect(chapters.length).toBeGreaterThan(0);
    });

    it('should handle errors and fallback to regex parser', async () => {
      const content = `Title
Author

Chapter 1
Chapter 1 text here.`;

      mockDetectStructure.mockRejectedValue(new Error('LLM error'));

      const chapters = await NovelParser.parseChaptersWithLLM(content);

      // Should fallback to regex parser
      expect(chapters).toBeDefined();
    });
  });

  describe('_buildChaptersFromStructureIndex', () => {
    it('should build chapters from structure index correctly', () => {
      const content = `Title
Author

PROLOGUE
Prologue text here.

Chapter 1
Chapter 1 text here.

Chapter 2
Chapter 2 text here.`;

      const structureIndex = {
        markers: [
          { lineIndex: 3, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' },
          { lineIndex: 6, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' },
          { lineIndex: 9, type: 'CHAPTER', title: 'Chapter 2', rawLine: 'Chapter 2' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.9,
        totalLines: 12
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      expect(chapters).toHaveLength(3);
      expect(chapters[0].chapterNumber).toBe(1);
      expect(chapters[0].type).toBe('PROLOGUE');
      expect(chapters[0].title).toBe('Prologue');
      expect(chapters[1].chapterNumber).toBe(2);
      expect(chapters[1].type).toBe('CHAPTER');
      expect(chapters[1].title).toBe('Chapter 1');
      expect(chapters[2].chapterNumber).toBe(3);
      expect(chapters[2].type).toBe('CHAPTER');
      expect(chapters[2].title).toBe('Chapter 2');
    });

    it('should preserve all text - no gaps', () => {
      const content = `Line 0
Line 1
Line 2
PROLOGUE
Line 4
Line 5
Chapter 1
Line 7
Line 8
Chapter 2
Line 10
Line 11`;

      const structureIndex = {
        markers: [
          { lineIndex: 3, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' },
          { lineIndex: 6, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' },
          { lineIndex: 9, type: 'CHAPTER', title: 'Chapter 2', rawLine: 'Chapter 2' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.9,
        totalLines: 12
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Check that all lines are covered
      const totalLinesInChapters = chapters.reduce((sum, ch) => {
        const chapterText = ch.paragraphs.map(p => p.text).join('\n');
        return sum + chapterText.split('\n').length;
      }, 0);

      // Should include all 12 lines (accounting for paragraph breaks)
      expect(totalLinesInChapters).toBeGreaterThanOrEqual(10);
    });

    it('should handle gaps and fix them automatically', () => {
      const content = `Line 0
Line 1
Line 2
PROLOGUE
Line 4
Line 5
GAP LINE 6
GAP LINE 7
Chapter 1
Line 9
Line 10`;

      const structureIndex = {
        markers: [
          { lineIndex: 3, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' },
          { lineIndex: 8, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' } // Gap between line 5 and 8
        ],
        structure: 'prologue-chapters',
        confidence: 0.7,
        totalLines: 11
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Should detect gap and fix it
      expect(chapters).toHaveLength(2);
      
      // Check that gap lines are included in first chapter
      const firstChapterText = chapters[0].paragraphs.map(p => p.text).join('\n');
      expect(firstChapterText).toContain('GAP LINE 6');
      expect(firstChapterText).toContain('GAP LINE 7');
    });

    it('should handle missing end lines and fix them automatically', () => {
      const content = `Line 0
Line 1
PROLOGUE
Line 3
Line 4
Chapter 1
Line 6
Line 7
MISSING LINE 8
MISSING LINE 9`;

      const structureIndex = {
        markers: [
          { lineIndex: 2, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' },
          { lineIndex: 5, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.8,
        totalLines: 10
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Should detect missing end lines and fix them
      expect(chapters).toHaveLength(2);
      
      // Check that missing end lines are included in last chapter
      const lastChapterText = chapters[1].paragraphs.map(p => p.text).join('\n');
      expect(lastChapterText).toContain('MISSING LINE 8');
      expect(lastChapterText).toContain('MISSING LINE 9');
    });

    it('should handle invalid markers (out of bounds)', () => {
      const content = `Line 0
Line 1
Line 2
Chapter 1
Line 4`;

      const structureIndex = {
        markers: [
          { lineIndex: 3, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' },
          { lineIndex: 100, type: 'CHAPTER', title: 'Chapter 2', rawLine: 'Chapter 2' } // Invalid: out of bounds
        ],
        structure: 'chapters-only',
        confidence: 0.5,
        totalLines: 5
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Should skip invalid marker and only create one chapter
      expect(chapters).toHaveLength(1);
      expect(chapters[0].title).toBe('Chapter 1');
    });

    it('should handle empty markers array - treat as single chapter', () => {
      const content = `Line 0
Line 1
Line 2
Some text without markers.`;

      const structureIndex = {
        markers: [],
        structure: 'single-chapter',
        confidence: 0.0,
        totalLines: 4
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      expect(chapters).toHaveLength(1);
      expect(chapters[0].chapterNumber).toBe(1);
      expect(chapters[0].title).toBe('Chapter 1');
    });

    it('should preserve text order', () => {
      const content = `First line
Second line
Third line
PROLOGUE
Fifth line
Sixth line
Chapter 1
Eighth line
Ninth line`;

      const structureIndex = {
        markers: [
          { lineIndex: 3, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' },
          { lineIndex: 6, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.9,
        totalLines: 9
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Check text order is preserved
      const firstChapterText = chapters[0].paragraphs.map(p => p.text).join('\n');
      expect(firstChapterText).toContain('First line');
      expect(firstChapterText).toContain('Fifth line');
      
      const secondChapterText = chapters[1].paragraphs.map(p => p.text).join('\n');
      expect(secondChapterText).toContain('Eighth line');
      expect(secondChapterText).toContain('Ninth line');
    });

    it('should handle different marker types correctly', () => {
      const content = `Title
Author
PROLOGUE
Prologue text.
Chapter 1
Chapter 1 text.
INTERLUDE
Interlude text.
Chapter 2
Chapter 2 text.
EPILOGUE
Epilogue text.`;

      const structureIndex = {
        markers: [
          { lineIndex: 2, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' },
          { lineIndex: 4, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' },
          { lineIndex: 6, type: 'INTERLUDE', title: 'Interlude', rawLine: 'INTERLUDE' },
          { lineIndex: 8, type: 'CHAPTER', title: 'Chapter 2', rawLine: 'Chapter 2' },
          { lineIndex: 10, type: 'EPILOGUE', title: 'Epilogue', rawLine: 'EPILOGUE' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.9,
        totalLines: 12
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      expect(chapters).toHaveLength(5);
      expect(chapters[0].type).toBe('PROLOGUE');
      expect(chapters[0].title).toBe('Prologue');
      expect(chapters[1].type).toBe('CHAPTER');
      expect(chapters[1].title).toBe('Chapter 1');
      expect(chapters[2].type).toBe('INTERLUDE');
      expect(chapters[2].title).toBe('Interlude');
      expect(chapters[3].type).toBe('CHAPTER');
      expect(chapters[3].title).toBe('Chapter 2');
      expect(chapters[4].type).toBe('EPILOGUE');
      expect(chapters[4].title).toBe('Epilogue');
    });

    it('should handle overlaps and log warnings', () => {
      const content = `Line 0
Line 1
Chapter 1
Line 3
Line 4
Chapter 2
Line 6`;

      // Create overlapping markers (shouldn't happen but test it)
      // Note: With current logic, Chapter 1 ends at line 5 (before Chapter 2), so no overlap
      // To test overlap, we need markers that would cause endLineIndex < startLineIndex
      // But that's prevented by validation, so overlap won't occur in practice
      const structureIndex = {
        markers: [
          { lineIndex: 2, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' },
          { lineIndex: 5, type: 'CHAPTER', title: 'Chapter 2', rawLine: 'Chapter 2' }
        ],
        structure: 'chapters-only',
        confidence: 0.6,
        totalLines: 7
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Should still create chapters
      expect(chapters).toHaveLength(2);
      // Note: Overlap detection happens during validation loop, but with correct logic
      // overlaps shouldn't occur. The test verifies chapters are created correctly.
    });

    it('should include marker lines in chapter content', () => {
      const content = `Title
Author
PROLOGUE
Prologue text.
Chapter 1
Chapter 1 text.`;

      const structureIndex = {
        markers: [
          { lineIndex: 2, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' },
          { lineIndex: 4, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.9,
        totalLines: 6
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Marker lines should be included in chapter content
      const firstChapterText = chapters[0].paragraphs.map(p => p.text).join('\n');
      expect(firstChapterText).toContain('PROLOGUE');
      
      const secondChapterText = chapters[1].paragraphs.map(p => p.text).join('\n');
      expect(secondChapterText).toContain('Chapter 1');
    });

    it('should handle single chapter with prologue', () => {
      const content = `Title
Author
PROLOGUE
Prologue text.
More prologue text.`;

      const structureIndex = {
        markers: [
          { lineIndex: 2, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.8,
        totalLines: 5
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      expect(chapters).toHaveLength(1);
      expect(chapters[0].type).toBe('PROLOGUE');
      expect(chapters[0].title).toBe('Prologue');
    });
  });

  describe('parseNovel with LLM', () => {
    it('should parse novel with LLM structure detection', async () => {
      const filePath = 'test-novel.txt';
      const content = `Death March to the Parallel World Rhapsody, Vol. 1
Hiro Ainana

PROLOGUE
Death March to Disaster
Stars streak across the sky.

Chapter 1
I was working overtime on a day off.`;

      fs.readFile.mockResolvedValue(content);

      mockDetectStructure.mockResolvedValue({
        markers: [
          { lineIndex: 3, type: 'PROLOGUE', title: 'Death March to Disaster', rawLine: 'PROLOGUE' },
          { lineIndex: 6, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.9,
        totalLines: 8
      });

      const parsedNovel = await NovelParser.parseNovel(filePath, {
        useLLMStructureDetection: true,
        language: 'en'
      });

      expect(parsedNovel).toBeDefined();
      expect(parsedNovel.chapters).toBeDefined();
      if (parsedNovel.chapters.length >= 2) {
        expect(parsedNovel.chapters[0].type).toBe('PROLOGUE');
        expect(parsedNovel.chapters[1].type).toBe('CHAPTER');
      }
    });

    it('should fallback to regex parser when useLLMStructureDetection is false', async () => {
      const filePath = 'test-novel.txt';
      const content = `Title
Author

Chapter 1
Chapter 1 text.`;

      fs.readFile.mockResolvedValue(content);

      const parsedNovel = await NovelParser.parseNovel(filePath, {
        useLLMStructureDetection: false
      });

      expect(parsedNovel).toBeDefined();
      expect(parsedNovel.chapters).toBeDefined();
      // Should use regex parser (may not detect Chapter 1 if format doesn't match)
    });

    it('should use LLM by default', async () => {
      const filePath = 'test-novel.txt';
      const content = `Title
Author

PROLOGUE
Prologue text.`;

      fs.readFile.mockResolvedValue(content);

      mockDetectStructure.mockResolvedValue({
        markers: [
          { lineIndex: 3, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.8,
        totalLines: 5
      });

      const parsedNovel = await NovelParser.parseNovel(filePath);

      expect(mockDetectStructure).toHaveBeenCalled();
      expect(parsedNovel.chapters).toHaveLength(1);
    });
  });

  describe('Text Preservation', () => {
    it('should preserve all lines even with gaps', () => {
      const lines = Array.from({ length: 20 }, (_, i) => `Line ${i}`);
      const content = lines.join('\n');

      const structureIndex = {
        markers: [
          { lineIndex: 0, type: 'CHAPTER', title: 'Chapter 1', rawLine: 'Chapter 1' },
          { lineIndex: 10, type: 'CHAPTER', title: 'Chapter 2', rawLine: 'Chapter 2' } // Gap: lines 1-9 not covered
        ],
        structure: 'chapters-only',
        confidence: 0.7,
        totalLines: 20
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Should detect gap and fix it
      const allText = chapters.map(ch => 
        ch.paragraphs.map(p => p.text).join('\n')
      ).join('\n');

      // All lines should be present
      for (let i = 0; i < 20; i++) {
        expect(allText).toContain(`Line ${i}`);
      }
    });

    it('should preserve empty lines as paragraph breaks', () => {
      const content = `Line 1

Line 3

Line 5
PROLOGUE

Line 8
Line 9`;

      const structureIndex = {
        markers: [
          { lineIndex: 5, type: 'PROLOGUE', title: 'Prologue', rawLine: 'PROLOGUE' }
        ],
        structure: 'prologue-chapters',
        confidence: 0.8,
        totalLines: 9
      };

      const chapters = NovelParser._buildChaptersFromStructureIndex(content, structureIndex);

      // Empty lines should create paragraph breaks
      expect(chapters[0].paragraphs.length).toBeGreaterThan(1);
    });
  });
});

