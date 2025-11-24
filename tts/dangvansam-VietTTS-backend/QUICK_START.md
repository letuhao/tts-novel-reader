# Quick Start Guide / Hướng dẫn Khởi động Nhanh

## ⚠️ IMPORTANT: Always Use Start Scripts!
## ⚠️ QUAN TRỌNG: Luôn Sử dụng Script Khởi động!

**DO NOT run `python main.py` directly!**
**KHÔNG chạy `python main.py` trực tiếp!**

## Problem / Vấn đề

If you have multiple Python environments (e.g., vieneu-tts-backend with Python 3.12), running `python main.py` directly may use the wrong Python version, causing compatibility issues.

Nếu bạn có nhiều môi trường Python (ví dụ: vieneu-tts-backend với Python 3.12), chạy `python main.py` trực tiếp có thể sử dụng sai phiên bản Python, gây vấn đề tương thích.

## Solution / Giải pháp

**Always use the start scripts:**
**Luôn sử dụng script khởi động:**

```powershell
# Option 1: PowerShell script (recommended)
.\start_backend.ps1

# Option 2: Python script
python start_backend.py
```

Both scripts will:
- ✅ Always use `.venv\Scripts\python.exe` (Python 3.10.11)
- ✅ Never use system Python or other venv Python
- ✅ Validate environment before starting
- ✅ Fail fast if venv is missing or incorrect

Cả hai script sẽ:
- ✅ Luôn sử dụng `.venv\Scripts\python.exe` (Python 3.10.11)
- ✅ Không bao giờ dùng Python hệ thống hoặc Python venv khác
- ✅ Xác thực môi trường trước khi khởi động
- ✅ Dừng ngay nếu venv thiếu hoặc sai

## Check Environment / Kiểm tra Môi trường

Before starting, verify your environment:
Trước khi khởi động, xác minh môi trường của bạn:

```powershell
python check_env.py
```

This will verify:
- ✅ `.venv` exists
- ✅ Python version is correct (3.10.x)
- ✅ Key packages are installed
- ✅ Environment is properly isolated

Sẽ xác minh:
- ✅ `.venv` tồn tại
- ✅ Phiên bản Python đúng (3.10.x)
- ✅ Các gói quan trọng đã được cài đặt
- ✅ Môi trường được cô lập đúng cách

## Troubleshooting / Khắc phục Sự cố

### Error: "Wrong Python environment detected!"
### Lỗi: "Phát hiện môi trường Python sai!"

**Cause / Nguyên nhân:**
- You ran `python main.py` directly
- Your shell has another venv activated (e.g., vieneu-tts-backend)
- Bạn đã chạy `python main.py` trực tiếp
- Shell của bạn có venv khác được kích hoạt (ví dụ: vieneu-tts-backend)

**Solution / Giải pháp:**
1. Deactivate current venv (if any):
   ```powershell
   deactivate
   ```

2. Use the start script instead:
   ```powershell
   .\start_backend.ps1
   ```

3. Or use the Python start script:
   ```powershell
   python start_backend.py
   ```

### Error: "No virtual environment found!"
### Lỗi: "Không tìm thấy môi trường ảo!"

**Solution / Giải pháp:**
```powershell
.\setup.ps1
```

## Summary / Tóm tắt

| Action / Hành động | ✅ Correct / Đúng | ❌ Wrong / Sai |
|---------------------|-------------------|----------------|
| Start backend | `.\start_backend.ps1` | `python main.py` |
| Check environment | `python check_env.py` | - |
| Setup environment | `.\setup.ps1` | - |

**Remember: The start scripts handle everything automatically!**
**Nhớ: Script khởi động xử lý mọi thứ tự động!**

