# LLM-Based Novel Structure Detection

## Overview / Tổng quan

This enhancement adds intelligent novel structure detection using LLM (Ollama) to automatically identify chapters, prologues, epilogues, parts, and other structural elements in novels.

Tính năng này thêm phát hiện cấu trúc novel thông minh sử dụng LLM (Ollama) để tự động xác định chapters, prologues, epilogues, parts, và các phần tử cấu trúc khác trong novels.

## Problem / Vấn đề

The current regex-based parser is designed for Vietnamese novels with patterns like:
- `Chương 1`, `Chương 2`
- `Thứ XXXX chương`

However, English light novels have different structures:
- `PROLOGUE`, `Prologue: Title`
- `Chapter 1`, `Chapter 2: Title`
- `EPILOGUE`, `Epilogue: Title`
- `Part 1`, `Volume 1`, `Book 1`
- `Interlude`, `INTERLUDE`
- Roman numerals: `I`, `II`, `III`
- Numbered: `1`, `2`, `3`

The regex parser cannot handle all these variations, leading to:
- Single chapter novels (no markers detected)
- Missing chapters
- Incorrect chapter titles

## Solution / Giải pháp

**LLM-Based Structure Detection** uses Ollama to intelligently analyze novel structure and return a structure index with:
- Line numbers (1-based) for each structural marker
- Marker types: `PROLOGUE`, `CHAPTER`, `EPILOGUE`, `INTERLUDE`, `PART`, `AFTERWORD`, `OTHER`
- Chapter titles extracted from markers
- Structure type: `prologue-chapters`, `chapters-only`, `single-chapter`, `parts-chapters`

The structure index is then used to split the novel using the same **index-based approach** as the regex parser, ensuring **NO TEXT IS LOST**.

## Architecture / Kiến trúc

### Components / Các thành phần

1. **`novelStructureDetectionService.js`**
   - LLM-based structure detection service
   - Uses Ollama to analyze novel structure
   - Returns structure index with markers

2. **`novelParser.js`** (Enhanced)
   - New method: `parseChaptersWithLLM()` - Uses LLM structure detection
   - New method: `_buildChaptersFromStructureIndex()` - Builds chapters from LLM-detected structure
   - Updated: `parseNovel()` - Now accepts options for LLM structure detection

3. **`novels.js`** (Routes)
   - Updated upload/process routes to support LLM structure detection
   - Options: `useLLMStructureDetection` (default: `true`), `language` (default: `'auto'`)

### Flow / Luồng xử lý

```
1. User uploads novel file
   ↓
2. NovelParser.parseNovel() called with options
   ↓
3. If useLLMStructureDetection === true:
   ↓
   a. Check if Ollama is available
   ↓
   b. Call novelStructureDetectionService.detectStructure()
   ↓
   c. LLM analyzes novel and returns structure index
   ↓
   d. Build chapters from structure index (index-based, no text loss)
   ↓
4. If useLLMStructureDetection === false OR Ollama unavailable:
   ↓
   a. Fallback to regex-based parsing (original method)
   ↓
5. Return parsed novel with chapters
```

## API / API

### Structure Detection Service

```javascript
import { getNovelStructureDetectionService } from './novelStructureDetectionService.js';

const service = getNovelStructureDetectionService();

// Detect structure
const structureIndex = await service.detectStructure(content, {
  sampleSize: 5000,    // Sample size for analysis
  maxMarkers: 200,     // Maximum markers to detect
  language: 'auto'      // Language hint: 'auto', 'en', 'vi', etc.
});

// Structure index format:
{
  markers: [
    {
      lineIndex: 3,        // 0-based line index
      type: 'PROLOGUE',    // Marker type
      title: 'Death March to Disaster',
      rawLine: 'PROLOGUE'
    },
    {
      lineIndex: 249,
      type: 'CHAPTER',
      title: 'Chapter 1: Title',
      rawLine: 'Chapter 1: Title'
    }
  ],
  structure: 'prologue-chapters',  // Structure type
  confidence: 0.9,                 // Confidence score (0-1)
  notes: 'Optional notes',
  totalLines: 6205
}
```

### Novel Parser

