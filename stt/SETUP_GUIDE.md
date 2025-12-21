# STT Backend Setup Guide

Quick setup guide for the STT (Speech-to-Text) backend service.

## Prerequisites

1. **Python 3.8+** (Python 3.10+ recommended)
2. **CUDA-capable GPU** (recommended) - RTX 4090 or similar
3. **Existing Model:** `models/faster-whisper-large-v3/` must exist

## Quick Start

### 1. Install Dependencies

```bash
cd stt
pip install -r requirements.txt
```

### 2. Verify Model Exists

Check that the model is at the correct path:
```bash
# Should exist:
../models/faster-whisper-large-v3/model.bin
```

### 3. Start the Service

**Option A: Using Python script**
```bash
python main.py
```

**Option B: Using PowerShell script**
```powershell
.\start_backend.ps1
```

**Option C: Using uvicorn directly**
```bash
uvicorn main:app --host 0.0.0.0 --port 11210
```

### 4. Verify Service is Running

Visit:
- **Health Check:** http://localhost:11210/health
- **API Docs:** http://localhost:11210/docs
- **Root:** http://localhost:11210/

Or use PowerShell:
```powershell
.\test_api.ps1
```

## Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```env
# Device configuration
STT_DEVICE=cuda              # cuda, cpu, auto
STT_COMPUTE_TYPE=float16     # float16, int8_float16, int8
STT_LANGUAGE=en              # Default language code

# API configuration
STT_API_HOST=0.0.0.0         # API host
STT_API_PORT=11210           # API port

# Performance
STT_NUM_WORKERS=4            # CPU workers for preprocessing

# Logging
STT_LOG_LEVEL=info           # debug, info, warning, error
```

### Default Configuration

- **Device:** `cuda` (auto-detects GPU)
- **Compute Type:** `float16` (FP16 for best balance)
- **Language:** `en` (English)
- **Port:** `11210`
- **Workers:** `4` CPU workers

## Testing

### Health Check

```bash
curl http://localhost:11210/health
```

### Transcribe Audio File

```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=en" \
  -F "audio=@test_audio.wav"
```

### With PowerShell

```powershell
$audioFile = "path\to\your\audio.wav"
$formData = @{
    audio = Get-Item $audioFile
}
Invoke-RestMethod -Uri "http://localhost:11210/api/stt/transcribe?language=en" -Method Post -Form $formData
```

## Performance Tips

### For RTX 4090 (Recommended)

```env
STT_DEVICE=cuda
STT_COMPUTE_TYPE=float16     # Best accuracy/speed balance
STT_NUM_WORKERS=4
```

### For Lower VRAM

```env
STT_DEVICE=cuda
STT_COMPUTE_TYPE=int8_float16  # Lower memory, slightly less accurate
STT_NUM_WORKERS=2
```

### For CPU Only (Slower)

```env
STT_DEVICE=cpu
STT_COMPUTE_TYPE=int8         # Use INT8 for CPU
STT_NUM_WORKERS=4
```

## Troubleshooting

### Model Not Found

**Error:** `FileNotFoundError: Model path does not exist`

**Solution:**
1. Verify model exists at `../models/faster-whisper-large-v3/`
2. Check `model.bin` file is present (~2.9 GB)
3. Ensure correct relative path from `stt/` directory

### CUDA Out of Memory

**Error:** `CUDA out of memory`

**Solution:**
1. Use `STT_COMPUTE_TYPE=int8_float16` for lower memory
2. Close other GPU applications
3. Use CPU mode if needed: `STT_DEVICE=cpu`

### Slow Performance

**If using GPU:**
- Ensure CUDA is properly installed
- Check GPU is being used: Monitor with `nvidia-smi`
- Verify `STT_DEVICE=cuda`

**If using CPU:**
- CPU is much slower (expect 10-30x slower)
- Consider using GPU if available

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'faster_whisper'`

**Solution:**
```bash
pip install faster-whisper
# Or reinstall all dependencies
pip install -r requirements.txt
```

## Stopping the Service

**Option A: PowerShell script**
```powershell
.\stop_backend.ps1
```

**Option B: Manual (find and kill process on port 11210)**
```powershell
Get-NetTCPConnection -LocalPort 11210 | Stop-Process -Force
```

## Next Steps

1. ✅ STT backend is ready
2. ⏳ Integrate with English Tutor backend (create `sttService.ts`)
3. ⏳ Test end-to-end transcription flow
4. ⏳ Add streaming support (future enhancement)

## Integration with English Tutor App

The STT backend is configured to work with the English Tutor app:
- **Port:** 11210 (matches system settings)
- **URL:** http://127.0.0.1:11210
- **Integration:** See `english-tutor-app/backend/src/services/stt/` (to be created)

## References

- [faster-whisper Documentation](https://github.com/guillaumekln/faster-whisper)
- [Whisper Large V3 Model](https://huggingface.co/openai/whisper-large-v3)
- [API Documentation](http://localhost:11210/docs) (when service is running)

