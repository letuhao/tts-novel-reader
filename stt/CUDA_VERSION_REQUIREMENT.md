# CUDA Version Requirement for STT Backend

## Issue

faster-whisper (CTranslate2) requires **CUDA 12.x** runtime libraries, specifically:
- `cublas64_12.dll`
- Other CUDA 12.x DLLs

## Current Setup

You have:
- ✅ CUDA 11.8 installed (has `cublas64_11.dll`)
- ✅ CUDA 13.0 installed
- ❌ CUDA 12.x **NOT installed**

## Solutions

### Option 1: Install CUDA 12.x Toolkit (Recommended for GPU)

1. Download CUDA 12.x Toolkit:
   - Visit: https://developer.nvidia.com/cuda-downloads
   - Select: Windows → x86_64 → 10/11 → exe (local)
   - Download CUDA 12.1 or 12.4 (recommended)

2. Install CUDA 12.x:
   - Run the installer
   - It will install alongside your existing CUDA versions
   - Default path: `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.x\`

3. Restart the STT backend:
   ```powershell
   cd D:\Works\source\novel-reader\stt
   python main.py
   ```

The code will automatically detect and use CUDA 12.x.

### Option 2: Use CPU Mode (Works Now, But Slower)

If you don't want to install CUDA 12.x, use CPU mode:

```powershell
cd D:\Works\source\novel-reader\stt
$env:STT_DEVICE="cpu"
$env:STT_COMPUTE_TYPE="int8"
python main.py
```

**Performance:**
- GPU (CUDA 12.x): ~50-100ms per second of audio
- CPU: ~1-2 seconds per second of audio

### Option 3: Check CUDA 13.0 Compatibility

CUDA 13.0 might have backward compatibility. Check if it has `cublas64_12.dll`:

```powershell
Get-ChildItem "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.0\bin" -Filter "*12*.dll"
```

If it exists, the code should automatically use it.

## Verification

After installing CUDA 12.x, verify:

```powershell
Test-Path "C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\bin\cublas64_12.dll"
# Should return: True
```

## Notes

- Multiple CUDA versions can coexist
- The code automatically detects and uses the correct version
- cuDNN v9.16 is already properly configured
- Only CUDA runtime DLLs are missing