```javascript
import { NovelParser } from './novelParser.js';

// Parse with LLM structure detection (default)
const parsedNovel = await NovelParser.parseNovel(filePath, {
  useLLMStructureDetection: true,  // Default: true
  language: 'auto'                  // Default: 'auto'
});

// Parse with regex-based parsing (fallback)
const parsedNovel = await NovelParser.parseNovel(filePath, {
  useLLMStructureDetection: false
});
```

### Routes

**POST `/api/novels/upload`**
```json
{
  "novel": "<file>",
  "useLLMStructureDetection": true,  // Optional, default: true
  "language": "auto"                  // Optional, default: 'auto'
}
```

**POST `/api/novels/process`**
```json
{
  "filePath": "/path/to/novel.txt",
  "useLLMStructureDetection": true,  // Optional, default: true
  "language": "en"                    // Optional, default: 'auto'
}
```

## Marker Types / Các loại Marker

- **PROLOGUE**: Opening section before main story
- **CHAPTER**: Main story chapters
- **PART**: Volume/Part divisions
- **INTERLUDE**: Short sections between chapters
- **EPILOGUE**: Closing section after main story
- **AFTERWORD**: Author's note or afterword
- **OTHER**: Other structural elements (preface, introduction, etc.)

## Structure Types / Các loại Cấu trúc

- **`prologue-chapters`**: Has prologue + chapters
- **`chapters-only`**: Only chapters (no prologue/epilogue)
- **`single-chapter`**: No markers detected (single chapter)
- **`parts-chapters`**: Has parts/volumes + chapters

## Benefits / Lợi ích

1. **Intelligent Detection**: LLM understands context, not just patterns
2. **Multi-format Support**: Handles various chapter marker formats
3. **No Text Loss**: Uses same index-based approach as regex parser
4. **Automatic Fallback**: Falls back to regex if LLM unavailable
5. **Language-Aware**: Can detect structure in different languages
6. **Flexible**: Supports prologue, epilogue, parts, interludes, etc.

## Configuration / Cấu hình

### Environment Variables

```bash
# Ollama configuration (same as role detection)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=qwen3:8b
OLLAMA_TIMEOUT=600000  # 10 minutes
```

### Options

- **`useLLMStructureDetection`**: Enable/disable LLM structure detection (default: `true`)
- **`language`**: Language hint for better detection (`'auto'`, `'en'`, `'vi'`, etc.)

## Fallback Behavior / Hành vi Dự phòng

If LLM structure detection fails or is unavailable:
1. Automatically falls back to regex-based parsing
2. Logs warning message
3. Continues with original parsing method
4. No data loss or errors

## Testing / Kiểm thử

### Test with English Light Novel

```javascript
// Test with Death March novel
const parsedNovel = await NovelParser.parseNovel(
  'storage/Death March kara Hajimaru Isekai Kyousoukyoku - Volume 01 [Yen Press][CalibreV1DPC].txt',
  {
    useLLMStructureDetection: true,
    language: 'en'
  }
);

// Should detect:
// - PROLOGUE at line 4
// - CHAPTER markers (if any)
// - Proper chapter titles
```

### Test with Vietnamese Novel

```javascript
const parsedNovel = await NovelParser.parseNovel(
  'storage/vietnamese-novel.txt',
  {
    useLLMStructureDetection: true,
    language: 'vi'
  }
);

// Should detect:
// - Chương 1, Chương 2, etc.
// - Thứ XXXX chương
// - Proper Vietnamese chapter titles
```

## Future Enhancements / Cải tiến Tương lai

1. **Caching**: Cache structure detection results for faster re-parsing
2. **Batch Processing**: Process multiple novels in parallel
3. **Custom Patterns**: Allow users to define custom marker patterns
4. **Confidence Thresholds**: Only use LLM if confidence is above threshold
5. **Hybrid Approach**: Combine LLM + regex for better accuracy

## Notes / Ghi chú

- LLM structure detection requires Ollama to be running
- Uses same index-based approach as regex parser (no text loss)
- Automatically falls back to regex if LLM unavailable
- Language hint improves detection accuracy
- Structure index is used to build chapters (same as regex markers)

---

**Status**: ✅ Implemented  
**Date**: 2024-12-19

