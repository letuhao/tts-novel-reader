# VietTTS Setup Review
# Đánh giá Thiết lập VietTTS

## 📋 Original Setup Analysis / Phân tích Thiết lập Gốc

### Python Version / Phiên bản Python
- **Required:** Python ^3.10 (Python 3.10+)
- **Yêu cầu:** Python ^3.10 (Python 3.10+)

### Key Dependencies from `pyproject.toml` / Phụ thuộc Chính từ `pyproject.toml`

| Package | Version | Notes |
|---------|---------|-------|
| **torch** | 2.0.1 | PyTorch |
| **torchaudio** | 2.0.2 | Audio processing |
| **diffusers** | 0.27.2 | ⚠️ Uses `cached_download` |
| **huggingface-hub** | 0.24.7 | ❌ Removed `cached_download` |
| **numpy** | Not specified | Uses whatever is compatible |
| **fastapi** | 0.111.0 | API framework |
| **uvicorn** | 0.30.0 | ASGI server |

## ⚠️ Known Issue / Vấn đề Đã Biết

### Dependency Conflict / Xung đột Phụ thuộc

**Problem:**
- `diffusers==0.27.2` tries to import `cached_download` from `huggingface_hub`
- `huggingface-hub==0.24.7` removed `cached_download` (deprecated in 0.20.0, removed later)
- This creates an **incompatibility** even in the original setup!

**Vấn đề:**
- `diffusers==0.27.2` cố gắng import `cached_download` từ `huggingface_hub`
- `huggingface-hub==0.24.7` đã xóa `cached_download` (deprecated trong 0.20.0, bị xóa sau đó)
- Điều này tạo ra **không tương thích** ngay cả trong setup gốc!

### Solution / Giải pháp

**Patch diffusers** to use `hf_hub_download` instead of `cached_download`:
- `hf_hub_download` is the replacement function
- Available in all versions of `huggingface-hub`
- Functionally equivalent

**Sửa diffusers** để sử dụng `hf_hub_download` thay vì `cached_download`:
- `hf_hub_download` là hàm thay thế
- Có sẵn trong tất cả phiên bản của `huggingface-hub`
- Tương đương về chức năng

## ✅ Updated Requirements / Yêu cầu Đã Cập nhật

Our `requirements.txt` now **matches viet-tts exactly**:

```txt
# Match viet-tts pyproject.toml exactly
diffusers==0.27.2
huggingface-hub==0.24.7
numpy<2.0.0  # Added constraint to avoid NumPy 2.x issues
```

## 🔧 Patch Implementation / Triển khai Patch

The patch is applied **automatically** in `viet_tts.py` wrapper:
- Runs before importing viettts
- Patches `diffusers/utils/dynamic_modules_utils.py` directly
- Replaces `cached_download` with `hf_hub_download`
- Uses `site.getsitepackages()` to find diffusers without importing it

Patch được áp dụng **tự động** trong wrapper `viet_tts.py`:
- Chạy trước khi import viettts
- Sửa trực tiếp `diffusers/utils/dynamic_modules_utils.py`
- Thay thế `cached_download` bằng `hf_hub_download`
- Sử dụng `site.getsitepackages()` để tìm diffusers mà không cần import

## 📝 Why We Follow Original Setup / Tại sao Chúng ta Theo Setup Gốc

1. **100% Compatibility** ✅
   - Same Python version (3.10+)
   - Same package versions
   - Same environment

2. **Proven Working** ✅
   - Original setup works (with patch)
   - We apply the same patch
   - No version conflicts

3. **Easy Maintenance** ✅
   - Match original = less maintenance
   - Updates follow original
   - Clear version tracking

## 🚀 Next Steps / Các Bước Tiếp theo

1. **Install dependencies:**
   ```powershell
   pip install -r requirements.txt
   ```

2. **Patch will apply automatically** when model loads

3. **Run backend:**
   ```powershell
   .\run.ps1
   ```

The patch is now **built into the wrapper**, so it applies automatically before any imports!
