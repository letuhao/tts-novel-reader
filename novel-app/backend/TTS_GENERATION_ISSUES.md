# TTS Generation Issues Analysis

## Problems Found

### 1. **Model Mismatch in Logs**
- **Issue**: Log shows `Model: vieneu-tts, Voice: id_0004` (line 7922)
- **Expected**: `Model: viettts, Voice: quynh`
- **Root Cause**: The log is from an older run before the code was updated, OR the backend server hasn't been restarted after code changes
- **Fix**: Restart the backend server to load the new code

### 2. **TTS Backend Timeout**
- **Issue**: Backend at `http://127.0.0.1:11111` is timing out after 120 seconds
- **Error**: `timeout of 120000ms exceeded`
- **Root Cause**: 
  - VietTTS backend is not running
  - OR backend is overloaded/slow
  - OR request format is incorrect for VietTTS API
- **Fix**: 
  - Verify VietTTS backend is running: `curl http://127.0.0.1:11111/health`
  - Check if the request format matches VietTTS API (should be `{text, voice, speed}`, not `{text, model, voice, store, expiry_hours}`)

### 3. **Chapter Generation Stops Early**
- **Issue**: Chapter 1 only has 17 paragraphs generated (should have more)
- **Error**: Failed at paragraph 20 with timeout error
- **Root Cause**: TTS backend timeout caused the generation to fail
- **Current Behavior**: Worker catches error, marks paragraph as failed, continues to next paragraph
- **Problem**: When backend is down, all paragraphs fail, making the chapter incomplete

### 4. **Next Chapter Not Processed**
- **Issue**: Chapter 2 has no audio files (only metadata from role detection)
- **Root Cause**: Either:
  - The batch generation stopped after Chapter 1 failures
  - OR Chapter 2 generation was never started
- **Current Behavior**: Worker processes each chapter sequentially in `generateBatchAudio`, so if Chapter 1 has many failures, it might stop the batch

## Code Issues

### 1. **Request Body Format for VietTTS**
The VietTTS API expects:
```json
{
  "text": "...",
  "voice": "quynh",
  "speed": 1.0
}
```

But current code might be sending:
```json
{
  "text": "...",
  "model": "viettts",  // ❌ VietTTS doesn't need this
  "voice": "quynh",
  "speed": 1.0,
  "store": true,  // ❌ Not needed
  "expiry_hours": 2,  // ❌ Not needed
  "return_audio": false  // ❌ Not needed
}
```

### 2. **Error Handling in Worker**
Current behavior:
- Worker catches errors and continues to next paragraph ✅
- But doesn't retry or stop on consecutive failures ❌
- Chapter marked as "success" if at least one paragraph succeeded ❌

This means:
- If backend is down, all paragraphs fail
- Worker marks chapter as "failed" but continues to next chapter
- Next chapter also fails, causing a cascade

## Recommended Fixes

### 1. **Verify VietTTS Backend is Running**
```powershell
# Check if backend is running
curl http://127.0.0.1:11111/health

# If not running, start it
cd tts\dangvansam-VietTTS-backend
.\start_backend.ps1
```

### 2. **Fix Request Body Format**
The code already has the correct format in `ttsService.js` (lines 77-84), but we need to verify it's being used correctly.

### 3. **Add Better Error Handling**
- Add retry logic for transient failures
- Stop batch processing if too many consecutive failures (e.g., 5 in a row)
- Log better error messages

### 4. **Restart Backend Server**
After code changes, restart the backend to load the new code:
```powershell
cd novel-app\backend
python restart_backend.py
# or
.\restart_servers.ps1
```

## Next Steps

1. **Check VietTTS backend status**: `curl http://127.0.0.1:11111/health`
2. **Restart backend** to load the new code changes
3. **Test with a single paragraph** to verify the API format works
4. **Add retry logic** for transient failures
5. **Improve error messages** to distinguish between backend-down vs other errors

