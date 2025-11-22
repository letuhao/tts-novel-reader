# TTS Backend Service / Dịch vụ TTS Backend

## 🎯 Purpose / Mục đích

Unified TTS backend service supporting multiple Vietnamese TTS models:
- VieNeu-TTS (24 kHz, fast, CPU-friendly)
- Dia-Finetuning-Vietnamese (44.1 kHz, high quality, GPU-optimized)

Dịch vụ TTS backend thống nhất hỗ trợ nhiều mô hình TTS tiếng Việt:
- VieNeu-TTS (24 kHz, nhanh, thân thiện CPU)
- Dia-Finetuning-Vietnamese (44.1 kHz, chất lượng cao, tối ưu GPU)

## ⚠️ Python Version / Phiên bản Python

### ⚠️ Important: Python Version / Quan trọng: Phiên bản Python

**Current Status:** Only Python 3.13 available (no CUDA support)  
**Trạng thái hiện tại:** Chỉ có Python 3.13 (không hỗ trợ CUDA)

**Required:** Python 3.11 or 3.12 for GPU/CUDA support  
**Yêu cầu:** Python 3.11 hoặc 3.12 để hỗ trợ GPU/CUDA

### 🚀 Installation Steps / Các bước Cài đặt

1. **Install Python 3.11 or 3.12:**
   - Download from: https://www.python.org/downloads/
   - Recommended: Python 3.11.9 or Python 3.12.7
   - During installation, check "Add Python to PATH"

2. **Verify installation:**
   ```powershell
   py -3.11 --version
   # or
   py -3.12 --version
   ```

3. **Create virtual environment:**
   ```powershell
   cd D:\Works\source\novel-reader\app
   py -3.11 -m venv .venv
   # or
   py -3.12 -m venv .venv
   ```

4. **Activate virtual environment:**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

5. **Install dependencies:**
   ```powershell
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

## 📁 Project Structure / Cấu trúc Dự án

```
app/
├── tts_backend/          # TTS backend service
│   ├── __init__.py
│   ├── config.py         # Configuration
│   ├── models/           # Model wrappers
│   │   ├── __init__.py
│   │   ├── vieneu_tts.py    # VieNeu-TTS wrapper
│   │   └── dia_tts.py       # Dia TTS wrapper
│   ├── service.py        # Main TTS service
│   └── api.py            # API endpoints
├── config/               # Configuration files
│   ├── models.yaml       # Model configurations
│   └── app.yaml          # App configuration
├── requirements.txt      # Python dependencies
├── main.py              # Main application entry
└── README.md            # This file
```

## 🔧 Setup / Cài đặt

See [SETUP.md](./SETUP.md) for detailed setup instructions.

