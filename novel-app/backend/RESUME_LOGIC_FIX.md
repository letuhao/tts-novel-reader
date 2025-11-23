# Resume Logic Fix for Chapter Audio Generation

## Problem / Vấn đề

Generation was getting stuck at paragraph_077 because:
1. Resume logic only checked database entries for cached files
2. If database entry had missing/incorrect `local_audio_path`, file existence wasn't verified
3. If database entry didn't exist but file did, it wasn't detected
4. Only checked database-stored path, not the standard storage path structure

## Solution / Giải pháp

Enhanced resume logic to check files in two ways:

### 1. Database Path Check (Primary)
- Checks if database entry exists
- If exists and `local_audio_path` is set, verifies file exists at that path
- Uses database path as primary check

### 2. Standard Storage Path Check (Fallback)
- If database check fails or no database entry, checks standard storage path
- Uses same path structure logic as `generateAndStore`:
  ```
  {storage}/audio/{novelId}/chapter_{number}/paragraph_{number}/paragraph_{number}.wav
  ```
- Ensures files are detected even if database metadata is missing/incorrect

## Improvements / Cải thiện

1. **Dual Path Checking**: Checks both database path and standard storage path
2. **Better Logging**: Logs when files are found at expected path
3. **Graceful Degradation**: Continues generation if cache check fails
4. **Debug Information**: Logs when database entries exist but files are missing

## Files Changed / Tệp Đã Thay đổi

- `novel-app/backend/src/services/worker.js` - Enhanced resume logic in `generateChapterAudio`

## How It Works / Cách Hoạt động

```
For each paragraph:
  ↓
Check database entry
  ↓ (exists & has path)
  Check file at database path
  ↓ (exists)
  ✅ Skip generation
  ↓ (doesn't exist)
  Check file at standard storage path
  ↓ (exists)
  ✅ Skip generation (log path found)
  ↓ (doesn't exist)
  ➡️ Add to generation queue
```

## Testing / Kiểm thử

After this fix:
- Paragraphs with existing files should be detected and skipped correctly
- Paragraphs with missing files should be regenerated
- Generation should continue past paragraph_077 to process all remaining paragraphs (78-162)

## Next Steps / Bước Tiếp theo

1. Restart backend to apply changes
2. Re-run chapter generation - it should:
   - Detect existing files (1-77)
   - Continue processing remaining paragraphs (78-162)
   - Not get stuck at paragraph_077

