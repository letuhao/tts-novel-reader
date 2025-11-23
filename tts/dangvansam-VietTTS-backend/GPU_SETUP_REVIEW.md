# GPU Setup Review for VietTTS Backend
# Đánh giá Thiết lập GPU cho VietTTS Backend

## 📋 Current Issues / Vấn đề Hiện tại

1. **NumPy 2.x Incompatibility**: `onnxruntime==1.16.0` was compiled with NumPy 1.x, causing `AttributeError: _ARRAY_API not found` when using NumPy 2.2.6
2. **Wrong ONNX Runtime Version**: Using CPU version (`onnxruntime`) instead of GPU version (`onnxruntime-gpu`)
3. **Installation Order**: NumPy must be installed BEFORE `onnxruntime-gpu` to ensure compatibility

## ✅ Solution / Giải pháp

### 1. Use GPU Version (Matches Original viet-tts)
The original `viet-tts` repository uses `onnxruntime-gpu==1.16.0` in `pyproject.toml`:
```toml
onnxruntime-gpu = "1.16.0"
```

### 2. Fix NumPy Version
- **Requirement**: `numpy>=1.21.6,<2.0.0`
- **Reason**: `onnxruntime-gpu==1.16.0` was compiled with NumPy 1.x and is incompatible with NumPy 2.x
- **Installation Order**: Install NumPy FIRST, then `onnxruntime-gpu`

### 3. Updated Requirements
```txt
numpy>=1.21.6,<2.0.0  # Must be <2.0.0 for onnxruntime 1.16.0 compatibility
onnxruntime-gpu==1.16.0  # GPU version for NVIDIA GPU support
```

## 🔧 Setup Steps / Các bước Thiết lập

### Automatic Setup (Recommended)
```powershell
.\setup_gpu.ps1
```

### Manual Setup
```powershell
# 1. Stop backend
# Ctrl+C in backend terminal

# 2. Uninstall existing ONNX Runtime
.\.venv\Scripts\python.exe -m pip uninstall onnxruntime onnxruntime-gpu -y

# 3. Install NumPy <2.0.0 FIRST
.\.venv\Scripts\python.exe -m pip install "numpy>=1.21.6,<2.0.0" --force-reinstall

# 4. Install onnxruntime-gpu
.\.venv\Scripts\python.exe -m pip install onnxruntime-gpu==1.16.0

# 5. Verify
.\.venv\Scripts\python.exe -c "import onnxruntime; print(onnxruntime.__version__); print(onnxruntime.get_available_providers())"

# 6. Restart backend
.\run.ps1
```

## 🎯 Expected Results / Kết quả Mong đợi

### Successful GPU Setup:
```
Version: 1.16.0
Providers: ['CUDAExecutionProvider', 'TensorrtExecutionProvider', 'CPUExecutionProvider']
```

### CPU Fallback (if CUDA not available):
```
Version: 1.16.0
Providers: ['CPUExecutionProvider']
```

## ⚠️ Troubleshooting / Khắc phục Sự cố

### Issue: WinError 193
**Cause**: Architecture mismatch or CUDA/cuDNN incompatibility

**Solutions**:
1. Verify CUDA installation:
   ```powershell
   nvcc --version
   ```
2. Check CUDA_PATH environment variable:
   ```powershell
   $env:CUDA_PATH
   ```
3. Ensure CUDA/cuDNN versions are compatible with `onnxruntime-gpu==1.16.0`
4. Try reinstalling with `--no-cache-dir` flag

### Issue: NumPy Compatibility Error
**Cause**: NumPy 2.x installed before onnxruntime-gpu

**Solution**: 
1. Uninstall both: `pip uninstall numpy onnxruntime-gpu -y`
2. Install NumPy <2.0.0 FIRST: `pip install "numpy>=1.21.6,<2.0.0"`
3. Then install onnxruntime-gpu: `pip install onnxruntime-gpu==1.16.0`

### Issue: CUDAExecutionProvider not available
**Cause**: CUDA not properly configured or incompatible versions

**Solutions**:
1. Verify PyTorch CUDA support:
   ```python
   import torch
   print(torch.cuda.is_available())
   ```
2. Check CUDA/cuDNN versions match ONNX Runtime requirements
3. CPU will still work, but slower

## 📚 References / Tài liệu Tham khảo

- [ONNX Runtime GPU Support](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html)
- [ONNX Runtime Compatibility](https://faxu.github.io/onnxruntime/docs/reference/compatibility.html)
- [Original viet-tts pyproject.toml](https://github.com/dangvansam/viet-tts/blob/main/pyproject.toml)

## ✅ Verification Checklist / Danh sách Kiểm tra

- [ ] NumPy <2.0.0 installed
- [ ] `onnxruntime-gpu==1.16.0` installed
- [ ] No NumPy compatibility errors
- [ ] ONNX Runtime imports successfully
- [ ] CUDAExecutionProvider available (if GPU present)
- [ ] Backend starts without errors
- [ ] TTS synthesis works

