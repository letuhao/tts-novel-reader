# LLM Parser Troubleshooting Guide

## Issue: Parser Still Using Old Regex Parser

If you upload a new novel but it's still using the old regex parser instead of LLM structure detection, check the following:

## Checklist / Danh sách Kiểm tra

### 1. **Frontend is Sending LLM Options** / Frontend Đang Gửi Tùy chọn LLM

✅ **Fixed**: The frontend now sends `useLLMStructureDetection` and `language` in FormData.

**Check:**
- Open browser DevTools → Network tab
- Upload a novel
- Check the request payload
- Should see: `useLLMStructureDetection: "true"` and `language: "auto"`

### 2. **Backend is Receiving Options** / Backend Đang Nhận Tùy chọn

✅ **Fixed**: Added logging to show received options.

**Check logs:**
```bash
# Look for these log messages:
[Novels Route] 📤 Upload request - useLLM: true, language: auto
[Novels Route] 📤 Request body keys: novel, useLLMStructureDetection, language
```

### 3. **Ollama is Running** / Ollama Đang Chạy

**Check:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Should return list of available models
```

**If not running:**
```bash
# Start Ollama (if installed)
ollama serve

# Or check if it's running on different port
# Check OLLAMA_BASE_URL environment variable
```

### 4. **Ollama Model is Available** / Model Ollama Có sẵn

**Check:**
```bash
# List available models
ollama list

# Should see: qwen3:8b (or your configured model)
```

**If model not available:**
```bash
# Pull the model
ollama pull qwen3:8b
```

### 5. **Check Backend Logs** / Kiểm tra Log Backend

Look for these log messages in `novel-app/backend/logs/backend_output.log`:

**✅ LLM is being used:**
```
[NovelParser] Using LLM structure detection...
[NovelParser] ✅ LLM structure detection service is available
[NovelParser] ✅ LLM detected X structure markers
```

**❌ LLM is not available (fallback to regex):**
```
[NovelParser] ⚠️ LLM structure detection not available (Ollama not running or model not available)
[NovelParser] ⚠️ Falling back to regex-based parsing
```

**❌ LLM returned no markers (fallback to regex):**
```
[NovelParser] ⚠️ No structure markers detected by LLM, falling back to regex parser
```

## Common Issues / Các Vấn đề Thường gặp

### Issue 1: Ollama Not Running
**Symptoms:**
- Logs show: "LLM structure detection not available"
- Falls back to regex parser

**Solution:**
1. Start Ollama: `ollama serve`
2. Verify it's running: `curl http://localhost:11434/api/tags`
3. Restart the backend

### Issue 2: Model Not Available
**Symptoms:**
- Logs show: "LLM structure detection not available"
- Ollama is running but model not found

**Solution:**
1. Pull the model: `ollama pull qwen3:8b`
2. Verify: `ollama list`
3. Restart the backend

### Issue 3: LLM Returns No Markers
**Symptoms:**
- Logs show: "LLM detected 0 structure markers"
- Falls back to regex parser

**Possible Causes:**
- Novel has no clear structure markers
- LLM prompt needs adjustment
- Novel format is unusual

**Solution:**
- Check the novel file format
- Try with a different novel that has clear chapter markers
- Check LLM response in logs

### Issue 4: Frontend Not Sending Options
**Symptoms:**
- Backend logs show: `useLLM: false` or missing options

**Solution:**
- ✅ **Fixed**: Frontend now sends options by default
- Clear browser cache and reload
- Check browser DevTools Network tab

## Debugging Steps / Các Bước Gỡ lỗi

### Step 1: Check Backend Logs
```bash
# Watch backend logs in real-time
tail -f novel-app/backend/logs/backend_output.log

# Or check recent logs
tail -n 100 novel-app/backend/logs/backend_output.log | grep -i "llm\|parser\|structure"
```

### Step 2: Test Ollama Directly
```bash
# Test Ollama API
curl http://localhost:11434/api/tags

# Test with a simple prompt
curl http://localhost:11434/api/generate -d '{
  "model": "qwen3:8b",
  "prompt": "Hello",
  "stream": false
}'
```

### Step 3: Test LLM Structure Detection Service
```bash
# Create a test script
cd novel-app/backend
node -e "
import('./src/services/novelStructureDetectionService.js').then(async (module) => {
  const service = module.getNovelStructureDetectionService();
  const available = await service.isAvailable();
  console.log('LLM Available:', available);
  
  if (available) {
    const testContent = 'PROLOGUE\nPrologue text.\n\nChapter 1\nChapter 1 text.';
    const result = await service.detectStructure(testContent, { language: 'en' });
    console.log('Structure Index:', JSON.stringify(result, null, 2));
  }
});
"
```

### Step 4: Check Frontend Request
1. Open browser DevTools (F12)
2. Go to Network tab
3. Upload a novel
4. Find the `/api/novels/upload` request
5. Check:
   - Request payload (FormData)
   - Should include: `useLLMStructureDetection: "true"`, `language: "auto"`

## Expected Behavior / Hành vi Mong đợi

### When LLM is Available / Khi LLM Có sẵn

1. **Upload novel** → Frontend sends FormData with `useLLMStructureDetection: "true"`
2. **Backend receives** → Logs show: `useLLM: true, language: auto`
3. **Parser checks** → Logs show: `✅ LLM structure detection service is available`
4. **LLM analyzes** → Logs show: `✅ LLM detected X structure markers`
5. **Chapters created** → Logs show: `📚 Parsed X chapters`

### When LLM is Not Available / Khi LLM Không có sẵn

1. **Upload novel** → Frontend sends FormData with `useLLMStructureDetection: "true"`
2. **Backend receives** → Logs show: `useLLM: true, language: auto`
3. **Parser checks** → Logs show: `⚠️ LLM structure detection not available`
4. **Falls back** → Logs show: `⚠️ Falling back to regex-based parsing`
5. **Regex parses** → Logs show: `📚 Parsed X chapters` (using regex)

## Force LLM Usage / Ép Sử dụng LLM

If you want to force LLM usage (even if it fails), you can:

1. **Check Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Check model is available:**
   ```bash
   ollama list | grep qwen3:8b
   ```

3. **Restart backend:**
   ```bash
   cd novel-app/backend
   python stop_backend.py
   python start_backend.py
   ```

4. **Upload novel again** - Should now use LLM

## Force Regex Parser / Ép Sử dụng Regex Parser

If you want to disable LLM and use regex parser:

**Option 1: Frontend (temporary)**
- Modify `novel-app/frontend/src/services/novels.ts`
- Change: `formData.append('useLLMStructureDetection', 'false')`

**Option 2: Backend (permanent)**
- Modify `novel-app/backend/src/routes/novels.js`
- Change: `const useLLM = false;` (hardcode)

## Verification / Xác minh

After uploading a novel, check the logs:

**✅ LLM was used:**
```
[NovelParser] Using LLM structure detection...
[NovelParser] ✅ LLM structure detection service is available
[NovelParser] ✅ LLM detected X structure markers
[NovelParser] 📚 Parsed X chapters
```

**❌ Regex was used:**
```
[NovelParser] ⚠️ LLM structure detection not available
[NovelParser] ⚠️ Falling back to regex-based parsing
[NovelParser] 📚 Parsed X chapters
```

---

**Status**: ✅ Frontend and Backend Updated  
**Date**: 2024-12-19

