# CUDA/cuDNN Setup Review / Đánh giá Cài đặt CUDA/cuDNN

## Current Issue / Vấn đề Hiện tại

ONNX Runtime CUDA provider cannot find `cublasLt64_12.dll`:

```
Error loading "onnxruntime_providers_cuda.dll" which depends on 
"cublasLt64_12.dll" which is missing.
```

## Your Setup / Cài đặt Của Bạn

✅ **cuDNN v9.16** installed at: `C:\Program Files\NVIDIA\CUDNN\v9.16`

✅ **CUDA v12.9** installed at: `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9`

✅ **CUDA v13.0** installed at: `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.0`

❌ **PATH** currently has:
- CUDA v13.0\bin (✅)
- But NOT CUDA v12.9\bin (❌)
- And NOT cuDNN v9.16\bin (❌)

## Problem Analysis / Phân tích Vấn đề

1. **ONNX Runtime 1.23.2** requires:
   - CUDA 12.x
   - cuDNN 9.x
   - `cublasLt64_12.dll` (CUDA 12 library)

2. **VietTTS specifies** `onnxruntime-gpu = 1.16.0` in `pyproject.toml`
   - More flexible (CUDA 11.x/12.x, cuDNN 8.x)
   - Was working before

3. **Version mismatch**:
   - Installed: `onnxruntime-gpu 1.23.2` (requires CUDA 12.x strict)
   - Expected: `onnxruntime-gpu 1.16.0` (more flexible)

## Solutions / Giải pháp

### Option 1: Downgrade ONNX Runtime (RECOMMENDED) ⭐

Match VietTTS specification:

```powershell
cd D:\Works\source\novel-reader\tts\dangvansam-VietTTS-backend
.venv\Scripts\python.exe -m pip install "onnxruntime-gpu==1.16.0" --force-reinstall --no-cache-dir
```

**Pros:**
- ✅ Matches VietTTS specification
- ✅ More flexible CUDA compatibility
- ✅ Was working before we upgraded
- ✅ No PATH changes needed (uses CUDA v13.0 in PATH)

**Cons:**
- ⚠️ Older version (but stable and tested)

### Option 2: Fix PATH for ONNX Runtime 1.23.2

Add to system PATH:
- `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin`
- `C:\Program Files\NVIDIA\CUDNN\v9.16\bin`

**How to add:**
1. Open "Environment Variables" in Windows
2. Edit "Path" system variable
3. Add both directories above
4. Restart terminal/backend

**Pros:**
- ✅ Latest ONNX Runtime version
- ✅ Better performance potentially

**Cons:**
- ⚠️ More complex setup
- ⚠️ PATH conflicts possible (v12.9 vs v13.0)
- ⚠️ Need to verify DLL compatibility

### Option 3: Copy DLLs to ONNX Runtime location

Copy required DLLs directly to ONNX Runtime directory (quick fix, but not recommended for long-term).

## Recommendation / Khuyến nghị

**Use Option 1** - Downgrade to `onnxruntime-gpu 1.16.0`:
- Simpler
- Matches project specification
- Should work immediately
- No PATH changes needed

