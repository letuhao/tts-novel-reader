# LLM Parser Unit Tests

## Overview / Tổng quan

Comprehensive unit tests for the LLM-based novel structure detection parser, covering all guard logic, text preservation, and edge cases.

Kiểm tra đơn vị toàn diện cho parser phát hiện cấu trúc novel dựa trên LLM, bao gồm tất cả guard logic, bảo tồn text, và các trường hợp biên.

## Test File / File Kiểm thử

**Location:** `novel-app/backend/src/services/__tests__/novelParser.test.js`

## Test Coverage / Phạm vi Kiểm thử

### ✅ 20 Tests - All Passing / Tất cả Đạt

### 1. `parseChaptersWithLLM` Tests (4 tests)

#### ✅ `should use LLM structure detection when available`
- Tests basic LLM structure detection
- Verifies markers are detected correctly
- Checks chapter types and titles

#### ✅ `should fallback to regex parser when LLM unavailable`
- Tests fallback when `isAvailable()` returns false
- Verifies regex parser is used

#### ✅ `should fallback to regex parser when no markers detected`
- Tests fallback when LLM returns empty markers
- Verifies single chapter is created

#### ✅ `should handle errors and fallback to regex parser`
- Tests error handling
- Verifies graceful fallback on LLM errors

### 2. `_buildChaptersFromStructureIndex` Tests (11 tests)

#### ✅ `should build chapters from structure index correctly`
- Tests basic chapter building from structure index
- Verifies chapter numbers, types, and titles

#### ✅ `should preserve all text - no gaps`
- Tests text preservation
- Verifies all lines are included

#### ✅ `should handle gaps and fix them automatically`
- Tests gap detection
- Verifies automatic gap fixing by adding missing lines to previous chapter

#### ✅ `should handle missing end lines and fix them automatically`
- Tests missing end lines detection
- Verifies automatic fixing by adding to last chapter

#### ✅ `should handle invalid markers (out of bounds)`
- Tests invalid marker handling
- Verifies invalid markers are skipped

#### ✅ `should handle empty markers array - treat as single chapter`
- Tests empty markers array
- Verifies single chapter is created

#### ✅ `should preserve text order`
- Tests text order preservation
- Verifies lines are in correct order

#### ✅ `should handle different marker types correctly`
- Tests PROLOGUE, CHAPTER, INTERLUDE, EPILOGUE types
- Verifies correct type handling

#### ✅ `should handle overlaps and log warnings`
- Tests overlap detection (if it occurs)
- Verifies chapters are still created

#### ✅ `should include marker lines in chapter content`
- Tests marker lines are included in content
- Verifies no marker lines are lost

#### ✅ `should handle single chapter with prologue`
- Tests single chapter with prologue marker
- Verifies correct chapter creation

### 3. `parseNovel with LLM` Tests (3 tests)

#### ✅ `should parse novel with LLM structure detection`
- Tests full `parseNovel` flow with LLM
- Verifies file reading and parsing

#### ✅ `should fallback to regex parser when useLLMStructureDetection is false`
- Tests option to disable LLM
- Verifies regex parser is used

#### ✅ `should use LLM by default`
- Tests default behavior (LLM enabled)
- Verifies LLM is called by default

### 4. `Text Preservation` Tests (2 tests)

#### ✅ `should preserve all lines even with gaps`
- Tests comprehensive text preservation
- Verifies all 20 lines are preserved even with gaps

#### ✅ `should preserve empty lines as paragraph breaks`
- Tests empty line preservation
- Verifies empty lines create paragraph breaks

## Test Results / Kết quả Kiểm thử

```
✓ src/services/__tests__/novelParser.test.js  (20 tests) 25ms

Test Files  1 passed (1)
     Tests  20 passed (20)
```

## Key Test Scenarios / Các Kịch bản Kiểm thử Chính

### 1. **Gap Detection and Fixing** / Phát hiện và Sửa Gap
- ✅ Detects gaps between chapters
- ✅ Automatically fixes by adding missing lines to previous chapter
- ✅ Preserves text order

### 2. **Missing End Lines Fixing** / Sửa Missing End Lines
- ✅ Detects missing lines at end of file
- ✅ Automatically fixes by adding to last chapter
- ✅ Preserves all text

### 3. **Invalid Marker Handling** / Xử lý Marker Không hợp lệ
- ✅ Skips invalid markers (out of bounds)
- ✅ Continues parsing with valid markers
- ✅ Falls back to single chapter if all markers invalid

### 4. **Text Order Preservation** / Giữ Thứ tự Text
- ✅ All lines preserved in original order
- ✅ No text reordering
- ✅ Empty lines preserved as paragraph breaks

