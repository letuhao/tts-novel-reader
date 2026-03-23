# API Reference

Complete API endpoint documentation for the STT backend service.

## Base URL

```
http://localhost:11210
```

## Endpoints

### Health Check

Check if the service is running and healthy.

**Endpoint:** `GET /health`

**Method:** `GET`

**Response:**
```json
{
  "status": "healthy",
  "service": "STT Backend",
  "version": "1.0.0",
  "model": "faster-whisper-large-v3"
}
```

**Example:**
```bash
curl http://localhost:11210/health
```

---

### Root Endpoint

Get service information and available endpoints.

**Endpoint:** `GET /`

**Method:** `GET`

**Response:**
```json
{
  "service": "STT Backend",
  "version": "1.0.0",
  "model": "faster-whisper-large-v3",
  "docs": "/docs",
  "health": "/health",
  "endpoints": {
    "health": "/health",
    "api": "/api/stt",
    "transcribe": "POST /api/stt/transcribe",
    "transcribe_json": "POST /api/stt/transcribe/json"
  }
}
```

---

### Transcribe Audio

Transcribe an audio file to text.

**Endpoint:** `POST /api/stt/transcribe`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `audio` | File | Yes | - | Audio file to transcribe (WAV, MP3, M4A, FLAC, OGG, etc.) |
| `language` | String | No | `"en"` | Language code (e.g., "en", "es", "auto" for auto-detection) |
| `task` | String | No | `"transcribe"` | Task type: "transcribe" or "translate" (to English) |
| `beam_size` | Integer | No | `5` | Beam size for beam search (1-20) |
| `vad_filter` | Boolean | No | `true` | Enable Voice Activity Detection (filters silence) |
| `return_timestamps` | Boolean | No | `true` | Return segment-level timestamps |
| `word_timestamps` | Boolean | No | `false` | Return word-level timestamps (slower) |

**Request Example:**
```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=en&vad_filter=true" \
  -F "audio=@test_audio.wav"
```

**Response:**
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

**Response with Word Timestamps:**
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
        "end": 3.5,
        "words": [
          {
            "word": "Hello",
            "start": 0.0,
            "end": 0.5,
            "probability": 0.99
          },
          {
            "word": "this",
            "start": 0.6,
            "end": 0.8,
            "probability": 0.98
          }
        ]
      }
    ]
  }
}
```

---

### Transcribe Audio (JSON Body)

Alternative endpoint that accepts parameters in JSON body.

**Endpoint:** `POST /api/stt/transcribe/json`

**Method:** `POST`

**Content-Type:** `multipart/form-data`

**Request Body (JSON):**
```json
{
  "language": "en",
  "task": "transcribe",
  "beam_size": 5,
  "vad_filter": true,
  "return_timestamps": true,
  "word_timestamps": false
}
```

**Form Data:**
- `audio`: Audio file (multipart/form-data)

**Request Example:**
```bash
curl -X POST "http://localhost:11210/api/stt/transcribe/json" \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@test_audio.wav" \
  -F 'json={"language":"en","vad_filter":true}'
```

**Response:** Same as `/api/stt/transcribe`

---

## Error Responses

### 400 Bad Request

```json
{
  "detail": "Audio file is required"
}
```

### 404 Not Found

```json
{
  "detail": "Endpoint not found"
}
```

### 500 Internal Server Error

```json
{
  "detail": "Transcription failed: <error message>"
}
```

---

## Supported Audio Formats

- WAV
- MP3
- M4A
- FLAC
- OGG
- WebM
- And other formats supported by `faster-whisper`

---

## Language Codes

Common language codes:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ja` - Japanese
- `zh` - Chinese
- `auto` - Auto-detect language

See [Whisper documentation](https://github.com/openai/whisper) for full list of 99 supported languages.

---

## Rate Limiting

Currently, there is no rate limiting implemented. However, for production use, consider:
- Implementing request queuing for concurrent requests
- Using a load balancer for multiple instances
- Monitoring GPU memory usage

---

## See Also

- [API Examples](./API_EXAMPLES.md) - Code examples
- [Response Formats](./RESPONSE_FORMATS.md) - Detailed response structure
- [Integration Guide](./INTEGRATION.md) - Integration examples

