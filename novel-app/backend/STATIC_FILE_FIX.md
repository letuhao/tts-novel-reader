# Static File Serving Fix
# Sửa lỗi Phục vụ File Tĩnh

## Problem / Vấn đề

Frontend is getting 404 when trying to access static audio files:
- Request: `http://localhost:5173/static/audio/.../paragraph_001/paragraph_001.wav`
- Response: 404 Not Found

## Issues Found / Vấn đề Phát hiện

### Issue 1: Proxy Not Working
- Frontend requests go to `localhost:5173/static/...`
- Backend serves static files at `localhost:11110/static/...`
- Vite proxy was only configured for `/api`, not `/static`
- ✅ **FIXED**: Added `/static` proxy to `vite.config.ts`

### Issue 2: Paragraph Number Mismatch
- Frontend requests: `paragraph_001`
- Actual files: `paragraph_000` (first paragraph is 0-based)
- This suggests either:
  1. Backend API returns wrong paragraph numbers
  2. Frontend incorrectly interprets paragraph numbers
  3. Database has wrong paragraph_number values

### Issue 3: Static File Path
- Backend serves: `/static` -> `storage/` directory
- Files are at: `storage/audio/{novel_dir}/chapter_XXX/paragraph_XXX/paragraph_XXX.wav`
- URL should be: `/static/audio/{novel_dir}/chapter_XXX/paragraph_XXX/paragraph_XXX.wav`

## Root Cause / Nguyên nhân Gốc

### Paragraph Numbering
- ✅ Novel parser uses **0-based indexing**: First paragraph = 0
- ✅ Files are correctly stored as `paragraph_000/`, `paragraph_001/`, etc.
- ❓ Database might have wrong `paragraph_number` values
- ❓ Backend API might be returning wrong `paragraph_number` in response

## Fixes Applied / Các Sửa lỗi Đã Áp dụng

### 1. Added Static File Proxy ✅
**File:** `novel-app/frontend/vite.config.ts`

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:11110',
    changeOrigin: true
  },
  '/static': {  // ✅ Added
    target: 'http://localhost:11110',
    changeOrigin: true
  }
}
```

### 2. URL Generation ✅
**File:** `novel-app/backend/src/routes/audio.js`

- Already checks for `paragraphNumber !== null && !== undefined`
- Generates correct URL format: `/static/audio/{novel_dir}/chapter_XXX/paragraph_XXX/paragraph_XXX.wav`
- Falls back to TTS backend URL if paragraph_number is null

## Testing / Kiểm tra

### 1. Test Backend API Response
```powershell
$novelId = "780ee1f0-0c56-44b3-bfc6-03e8055e7640"
Invoke-RestMethod "http://127.0.0.1:11110/api/audio/$novelId/1"
```

Check:
- ✅ `paragraphNumber` values (should be 0, 1, 2, ...)
- ✅ `audioURL` format (should be `/static/audio/.../paragraph_XXX/paragraph_XXX.wav`)

### 2. Test Backend Static Serving
```powershell
Invoke-WebRequest -Method Head "http://127.0.0.1:11110/static/audio/.../paragraph_000/paragraph_000.wav"
```

Should return: 200 OK

### 3. Test Frontend Proxy
After restarting frontend dev server:
```powershell
Invoke-WebRequest -Method Head "http://localhost:5173/static/audio/.../paragraph_000/paragraph_000.wav"
```

Should proxy to backend and return: 200 OK

## Next Steps / Các Bước Tiếp theo

1. ✅ **Restart Frontend Dev Server** (CRITICAL!)
   ```powershell
   cd novel-app/frontend
   npm run dev
   ```
   The proxy config only works after restart.

2. **Check Backend API Response**
   - Verify paragraph numbers are correct (0, 1, 2, ...)
   - Verify audioURL format is correct

3. **Check Database**
   - Verify `paragraph_number` values in `audio_cache` table
   - Run fix script if needed: `node scripts/fix_null_paragraphs.js`

4. **Test Audio Playback**
   - Refresh frontend
   - Generate/load audio files
   - Verify audio playback works

## Expected Behavior After Fix / Hành vi Mong đợi Sau Khi Sửa

1. ✅ Frontend requests: `http://localhost:5173/static/audio/...`
2. ✅ Vite proxy forwards to: `http://localhost:11110/static/audio/...`
3. ✅ Backend serves file from: `storage/audio/...`
4. ✅ Audio files load correctly
5. ✅ Playback works without 404 errors

