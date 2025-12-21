# STT Backend Service

Speech-to-Text backend service using faster-whisper with Whisper Large V3 model.

## Features

- ✅ **Fast Inference:** Uses faster-whisper (CTranslate2) for optimized performance
- ✅ **Real-time Capable:** Optimized for real-time transcription on RTX 4090
- ✅ **High Accuracy:** Whisper Large V3 model (state-of-the-art)
- ✅ **Multi-language:** Supports 99 languages (including English)
- ✅ **Voice Activity Detection:** Filters out silence automatically
- ✅ **Timestamps:** Segment-level and word-level timestamps support
- ✅ **Translation:** Can translate speech to English

## Model

Uses the existing model at `models/faster-whisper-large-v3`:
- **Format:** CTranslate2 (optimized)
- **Quantization:** FP16 (float16)
- **Size:** ~2.9 GB
- **Source:** OpenAI Whisper Large V3

## Installation

1. **Install dependencies:**
```bash
cd stt
pip install -r requirements.txt
```

2. **Verify model exists:**
The model should be at `../models/faster-whisper-large-v3/`

## Configuration

Environment variables (optional):
```env
STT_DEVICE=cuda              # cuda, cpu, auto
STT_COMPUTE_TYPE=float16     # float16, int8_float16, int8
STT_LANGUAGE=en              # Default language code
STT_API_HOST=0.0.0.0         # API host
STT_API_PORT=11210           # API port
STT_LOG_LEVEL=info           # Logging level
STT_NUM_WORKERS=4            # CPU workers for preprocessing
```

## Running

### Development Mode
```bash
python main.py
```

### Production Mode (using uvicorn)
```bash
uvicorn main:app --host 0.0.0.0 --port 11210
```

The service will be available at:
- **API:** http://localhost:11210
- **Docs:** http://localhost:11210/docs
- **Health:** http://localhost:11210/health

## API Endpoints

### Health Check
```
GET /health
```

### Transcribe Audio
```
POST /api/stt/transcribe
Content-Type: multipart/form-data

Parameters:
- audio: Audio file (WAV, MP3, M4A, FLAC, etc.)
- language: Language code (e.g., "en", "auto")
- task: "transcribe" or "translate"
- beam_size: Beam size (1-20, default: 5)
- vad_filter: Enable VAD (default: true)
- return_timestamps: Return timestamps (default: true)
- word_timestamps: Word-level timestamps (default: false)
```

### Example Request

```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=en&vad_filter=true" \
  -F "audio=@test_audio.wav"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "text": "Hello, this is a test transcription.",
    "language": "en",
    "language_probability": 0.99,
    "segments": [
      {
        "text": "Hello, this is a test transcription.",
        "start": 0.0,
        "end": 3.5
      }
    ]
  }
}
```

## Performance

On RTX 4090:
- **Latency:** 50-100ms per second of audio
- **Real-time Factor:** 0.05-0.1x (10-20x faster than real-time)
- **VRAM Usage:** ~6-8GB

## Integration with English Tutor App

The STT backend is integrated with the English Tutor app backend:
- **Port:** 11210 (configured in system settings)
- **Service URL:** http://127.0.0.1:11210
- **Integration:** See `english-tutor-app/backend/src/services/stt/` (to be created)

## Notes

- First request may be slower due to model loading
- Model is loaded lazily on first request (or preloaded at startup)
- Audio files are temporarily saved for processing
- Supports common audio formats: WAV, MP3, M4A, FLAC, OGG, etc.

## Troubleshooting

1. **Model not found:**
   - Verify model exists at `../models/faster-whisper-large-v3/`
   - Check `model.bin` file is present

2. **CUDA errors:**
   - Set `STT_DEVICE=cpu` to use CPU (slower)
   - Verify CUDA is installed and available

3. **Out of memory:**
   - Use `STT_COMPUTE_TYPE=int8_float16` for lower memory usage
   - Close other GPU applications

## References

- [faster-whisper](https://github.com/guillaumekln/faster-whisper)
- [Whisper Large V3](https://huggingface.co/openai/whisper-large-v3)
- [CTranslate2](https://github.com/OpenNMT/CTranslate2)

