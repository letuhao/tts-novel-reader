# Storage Organization Issues - Fix Summary
# Vấn đề Tổ chức Lưu trữ - Tóm tắt Sửa lỗi

## Problems Found / Vấn đề Phát hiện

### Current Structure (WRONG) / Cấu trúc Hiện tại (SAI)
```
storage/audio/{novel_id}_{novel_title}/chapter_{number}_{chapter_title}/
  ├── {uuid1}.wav          ❌ UUID filename
  ├── {uuid2}.wav          ❌ UUID filename
  ├── {uuid3}.wav          ❌ UUID filename
  └── metadata.json        ❌ Only one metadata file
```

**Issues:**
1. ❌ All audio files are directly in chapter folder (not in paragraph subfolders)
2. ❌ Audio files use UUID names instead of `paragraph_XXX.wav`
3. ❌ Only one `metadata.json` file exists (should be one per paragraph)
4. ❌ `metadata.json` shows `paragraphNumber: null` (should be a number)

### Expected Structure (from test_worker.py) / Cấu trúc Mong đợi (từ test_worker.py)
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

## Root Cause / Nguyên nhân Gốc

The `paragraphNumber` parameter is being passed as `null` to `generateAndStore()` or `saveMetadata()`, causing:
1. Files to be saved in chapter directory instead of paragraph subdirectories
2. UUID filenames instead of `paragraph_XXX.wav`
3. Only one metadata file being created

## Fixes Applied / Các Sửa lỗi Đã Áp dụng

### 1. Fixed `saveMetadata` to receive all required fields
- Added `paragraphId`, `paragraphIndex`, `totalParagraphsInChapter` to `localInfo` parameter
- Added `speakerId`, `model`, `speedFactor` to `localInfo` parameter
- Now properly extracts these from `options` in `generateAndStore()`

### 2. Need to verify `paragraphNumber` is passed correctly
- Check `worker.js` line 164: `paragraph.paragraphNumber` should not be `null`
- Check `generateAndStore()` receives `paragraphNumber` correctly
- Check `downloadAndSaveAudio()` receives `paragraphNumber` correctly
- Check `saveMetadata()` receives `paragraphNumber` correctly

## Next Steps / Các Bước Tiếp theo

1. ✅ Fix applied: Pass all metadata fields to `saveMetadata()`
2. ⚠️  **TODO**: Verify `paragraphNumber` is not null when called from worker
3. ⚠️  **TODO**: Test storage organization after fix
4. ⚠️  **TODO**: Clean up old incorrectly organized files
5. ⚠️  **TODO**: Regenerate audio with correct organization

## Code Changes / Thay đổi Code

### File: `novel-app/backend/src/services/audioStorage.js`

**Line ~251-263**: Updated `saveMetadata` call to include all required fields:
```javascript
const metadataFile = await this.saveMetadata(
  audioMetadata,
  novelId,
  chapterNumber,
  paragraphNumber,
  {
    storageDir: storageDir,
    localAudioPath: localAudioPath,
    chapterTitle: chapterTitle,
    novelTitle: novelTitle,
    subtitle: text,
    paragraphId: options.paragraphId || null,  // ✅ Added
    paragraphIndex: options.paragraphIndex !== undefined ? options.paragraphIndex : null,  // ✅ Added
    totalParagraphsInChapter: options.totalParagraphsInChapter || null,  // ✅ Added
    speakerId: speakerId,  // ✅ Added
    model: model,  // ✅ Added
    speedFactor: speedFactor  // ✅ Added
  }
);
```

## Testing / Kiểm tra

After fixes, test with:
```bash
cd novel-app/backend
python test_worker.py
```

Expected result:
- ✅ Each paragraph has its own subdirectory (`paragraph_001/`, `paragraph_002/`, etc.)
- ✅ Audio files are named `paragraph_XXX.wav`
- ✅ Each paragraph has its own `paragraph_XXX_metadata.json`
- ✅ Metadata contains correct `paragraphNumber`, `paragraphId`, etc.

