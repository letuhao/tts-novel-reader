# Installation Guide

Detailed installation instructions for the STT backend service.

## Prerequisites

### Required

- **Python 3.8+** (Python 3.10+ recommended)
- **CUDA-capable GPU** (recommended) - RTX 4090 or similar
- **Existing Model:** `models/faster-whisper-large-v3/` must exist

### Optional

- **CUDA Toolkit** (for GPU acceleration)
- **Virtual Environment** (recommended for isolation)

## Step-by-Step Installation

### Step 1: Verify Model Exists

Check that the faster-whisper model exists:

```bash
# From project root
ls models/faster-whisper-large-v3/model.bin
```

The model should be approximately 2.9 GB in size.

### Step 2: Navigate to STT Directory

```bash
cd stt
```

### Step 3: Create Virtual Environment (Recommended)

**Windows:**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**Linux/Mac:**
```bash
python -m venv .venv
source .venv/bin/activate
```

### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- `faster-whisper` - Optimized Whisper implementation
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic` - Data validation
- And other dependencies

### Step 5: Verify Installation

```bash
python verify_setup.py
```

This will check:
- ✅ All required files exist
- ✅ Model is present
- ✅ Dependencies are installed

## CUDA Setup (For GPU Acceleration)

### Windows

1. **Install CUDA Toolkit:**
   - Download from [NVIDIA CUDA Toolkit](https://developer.nvidia.com/cuda-downloads)
   - Install version 11.8 or 12.x

2. **Verify CUDA:**
   ```powershell
   nvidia-smi
   ```

3. **Install PyTorch with CUDA:**
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```

### Linux

1. **Install CUDA:**
   ```bash
   sudo apt-get update
   sudo apt-get install nvidia-cuda-toolkit
   ```

2. **Verify CUDA:**
   ```bash
   nvidia-smi
   ```

## Configuration

### Environment Variables

Create a `.env` file in the `stt/` directory (optional):

```env
STT_DEVICE=cuda
STT_COMPUTE_TYPE=float16
STT_LANGUAGE=en
STT_API_HOST=0.0.0.0
STT_API_PORT=11210
STT_NUM_WORKERS=4
STT_LOG_LEVEL=info
```

## Testing Installation

### 1. Start the Service

```bash
python main.py
```

### 2. Test Health Endpoint

```bash
curl http://localhost:11210/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "STT Backend",
  "version": "1.0.0",
  "model": "faster-whisper-large-v3"
}
```

### 3. Test Transcription (if you have an audio file)

```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=en" \
  -F "audio=@test_audio.wav"
```

## Troubleshooting

### Model Not Found

**Error:** `FileNotFoundError: Model path does not exist`

**Solution:**
1. Verify model exists: `ls models/faster-whisper-large-v3/model.bin`
2. Check path in `stt_backend/config.py`
3. Ensure you're running from the correct directory

### CUDA Not Available

**Error:** `CUDA not available` or `Device not found`

**Solution:**
1. Verify GPU: `nvidia-smi`
2. Install CUDA Toolkit
3. Use CPU mode: Set `STT_DEVICE=cpu`

### Import Errors

**Error:** `ModuleNotFoundError: No module named 'faster_whisper'`

**Solution:**
```bash
pip install faster-whisper
# Or reinstall all dependencies
pip install -r requirements.txt
```

### Out of Memory

**Error:** `CUDA out of memory`

**Solution:**
1. Use INT8 quantization: `STT_COMPUTE_TYPE=int8_float16`
2. Close other GPU applications
3. Use CPU mode: `STT_DEVICE=cpu`

## Verification Checklist

- [ ] Python 3.8+ installed
- [ ] Model exists at `models/faster-whisper-large-v3/`
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] CUDA available (if using GPU)
- [ ] Service starts without errors
- [ ] Health endpoint returns 200
- [ ] Can transcribe a test audio file

## Next Steps

After installation:
1. Read [Quick Start Guide](./QUICK_START.md)
2. Check [Configuration Guide](./CONFIGURATION.md)
3. Review [API Reference](./API_REFERENCE.md)

---

**Installation complete!** 🎉

