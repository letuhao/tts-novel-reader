# Worker.js Fix - Property Name Mismatch
# Sửa lỗi Worker.js - Lỗi Tên Thuộc tính

## Problem / Vấn đề

The `worker.js` was not working like `test_worker.py` expected because:

1. ❌ Database columns use **snake_case** (`paragraph_number`)
2. ❌ JavaScript code was accessing **camelCase** (`paragraph.paragraphNumber`)
3. ❌ `ParagraphModel` was returning raw database rows without conversion
4. ❌ `paragraph.paragraphNumber` was `undefined`, causing `null` to be passed to `generateAndStore()`
5. ❌ When `paragraphNumber` is `null`, files are saved in chapter folder with UUID names

## Root Cause / Nguyên nhân Gốc

The `ParagraphModel.getByChapter()` method was returning raw database rows:

```javascript
return paragraphs.map(paragraph => ({
  ...paragraph,  // ❌ Contains snake_case: paragraph_number
  lines: paragraph.lines ? JSON.parse(paragraph.lines) : null
}));
```

But `worker.js` was accessing:
```javascript
paragraph.paragraphNumber  // ❌ undefined! Should be paragraph.paragraph_number
```

This caused:
- `paragraphNumber` to be `undefined` → passed as `null` to `generateAndStore()`
- Files saved in wrong location (chapter folder instead of paragraph subfolders)
- Wrong filenames (UUID instead of `paragraph_XXX.wav`)
- Only one metadata file (instead of one per paragraph)

## Fix Applied / Sửa lỗi Đã Áp dụng

### Updated `ParagraphModel.js` to convert snake_case to camelCase:

**Before:**
```javascript
return paragraphs.map(paragraph => ({
  ...paragraph,  // snake_case properties
  lines: paragraph.lines ? JSON.parse(paragraph.lines) : null
}));
```

**After:**
```javascript
// Convert snake_case database columns to camelCase
return paragraphs.map(paragraph => ({
  id: paragraph.id,
  novelId: paragraph.novel_id,
  chapterId: paragraph.chapter_id,
  chapterNumber: paragraph.chapter_number,
  paragraphNumber: paragraph.paragraph_number,  // ✅ Now in camelCase!
  text: paragraph.text,
  lines: paragraph.lines ? JSON.parse(paragraph.lines) : null,
  createdAt: paragraph.created_at,
  updatedAt: paragraph.updated_at
}));
```

## Methods Fixed / Các Phương thức Đã Sửa

1. ✅ `getByChapter()` - Converts columns to camelCase
2. ✅ `getByNovelAndChapter()` - Converts columns to camelCase
3. ✅ `getById()` - Converts columns to camelCase
4. ✅ `getByNumbers()` - Converts columns to camelCase

## Expected Behavior After Fix / Hành vi Mong đợi Sau Khi Sửa

Now `worker.js` will work like `test_worker.py` expects:

### Storage Structure / Cấu trúc Lưu trữ
```
storage/audio/{novel_id}_{novel_title}/chapter_{number}_{chapter_title}/
  ├── paragraph_001/
  │   ├── paragraph_001.wav
  │   └── paragraph_001_metadata.json
  ├── paragraph_002/
  │   ├── paragraph_002.wav
  │   └── paragraph_002_metadata.json
  └── paragraph_003/
      ├── paragraph_003.wav
      └── paragraph_003_metadata.json
```

### Flow / Luồng hoạt động

1. ✅ `ParagraphModel.getByChapter()` returns paragraphs with `paragraphNumber` in camelCase
2. ✅ `worker.js` accesses `paragraph.paragraphNumber` correctly
3. ✅ `paragraph.paragraphNumber` is passed to `generateAndStore()` as a number (not null)
4. ✅ `getStoragePath()` creates paragraph subdirectories
5. ✅ `getAudioFilePath()` uses `paragraph_XXX.wav` filename
6. ✅ `getMetadataFilePath()` uses `paragraph_XXX_metadata.json` filename
7. ✅ Each paragraph gets its own subdirectory and metadata file

## Testing / Kiểm tra

After this fix, test with:
```bash
cd novel-app/backend
python test_worker.py
```

Expected results:
- ✅ `paragraph.paragraphNumber` is a number (not undefined/null)
- ✅ Files are saved in `paragraph_XXX/` subdirectories
- ✅ Audio files are named `paragraph_XXX.wav`
- ✅ Each paragraph has its own `paragraph_XXX_metadata.json`
- ✅ `test_worker.py` should pass all checks

