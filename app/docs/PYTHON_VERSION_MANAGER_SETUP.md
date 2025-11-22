# Python Version Manager Setup / Cài đặt Python Version Manager

## 🎯 Quick Recommendation / Khuyến nghị Nhanh

**Use `uv`** - It's the easiest and fastest option!  
**Sử dụng `uv`** - Đây là tùy chọn dễ nhất và nhanh nhất!

**Why / Tại sao:**
- ✅ **One-line installation** - Cài đặt một dòng
- ✅ **Fast** - Written in Rust
- ✅ **Manages both versions and packages** - Quản lý cả phiên bản và gói
- ✅ **Modern** - Best tooling

## 🚀 Quick Setup with uv / Cài đặt Nhanh với uv

### Step 1: Install uv / Bước 1: Cài đặt uv

```powershell
# Install uv (one command!)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Step 2: Restart PowerShell / Bước 2: Khởi động lại PowerShell

Close and reopen PowerShell.  
Đóng và mở lại PowerShell.

### Step 3: Install Python 3.11 / Bước 3: Cài đặt Python 3.11

```powershell
# Install Python 3.11 (latest 3.11.x)
uv python install 3.11

# Verify
uv python list
```

### Step 4: Setup Project / Bước 4: Thiết lập Dự án

```powershell
cd D:\Works\source\novel-reader\app

# Create virtual environment with Python 3.11
uv venv --python 3.11

# Activate
.\.venv\Scripts\Activate.ps1

# Verify
python --version
# Expected: Python 3.11.x
```

### Step 5: Install Dependencies / Bước 5: Cài đặt Phụ thuộc

```powershell
# Install PyTorch with CUDA
uv pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Verify CUDA
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU')"

# Install other dependencies
uv pip install -r requirements.txt
```

### Step 6: Run Service / Bước 6: Chạy Dịch vụ

```powershell
python main.py
```

## 📊 Alternative: pyenv-win / Tùy chọn: pyenv-win

If you prefer something more similar to nvm:

```powershell
# Install pyenv-win
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile "./install-pyenv-win.ps1"
&"./install-pyenv-win.ps1"

# Restart PowerShell

# Install Python 3.11
pyenv install 3.11.9

# Set for project
cd D:\Works\source\novel-reader\app
pyenv local 3.11.9

# Create venv
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

## ✅ Comparison / So sánh

| Feature | uv | pyenv-win |
|---------|-----|-----------|
| **Installation** | 1 command | 1 command |
| **Speed** | ⚡ Very fast | Fast |
| **Package Management** | ✅ Yes | ❌ No |
| **Similar to nvm** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 📚 Full Guides / Hướng dẫn Đầy đủ

- **SETUP_WITH_UV.md** - Complete uv setup guide
- **SETUP_WITH_PYENV.md** - Complete pyenv-win setup guide
- **PYTHON_VERSION_MANAGERS.md** - Comparison of all options

## 💡 Recommendation / Khuyến nghị

**Start with `uv`** - It's the fastest and easiest!  
**Bắt đầu với `uv`** - Nó nhanh nhất và dễ nhất!

If you want something more like nvm, use `pyenv-win`.  
Nếu bạn muốn thứ gì đó giống nvm hơn, sử dụng `pyenv-win`.

---

**No more manual Python installation!**  
**Không cần cài đặt Python thủ công nữa!**

