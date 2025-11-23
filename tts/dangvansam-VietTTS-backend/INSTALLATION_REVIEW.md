# Installation Review: GPU Setup for VietTTS Backend
# Đánh giá Cài đặt: Thiết lập GPU cho VietTTS Backend

## 🔍 Current Status / Trạng thái Hiện tại

### Issues Found / Vấn đề Phát hiện:

1. **❌ Wrong ONNX Runtime**: Using CPU version (`onnxruntime`) instead of GPU version (`onnxruntime-gpu`)
2. **❌ NumPy 2.x Incompatibility**: `onnxruntime==1.16.0` was compiled with NumPy 1.x, causing:
   ```
   AttributeError: _ARRAY_API not found
   SystemError: <built-in function __import__> returned a result with an exception set
   ```
3. **⚠️ PyTorch CPU-only**: Current PyTorch is `2.0.1+cpu` (CPU-only build)
   - **Note**: This doesn't affect ONNX Runtime GPU, but PyTorch models will run on CPU
   - ONNX Runtime can still use GPU independently

## ✅ Fixes Applied / Sửa chữa Đã áp dụng

### 1. Updated `requirements.txt`:
```txt
# Before:
onnxruntime==1.16.0  # CPU version
numpy<2.0.0

# After:
onnxruntime-gpu==1.16.0  # GPU version (matches viet-tts pyproject.toml)
numpy>=1.21.6,<2.0.0  # Explicit version range for compatibility
```

### 2. Installation Order:
1. **First**: Install NumPy <2.0.0 (required for onnxruntime 1.16.0)
2. **Then**: Install onnxruntime-gpu==1.16.0

### 3. Created Setup Script:
- `setup_gpu.ps1`: Automated GPU setup script
- Handles installation order correctly
- Verifies CUDA availability

## 🚀 Installation Steps / Các bước Cài đặt

### Option 1: Automated Setup (Recommended)
```powershell
.\setup_gpu.ps1
```

### Option 2: Manual Setup
```powershell
# 1. Stop backend (Ctrl+C)

# 2. Uninstall existing packages
.\.venv\Scripts\python.exe -m pip uninstall onnxruntime onnxruntime-gpu numpy -y

# 3. Install NumPy FIRST (critical order!)
.\.venv\Scripts\python.exe -m pip install "numpy>=1.21.6,<2.0.0" --force-reinstall

# 4. Install onnxruntime-gpu
.\.venv\Scripts\python.exe -m pip install onnxruntime-gpu==1.16.0 --no-cache-dir

# 5. Verify installation
.\.venv\Scripts\python.exe -c "import onnxruntime; print('Version:', onnxruntime.__version__); print('Providers:', onnxruntime.get_available_providers())"

# 6. Restart backend
.\run.ps1
```

## 📊 Expected Results / Kết quả Mong đợi

### Successful GPU Setup:
```
Version: 1.16.0
Providers: ['CUDAExecutionProvider', 'TensorrtExecutionProvider', 'CPUExecutionProvider']
✅ GPU support enabled!
```

### CPU Fallback (if CUDA not available):
```
Version: 1.16.0
Providers: ['CPUExecutionProvider']
⚠️ GPU support not detected, but CPU will work
```

## ⚠️ Important Notes / Lưu Ý Quan trọng

### 1. NumPy Version Constraint
- **Must be <2.0.0**: `onnxruntime-gpu==1.16.0` was compiled with NumPy 1.x
- **Minimum 1.21.6**: Required by onnxruntime dependencies
- **Install FIRST**: Before installing onnxruntime-gpu

### 2. PyTorch CUDA Support
- Current: `torch==2.0.1+cpu` (CPU-only)
- **Note**: ONNX Runtime GPU works independently of PyTorch CUDA
- For full GPU acceleration, consider installing PyTorch with CUDA:
  ```powershell
  pip install torch==2.0.1+cu118 torchaudio==2.0.2+cu118 --index-url https://download.pytorch.org/whl/cu118
  ```
- But this is **optional** - ONNX Runtime can use GPU even if PyTorch uses CPU

### 3. CUDA Requirements
- NVIDIA GPU with CUDA support
- CUDA Toolkit installed
- cuDNN installed (if using TensorRT provider)
- `CUDA_PATH` environment variable set (usually automatic)

### 4. WinError 193 Prevention
- Use `--no-cache-dir` flag to avoid corrupted cache
- Ensure CUDA/cuDNN versions are compatible
- Install in correct order (NumPy first, then onnxruntime-gpu)

## 🔧 Troubleshooting / Khắc phục Sự cố

### Issue: NumPy Compatibility Error
**Symptoms**:
```
AttributeError: _ARRAY_API not found
SystemError: <built-in function __import__> returned a result with an exception set
```

**Solution**:
1. Uninstall both: `pip uninstall numpy onnxruntime-gpu -y`
2. Install NumPy <2.0.0 FIRST: `pip install "numpy>=1.21.6,<2.0.0"`
3. Then install onnxruntime-gpu: `pip install onnxruntime-gpu==1.16.0`

### Issue: WinError 193
**Symptoms**: `[WinError 193] %1 is not a valid Win32 application`

**Solutions**:
1. Check CUDA installation: `nvcc --version`
2. Verify CUDA_PATH: `$env:CUDA_PATH`
3. Reinstall with `--no-cache-dir` flag
4. Ensure correct architecture (64-bit Python, 64-bit CUDA)

### Issue: CUDAExecutionProvider not available
**Symptoms**: Only `CPUExecutionProvider` in providers list

**Solutions**:
1. Verify CUDA is installed: `nvcc --version`
2. Check CUDA/cuDNN compatibility with onnxruntime-gpu 1.16.0
3. CPU will still work, but slower
4. Check NVIDIA driver version

## ✅ Verification Checklist / Danh sách Kiểm tra

After installation, verify:

- [ ] NumPy version: `python -c "import numpy; print(numpy.__version__)"` → Should be 1.x (e.g., 1.26.4)
- [ ] ONNX Runtime imports: `python -c "import onnxruntime; print(onnxruntime.__version__)"` → Should be 1.16.0
- [ ] Providers available: `python -c "import onnxruntime; print(onnxruntime.get_available_providers())"` → Should include CUDAExecutionProvider if GPU available
- [ ] No NumPy errors when importing onnxruntime
- [ ] Backend starts without errors
- [ ] TTS synthesis works

## 📚 References / Tài liệu Tham khảo

- [Original viet-tts pyproject.toml](https://github.com/dangvansam/viet-tts/blob/main/pyproject.toml) - Uses `onnxruntime-gpu==1.16.0`
- [ONNX Runtime GPU Documentation](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html)
- [ONNX Runtime Compatibility](https://faxu.github.io/onnxruntime/docs/reference/compatibility.html)

## 🎯 Summary / Tóm tắt

**Key Changes**:
1. ✅ Changed from `onnxruntime` (CPU) to `onnxruntime-gpu` (GPU)
2. ✅ Fixed NumPy version constraint: `>=1.21.6,<2.0.0`
3. ✅ Created automated setup script: `setup_gpu.ps1`
4. ✅ Documented installation order (NumPy first, then onnxruntime-gpu)

**Next Steps**:
1. Run `.\setup_gpu.ps1` to install GPU version
2. Verify installation with checklist above
3. Restart backend: `.\run.ps1`
4. Test TTS synthesis

