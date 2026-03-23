# Environment Setup Fix
# Sửa Lỗi Thiết Lập Môi Trường

## ✅ Issue Fixed / Vấn đề Đã Sửa

The wrapper was trying to import Coqui TTS incorrectly, even though `coqui-tts` package was already installed.

Wrapper đang cố gắng import Coqui TTS không đúng, mặc dù package `coqui-tts` đã được cài đặt.

## 🔍 Root Cause / Nguyên nhân

The import logic was:
1. Adding repository path to sys.path first
2. Then trying to import (which could conflict with installed package)
3. Had duplicate try/except blocks

Logic import đã:
1. Thêm repository path vào sys.path trước
2. Sau đó mới thử import (có thể xung đột với package đã cài đặt)
3. Có các khối try/except trùng lặp

## ✅ Solution / Giải pháp

**Changed:** Try installed package **first**, then fallback to repository if needed.

**Đã thay đổi:** Thử package đã cài đặt **trước**, sau đó mới dự phòng repository nếu cần.

### Before / Trước:
```python
# Add repo path first (could cause conflicts)
if COQUI_TTS_REPO_PATH.exists():
    sys.path.insert(0, str(COQUI_TTS_REPO_PATH))

# Try import (might use repo instead of package)
try:
    from TTS.api import TTS
except ImportError:
    try:
        from TTS.api import TTS  # Duplicate!
    except ImportError:
        ...
```

### After / Sau:
```python
# Try installed package FIRST
try:
    from TTS.api import TTS
except ImportError:
    # Only if package not installed, try repository
    if COQUI_TTS_REPO_PATH.exists():
        sys.path.insert(0, str(COQUI_TTS_REPO_PATH))
        from TTS.api import TTS
```

## ✅ Verification / Xác minh

### Package Installation / Cài đặt Package
```powershell
# Check if coqui-tts is installed
.\.venv\Scripts\python.exe -m pip list | Select-String "coqui"
# Output: coqui-tts 0.27.3 ✅
```

### Import Test / Kiểm tra Import
```powershell
# Test direct import
.\.venv\Scripts\python.exe -c "from TTS.api import TTS; print('✅ Import successful')"
# Output: ✅ Import successful
```

### Wrapper Test / Kiểm tra Wrapper
```powershell
# Test wrapper import
.\.venv\Scripts\python.exe -c "from tts_backend.models.xtts_english import XTTSEnglishWrapper; print('✅ Wrapper import successful')"
# Output: ✅ Wrapper import successful
```

## 🚀 Next Steps / Bước Tiếp theo

1. **Run the backend** / **Chạy backend:**
   ```powershell
   .\run.ps1
   ```

2. **Expected output** / **Kết quả mong đợi:**
   ```
   Loading XTTS English model...
   Đang tải model XTTS tiếng Anh...
   ✅ XTTS-v2 English model loaded
   ✅ Model XTTS-v2 tiếng Anh đã được tải
   ```

3. **If still fails** / **Nếu vẫn thất bại:**
   - Check venv is activated: `.\.venv\Scripts\Activate.ps1`
   - Reinstall: `pip install --upgrade coqui-tts`
   - Check Python version: `python --version` (should be 3.9-3.11)

## 📝 Notes / Ghi chú

### Import Priority / Ưu tiên Import

1. **Installed package** (`coqui-tts`) - **Preferred** ✅
2. **Repository** (`tts/coqui-ai-TTS`) - Fallback only

### Why This Matters / Tại sao Điều này Quan trọng

- Installed package is **tested and stable**
- Repository might have **development changes**
- Package is **easier to manage** (version control via pip)
- Package is **faster** (no path manipulation needed)

---

**Fixed:** 2024-12-19
**Status:** ✅ Ready to use

