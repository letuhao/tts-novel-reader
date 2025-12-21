# ✅ STT Backend Service Running!

The STT backend service has been successfully set up and is now running.

## Service Status

✅ **Status:** Running  
✅ **Port:** 11210  
✅ **Model:** faster-whisper-large-v3  
✅ **Health:** Healthy

## Service URLs

- **Health Check:** http://localhost:11210/health
- **API Documentation:** http://localhost:11210/docs
- **Root Endpoint:** http://localhost:11210/
- **Transcribe Endpoint:** POST http://localhost:11210/api/stt/transcribe

## Test the Service

### Health Check
```powershell
Invoke-RestMethod -Uri http://localhost:11210/health
```

### Root Endpoint
```powershell
Invoke-RestMethod -Uri http://localhost:11210/
```

### Transcribe Audio (Example)
```powershell
# With an audio file
$formData = @{
    audio = Get-Item "path\to\audio.wav"
}
Invoke-RestMethod -Uri "http://localhost:11210/api/stt/transcribe?language=en" -Method Post -Form $formData
```

### Using curl
```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=en&vad_filter=true" \
  -F "audio=@test_audio.wav"
```

## Available Endpoints

1. **GET /health** - Health check endpoint
2. **GET /** - Root endpoint with service information
3. **POST /api/stt/transcribe** - Transcribe audio file
   - Parameters:
     - `audio`: Audio file (multipart/form-data)
     - `language`: Language code (e.g., "en", "auto")
     - `task`: "transcribe" or "translate"
     - `beam_size`: Beam size (1-20, default: 5)
     - `vad_filter`: Enable VAD (default: true)
     - `return_timestamps`: Return timestamps (default: true)
     - `word_timestamps`: Word-level timestamps (default: false)

4. **POST /api/stt/transcribe/json** - Alternative endpoint with JSON body

## Configuration

- **Device:** CUDA (GPU acceleration)
- **Compute Type:** FP16 (float16)
- **Default Language:** English (en)
- **Model Path:** `../models/faster-whisper-large-v3/`

## Performance

On RTX 4090:
- **Expected Latency:** 50-100ms per second of audio
- **Real-time Factor:** 0.05-0.1x (10-20x faster than real-time)
- **VRAM Usage:** ~6-8GB

## Stopping the Service

**Option 1: PowerShell script**
```powershell
cd D:\Works\source\novel-reader\stt
.\stop_backend.ps1
```

**Option 2: Manual**
```powershell
Get-NetTCPConnection -LocalPort 11210 | Stop-Process -Force
```

## Next Steps

1. ✅ STT backend is running
2. ⏳ Test transcription with an audio file
3. ⏳ Integrate with English Tutor backend (create `sttService.ts`)
4. ⏳ Test end-to-end flow

## Notes

- First transcription may be slower due to model loading
- Model is preloaded at startup for faster response
- Supports multiple audio formats: WAV, MP3, M4A, FLAC, OGG, etc.

---

**Service started successfully!** 🎉

