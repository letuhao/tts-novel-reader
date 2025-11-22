# TTS Backend Quick Start / Bắt đầu Nhanh TTS Backend

## ✅ Current Status / Trạng thái Hiện tại

**Backend structure created!**  
**Cấu trúc backend đã được tạo!**

## ⚠️ Next Steps / Các Bước Tiếp theo

### Step 1: Install Python 3.11 / Bước 1: Cài đặt Python 3.11

**EASIEST: Use `py` launcher + winget (You already have both!)**  
**Dễ nhất: Sử dụng `py` launcher + winget (Bạn đã có cả hai!)**

```powershell
# Install Python 3.11 with winget (one command!)
winget install Python.Python.3.11

# Verify installation
py --list
# Should show both 3.11 and 3.13
```

**Alternative Options / Tùy chọn Khác:**
- **uv** - Modern version manager (see SETUP_WITH_UV.md)
- **pyenv-win** - Similar to nvm (see SETUP_WITH_PYENV.md)
- **Manual** - Download installer (see SETUP_GUIDE.md)

### Step 2: Setup Environment / Bước 2: Thiết lập Môi trường

```powershell
cd D:\Works\source\novel-reader\app

# Create virtual environment with Python 3.11 using py launcher
py -3.11 -m venv .venv

# Activate
.\.venv\Scripts\Activate.ps1

# Verify Python version
python --version
# Expected: Python 3.11.9

# Upgrade pip
python -m pip install --upgrade pip
```

### Step 3: Install PyTorch with CUDA / Bước 3: Cài đặt PyTorch với CUDA

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
python -c "import torch; print('CUDA:', torch.cuda.is_available())"
```

### Step 4: Install Dependencies / Bước 4: Cài đặt Phụ thuộc

```powershell
pip install -r requirements.txt
```

### Step 5: Run Service / Bước 5: Chạy Dịch vụ

```powershell
python main.py
```

## 📁 Project Structure / Cấu trúc Dự án

```
app/
├── tts_backend/          # TTS backend service
│   ├── __init__.py
│   ├── config.py         # Configuration
│   ├── models/           # Model wrappers
│   │   ├── vieneu_tts.py # VieNeu-TTS wrapper
│   │   └── dia_tts.py    # Dia TTS wrapper
│   ├── service.py        # Main TTS service
│   └── api.py            # API endpoints
├── config/               # Configuration files
│   └── models.yaml
├── main.py              # Main application
├── requirements.txt     # Dependencies
└── README.md           # Documentation
```

## 🎯 Supported Models / Model Được Hỗ trợ

1. **VieNeu-TTS** (24 kHz)
   - Fast inference
   - CPU-friendly
   - Requires reference audio

2. **Dia-Finetuning-Vietnamese** (44.1 kHz)
   - High quality
   - GPU-optimized
   - Multi-speaker support

## 📚 Documentation / Tài liệu

- **SETUP_GUIDE.md** - Complete setup instructions
- **README.md** - Overview
- **SETUP.md** - Quick setup guide

