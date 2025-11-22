# Python Version Managers / Quản lý Phiên bản Python

## 🎯 Why Use a Version Manager? / Tại sao Sử dụng Version Manager?

Similar to `nvm` for Node.js, Python version managers allow you to:
- Install multiple Python versions easily
- Switch between versions per project
- No manual installation needed
- Automatic PATH management

Giống như `nvm` cho Node.js, Python version manager cho phép bạn:
- Cài đặt nhiều phiên bản Python dễ dàng
- Chuyển đổi giữa các phiên bản theo dự án
- Không cần cài đặt thủ công
- Quản lý PATH tự động

## 🚀 Recommended Options / Tùy chọn Được Khuyến nghị

### Option 1: **pyenv-win** (Most Popular / Phổ biến nhất)

**Similar to nvm** - Most Windows users prefer this  
**Giống nvm** - Hầu hết người dùng Windows ưa thích

**Features / Tính năng:**
- ✅ Easy installation
- ✅ Similar to nvm commands
- ✅ Widely used and documented
- ✅ Supports all Python versions

**Installation / Cài đặt:**
```powershell
# Install via PowerShell
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile "./install-pyenv-win.ps1"; &"./install-pyenv-win.ps1"
```

**Usage / Sử dụng:**
```powershell
# List available Python versions
pyenv install --list

# Install Python 3.11.9
pyenv install 3.11.9

# Set global version
pyenv global 3.11.9

# Set local version for project
pyenv local 3.11.9
```

**Repository:** https://github.com/pyenv-win/pyenv-win

---

### Option 2: **uv** (Modern & Fast / Hiện đại & Nhanh) ⭐ Recommended

**Modern Python package and version manager**  
**Quản lý gói và phiên bản Python hiện đại**

**Features / Tính năng:**
- ✅ Very fast
- ✅ Manages Python versions AND packages
- ✅ Modern tooling
- ✅ Easy installation

**Installation / Cài đặt:**
```powershell
# Install uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Usage / Sử dụng:**
```powershell
# Install Python 3.11
uv python install 3.11

# List installed versions
uv python list

# Create virtual environment with specific Python version
uv venv --python 3.11

# Set Python version for project
uv python pin 3.11
```

**Repository:** https://github.com/astral-sh/uv

---

### Option 3: **Mise** (Polyglot / Đa ngôn ngữ)

**Manages Python and many other languages**  
**Quản lý Python và nhiều ngôn ngữ khác**

**Features / Tính năng:**
- ✅ Manages multiple languages (Python, Node.js, etc.)
- ✅ Similar to asdf
- ✅ Unified interface

**Installation / Cài đặt:**
```powershell
# Install via winget
winget install jdx.mise

# Or via PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://mise.run | iex"
```

**Usage / Sử dụng:**
```powershell
# Install Python 3.11
mise install python@3.11

# Set local version
mise use python@3.11
```

**Repository:** https://github.com/jdx/mise

---

## 🎯 Recommendation / Khuyến nghị

### **Best for Beginners / Tốt nhất cho Người mới:**

**pyenv-win** - Most similar to nvm, easy to use  
**pyenv-win** - Giống nvm nhất, dễ sử dụng

### **Best for Modern Development / Tốt nhất cho Phát triển Hiện đại:**

**uv** - Fast, modern, manages both versions and packages  
**uv** - Nhanh, hiện đại, quản lý cả phiên bản và gói

### **Best for Multi-Language Projects / Tốt nhất cho Dự án Đa ngôn ngữ:**

**Mise** - Manages Python, Node.js, and more  
**Mise** - Quản lý Python, Node.js và nhiều hơn

---

## 🚀 Quick Setup Guide / Hướng dẫn Cài đặt Nhanh

### Setup with pyenv-win / Cài đặt với pyenv-win

```powershell
# 1. Install pyenv-win
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile "./install-pyenv-win.ps1"
&"./install-pyenv-win.ps1"

# 2. Restart PowerShell / Khởi động lại PowerShell

# 3. Install Python 3.11
pyenv install 3.11.9

# 4. Set global version
pyenv global 3.11.9

# 5. Verify
python --version
# Expected: Python 3.11.9
```

### Setup with uv / Cài đặt với uv

```powershell
# 1. Install uv
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 2. Restart PowerShell / Khởi động lại PowerShell

# 3. Install Python 3.11
uv python install 3.11

# 4. Create virtual environment
cd D:\Works\source\novel-reader\app
uv venv --python 3.11

# 5. Activate
.\.venv\Scripts\Activate.ps1

# 6. Verify
python --version
# Expected: Python 3.11.x
```

---

## 📊 Comparison / So sánh

| Feature | pyenv-win | uv | Mise |
|---------|-----------|-----|------|
| **Similarity to nvm** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Speed** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Package Management** | ❌ | ✅ | ❌ |
| **Multi-Language** | ❌ | ❌ | ✅ |
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 💡 Recommendation for You / Khuyến nghị cho Bạn

**I recommend `uv`** for modern Python development:
- ✅ Fast installation
- ✅ Manages both Python versions and packages
- ✅ Modern tooling
- ✅ Easy to use

**Tôi khuyến nghị `uv`** cho phát triển Python hiện đại:
- ✅ Cài đặt nhanh
- ✅ Quản lý cả phiên bản Python và gói
- ✅ Công cụ hiện đại
- ✅ Dễ sử dụng

---

## 📚 Resources / Tài nguyên

- **pyenv-win:** https://github.com/pyenv-win/pyenv-win
- **uv:** https://github.com/astral-sh/uv
- **Mise:** https://github.com/jdx/mise

