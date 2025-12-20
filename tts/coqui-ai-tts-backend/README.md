# Coqui TTS (XTTS-v2) Backend
# Backend Coqui TTS (XTTS-v2)

English TTS Backend using Coqui XTTS-v2 model for high-quality English text-to-speech.

Backend TTS tiếng Anh sử dụng model Coqui XTTS-v2 cho text-to-speech tiếng Anh chất lượng cao.

## 🎯 Features / Tính năng

- ✅ **XTTS-v2 Model** - High-quality English TTS with voice cloning
- ✅ **17 Languages** - Multi-language support (English, Spanish, French, etc.)
- ✅ **Voice Cloning** - Clone any voice with 6+ seconds of reference audio
- ✅ **FastAPI API** - Modern async API with OpenAPI docs
- ✅ **Audio Storage** - Automatic file management with expiration
- ✅ **GPU Optimized** - CUDA support for RTX 4090

## 🚀 Quick Start / Bắt đầu Nhanh

### 1. Setup / Cài đặt

```powershell
# Navigate to backend
cd D:\Works\source\novel-reader\tts\coqui-ai-tts-backend

# Run setup
.\setup.ps1
```

This will:
- Create virtual environment
- Install Coqui TTS and dependencies
- Install FastAPI, uvicorn, etc.

### 2. Run Backend / Chạy Backend

**Interactive mode / Chế độ tương tác:**
```powershell
.\run.ps1
```

**Background mode / Chế độ nền:**
```powershell
.\start_backend.ps1
```

**Stop backend / Dừng backend:**
```powershell
python stop_backend.py
```

## 📁 Directory Structure / Cấu trúc Thư mục

```
coqui-ai-tts-backend/
├── tts_backend/
│   ├── models/
│   │   └── xtts_english.py      # XTTS-v2 model wrapper
│   ├── api.py                    # FastAPI endpoints
│   ├── config.py                 # Configuration
│   ├── service.py                # TTS service
│   └── storage.py                # Audio storage management
├── logs/                         # Log files
├── main.py                       # FastAPI application
├── requirements.txt              # Python dependencies
├── setup.ps1                     # Setup script
├── run.ps1                        # Run backend (interactive)
├── start_backend.ps1             # Start backend (background)
└── stop_backend.py                # Stop backend
```

## 🔧 Configuration / Cấu hình

### Model Path / Đường dẫn Model

The backend uses model from: `models/coqui-XTTS-v2`

Backend sử dụng model từ: `models/coqui-XTTS-v2`

### Environment Variables / Biến Môi trường

- `TTS_DEVICE` - Device to use (cuda/cpu, default: cuda)
- `API_HOST` - API host (default: 0.0.0.0)
- `API_PORT` - API port (default: 11111)
- `TTS_STORAGE_DIR` - Storage directory (default: storage/audio)
- `TTS_DEFAULT_EXPIRY_HOURS` - Default file expiration (default: 2)
- `TTS_LOG_LEVEL` - Log level (default: warning)

## 📡 API Endpoints / Điểm cuối API

### Health Check / Kiểm tra Sức khỏe
```
GET /health
```

### Synthesize Speech / Tổng hợp Giọng nói
```
POST /api/tts/synthesize
```

**Request Body:**
```json
{
  "text": "Hello, this is a test of English TTS.",
  "model": "xtts-english",
  "speaker_wav": "/path/to/reference_voice.wav",  // Optional: for voice cloning
  "language": "en",  // Optional: language code (default: "en")
  "store": true,
  "return_audio": true
}
```

### Get Model Info / Lấy Thông tin Model
```
POST /api/tts/model/info
```

**Request Body:**
```json
{
  "model": "xtts-english"
}
```

## 🌍 Supported Languages / Ngôn ngữ Được hỗ trợ

XTTS-v2 supports 17 languages:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `pl` - Polish
- `tr` - Turkish
- `ru` - Russian
- `nl` - Dutch
- `cs` - Czech
- `ar` - Arabic
- `zh-cn` - Chinese
- `hu` - Hungarian
- `ko` - Korean
- `ja` - Japanese
- `hi` - Hindi

## 🎙️ Voice Cloning / Nhân bản Giọng nói

XTTS-v2 supports voice cloning with just 6+ seconds of reference audio:

XTTS-v2 hỗ trợ nhân bản giọng nói chỉ với 6+ giây audio tham chiếu:

```json
{
  "text": "Your text here",
  "model": "xtts-english",
  "speaker_wav": "/path/to/reference_voice.wav",  // 6+ seconds
  "language": "en"
}
```

## 🔍 Troubleshooting / Khắc phục Sự cố

### Backend won't start / Backend không khởi động

1. Check if venv exists: `Test-Path .\.venv\Scripts\python.exe`
2. Run setup: `.\setup.ps1`
3. Check logs: `logs\backend_error.log`

### Model not found / Không tìm thấy Model

1. Verify model path: `models/coqui-XTTS-v2`
2. Check if model files exist:
   - `config.json`
   - `model.pth`
   - `dvae.pth`
   - `vocab.json`

### Port already in use / Port đã được sử dụng

1. Stop existing backend: `python stop_backend.py`
2. Or change port in `config.py` or via `API_PORT` environment variable

## 📝 Notes / Ghi chú

- The backend uses the Coqui TTS repository from `tts/coqui-ai-TTS`
- Model files should be in `models/coqui-XTTS-v2/`
- Audio files are stored in `storage/audio/` with automatic expiration
- Voice cloning requires 6+ seconds of reference audio

## 🔗 Related / Liên quan

- **Model Repository:** `tts/coqui-ai-TTS`
- **Model Files:** `models/coqui-XTTS-v2`
- **Other Backends:** 
  - `tts/dangvansam-VietTTS-backend` (Vietnamese)
  - `tts/vieneu-tts-backend` (Vietnamese)

