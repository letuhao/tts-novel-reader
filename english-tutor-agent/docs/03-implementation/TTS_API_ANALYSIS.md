# TTS API Analysis - So sánh với english-tutor-app
## Phân tích cách english-tutor-app giao tiếp với Coqui TTS

**Date:** 2025-12-22  
**Status:** ✅ Fixed

---

## 🔍 Phân tích TypeScript Implementation

### Key Differences Found

#### 1. Health Check Endpoint
- ✅ **TypeScript:** `/health` (not `/api/tts/health`)
- ❌ **Python (before):** `/api/tts/health`
- ✅ **Python (after):** `/health` - Fixed

#### 2. API Request Format

**TypeScript Code:**
```typescript
const ttsRequest: Record<string, unknown> = {
  text: text,
  model: model === 'dia' ? 'xtts-english' : model, // Map 'dia' to 'xtts-english'
  language: 'en', // Default to English
  store: store,
  return_audio: true, // First call to get audio
};

// Map voice parameter to speaker or speaker_wav
if (voice) {
  if (voice.startsWith('/') || voice.includes('\\') || voice.includes('.')) {
    ttsRequest.speaker_wav = voice; // Voice cloning
  } else {
    ttsRequest.speaker = voice; // Speaker name
  }
}
```

**Python Implementation (now matches):**
```python
request_data = {
    "text": text,
    "model": model,  # "xtts-english"
    "language": language,  # "en"
    "store": store,
    "return_audio": return_audio,  # False for metadata only
}

if speaker:
    if speaker.startswith('/') or '\\' in speaker or '.' in speaker:
        request_data["speaker_wav"] = speaker
    else:
        request_data["speaker"] = speaker
```

#### 3. Response Handling

**TypeScript Logic:**
1. First call with `return_audio: true` → Get binary audio + headers (x-request-id, x-duration)
2. Second call with `return_audio: false` → Get JSON with `file_metadata` (file_id, expires_at)

**Python Implementation:**
- Single call with `return_audio: false` → Get JSON response directly
- Response format: `{ success, request_id, model, sample_rate, duration_seconds, file_metadata }`
- `file_metadata` contains: `{ file_id, expires_at, ... }`

#### 4. Response Parsing

**TypeScript:**
```typescript
// Extract from headers (when return_audio: true)
const requestId = response.headers['x-request-id'];
const duration = response.headers['x-duration'];

// Extract from JSON (when return_audio: false)
if (metadataResponse.data && metadataResponse.data.file_metadata) {
  fileId = metadataResponse.data.file_metadata.file_id;
  expiresAt = metadataResponse.data.file_metadata.expires_at;
}
```

**Python (fixed):**
```python
result = response.json()
# Backend returns: { success, request_id, model, sample_rate, duration_seconds, file_metadata }
# Extract file_id for easier access
if "file_metadata" in result and result["file_metadata"]:
    result["file_id"] = result["file_metadata"].get("file_id")
    result["expires_at"] = result["file_metadata"].get("expires_at")
    result["duration_seconds"] = result.get("duration_seconds", 0)
    result["sample_rate"] = result.get("sample_rate", 24000)
```

---

## ✅ Changes Made

### 1. Health Check Endpoint
```python
# Before
endpoint = f"{tts_url}/api/tts/health"

# After (matches TypeScript)
endpoint = f"{tts_url}/health"
```

### 2. Response Parsing
```python
# Before
result = response.json()
file_id = result.get('file_metadata', {}).get('file_id')

# After (handle both top-level and nested file_id)
result = response.json()
if "file_metadata" in result and result["file_metadata"]:
    result["file_id"] = result["file_metadata"].get("file_id")
    result["expires_at"] = result["file_metadata"].get("expires_at")
```

### 3. Pipeline Agent - Metadata Extraction
```python
# Before
file_metadata = tts_result.get("file_metadata")
if not file_metadata:
    raise ValueError("No file_metadata in TTS response")
file_id = file_metadata.get("file_id")

# After (more flexible)
file_metadata = tts_result.get("file_metadata") or {}
file_id = tts_result.get("file_id") or file_metadata.get("file_id")
```

---

## 📋 API Contract (Coqui XTTS Backend)

### Request Format
```json
{
  "text": "Hello, how are you?",
  "model": "xtts-english",
  "speaker": "Ana Florence",  // or "speaker_wav": "/path/to/audio.wav"
  "language": "en",
  "store": true,
  "return_audio": false,  // false = JSON response, true = binary audio
  "expiry_hours": 24
}
```

### Response Format (return_audio: false)
```json
{
  "success": true,
  "request_id": "uuid-here",
  "model": "xtts-english",
  "sample_rate": 24000,
  "duration_seconds": 2.5,
  "file_metadata": {
    "file_id": "file-uuid-here",
    "expires_at": "2025-12-23T12:00:00Z",
    ...
  }
}
```

### Response Format (return_audio: true)
- Content-Type: `audio/wav`
- Headers:
  - `X-Request-ID`: request UUID
  - `X-Sample-Rate`: sample rate (e.g., "24000")
  - `X-Duration`: duration in seconds (e.g., "2.5")
- Body: Binary WAV audio data

---

## 🔑 Key Insights

1. **Health Check:** Uses `/health`, not `/api/tts/health`
2. **Model Mapping:** TypeScript maps "dia" → "xtts-english" (for backward compatibility)
3. **Two-Call Pattern:** TypeScript makes 2 calls (audio + metadata), but for agent we only need metadata
4. **Speaker Parameter:** Can be speaker name OR file path (for voice cloning)
5. **Response Structure:** `file_metadata` is nested, but we extract `file_id` to top level for easier access

---

## ✅ Verification Checklist

- [x] Health check endpoint fixed (`/health`)
- [x] API request format matches TypeScript
- [x] Response parsing handles nested `file_metadata`
- [x] Speaker parameter logic matches (name vs file path)
- [x] Model defaults to "xtts-english"
- [x] Language defaults to "en"
- [x] Error handling matches TypeScript patterns

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-22  
**Status:** ✅ Code matches TypeScript implementation pattern

