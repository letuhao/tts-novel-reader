# TTS Backend Setup Guide / Hướng dẫn Cài đặt TTS Backend

## 🎯 Overview / Tổng quan

This guide will help you set up a unified TTS backend service in `D:\Works\source\novel-reader\app` that supports both:
- **VieNeu-TTS** (24 kHz, CPU-friendly)
- **Dia-Finetuning-Vietnamese** (44.1 kHz, GPU-optimized)

Hướng dẫn này sẽ giúp bạn thiết lập dịch vụ TTS backend thống nhất hỗ trợ cả hai:
- **VieNeu-TTS** (24 kHz, thân thiện CPU)
- **Dia-Finetuning-Vietnamese** (44.1 kHz, tối ưu GPU)

## ⚠️ Critical: Python Version / Quan trọng: Phiên bản Python

### Problem / Vấn đề

- ❌ **Python 3.13** has no PyTorch CUDA wheels yet
- ❌ This prevents GPU acceleration
- ❌ VieNeu-TTS setup failed because of this

### Solution / Giải pháp

**Install Python 3.11 or 3.12** for full CUDA support  
**Cài đặt Python 3.11 hoặc 3.12** để có hỗ trợ CUDA đầy đủ

## 📋 Step-by-Step Setup / Cài đặt Từng Bước

### Step 1: Install Python 3.11 / Bước 1: Cài đặt Python 3.11

**Option A: Using `py` launcher + winget (EASIEST / Dễ nhất)** - You already have it!  
**Tùy chọn A: Sử dụng `py` launcher + winget (Dễ nhất)** - Bạn đã có nó!

```powershell
# Install Python 3.11 with winget (one command!)
winget install Python.Python.3.11

# Verify
py --list

# Create venv with Python 3.11
py -3.11 -m venv .venv
```

See [SETUP_WITH_PY_LAUNCHER.md](./SETUP_WITH_PY_LAUNCHER.md) or [SETUP_EASIEST.md](./SETUP_EASIEST.md) for details.

**Option B: Using uv** - Modern version manager  
**Tùy chọn B: Sử dụng uv** - Version manager hiện đại

See [SETUP_WITH_UV.md](./SETUP_WITH_UV.md) or [PYTHON_VERSION_MANAGER_SETUP.md](./PYTHON_VERSION_MANAGER_SETUP.md) for quick setup.

**Option B: Using pyenv-win** - Similar to nvm  
**Tùy chọn B: Sử dụng pyenv-win** - Giống nvm

See [SETUP_WITH_PYENV.md](./SETUP_WITH_PYENV.md) for setup guide.

**Option C: Using pyenv-win** - Similar to nvm  
**Tùy chọn C: Sử dụng pyenv-win** - Giống nvm

See [SETUP_WITH_PYENV.md](./SETUP_WITH_PYENV.md) for setup guide.

**Option D: Manual Installation / Cài đặt Thủ công**

1. **Download Python 3.11:**
   - Visit: https://www.python.org/downloads/release/python-3119/
   - Download: `python-3.11.9-amd64.exe` (Windows 64-bit)

2. **Install Python 3.11:**
   - Run installer
   - ✅ **IMPORTANT:** Check "Add Python 3.11 to PATH"
   - Click "Install Now"

3. **Verify installation:**
   ```powershell
   py -3.11 --version
   # Expected: Python 3.11.9
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

For RTX 4090 with CUDA 13.0, use CUDA 12.1:

```powershell
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Verify CUDA support:**
```powershell
python -c "import torch; print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'No GPU')"
```

**Expected output:**
```
CUDA: True
GPU: NVIDIA GeForce RTX 4090
```

### Step 6: Install Dependencies / Bước 6: Cài đặt Phụ thuộc

```powershell
pip install -r requirements.txt
```

### Step 7: Verify Setup / Bước 7: Kiểm tra Cài đặt

```powershell
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.cuda.is_available()); print('Version:', torch.version.cuda)"
```

## 🚀 Running the Service / Chạy Dịch vụ

### Start TTS Backend / Khởi động TTS Backend

```powershell
# Activate virtual environment
cd D:\Works\source\novel-reader\app
.\.venv\Scripts\Activate.ps1

# Run server
python main.py
```

### Access API / Truy cập API

- **API Docs:** http://127.0.0.1:8000/docs
- **Health Check:** http://127.0.0.1:8000/health
- **TTS Endpoints:** http://127.0.0.1:8000/api/tts/

## 📝 API Usage Examples / Ví dụ Sử dụng API

### Synthesize with VieNeu-TTS / Tổng hợp với VieNeu-TTS

```bash
curl -X POST "http://127.0.0.1:8000/api/tts/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt.",
    "model": "vieneu-tts",
    "ref_audio_path": "../tts/VieNeu-TTS/sample/id_0001.wav",
    "ref_text": "File reference text here"
  }' \
  --output output.wav
```

### Synthesize with Dia TTS / Tổng hợp với Dia TTS

```bash
curl -X POST "http://127.0.0.1:8000/api/tts/synthesize" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "[01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt.",
    "model": "dia",
    "temperature": 1.3,
    "top_p": 0.95,
    "cfg_scale": 3.0
  }' \
  --output output.wav
```

## ✅ Verification Checklist / Danh sách Kiểm tra

- [ ] Python 3.11 or 3.12 installed
- [ ] Virtual environment created with Python 3.11/3.12
- [ ] PyTorch with CUDA installed
- [ ] CUDA support verified (torch.cuda.is_available() == True)
- [ ] All dependencies installed
- [ ] TTS backend structure created
- [ ] Service can start successfully

## 🔧 Troubleshooting / Xử lý Sự cố

### Issue: CUDA not available / Vấn đề: CUDA không khả dụng

**Solution:**
1. Check Python version: `python --version` (should be 3.11 or 3.12)
2. Reinstall PyTorch with CUDA: `pip install torch --index-url https://download.pytorch.org/whl/cu121`
3. Verify GPU: `nvidia-smi`

### Issue: Import errors / Vấn đề: Lỗi import

**Solution:**
1. Ensure virtual environment is activated
2. Install all dependencies: `pip install -r requirements.txt`
3. Check Python path includes tts directories

## 📚 Next Steps / Các Bước Tiếp theo

1. Test the API endpoints
2. Integrate with your frontend
3. Configure model paths if different
4. Set up production deployment

