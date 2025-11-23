# DangVanSam VietTTS Backend
# Backend DangVanSam VietTTS

Vietnamese TTS Backend using DangVanSam VietTTS model with 100% VietTTS environment compatibility.

Backend TTS tiếng Việt sử dụng model DangVanSam VietTTS với 100% tương thích môi trường VietTTS.

## 🎯 Features / Tính năng

- ✅ **100% VietTTS Environment Compatible** - Uses cloned venv from `tts/viet-tts`
- ✅ **24 Built-in Voices** - Access to all VietTTS built-in voices
- ✅ **Voice Cloning** - Support for custom voice files
- ✅ **FastAPI API** - Modern async API with OpenAPI docs
- ✅ **Audio Storage** - Automatic file management with expiration
- ✅ **GPU Optimized** - TF32 support for RTX 4090

## 🚀 Quick Start / Bắt đầu Nhanh

### 1. Setup / Cài đặt

```powershell
# Run setup script
.\setup.ps1
```

This will:
- Clone virtual environment from `tts/viet-tts` (if available)
- Or create a new venv
- Install additional dependencies (FastAPI, uvicorn, etc.)

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
dangvansam-VietTTS-backend/
├── tts_backend/
│   ├── models/
│   │   └── viet_tts.py      # VietTTS model wrapper
│   ├── api.py                # FastAPI endpoints
│   ├── config.py             # Configuration
│   ├── service.py            # TTS service
│   └── storage.py            # Audio storage management
├── logs/                     # Log files
├── main.py                   # FastAPI application
├── requirements.txt          # Python dependencies
├── setup.ps1                 # Setup script
├── clone_venv.ps1           # Clone venv script
├── run.ps1                   # Run backend (interactive)
├── start_backend.ps1         # Start backend (background)
└── stop_backend.py           # Stop backend
```

## 🔧 Configuration / Cấu hình

### Model Path / Đường dẫn Model

The backend uses model from: `models/dangvansam-viet-tts`

Backend sử dụng model từ: `models/dangvansam-viet-tts`

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

### Get Available Voices / Lấy Giọng có sẵn
```
GET /api/tts/voices
```

### Synthesize Speech / Tổng hợp Giọng nói
```
POST /api/tts/synthesize
```

**Request Body:**
```json
{
  "text": "Xin chào Việt Nam",
  "model": "viet-tts",
  "voice": "cdteam",  // Optional: voice name
  "voice_file": null,  // Optional: path to custom voice file
  "speed": 1.0,       // Optional: 0.5-2.0
  "store": true,      // Optional: store audio file
  "return_audio": true // Optional: return audio in response
}
```

### Get Audio File / Lấy File Audio
```
GET /api/tts/audio/{file_id}
```

### Get Model Info / Lấy Thông tin Model
```
POST /api/tts/model/info
```

**Request Body:**
```json
{
  "model": "viet-tts"
}
```

## 🎙️ Available Voices / Giọng có sẵn

The backend supports all 24 built-in voices from VietTTS:

- `cdteam`, `nsnd-le-chuc`, `atuan`, `diep-chi`, `doremon`, `jack-sparrow`, `son-tung-mtp`
- `speechify_1` through `speechify_12`
- `nguyen-ngoc-ngan`, `nu-nhe-nhang`, `quynh`
- `cross_lingual_prompt`, `zero_shot_prompt`

See `/api/tts/voices` for complete list.

## 🔍 Troubleshooting / Khắc phục Sự cố

### Backend won't start / Backend không khởi động

1. Check if venv exists: `Test-Path .\.venv\Scripts\python.exe`
2. Run setup: `.\setup.ps1`
3. Check logs: `logs\backend_error.log`

### Model not found / Không tìm thấy Model

1. Verify model path: `models/dangvansam-viet-tts`
2. Check if model files exist:
   - `config.yaml`
   - `llm.pt`
   - `flow.pt`
   - `hift.pt`
   - `speech_embedding.onnx`
   - `speech_tokenizer.onnx`

### Port already in use / Port đã được sử dụng

1. Stop existing backend: `python stop_backend.py`
2. Or change port in `config.py` or via `API_PORT` environment variable

## 📝 Notes / Ghi chú

- The backend clones the venv from `tts/viet-tts` to ensure 100% compatibility
- Model files should be in `models/dangvansam-viet-tts/`
- Voice samples are loaded from `tts/viet-tts/samples/`
- Audio files are stored in `storage/audio/` with automatic expiration

## 🔗 Related / Liên quan

- **Model Repository:** `tts/viet-tts`
- **Model Files:** `models/dangvansam-viet-tts`
- **Original Backend:** `tts/vieneu-tts-backend` (for reference)

