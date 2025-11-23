# NumPy Version Fix / Sửa Lỗi Phiên bản NumPy

## Issue / Vấn đề

The backend was failing to start with the following error:
```
A module that was compiled using NumPy 1.x cannot be run in NumPy 2.2.6
RuntimeError: Numpy is not available
```

**Root Cause / Nguyên nhân:**
- NumPy 2.2.6 was installed in the virtual environment
- The project dependencies (onnxruntime-gpu 1.16.0, viet-tts) were compiled against NumPy 1.x
- NumPy 2.x has breaking API changes that are incompatible with modules compiled for NumPy 1.x

## Fix Applied / Giải pháp Đã Áp dụng

✅ **Downgraded NumPy from 2.2.6 to 1.26.4**

The fix script (`fix_numpy.ps1`) was created and executed:

1. ✅ Detected NumPy 2.2.6
2. ✅ Uninstalled NumPy 2.x
3. ✅ Installed NumPy 1.26.4 (latest compatible 1.x version)
4. ✅ Verified installation and compatibility

## Verification / Xác minh

All tests passed:
- ✅ NumPy 1.26.4 imports successfully
- ✅ `torch.from_numpy()` works correctly
- ✅ `get_window()` + `torch.from_numpy()` works (the exact operation that was failing)

## Next Steps / Bước Tiếp theo

1. **Restart the backend server:**
   ```powershell
   cd tts/dangvansam-VietTTS-backend
   .\stop_backend.ps1
   .\start_backend.ps1
   ```

2. **Monitor the logs:**
   - Check `logs/backend_error.log` for any remaining errors
   - Check `logs/backend_output.log` for startup messages

3. **If issues persist:**
   - Run `fix_numpy.ps1` again
   - Verify NumPy version: `python -c "import numpy; print(numpy.__version__)"`
   - Should show: `1.26.4` (or another 1.x version)

## Prevention / Phòng ngừa

The `requirements.txt` already specifies:
```
numpy<2.0.0,>=1.21.6  # NumPy 2.x incompatible with onnxruntime 1.16.0
```

To prevent this issue in the future:
- Always use `pip install -r requirements.txt` when installing dependencies
- If upgrading packages manually, ensure NumPy stays <2.0.0
- Run `fix_numpy.ps1` if NumPy gets upgraded to 2.x

## Files Created / Tệp Đã Tạo

- `fix_numpy.ps1` - Script to fix NumPy version issues
- `NUMPY_FIX.md` - This documentation

## Related Files / Tệp Liên quan

- `requirements.txt` - Contains NumPy version constraint
- `FIX_DEPENDENCIES.md` - General dependency fixes
- `DEPENDENCY_FIXES.md` - Comprehensive dependency fixes (includes both NumPy and ONNX Runtime)
- `fix_onnxruntime_session.ps1` - Fix script for ONNX Runtime SessionOptions error
- `setup_gpu.ps1` - GPU setup script (also handles NumPy installation)

## Note / Lưu ý

After fixing NumPy, you may encounter an ONNX Runtime error:
- Error: `AttributeError: module 'onnxruntime' has no attribute 'SessionOptions'`
- Fix: Run `fix_onnxruntime_session.ps1` to fix ONNX Runtime installation
- See `DEPENDENCY_FIXES.md` for complete details

