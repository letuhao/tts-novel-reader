# Pipeline Issues Identified / Vấn Đề Pipeline Đã Xác Định

## ❌ Critical Issues Found / Vấn Đề Nghiêm Trọng Đã Tìm Thấy

### 1. `getStoragePath()` Implementation is WRONG / Triển Khai `getStoragePath()` SAI

**Problem / Vấn Đề:**
- Method signature: `getStoragePath(novelId, chapterNumber, paragraphNumber = null)`
- Other methods call it with titles: `getStoragePath(..., chapterTitle, novelTitle)`
- **Titles are IGNORED** because method doesn't accept them!
- Uses OLD structure: `{novel_id}/chapter_XXX/paragraph_YYY/`
- Should be: `{novel_id}_{novel_title}/chapter_{number}_{chapter_title}/paragraph_{number}/`

**Current Code / Code Hiện Tại:**
```javascript
getStoragePath(novelId, chapterNumber, paragraphNumber = null) {
  // Structure: storage/audio/novel_id/chapter_XX/paragraph_YY/
  const novelDir = path.join(this.baseStorageDir, novelId);
  const chapterDir = path.join(novelDir, `chapter_${String(chapterNumber).padStart(3, '0')}`);
  // NO TITLES USED!
}
```

**Should be / Nên Là:**
```javascript
getStoragePath(novelId, chapterNumber, paragraphNumber = null, chapterTitle = null, novelTitle = null) {
  // Structure: storage/audio/{novel_id}_{novel_title}/chapter_{number}_{chapter_title}/paragraph_{number}/
  const novelDirName = novelTitle 
    ? `${novelId}_${this.sanitizeFileName(novelTitle)}`
    : novelId;
  const novelDir = path.join(this.baseStorageDir, novelDirName);
  const chapterTitleSafe = chapterTitle ? `_${this.sanitizeFileName(chapterTitle)}` : '';
  const chapterDirName = `chapter_${String(chapterNumber).padStart(3, '0')}${chapterTitleSafe}`;
  // ... with titles
}
```

### 2. Missing `sanitizeFileName()` Method / Thiếu Phương Thức `sanitizeFileName()`

**Problem / Vấn Đề:**
- Method is referenced but doesn't exist
- Needed to clean titles for file/folder names
- Should remove invalid characters, replace spaces, limit length

### 3. Audio Files NOT Being Downloaded / File Audio KHÔNG Được Tải

**Problem / Vấn Đề:**
- Only metadata JSON files exist in paragraph folders
- NO `.wav` files found
- Download logs show no activity
- This suggests download step is failing silently or not executing

**Evidence / Bằng Chứng:**
```
paragraph_000/
  - f714141017fc73d65cb47cb48019ebdf.json  ✅ (metadata)
  - ❌ NO .wav file!
```

### 4. Wrong File Naming / Đặt Tên File Sai

**Problem / Vấn Đề:**
- Metadata files use old file IDs: `{file_id}.json`
- Should use: `paragraph_{number}_metadata.json`
- Audio files missing (should be: `paragraph_{number}.wav`)

**Current / Hiện Tại:**
```
paragraph_000/
  - f714141017fc73d65cb47cb48019ebdf.json  ❌ (old file ID)
```

**Should be / Nên Là:**
```
paragraph_000/
  - paragraph_000.wav  ✅
  - paragraph_000_metadata.json  ✅
```

### 5. TTS Cache Not Being Cleaned / Cache TTS Không Được Dọn Dẹp

**Problem / Vấn Đề:**
- 62 files still in TTS backend storage
- Should be empty after download + cleanup
- Suggests cleanup is not working or download is failing

### 6. Storage Structure Wrong / Cấu Trúc Lưu Trữ Sai

**Current / Hiện Tại:**
```
novel-app/storage/audio/
  └── 522e13ed-db50-4d2a-a0d9-92a3956d527d/  ❌ (no title)
      └── chapter_001/  ❌ (no title)
          └── paragraph_000/
              └── {file_id}.json  ❌ (wrong name, no audio)
```

**Should be / Nên Là:**
```
novel-app/storage/audio/
  └── 522e13ed-db50-4d2a-a0d9-92a3956d527d_Bat_dau_bien_than_nu_dieu_tra_quan/  ✅
      └── chapter_001_Chuong_1/  ✅
          └── paragraph_000/
              ├── paragraph_000.wav  ✅
              └── paragraph_000_metadata.json  ✅
```

## ✅ What Needs to be Fixed / Những Gì Cần Sửa

1. ✅ Fix `getStoragePath()` to accept and use titles
2. ✅ Add `sanitizeFileName()` method
3. ✅ Fix download step to actually work
4. ✅ Fix metadata file naming (use paragraph numbers, not file IDs)
5. ✅ Ensure audio files are downloaded and saved
6. ✅ Verify TTS cache cleanup works

---

**Status: ❌ CRITICAL BUGS FOUND - Need Immediate Fix**  
**Trạng thái: ❌ ĐÃ TÌM THẤY LỖI NGHIÊM TRỌNG - Cần Sửa Ngay**

