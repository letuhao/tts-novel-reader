# Comparison: Coqui TTS Repository vs Backend
# So sánh: Repository Coqui TTS vs Backend

## 📊 Overview / Tổng quan

| Aspect | `tts/coqui-ai-TTS` | `tts/coqui-ai-tts-backend` |
|--------|-------------------|---------------------------|
| **Type** | Original Library / Thư viện gốc | Backend Service / Dịch vụ Backend |
| **Purpose** | TTS library with 1100+ languages | FastAPI backend for XTTS-v2 English |
| **Size** | ~1000+ files, full library | ~15 files, minimal wrapper |
| **Dependencies** | Full TTS ecosystem | Minimal (coqui-tts + FastAPI) |
| **Usage** | Python library import | HTTP API service |

---

## 🎯 Purpose / Mục đích

### `tts/coqui-ai-TTS` (Original Repository)
- **Full TTS Library** - Complete Coqui TTS implementation
- **1100+ Languages** - Supports many languages and models
- **Training Tools** - Includes training, fine-tuning, dataset analysis
- **Multiple Models** - Tacotron, Glow-TTS, XTTS, Bark, Tortoise, etc.
- **Research & Development** - For model development and experimentation

### `tts/coqui-ai-tts-backend` (Backend Service)
- **Production Backend** - FastAPI service for production use
- **XTTS-v2 Focus** - Specifically for XTTS-v2 English TTS
- **HTTP API** - RESTful API endpoints
- **Audio Storage** - File management with expiration
- **Microservice** - Designed for microservice architecture

---

## 📁 Directory Structure / Cấu trúc Thư mục

### `tts/coqui-ai-TTS` (Original)
```
coqui-ai-TTS/
├── TTS/                    # Main library package
│   ├── api.py             # High-level TTS API
│   ├── tts/               # TTS models (100+ files)
│   ├── vocoder/           # Vocoder models
│   ├── encoder/            # Speaker encoders
│   ├── vc/                # Voice conversion
│   ├── utils/             # Utilities
│   └── bin/               # CLI tools
├── recipes/               # Training recipes
├── notebooks/             # Jupyter notebooks
├── tests/                 # Test suite
├── docs/                  # Documentation
├── setup.py               # Package setup
└── requirements.txt        # Dependencies
```

**Key Files:**
- `TTS/api.py` - High-level Python API (`TTS` class)
- `TTS/tts/models/xtts.py` - XTTS model implementation
- `TTS/utils/synthesizer.py` - Synthesizer interface
- `setup.py` - Package installation

### `tts/coqui-ai-tts-backend` (Backend)
```
coqui-ai-tts-backend/
├── tts_backend/
│   ├── models/
│   │   └── xtts_english.py    # Wrapper for XTTS-v2
│   ├── api.py                 # FastAPI endpoints
│   ├── config.py              # Configuration
│   ├── service.py             # TTS service layer
│   └── storage.py             # Audio storage
├── main.py                    # FastAPI app
├── requirements.txt           # Minimal dependencies
├── setup.ps1                  # Setup script
└── run.ps1                    # Run script
```

**Key Files:**
- `tts_backend/models/xtts_english.py` - Wraps `TTS.api.TTS`
- `tts_backend/api.py` - HTTP endpoints
- `tts_backend/service.py` - Service layer
- `main.py` - FastAPI application

---

## 🔌 API / Interface

### `tts/coqui-ai-TTS` (Python Library)

**Direct Python Usage:**
```python
from TTS.api import TTS

# Initialize
tts = TTS(
    model_name="tts_models/multilingual/multi-dataset/xtts_v2",
    gpu=True
)

# Synthesize
wav = tts.tts(
    text="Hello world",
    speaker_wav="reference.wav",
    language="en"
)

# Save to file
tts.tts_to_file(
    text="Hello world",
    speaker_wav="reference.wav",
    language="en",
    file_path="output.wav"
)
```

**Features:**
- Direct Python import
- Multiple models support
- Training/fine-tuning tools
- Dataset analysis
- CLI tools

### `tts/coqui-ai-tts-backend` (HTTP API)

**HTTP API Usage:**
```bash
POST http://localhost:11111/api/tts/synthesize
Content-Type: application/json

{
  "text": "Hello world",
  "model": "xtts-english",
  "speaker_wav": "/path/to/reference.wav",
  "language": "en",
  "store": true,
  "return_audio": true
}
```

**Features:**
- RESTful HTTP API
- Audio storage management
- File expiration
- Background processing
- Microservice ready

---

## 📦 Dependencies / Phụ thuộc

### `tts/coqui-ai-TTS` (Original)

**Full Dependencies:**
```txt
torch
torchaudio
transformers
einops
encodec
pysbd
numpy
librosa
soundfile
# ... 50+ more dependencies
```

**Installation:**
```bash
pip install TTS
# or
pip install coqui-tts
```

### `tts/coqui-ai-tts-backend` (Backend)

