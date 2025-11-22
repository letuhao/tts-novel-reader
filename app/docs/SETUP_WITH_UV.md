# TTS Backend Setup with uv / Cài đặt TTS Backend với uv

## 🎯 Why uv? / Tại sao uv?

`uv` is a modern Python package and project manager that:
- ✅ **Manages Python versions** (like nvm)
- ✅ **Manages packages** (faster than pip)
- ✅ **Fast installation** (written in Rust)
- ✅ **Easy to use**

`uv` là quản lý gói và dự án Python hiện đại:
- ✅ **Quản lý phiên bản Python** (như nvm)
- ✅ **Quản lý gói** (nhanh hơn pip)
- ✅ **Cài đặt nhanh** (viết bằng Rust)
- ✅ **Dễ sử dụng**

## 🚀 Installation Steps / Các bước Cài đặt

### Step 1: Install uv / Bước 1: Cài đặt uv

```powershell
# Install uv via PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Or with winget:**
```powershell
winget install --id=astral-sh.uv -e
```

### Step 2: Restart PowerShell / Bước 2: Khởi động lại PowerShell

Close and reopen PowerShell for PATH changes to take effect.  
Đóng và mở lại PowerShell để thay đổi PATH có hiệu lực.

### Step 3: Verify Installation / Bước 3: Kiểm tra Cài đặt

```powershell
uv --version
```

### Step 4: Install Python 3.11 / Bước 4: Cài đặt Python 3.11

```powershell
# Install Python 3.11.9
uv python install 3.11.9

# Or latest 3.11
uv python install 3.11
```

### Step 5: List Installed Versions / Bước 5: Liệt kê Phiên bản Đã Cài đặt

```powershell
uv python list
```

### Step 6: Setup Project Environment / Bước 6: Thiết lập Môi trường Dự án

```powershell
cd D:\Works\source\novel-reader\app

# Create virtual environment with Python 3.11
uv venv --python 3.11

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Verify Python version
python --version
# Expected: Python 3.11.x
```

### Step 7: Install Dependencies / Bước 7: Cài đặt Phụ thuộc

```powershell
# Install PyTorch with CUDA first
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Verify CUDA support
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU')"

# Install other dependencies
uv pip install -r requirements.txt
```

### Step 8: Run Service / Bước 8: Chạy Dịch vụ

```powershell
python main.py
```

## 📝 uv Commands / Lệnh uv

### Python Version Management / Quản lý Phiên bản Python

```powershell
# Install Python version
uv python install 3.11

# List installed versions
uv python list

# List available versions
uv python list --only-installed  # Only installed
uv python list --only-available  # All available

# Pin Python version for project
uv python pin 3.11

# Remove Python version
uv python uninstall 3.11
```

### Package Management / Quản lý Gói

```powershell
# Install package
uv pip install package-name

# Install from requirements
uv pip install -r requirements.txt

# Install with index URL
uv pip install torch --index-url https://download.pytorch.org/whl/cu121

# Upgrade pip itself
uv pip install --upgrade pip
```

### Virtual Environment / Môi trường Ảo

```powershell
# Create virtual environment
uv venv

# Create with specific Python version
uv venv --python 3.11

# Activate (same as regular venv)
.\.venv\Scripts\Activate.ps1
```

## ✅ Advantages of uv / Ưu điểm của uv

1. **Fast / Nhanh:**
   - Written in Rust
   - Much faster than pip
   - Parallel downloads

2. **Easy Version Management / Quản lý Phiên bản Dễ dàng:**
   - No manual Python installation
   - Automatic PATH management
   - Project-specific versions

3. **Modern Tooling / Công cụ Hiện đại:**
   - Better error messages
   - Faster dependency resolution
   - Integrated package and version management

## 📊 Comparison: Manual vs uv / So sánh: Thủ công vs uv

| Task | Manual | uv |
|------|--------|-----|
| Install Python | Download installer | `uv python install 3.11` |
| Create venv | `python -m venv .venv` | `uv venv --python 3.11` |
| Install packages | `pip install` | `uv pip install` |
| Speed | Slow | ⚡ **Much faster** |
| Version switching | Manual PATH | Automatic |

## 🎯 Quick Reference / Tham khảo Nhanh

```powershell
# Install uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Install Python 3.11
uv python install 3.11

# Setup project
cd D:\Works\source\novel-reader\app
uv venv --python 3.11
.\.venv\Scripts\Activate.ps1

# Install dependencies
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
uv pip install -r requirements.txt

# Run
python main.py
```

---

**Much easier than manual installation!**  
**Dễ dàng hơn nhiều so với cài đặt thủ công!**

