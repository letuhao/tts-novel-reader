# Fix Dependencies / Sửa Phụ thuộc

## Issues Fixed / Vấn đề Đã Sửa

### 1. NumPy Version Incompatibility / Không tương thích Phiên bản NumPy
**Error:** `A module that was compiled using NumPy 1.x cannot be run in NumPy 2.2.6`

**Fix:** Downgrade numpy to <2.0.0
```bash
pip install "numpy<2.0.0"
```

### 2. huggingface_hub API Change / Thay đổi API huggingface_hub
**Error:** `cannot import name 'cached_download' from 'huggingface_hub'`

**Fix:** Use older version of huggingface_hub that still has `cached_download`
```bash
pip install "huggingface-hub==0.19.4"
```

**Reason:** 
- `diffusers==0.27.2` requires `cached_download` from `huggingface_hub`
- `cached_download` was removed in `huggingface_hub>=0.20.0`
- Original viet-tts uses `huggingface-hub==0.24.7` but that's incompatible with `diffusers==0.27.2`

### 3. FastAPI Deprecation / FastAPI Deprecated
**Warning:** `on_event is deprecated, use lifespan event handlers instead`

**Fix:** Updated to use `lifespan` context manager (already fixed in main.py)

## Quick Fix / Sửa Nhanh

Run this to fix dependencies:
```powershell
.\.venv\Scripts\Activate.ps1
pip install "numpy<2.0.0" "huggingface-hub==0.19.4"
```

Or reinstall all dependencies:
```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt --force-reinstall
```

## Updated Requirements / Yêu cầu Đã Cập nhật

The `requirements.txt` has been updated with:
- `numpy<2.0.0` (instead of `numpy>=2.2.4`)
- `huggingface-hub==0.19.4` (instead of `huggingface-hub>=0.24.7`)