**Minimal Dependencies:**
```txt
coqui-tts>=0.22.0
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.11.3
soundfile>=0.13.1
numpy>=1.24.0
```

**Installation:**
```bash
pip install -r requirements.txt
```

**Note:** Backend uses `coqui-tts` package (which wraps the original library)

---

## 🔄 Relationship / Mối quan hệ

### How They Connect / Cách chúng kết nối

```
┌─────────────────────────────────┐
│  tts/coqui-ai-TTS               │
│  (Original Library)             │
│  - TTS.api.TTS class            │
│  - XTTS model implementation   │
│  - Full TTS ecosystem           │
└──────────────┬──────────────────┘
               │
               │ Uses / Sử dụng
               │
               ▼
┌─────────────────────────────────┐
│  tts/coqui-ai-tts-backend       │
│  (Backend Service)              │
│  - Wraps TTS.api.TTS            │
│  - Adds FastAPI layer          │
│  - Adds storage management     │
└─────────────────────────────────┘
```

### Code Flow / Luồng Mã

**Backend Wrapper:**
```python
# tts_backend/models/xtts_english.py
from TTS.api import TTS  # ← Uses original library

class XTTSEnglishWrapper:
    def __init__(self):
        self.tts = TTS(
            model_name="tts_models/multilingual/multi-dataset/xtts_v2",
            gpu=True
        )
    
    def synthesize(self, text, speaker_wav, language):
        return self.tts.tts(text, speaker_wav=speaker_wav, language=language)
```

**Backend API:**
```python
# tts_backend/api.py
@router.post("/synthesize")
async def synthesize_speech(request):
    service = get_service()
    audio = service.synthesize(...)  # ← Uses wrapper
    return audio
```

---

## 🎯 Use Cases / Trường hợp Sử dụng

### Use `tts/coqui-ai-TTS` When:
- ✅ Developing new TTS models
- ✅ Training/fine-tuning models
- ✅ Experimenting with different models
- ✅ Need full library features
- ✅ Direct Python integration
- ✅ Research and development

### Use `tts/coqui-ai-tts-backend` When:
- ✅ Production deployment
- ✅ Microservice architecture
- ✅ HTTP API needed
- ✅ Audio file management required
- ✅ Multiple clients need TTS
- ✅ Simple integration (just HTTP calls)

---

## 📊 Comparison Table / Bảng So sánh

| Feature | `coqui-ai-TTS` | `coqui-ai-tts-backend` |
|---------|---------------|----------------------|
| **Language** | Python Library | Python + HTTP API |
| **Models** | 100+ models | XTTS-v2 only |
| **Languages** | 1100+ languages | 17 languages (XTTS-v2) |
| **Training** | ✅ Yes | ❌ No |
| **Fine-tuning** | ✅ Yes | ❌ No |
| **CLI Tools** | ✅ Yes | ❌ No |
| **HTTP API** | ❌ No | ✅ Yes |
| **Audio Storage** | ❌ No | ✅ Yes |
| **File Expiration** | ❌ No | ✅ Yes |
| **Microservice** | ❌ No | ✅ Yes |
| **Setup Complexity** | Medium | Low |
| **Dependencies** | 50+ packages | 10 packages |
| **File Count** | 1000+ files | ~15 files |
| **Size** | ~500MB+ | ~50KB |

---

## 🔧 Integration / Tích hợp

### Option 1: Use Backend (Recommended for Production)
```python
# Client code
import requests

response = requests.post(
    "http://localhost:11111/api/tts/synthesize",
    json={
        "text": "Hello world",
        "model": "xtts-english",
        "language": "en"
    }
)
audio = response.content
```

### Option 2: Use Library Directly
```python
# Direct library usage
from TTS.api import TTS

tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2")
wav = tts.tts("Hello world", language="en")
```

---

## 📝 Summary / Tóm tắt

### `tts/coqui-ai-TTS` (Original)
- **Full-featured TTS library**
- **Research and development tool**
- **Multiple models and languages**
- **Training and fine-tuning support**
- **Direct Python integration**

### `tts/coqui-ai-tts-backend` (Backend)
- **Production-ready HTTP API**
- **Minimal wrapper around XTTS-v2**
- **Audio storage management**
- **Microservice architecture**
- **Simple HTTP integration**

### Relationship
- **Backend wraps the library** - Uses `TTS.api.TTS` from original
- **Backend adds HTTP layer** - FastAPI endpoints
- **Backend adds storage** - File management
- **Backend simplifies** - Focused on XTTS-v2 English

---

## ✅ Conclusion / Kết luận

**For Production Use:** Use `tts/coqui-ai-tts-backend`
- Simple HTTP API
- Audio storage included
- Microservice ready
- Minimal dependencies

**For Development/Research:** Use `tts/coqui-ai-TTS`
- Full library features
- Training tools
- Multiple models
- Direct Python access

**Best Practice:** Use backend for production, library for development.

