# Quick Start Guide

Get the STT backend up and running in minutes.

## Prerequisites

- Python 3.8+ (3.10+ recommended)
- CUDA-capable GPU (recommended) - RTX 4090 or similar
- Existing model at `models/faster-whisper-large-v3/`

## Installation

1. **Navigate to STT directory:**
   ```bash
   cd stt
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Verify setup:**
   ```bash
   python verify_setup.py
   ```

## Starting the Service

### Option 1: PowerShell Script (Recommended)
```powershell
.\start_backend.ps1
```

### Option 2: Python Script
```bash
python main.py
```

### Option 3: Uvicorn Directly
```bash
uvicorn main:app --host 0.0.0.0 --port 11210
```

## Verify Service is Running

1. **Health Check:**
   ```powershell
   Invoke-RestMethod -Uri http://localhost:11210/health
   ```

2. **Open API Docs:**
   - Browser: http://localhost:11210/docs
   - Interactive Swagger UI for testing

## Quick Test

### Transcribe an Audio File

**Using PowerShell:**
```powershell
$formData = @{
    audio = Get-Item "path\to\your\audio.wav"
}
$result = Invoke-RestMethod -Uri "http://localhost:11210/api/stt/transcribe?language=en" -Method Post -Form $formData
$result.data.text
```

**Using curl:**
```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=en" \
  -F "audio=@test_audio.wav"
```

**Using Python:**
```python
import requests

with open("test_audio.wav", "rb") as f:
    files = {"audio": f}
    response = requests.post(
        "http://localhost:11210/api/stt/transcribe",
        files=files,
        params={"language": "en"}
    )
    result = response.json()
    print(result["data"]["text"])
```

## Expected Response

```json
{
  "success": true,
  "data": {
    "text": "Hello, this is a test transcription.",
    "language": "en",
    "language_probability": 0.99,
    "segments": [
      {
        "text": "Hello, this is a test transcription.",
        "start": 0.0,
        "end": 3.5
      }
    ]
  }
}
```

## Stopping the Service

**Option 1: PowerShell Script**
```powershell
.\stop_backend.ps1
```

**Option 2: Manual**
```powershell
Get-NetTCPConnection -LocalPort 11210 | Stop-Process -Force
```

## Next Steps

- Read [API Reference](./API_REFERENCE.md) for detailed endpoint documentation
- Check [Configuration Guide](./CONFIGURATION.md) for customization options
- See [Integration Guide](./INTEGRATION.md) for integrating with other services

---

**That's it!** Your STT backend is ready to use. 🎉

