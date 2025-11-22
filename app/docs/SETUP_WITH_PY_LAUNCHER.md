# TTS Backend Setup with `py` Launcher / Cài đặt TTS Backend với `py` Launcher

## 🎯 Using Built-in Python Launcher / Sử dụng Python Launcher Tích hợp

You already have the `py` launcher! This is the **Python Launcher for Windows** built into Python installations.  
Bạn đã có `py` launcher! Đây là **Python Launcher for Windows** tích hợp trong cài đặt Python.

**Good news:** `py` launcher can work with multiple Python versions!  
**Tin tốt:** `py` launcher có thể làm việc với nhiều phiên bản Python!

## 🚀 Quick Setup / Cài đặt Nhanh

### Option 1: Install Python 3.11 with winget / Tùy chọn 1: Cài đặt Python 3.11 với winget

`winget` found Python 3.11 available! Install it easily:

```powershell
# Install Python 3.11.9 via winget (one command!)
winget install Python.Python.3.11

# After installation, verify
py --list
# Should show both 3.13 and 3.11
```

### Option 2: Install Python 3.11 with Chocolatey / Tùy chọn 2: Cài đặt Python 3.11 với Chocolatey

If you have Chocolatey installed:

```powershell
# Install Python 3.11
choco install python311

# Verify
py --list
```

### Option 3: Manual Installation / Tùy chọn 3: Cài đặt Thủ công

1. Download: https://www.python.org/downloads/release/python-3119/
2. Install with "Add to PATH" checked
3. Verify: `py --list`

## 📋 Using `py` Launcher / Sử dụng `py` Launcher

### Commands / Lệnh

```powershell
# List all installed Python versions
py --list

# List with paths
py --list-paths

# Launch specific Python version
py -3.11 --version
py -3.13 --version

# Create virtual environment with specific Python version
py -3.11 -m venv .venv

# Run script with specific Python version
py -3.11 script.py
```

### Example Usage / Ví dụ Sử dụng

```powershell
# Check available versions
py --list

# Create venv with Python 3.11 (if installed)
cd D:\Works\source\novel-reader\app
py -3.11 -m venv .venv

# Activate
.\.venv\Scripts\Activate.ps1

# Verify Python version
python --version
# Should be: Python 3.11.x
```

## ✅ Recommended Workflow / Quy trình Được Khuyến nghị

### Step 1: Install Python 3.11 / Bước 1: Cài đặt Python 3.11

**Easiest way / Cách dễ nhất:**

```powershell
winget install Python.Python.3.11
```

**Or with Chocolatey:**
```powershell
choco install python311
```

### Step 2: Verify Installation / Bước 2: Kiểm tra Cài đặt

```powershell
py --list
# Should show:
#  -V:3.11
#  -V:3.13 *
```

### Step 3: Setup Project / Bước 3: Thiết lập Dự án

```powershell
cd D:\Works\source\novel-reader\app

# Create venv with Python 3.11
py -3.11 -m venv .venv

# Activate
.\.venv\Scripts\Activate.ps1

# Verify
python --version
# Expected: Python 3.11.9
```

### Step 4: Install Dependencies / Bước 4: Cài đặt Phụ thuộc

```powershell
# Upgrade pip
python -m pip install --upgrade pip

# Install PyTorch with CUDA
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Verify CUDA
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU')"

# Install other dependencies
pip install -r requirements.txt
```

### Step 5: Run Service / Bước 5: Chạy Dịch vụ

```powershell
python main.py
```

## 📝 `py` Launcher Features / Tính năng `py` Launcher

### Available Commands / Lệnh Có sẵn

- `py --list` - List all installed Python versions
- `py --list-paths` - List with full paths
- `py -3.11` - Launch Python 3.11
- `py -3.13` - Launch Python 3.13
- `py -3` - Launch latest Python 3.x

### Version Selection / Lựa chọn Phiên bản

The `py` launcher checks versions in this order:
1. Command-line argument (`py -3.11`)
2. Virtual environment (if activated)
3. Shebang line in script
4. Environment variable `PY_PYTHON`
5. Default (latest installed)

## 💡 Advantages / Ưu điểm

1. **Built-in / Tích hợp:**
   - Already installed with Python
   - No extra installation needed

2. **Simple / Đơn giản:**
   - Easy to use
   - Standard Windows tool

3. **Works with Multiple Versions / Hoạt động với Nhiều Phiên bản:**
   - Can switch between versions
   - No PATH conflicts

## ⚠️ Limitations / Hạn chế

1. **Doesn't Install Python / Không Cài đặt Python:**
   - Only uses already installed versions
   - Need to install Python separately (but winget makes this easy!)

2. **No Automatic PATH Management / Không Tự động Quản lý PATH:**
   - Need to manage PATH manually if needed
   - But virtual environments handle this

## 🎯 Recommendation / Khuyến nghị

**Use `py` launcher + winget:**
- ✅ Built-in (no extra install)
- ✅ Easy Python installation with `winget install Python.Python.3.11`
- ✅ Simple version switching
- ✅ Works perfectly for your needs

**Sử dụng `py` launcher + winget:**
- ✅ Tích hợp (không cần cài thêm)
- ✅ Cài đặt Python dễ dàng với `winget install Python.Python.3.11`
- ✅ Chuyển đổi phiên bản đơn giản
- ✅ Hoạt động hoàn hảo cho nhu cầu của bạn

---

**This is the easiest option since you already have `py`!**  
**Đây là tùy chọn dễ nhất vì bạn đã có `py`!**

