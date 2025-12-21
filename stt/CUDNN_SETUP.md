# cuDNN Setup for STT Backend

## Issue

faster-whisper (which uses CTranslate2) requires cuDNN DLLs to be accessible. Error:
```
Could not locate cudnn_ops64_9.dll. Please make sure it is in your library path!
```

## Solution

The `start_backend.ps1` script automatically adds cuDNN to PATH before starting the backend.

### Automatic Setup (Recommended)

Just use the startup script - it handles cuDNN PATH automatically:

```powershell
cd D:\Works\source\novel-reader\stt
.\start_backend.ps1
```

### Manual Setup

If you need to set PATH manually:

```powershell
# For cuDNN v9.16 (recommended for faster-whisper)
$env:PATH = "C:\Program Files\NVIDIA\CUDNN\v9.16\bin;$env:PATH"

# Or for cuDNN v8.9.7.29 (fallback)
$env:PATH = "C:\Program Files\NVIDIA\CUDNN\v8.9.7.29\bin;$env:PATH"

# Then start backend
python main.py
```

### Permanent Setup (System PATH)

To make cuDNN available system-wide:

1. Open "Environment Variables" (Win + R → `sysdm.cpl` → Advanced → Environment Variables)
2. Edit "Path" system variable
3. Add: `C:\Program Files\NVIDIA\CUDNN\v9.16\bin`
4. Restart terminal/backend

## Verification

After starting the backend, check the logs. You should see:
- ✅ Model loaded successfully on CUDA
- ✅ No cuDNN errors

If you still see cuDNN errors, verify:
1. cuDNN is installed at the expected location
2. The `bin` directory contains `cudnn_ops64_9.dll` (or similar)
3. PATH includes the cuDNN bin directory

## Requirements

- **cuDNN v9.16** (recommended) - for latest faster-whisper
- **cuDNN v8.9.7.29** (fallback) - older but may work

Both are detected automatically by `start_backend.ps1`.

