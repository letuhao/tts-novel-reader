# Log Review - Bug Fixes
# Xem Xét Log - Sửa Lỗi

## Issues Found / Vấn Đề Tìm Thấy

### 1. Chapter Parsing Warning (False Positive)
**Issue:** Warning appears for novels with only 1 chapter and no chapter indicators.

**Root Cause:** The warning logic was checking if all chapters have `chapterNumber = 1`, but this is actually **normal** for single-chapter novels (novels without chapter markers).

**Fix Applied:**
- Updated `ChapterModel.getByNovel()` to only warn when there are **multiple chapters** but they all have the same number
- Added informational log for single-chapter novels (this is expected behavior)
- Updated `novels.js` route to apply the same logic

**Files Changed:**
- `src/models/Chapter.js`
- `src/routes/novels.js`

---

### 2. TTS API Model Name Mismatch
**Issue:** 422 error - Backend expects `"xtts-english"` but receives `"coqui-xtts-v2"`

**Error Message:**
```
{"detail":[{"type":"literal_error","loc":["body","model"],"msg":"Input should be 'xtts-english'","input":"coqui-xtts-v2","ctx":{"expected":"'xtts-english'"}}]}
```

**Root Cause:** The Coqui TTS backend API only accepted `"xtts-english"` as a literal value, but the frontend/worker sends `"coqui-xtts-v2"` (which is the configured model name).

**Fix Applied:**
- Updated `TTSSynthesizeRequest` to accept model aliases: `"xtts-english"`, `"coqui-xtts-v2"`, `"coqui-tts"`, `"xtts-v2"`
- Updated `ModelInfoRequest` to accept the same aliases
- Added model name normalization in the `/synthesize` endpoint to map aliases to `"xtts-english"`
- Added model name normalization in the `/model/info` endpoint

**Files Changed:**
- `tts/coqui-ai-tts-backend/tts_backend/api.py`

---

## Changes Made / Thay Đổi Đã Thực Hiện

### 1. Chapter Model (`src/models/Chapter.js`)

**Before:**
```javascript
if (uniqueNumbers.length === 1 && uniqueNumbers[0] === 1) {
  console.warn(`[ChapterModel] ⚠️ WARNING: All chapters have chapterNumber = 1!`);
}
```

**After:**
```javascript
// Only warn if there are MULTIPLE chapters but they all have the same number
if (transformed.length > 1 && uniqueNumbers.length === 1 && uniqueNumbers[0] === 1) {
  console.warn(`[ChapterModel] ⚠️ WARNING: All ${transformed.length} chapters have chapterNumber = 1!`);
} else if (transformed.length === 1 && uniqueNumbers[0] === 1) {
  // Single chapter with number 1 is normal
  console.log(`[ChapterModel] ℹ️  Single chapter detected (no chapter markers found in novel)`);
}
```

### 2. Novels Route (`src/routes/novels.js`)

**Before:**
```javascript
if (uniqueNumbers.length === 1 && sortedChapters.length > 1) {
  console.error(`[Novels Route] ❌ CRITICAL: All ${sortedChapters.length} chapters...`);
}
```

**After:**
```javascript
// Only warn if there are MULTIPLE chapters but they all have the same number
if (uniqueNumbers.length === 1 && sortedChapters.length > 1) {
  console.error(`[Novels Route] ❌ CRITICAL: All ${sortedChapters.length} chapters...`);
} else if (sortedChapters.length === 1 && uniqueNumbers[0] === 1) {
  // Single chapter with number 1 is normal
  console.log(`[Novels Route] ℹ️  Single chapter detected (no chapter markers found in novel)`);
}
```

### 3. Coqui TTS Backend API (`tts/coqui-ai-tts-backend/tts_backend/api.py`)

**Before:**
```python
model: Optional[Literal["xtts-english"]] = "xtts-english"
```

**After:**
```python
model: Optional[Literal["xtts-english", "coqui-xtts-v2", "coqui-tts", "xtts-v2"]] = "xtts-english"
```

**Added normalization:**
```python
# Normalize model name (accept aliases)
normalized_model = request.model
if request.model in ["coqui-xtts-v2", "coqui-tts", "xtts-v2"]:
    normalized_model = "xtts-english"
```

---

## Testing / Kiểm Tra

### Test Chapter Parsing
1. Upload a novel with no chapter markers (single chapter)
2. Check logs - should see informational message, not warning
3. Upload a novel with multiple chapters but all have same number
4. Check logs - should see warning (this is a real issue)

### Test TTS API
1. Generate audio with `model: "coqui-xtts-v2"`
2. Should succeed (no 422 error)
3. Check backend logs - should show normalized model name

---

## Expected Behavior After Fix / Hành Vi Mong Đợi Sau Khi Sửa

### Single-Chapter Novels
- ✅ No false warnings
- ✅ Informational log: "Single chapter detected (no chapter markers found in novel)"
- ✅ Novel works correctly

### Multi-Chapter Novels with Same Number
- ⚠️ Warning still appears (this is a real issue)
- ⚠️ Indicates parsing problem

### TTS API Calls
- ✅ Accepts `"coqui-xtts-v2"`, `"coqui-tts"`, `"xtts-v2"` as aliases
- ✅ Normalizes to `"xtts-english"` internally
- ✅ No more 422 errors

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Fixes Applied

