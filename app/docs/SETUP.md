# TTS Backend Setup Guide / Hướng dẫn Cài đặt TTS Backend

## ⚠️ Python Version Requirement / Yêu cầu Phiên bản Python

### Problem with Python 3.13 / Vấn đề với Python 3.13

- ❌ **No PyTorch CUDA wheels** available for Python 3.13
- ❌ This causes GPU acceleration to fail
- ❌ Limited library compatibility

### ✅ Recommended Python Version / Phiên bản Python Được Khuyến nghị

**Python 3.11** is recommended for best compatibility:
- ✅ Full PyTorch CUDA support (CUDA 11.8, 12.1, 12.6)
- ✅ Stable and well-tested
- ✅ Compatible with both VieNeu-TTS and Dia
- ✅ Good performance

**Python 3.12** is also supported:
- ✅ Full PyTorch CUDA support
- ✅ Latest features
- ✅ Good performance

## 📋 Installation Steps / Các bước Cài đặt

### Step 1: Install Python 3.11 / Bước 1: Cài đặt Python 3.11

1. **Download Python 3.11:**
   - Visit: https://www.python.org/downloads/release/python-3119/
   - Download Windows installer (64-bit)
   - File: `python-3.11.9-amd64.exe`

2. **Install Python 3.11:**
   - Run the installer
   - **Important:** Check "Add Python 3.11 to PATH"
   - Click "Install Now"

3. **Verify installation:**
   ```powershell
   py -3.11 --version
   # Should output: Python 3.11.9
   ```

### Step 2: Create Virtual Environment / Bước 2: Tạo Môi trường Ảo

```powershell
cd D:\Works\source\novel-reader\app
py -3.11 -m venv .venv
```

### Step 3: Activate Virtual Environment / Bước 3: Kích hoạt Môi trường Ảo

```powershell
.\.venv\Scripts\Activate.ps1
```

### Step 4: Upgrade pip / Bước 4: Nâng cấp pip

```powershell
python -m pip install --upgrade pip
```

### Step 5: Install PyTorch with CUDA / Bước 5: Cài đặt PyTorch với CUDA

For your RTX 4090 with CUDA 13.0, use CUDA 12.1 or 12.6:

```powershell
# For CUDA 12.1 (recommended for compatibility)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Verify CUDA support
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU')"
```

### Step 6: Install Dependencies / Bước 6: Cài đặt Phụ thuộc

```powershell
pip install -r requirements.txt
```

### Step 7: Verify Setup / Bước 7: Kiểm tra Cài đặt

```powershell
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.cuda.is_available()); print('CUDA Version:', torch.version.cuda if torch.cuda.is_available() else 'N/A')"
```

## ✅ Expected Output / Kết quả Mong đợi

```
PyTorch: 2.x.x+cu121
CUDA: True
CUDA Version: 12.1
GPU: NVIDIA GeForce RTX 4090
```

## 📝 Notes / Lưu ý

1. **Python Version:** Use 3.11 or 3.12 (NOT 3.13)
2. **CUDA Version:** Use 12.1 for best compatibility with RTX 4090
3. **Virtual Environment:** Always use a virtual environment
4. **GPU:** Your RTX 4090 will work perfectly with this setup