### 5. **Fallback Behavior** / Hành vi Dự phòng
- ✅ Falls back to regex parser when LLM unavailable
- ✅ Falls back to regex parser when no markers detected
- ✅ Falls back to regex parser on errors
- ✅ Option to disable LLM via `useLLMStructureDetection: false`

## Mocking / Mock

### Mocked Services / Dịch vụ được Mock

1. **`novelStructureDetectionService.js`**
   - `getNovelStructureDetectionService()` - Returns mocked service
   - `isAvailable()` - Mocked to return `Promise.resolve(true)`
   - `isModelAvailable()` - Mocked to return `Promise.resolve(true)`
   - `detectStructure()` - Mocked function for testing

2. **`fs/promises`**
   - `readFile()` - Mocked for file reading tests

### Mock Setup / Thiết lập Mock

```javascript
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
```

## Running Tests / Chạy Kiểm thử

### Run All Tests / Chạy Tất cả Kiểm thử
```bash
cd novel-app/backend
npm test
```

### Run Specific Test File / Chạy File Kiểm thử Cụ thể
```bash
cd novel-app/backend
npm test -- novelParser.test.js
```

### Run in Watch Mode / Chạy ở Chế độ Watch
```bash
cd novel-app/backend
npm run test:watch
```

### Run with Coverage / Chạy với Coverage
```bash
cd novel-app/backend
npm run test:coverage
```

## Test Structure / Cấu trúc Kiểm thử

```
NovelParser - LLM Structure Detection
├── parseChaptersWithLLM
│   ├── should use LLM structure detection when available
│   ├── should fallback to regex parser when LLM unavailable
│   ├── should fallback to regex parser when no markers detected
│   └── should handle errors and fallback to regex parser
├── _buildChaptersFromStructureIndex
│   ├── should build chapters from structure index correctly
│   ├── should preserve all text - no gaps
│   ├── should handle gaps and fix them automatically
│   ├── should handle missing end lines and fix them automatically
│   ├── should handle invalid markers (out of bounds)
│   ├── should handle empty markers array - treat as single chapter
│   ├── should preserve text order
│   ├── should handle different marker types correctly
│   ├── should handle overlaps and log warnings
│   ├── should include marker lines in chapter content
│   └── should handle single chapter with prologue
├── parseNovel with LLM
│   ├── should parse novel with LLM structure detection
│   ├── should fallback to regex parser when useLLMStructureDetection is false
│   └── should use LLM by default
└── Text Preservation
    ├── should preserve all lines even with gaps
    └── should preserve empty lines as paragraph breaks
```

## Assertions / Các Khẳng định

### Chapter Structure / Cấu trúc Chapter
- ✅ Chapter count matches expected
- ✅ Chapter numbers are sequential (1, 2, 3, ...)
- ✅ Chapter types are correct (PROLOGUE, CHAPTER, etc.)
- ✅ Chapter titles match expected values

### Text Preservation / Bảo tồn Text
- ✅ All lines are preserved
- ✅ Text order is maintained
- ✅ Empty lines create paragraph breaks
- ✅ Gap lines are included in chapters
- ✅ Missing end lines are included in last chapter

### Guard Logic / Logic Bảo vệ
- ✅ Gaps are detected and fixed
- ✅ Missing end lines are detected and fixed
- ✅ Invalid markers are skipped
- ✅ Empty markers array creates single chapter
- ✅ Overlaps are detected (if they occur)

## Edge Cases Covered / Các Trường hợp Biên được Bao phủ

1. ✅ No markers detected
2. ✅ Empty markers array
3. ✅ Invalid markers (out of bounds)
4. ✅ Gaps between chapters
5. ✅ Missing end lines
6. ✅ Overlapping chapters
7. ✅ Single chapter with prologue
8. ✅ Multiple marker types (PROLOGUE, CHAPTER, INTERLUDE, EPILOGUE)
9. ✅ LLM unavailable
10. ✅ LLM errors
11. ✅ Empty content
12. ✅ Content with only empty lines

## Future Test Additions / Bổ sung Kiểm thử Tương lai

1. **Performance Tests** / Kiểm thử Hiệu năng
   - Large file parsing (10,000+ lines)
   - Many chapters (100+ chapters)
   - Complex structure (parts, volumes, etc.)

2. **Integration Tests** / Kiểm thử Tích hợp
   - Full novel upload flow
   - Database persistence
   - Frontend integration

3. **Error Recovery Tests** / Kiểm thử Phục hồi Lỗi
   - Malformed structure index
   - Partial LLM responses
   - Network errors

---

**Status**: ✅ All Tests Passing (20/20)  
**Date**: 2024-12-19

