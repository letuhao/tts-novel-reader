# Check TTS Backend Status
# Kiểm tra Trạng thái TTS Backend

## Quick Check with curl

### 1. Health Check
```bash
curl -X GET http://localhost:11111/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "TTS Backend"
}
```

### 2. Test Audio Generation
```bash
curl -X POST "http://localhost:11111/api/tts/synthesize" \
  -H "Content-Type: application/json" \
  -d '{"text":"[05] Xin chào","model":"dia","store":false,"return_audio":false}'
```

**Expected Response:**
```json
{
  "success": true,
  "request_id": "...",
  "file_id": "...",
  "message": "Audio generated successfully"
}
```

## If TTS Backend is NOT Running

### Start TTS Backend:
```bash
cd app
python start_backend.py
```

### Or use restart script:
```bash
cd app
python restart_backend.py
```

## Check Backend Logs

### View output log:
```bash
cd app
cat logs/backend_output.log
```

### View error log:
```bash
cd app
cat logs/backend_error.log
```

## Common Issues

1. **Port 11111 already in use:**
   - Stop existing backend: `cd app && python stop_backend.py`

2. **Dia TTS model not loaded:**
   - Check error logs for model loading errors
   - Verify model files exist in `tts/Dia-Finetuning-Vietnamese/`

3. **Audio enhancement functions error:**
   - Check if `ensure_audio_format`, `normalize_audio`, `trim_silence` are imported correctly
   - Verify numpy is installed: `pip install numpy`

