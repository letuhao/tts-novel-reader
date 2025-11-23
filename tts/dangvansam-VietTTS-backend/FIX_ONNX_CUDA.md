# Fix ONNX Runtime CUDA Provider
# Sửa ONNX Runtime CUDA Provider

## Problem / Vấn đề

ONNX Runtime is falling back to CPU instead of using GPU:
```
⚠️  CUDAExecutionProvider requested but not used, falling back to CPU
⚠️  CUDAExecutionProvider failed (CUDA provider not active), falling back to CPU
```

This causes **3-7s delay per request** because:
- Speech tokenizer (ONNX) runs on CPU
- Speech embedding (ONNX) runs on CPU
- Called for every text chunk during inference

## Solution / Giải pháp

### Option 1: Install onnxruntime-gpu / Cài đặt onnxruntime-gpu

Check current installation:
```bash
pip list | findstr onnxruntime
```

If you see `onnxruntime` (CPU-only), uninstall and install GPU version:
```bash
pip uninstall onnxruntime
pip install onnxruntime-gpu
```

**Note:** Must match CUDA version (CUDA 11.8 for this setup)

### Option 2: Check CUDA DLL Path / Kiểm tra Đường dẫn CUDA DLL

ONNX Runtime CUDA provider needs CUDA DLLs in PATH or same directory.

Check CUDA installation:
```bash
where cudart64_*.dll
```

If not found, add CUDA bin directory to PATH:
```bash
# Example: C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin
```

### Option 3: Verify Provider Availability / Xác minh Provider Có sẵn

Check what providers are available:
```python
import onnxruntime as ort
print(ort.get_available_providers())
```

Should show: `['CUDAExecutionProvider', 'CPUExecutionProvider', ...]`

If CUDAExecutionProvider is missing, ONNX Runtime GPU is not installed correctly.

## Current Status / Trạng thái Hiện tại

From logs:
```
⚠️  ONNX Runtime CUDA: Not available (Providers: ['AzureExecutionProvider', 'CPUExecutionProvider'])
```

**ONNX Runtime CUDA is NOT installed!** Only Azure and CPU providers are available.

## Next Steps / Bước Tiếp theo

1. Check if `onnxruntime-gpu` is installed
2. If not, install it (matching CUDA version)
3. Restart backend and check logs again

