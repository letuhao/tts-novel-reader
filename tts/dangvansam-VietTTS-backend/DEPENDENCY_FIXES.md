# Dependency Fixes / Sửa Lỗi Phụ thuộc

## Issues Fixed / Vấn đề Đã Sửa

### 1. NumPy Version Incompatibility ✅
**Error:** 
```
A module that was compiled using NumPy 1.x cannot be run in NumPy 2.2.6
RuntimeError: Numpy is not available
```

**Cause / Nguyên nhân:**
- NumPy 2.2.6 was installed
- Project dependencies (onnxruntime-gpu 1.16.0, viet-tts) were compiled against NumPy 1.x
- NumPy 2.x has breaking API changes

**Fix / Giải pháp:**
- ✅ Downgraded NumPy from 2.2.6 to 1.26.4
- ✅ Fixed using `fix_numpy.ps1`

**Verification:**
```powershell
python -c "import numpy; print(numpy.__version__)"
# Should output: 1.26.4 (or another 1.x version)
```

---

### 2. ONNX Runtime SessionOptions Error ✅
**Error:**
```
AttributeError: module 'onnxruntime' has no attribute 'SessionOptions'
```

**Cause / Nguyên nhân:**
- `onnxruntime-gpu` version mismatch (1.23.2 installed, 1.16.0 required)
- Corrupted installation (invalid distribution "-nnxruntime")
- Missing or incomplete `SessionOptions` attribute

**Fix / Giải pháp:**
- ✅ Uninstalled corrupted onnxruntime packages
- ✅ Cleaned up corrupted distribution folders
- ✅ Reinstalled `onnxruntime-gpu==1.16.0`
- ✅ Reinstalled NumPy 1.x (onnxruntime-gpu tries to upgrade to 2.x)
- ✅ Fixed using `fix_onnxruntime_session.ps1`

**Verification:**
```powershell
python -c "import onnxruntime; print(onnxruntime.__version__); print(hasattr(onnxruntime, 'SessionOptions'))"
# Should output:
# 1.16.0
# True
```

---

## Fix Scripts / Script Sửa Lỗi

### `fix_numpy.ps1`
Fixes NumPy version incompatibility by:
1. Detecting NumPy 2.x
2. Uninstalling NumPy 2.x
3. Installing NumPy 1.26.4 (latest compatible 1.x)
4. Verifying installation

**Usage:**
```powershell
cd tts/dangvansam-VietTTS-backend
.\fix_numpy.ps1
```

---

### `fix_onnxruntime_session.ps1`
Fixes ONNX Runtime SessionOptions error by:
1. Checking current installation
2. Uninstalling all onnxruntime packages
3. Cleaning up corrupted distributions
4. Ensuring NumPy 1.x is installed
5. Installing onnxruntime-gpu==1.16.0
6. Reinstalling NumPy 1.x (if upgraded)
7. Verifying SessionOptions availability

**Usage:**
```powershell
cd tts/dangvansam-VietTTS-backend
.\fix_onnxruntime_session.ps1
```

**Note:** This script automatically reinstalls NumPy 1.x at the end because `onnxruntime-gpu==1.16.0` has a dependency `numpy>=1.21.6` which allows NumPy 2.x. We need to force NumPy 1.x after installation.

---

## Installation Order / Thứ tự Cài đặt

When installing dependencies, follow this order to avoid issues:

1. **NumPy 1.x FIRST** (before onnxruntime)
   ```powershell
   pip install "numpy>=1.21.6,<2.0.0"
   ```

2. **ONNX Runtime GPU** (will try to upgrade NumPy to 2.x)
   ```powershell
   pip install onnxruntime-gpu==1.16.0
   ```

3. **Reinstall NumPy 1.x** (force correct version)
   ```powershell
   pip install "numpy>=1.21.6,<2.0.0" --force-reinstall
   ```

---

## Current Status / Trạng thái Hiện tại

✅ **NumPy:** 1.26.4 (compatible)
✅ **ONNX Runtime GPU:** 1.16.0 (correct version)
✅ **SessionOptions:** Available and working

---

## Next Steps / Bước Tiếp theo

1. **Restart the backend server:**
   ```powershell
   cd tts/dangvansam-VietTTS-backend
   .\stop_backend.ps1
   .\start_backend.ps1
   ```

2. **Monitor logs:**
   - `logs/backend_error.log` - Check for any remaining errors
   - `logs/backend_output.log` - Check startup messages

3. **If issues persist:**
   - Run both fix scripts again
   - Verify versions: `python -c "import numpy, onnxruntime; print(f'NumPy: {numpy.__version__}, ONNX: {onnxruntime.__version__}')"`

---

## Prevention / Phòng ngừa

### requirements.txt constraints:
```txt
numpy<2.0.0,>=1.21.6  # NumPy 2.x incompatible with onnxruntime 1.16.0
onnxruntime-gpu==1.16.0
```

### To prevent future issues:
- ✅ Always use `pip install -r requirements.txt` when installing dependencies
- ✅ If upgrading packages manually, ensure NumPy stays <2.0.0
- ✅ Run `fix_numpy.ps1` if NumPy gets upgraded to 2.x
- ✅ Run `fix_onnxruntime_session.ps1` if onnxruntime has issues

---

## Related Files / Tệp Liên quan

- `requirements.txt` - Contains dependency version constraints
- `fix_numpy.ps1` - NumPy version fix script
- `fix_onnxruntime_session.ps1` - ONNX Runtime fix script
- `NUMPY_FIX.md` - NumPy-specific documentation
- `FIX_DEPENDENCIES.md` - General dependency fixes
- `setup_gpu.ps1` - GPU setup script (includes NumPy/ONNX installation)

