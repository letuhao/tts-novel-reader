# TTS Backend Setup with pyenv-win / Cài đặt TTS Backend với pyenv-win

## 🎯 Why pyenv-win? / Tại sao pyenv-win?

`pyenv-win` is the Windows port of pyenv, similar to nvm:
- ✅ **Most similar to nvm** - familiar commands
- ✅ **Widely used** - great community support
- ✅ **Easy to use** - straightforward workflow
- ✅ **Well documented** - lots of resources

`pyenv-win` là phiên bản Windows của pyenv, giống nvm:
- ✅ **Giống nvm nhất** - lệnh quen thuộc
- ✅ **Được sử dụng rộng rãi** - hỗ trợ cộng đồng tốt
- ✅ **Dễ sử dụng** - quy trình đơn giản
- ✅ **Tài liệu tốt** - nhiều tài nguyên

## 🚀 Installation Steps / Các bước Cài đặt

### Step 1: Install pyenv-win / Bước 1: Cài đặt pyenv-win

```powershell
# Method 1: PowerShell script (Recommended)
Invoke-WebRequest -UseBasicParsing -Uri "https://raw.githubusercontent.com/pyenv-win/pyenv-win/master/pyenv-win/install-pyenv-win.ps1" -OutFile "./install-pyenv-win.ps1"
&"./install-pyenv-win.ps1"

# Method 2: Git clone
git clone https://github.com/pyenv-win/pyenv-win.git $HOME\.pyenv
```

### Step 2: Add to PATH / Bước 2: Thêm vào PATH

The installer should do this automatically, but if not:

```powershell
# Add these to your PATH environment variable:
# %USERPROFILE%\.pyenv\pyenv-win\bin
# %USERPROFILE%\.pyenv\pyenv-win\shims
```

**Or edit Environment Variables:**
1. Win + R → `sysdm.cpl` → Advanced → Environment Variables
2. Edit PATH → Add:
   - `%USERPROFILE%\.pyenv\pyenv-win\bin`
   - `%USERPROFILE%\.pyenv\pyenv-win\shims`

### Step 3: Restart PowerShell / Bước 3: Khởi động lại PowerShell

Close and reopen PowerShell for PATH changes to take effect.  
Đóng và mở lại PowerShell để thay đổi PATH có hiệu lực.

### Step 4: Verify Installation / Bước 4: Kiểm tra Cài đặt

```powershell
pyenv --version
```

### Step 5: List Available Python Versions / Bước 5: Liệt kê Phiên bản Python Có sẵn

```powershell
# List all available versions
pyenv install --list | Select-String "3.11"

# Or search for specific version
pyenv install --list | findstr "3.11"
```

### Step 6: Install Python 3.11 / Bước 6: Cài đặt Python 3.11

```powershell
# Install Python 3.11.9
pyenv install 3.11.9

# Or latest 3.11
pyenv install 3.11.10  # Check latest version first
```

### Step 7: Set Python Version / Bước 7: Đặt Phiên bản Python

```powershell
# Set global version (for all projects)
pyenv global 3.11.9

# Or set local version (for this project only)
cd D:\Works\source\novel-reader\app
pyenv local 3.11.9
```

### Step 8: Verify Python Version / Bước 8: Kiểm tra Phiên bản Python

```powershell
python --version
# Expected: Python 3.11.9

pyenv version
# Shows current active version
```

### Step 9: Create Virtual Environment / Bước 9: Tạo Môi trường Ảo

```powershell
cd D:\Works\source\novel-reader\app
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Verify
python --version
# Expected: Python 3.11.9
```

### Step 10: Install Dependencies / Bước 10: Cài đặt Phụ thuộc

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

## 📝 pyenv-win Commands / Lệnh pyenv-win

### Version Management / Quản lý Phiên bản

```powershell
# List available versions
pyenv install --list

# Install Python version
pyenv install 3.11.9

# List installed versions
pyenv versions

# Set global version (all projects)
pyenv global 3.11.9

# Set local version (current project)
pyenv local 3.11.9

# Show current version
pyenv version

# Remove version
pyenv uninstall 3.11.9
```

### Version Priority / Ưu tiên Phiên bản

pyenv-win checks versions in this order:
1. `PYENV_VERSION` environment variable
2. `.python-version` file (local)
3. `global` setting

## ✅ Advantages / Ưu điểm

1. **Similar to nvm / Giống nvm:**
   - Familiar commands if you know nvm
   - Same workflow pattern

2. **No Manual Installation / Không Cài đặt Thủ công:**
   - Automatically downloads Python
   - No need to run installers

3. **Automatic PATH Management / Quản lý PATH Tự động:**
   - Switches versions automatically
   - No manual PATH editing needed

4. **Project-Specific Versions / Phiên bản Theo Dự án:**
   - Each project can have its own Python version
   - Automatic switching

## 🔧 Troubleshooting / Xử lý Sự cố

### Issue: pyenv command not found / Vấn đề: Không tìm thấy lệnh pyenv

**Solution / Giải pháp:**
1. Ensure PATH is set correctly
2. Restart PowerShell
3. Check installation: `Test-Path $HOME\.pyenv\pyenv-win\bin`

### Issue: Python installation fails / Vấn đề: Cài đặt Python thất bại

**Solution / Giải pháp:**
1. Check internet connection
2. Try specific version: `pyenv install 3.11.9`
3. Check pyenv-win issues: https://github.com/pyenv-win/pyenv-win/issues

## 📚 Resources / Tài nguyên

- **Repository:** https://github.com/pyenv-win/pyenv-win
- **Documentation:** https://github.com/pyenv-win/pyenv-win/wiki
- **Issues:** https://github.com/pyenv-win/pyenv-win/issues

## 🎯 Quick Reference / Tham khảo Nhanh

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

# Verify
python --version

# Setup environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

---

**Much easier than manual installation!**  
**Dễ dàng hơn nhiều so với cài đặt thủ công!**

