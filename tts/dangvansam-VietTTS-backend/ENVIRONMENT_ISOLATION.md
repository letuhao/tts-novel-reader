# Environment Isolation Guide
# Hướng dẫn Cô lập Môi trường

## Overview / Tổng quan

The `dangvansam-VietTTS-backend` uses a **completely isolated virtual environment** to ensure compatibility and prevent conflicts with other Python installations or projects.

`dangvansam-VietTTS-backend` sử dụng **môi trường ảo hoàn toàn cô lập** để đảm bảo tương thích và tránh xung đột với các cài đặt Python hoặc dự án khác.

## Problem / Vấn đề

When you install Python 3.12 and set up new environments for other projects, the system Python path may change, causing the backend to use the wrong Python version.

Khi bạn cài đặt Python 3.12 và thiết lập môi trường mới cho các dự án khác, đường dẫn Python hệ thống có thể thay đổi, khiến backend sử dụng sai phiên bản Python.

## Solution / Giải pháp

The backend **ALWAYS** uses its own `.venv` Python (Python 3.10.11), **NEVER** the system Python.

Backend **LUÔN** sử dụng Python của `.venv` riêng (Python 3.10.11), **KHÔNG BAO GIỜ** dùng Python hệ thống.

## Environment Setup / Thiết lập Môi trường

### 1. Check Environment / Kiểm tra Môi trường

```powershell
cd tts\dangvansam-VietTTS-backend
python check_env.py
```

This will verify:
- ✅ `.venv` exists
- ✅ Python version is correct (3.10.x recommended)
- ✅ Key packages are installed
- ✅ Environment is properly isolated

Sẽ xác minh:
- ✅ `.venv` tồn tại
- ✅ Phiên bản Python đúng (3.10.x được khuyến nghị)
- ✅ Các gói quan trọng đã được cài đặt
- ✅ Môi trường được cô lập đúng cách

### 2. Setup Environment (if needed) / Thiết lập Môi trường (nếu cần)

If `.venv` doesn't exist or is corrupted:

Nếu `.venv` không tồn tại hoặc bị hỏng:

```powershell
cd tts\dangvansam-VietTTS-backend
.\setup.ps1
```

This will:
- Create or clone the virtual environment
- Install all required packages
- Configure the environment for VietTTS compatibility

Sẽ:
- Tạo hoặc sao chép môi trường ảo
- Cài đặt tất cả các gói cần thiết
- Cấu hình môi trường cho tương thích VietTTS

## Starting the Backend / Khởi động Backend

### ✅ CORRECT: Use start scripts / ĐÚNG: Sử dụng script khởi động

```powershell
# Option 1: PowerShell script
.\start_backend.ps1

# Option 2: Python script (will use venv Python)
python start_backend.py
```

**Both scripts will:**
- ✅ Always use `.venv\Scripts\python.exe` (Python 3.10.11)
- ✅ Never use system Python
- ✅ Fail fast if venv is missing
- ✅ Validate Python version before starting

**Cả hai script sẽ:**
- ✅ Luôn sử dụng `.venv\Scripts\python.exe` (Python 3.10.11)
- ✅ Không bao giờ dùng Python hệ thống
- ✅ Dừng ngay nếu venv thiếu
- ✅ Xác thực phiên bản Python trước khi khởi động

### ❌ WRONG: Direct execution / SAI: Chạy trực tiếp

```powershell
# ❌ DON'T DO THIS - Uses system Python!
python main.py

# ❌ DON'T DO THIS - May use wrong Python!
.\venv\Scripts\python.exe main.py
```

**Why this is wrong:**
- May use system Python (3.12) instead of venv Python (3.10.11)
- Bypasses environment validation
- Can cause compatibility issues

**Tại sao điều này sai:**
- Có thể dùng Python hệ thống (3.12) thay vì Python venv (3.10.11)
- Bỏ qua xác thực môi trường
- Có thể gây vấn đề tương thích

## Environment Isolation Details / Chi tiết Cô lập Môi trường

### Python Version / Phiên bản Python

- **Venv Python**: 3.10.11 (recommended / được khuyến nghị)
- **System Python**: May be 3.12 or other (ignored / bị bỏ qua)

### Package Isolation / Cô lập Gói

All packages are installed in `.venv\Lib\site-packages\`:
- `torch==2.0.1+cu118`
- `onnxruntime-gpu==1.16.0`
- `fastapi>=0.111.0`
- `uvicorn>=0.30.0`
- And all other dependencies...

Tất cả các gói được cài đặt trong `.venv\Lib\site-packages\`:
- `torch==2.0.1+cu118`
- `onnxruntime-gpu==1.16.0`
- `fastapi>=0.111.0`
- `uvicorn>=0.30.0`
- Và tất cả các phụ thuộc khác...

### Path Isolation / Cô lập Đường dẫn

The venv Python's `sys.path` includes:
1. `.venv\Scripts\` (executables)
2. `.venv\Lib\site-packages\` (packages)
3. Project directory

**System Python paths are NOT included.**

Đường dẫn `sys.path` của Python venv bao gồm:
1. `.venv\Scripts\` (các file thực thi)
2. `.venv\Lib\site-packages\` (các gói)
3. Thư mục dự án

**Đường dẫn Python hệ thống KHÔNG được bao gồm.**

## Troubleshooting / Khắc phục Sự cố

### Problem: "No virtual environment found!"
### Vấn đề: "Không tìm thấy môi trường ảo!"

**Solution / Giải pháp:**
```powershell
cd tts\dangvansam-VietTTS-backend
.\setup.ps1
```

### Problem: Backend uses wrong Python version
### Vấn đề: Backend sử dụng sai phiên bản Python

**Solution / Giải pháp:**
1. Check which Python is being used:
   ```powershell
   cd tts\dangvansam-VietTTS-backend
   .\.venv\Scripts\python.exe --version
   ```
2. If it's not 3.10.x, recreate the venv:
   ```powershell
   Remove-Item -Recurse -Force .venv
   .\setup.ps1
   ```

### Problem: Import errors or missing packages
### Vấn đề: Lỗi import hoặc thiếu gói

**Solution / Giải pháp:**
```powershell
cd tts\dangvansam-VietTTS-backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Best Practices / Thực hành Tốt nhất

1. ✅ **Always use start scripts** (`start_backend.ps1` or `start_backend.py`)
   - **Luôn sử dụng script khởi động** (`start_backend.ps1` hoặc `start_backend.py`)

2. ✅ **Check environment before starting** (`python check_env.py`)
   - **Kiểm tra môi trường trước khi khởi động** (`python check_env.py`)

3. ✅ **Never run `python main.py` directly**
   - **Không bao giờ chạy `python main.py` trực tiếp**

4. ✅ **Keep venv isolated** - Don't share it with other projects
   - **Giữ venv cô lập** - Không chia sẻ với các dự án khác

5. ✅ **Recreate venv if Python version changes**
   - **Tạo lại venv nếu phiên bản Python thay đổi**

## Summary / Tóm tắt

- ✅ Backend uses **isolated `.venv`** with Python 3.10.11
- ✅ Start scripts **always use venv Python**, never system Python
- ✅ Environment is **validated before startup**
- ✅ Scripts **fail fast** if venv is missing or incorrect

- ✅ Backend sử dụng **`.venv` cô lập** với Python 3.10.11
- ✅ Script khởi động **luôn dùng Python venv**, không bao giờ dùng Python hệ thống
- ✅ Môi trường được **xác thực trước khi khởi động**
- ✅ Script **dừng ngay** nếu venv thiếu hoặc sai

