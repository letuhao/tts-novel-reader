# TTS Integration Review

Review of the TTS (Text-to-Speech) integration between English Tutor backend and Coqui TTS backend.

## Current Status

✅ **TTS Backend:** Running at `http://localhost:11111`  
✅ **English Tutor Backend:** Can connect to TTS backend  
⚠️ **Integration:** Partially working, needs fixes

---

## TTS Backend API Structure

### Actual Endpoints (Coqui TTS Backend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/tts/synthesize` | POST | Synthesize speech |
| `/api/tts/speakers` | GET | Get available speakers |
| `/api/tts/model/info` | POST | Get model information |
| `/api/tts/audio/{file_id}` | GET | Get stored audio file |
| `/api/tts/audio/{file_id}/metadata` | GET | Get audio metadata |
| `/api/tts/audio/{file_id}` | DELETE | Delete audio file |
| `/api/tts/storage/stats` | GET | Storage statistics |
| `/api/tts/storage/cleanup` | POST | Manual cleanup |

### Request Format

**Synthesize Request:**
```json
{
  "text": "Hello, this is a test.",
  "model": "xtts-english",
  "speaker_wav": "/path/to/reference.wav",  // Optional: voice cloning
  "speaker": "Ana Florence",                 // Optional: built-in speaker
  "language": "en",                          // Optional: default "en"
  "store": true,                            // Optional: default true
  "expiry_hours": null,                     // Optional: default from config
  "return_audio": true                      // Optional: default true
}
```

**Response Format:**
- If `return_audio: true`: Returns audio file (WAV) with headers:
  - `X-Request-ID`
  - `X-Sample-Rate`
  - `X-Duration`
- If `return_audio: false`: Returns JSON with metadata:
  ```json
  {
    "success": true,
    "request_id": "...",
    "model": "xtts-english",
    "sample_rate": 24000,
    "duration_seconds": 3.5,
    "file_metadata": {
      "file_id": "...",
      "file_path": "...",
      "file_name": "...",
      "text": "...",
      "created_at": "...",
      "expires_at": "..."
    }
  }
  ```

---

## Current Integration Issues

### Issue 1: Voices Endpoint Mismatch

**Problem:**
- English Tutor backend calls: `/api/tts/voices`
- TTS backend provides: `/api/tts/speakers`

**Current Code:**
```typescript
// english-tutor-app/backend/src/services/tts/ttsService.ts
const response = await this.client.get('/api/tts/voices', { timeout: 5000 });
```

**Fix Needed:**
- Change to `/api/tts/speakers`
- Update response parsing (returns `{ success: true, total: number, speakers: string[] }`)

---

### Issue 2: Synthesize Request Format Mismatch

**Problem:**
- English Tutor sends: `{ text, voice, speed, model, store, expiryHours }`
- TTS backend expects: `{ text, model, speaker_wav, speaker, language, store, expiry_hours, return_audio }`

**Current Code:**
```typescript
const ttsRequest = {
  text: text,
  model: model,
  speed_factor: speed,  // ❌ Not supported by XTTS
  store: store,
  expiry_hours: expiryHours,
  return_audio: true,
  trim_silence: true,   // ❌ Not supported
  normalize: false,    // ❌ Not supported
};
```

**Issues:**
1. `speed_factor` - XTTS doesn't support speed control directly
2. `trim_silence` - Not a parameter in XTTS API
3. `normalize` - Not a parameter in XTTS API
4. `voice` parameter - Should map to `speaker` or `speaker_wav`

---

### Issue 3: Response Format Mismatch

**Problem:**
- English Tutor expects: `{ fileId, audioUrl, duration, metadata }`
- TTS backend returns: Audio file (binary) or JSON with different structure

**Current Code:**
```typescript
// Expects headers: x-file-id, x-expires-at
const fileId = response.headers['x-file-id'];
const expiresAt = response.headers['x-expires-at'];
```

**Actual Headers:**
- `X-Request-ID` (not `x-file-id`)
- `X-Sample-Rate`
- `X-Duration`
- File ID is in response body when `return_audio: false`

---

## Recommended Fixes

### Fix 1: Update Voices Endpoint

```typescript
async getVoices(): Promise<string[]> {
  try {
    await this.loadSettings();
    
    // Use correct endpoint
    const response = await this.client.get('/api/tts/speakers', { timeout: 5000 });
    
    if (response.data && response.data.success && Array.isArray(response.data.speakers)) {
      return response.data.speakers as string[];
    }
    
    // Fallback: return default voices
    return ['tutor_female', 'tutor_male'];
  } catch (error) {
    logger.warn({ err: error }, 'Failed to get speakers, using defaults');
    return ['tutor_female', 'tutor_male'];
  }
}
```

### Fix 2: Update Synthesize Request

```typescript
async synthesize(request: TTSRequest): Promise<TTSResponse> {
  try {
    await this.loadSettings();
    
    const {
      text,
      voice,  // Map to speaker
      speed,  // Note: XTTS doesn't support speed control
      model = 'xtts-english',
      store = true,
      expiryHours,
    } = request;
    
    // Prepare request for XTTS backend
    const ttsRequest: any = {
      text: text,
      model: model,
      language: 'en',  // Default to English
      store: store,
      return_audio: true,  // Get audio in response
    };
    
    // Map voice to speaker (if provided)
    if (voice) {
      // Check if it's a built-in speaker name or needs speaker_wav
      if (voice.startsWith('/') || voice.includes('\\')) {
        // It's a file path
        ttsRequest.speaker_wav = voice;
      } else {
        // It's a speaker name
        ttsRequest.speaker = voice;
      }
    }
    
    if (expiryHours) {
      ttsRequest.expiry_hours = expiryHours;
    }
    
    // Note: speed control not available in XTTS
    // Would need post-processing or different model
    
    const response = await this.client.post('/api/tts/synthesize', ttsRequest, {
      responseType: 'arraybuffer',
      timeout: 120000,
    });
    
    // Extract metadata from headers
    const requestId = response.headers['x-request-id'] as string | undefined;
    const sampleRate = response.headers['x-sample-rate'] as string | undefined;
    const duration = response.headers['x-duration'] as string | undefined;
    
    const audioData = Buffer.from(response.data);
    
    // If we need file ID, we should call with return_audio: false first
    // Or parse from response if available
    
    return {
      success: true,
      fileId: requestId,  // Use request ID as file ID for now
      duration: duration ? parseFloat(duration) : undefined,
      metadata: {
        text,
        voice: voice || 'default',
        speed: speed || 1.0,
        expiresAt: undefined,  // Would need separate call to get this
      },
    };
  } catch (error) {
    // Error handling...
  }
}
```

### Fix 3: Handle Two Response Modes

**Option A: Get Audio Directly (Current)**
- Set `return_audio: true`
- Receive audio file in response
- Extract metadata from headers

**Option B: Get File ID First (Recommended)**
- First call: `return_audio: false` to get file metadata
- Second call: Use file ID to retrieve audio
- Better for caching and management

---

## Model Information

### XTTS-v2 English Model

- **Model Name:** `xtts-english`
- **Sample Rate:** 24000 Hz
- **Languages:** 17 languages (en, es, fr, de, it, pt, pl, tr, ru, nl, cs, ar, zh-cn, hu, ko, ja, hi)
- **Voice Cloning:** Yes (requires 6+ seconds reference audio)
- **Built-in Speakers:** 58+ speakers available
- **Speed Control:** Not directly supported (would need post-processing)

---

## Recommendations

### 1. Update Service Implementation

- ✅ Fix voices endpoint (`/api/tts/speakers`)
- ✅ Fix synthesize request format
- ✅ Handle XTTS-specific parameters (`speaker`, `speaker_wav`)
- ✅ Remove unsupported parameters (`speed_factor`, `trim_silence`, `normalize`)
- ✅ Update response parsing

### 2. Add Speed Control (Future)

Since XTTS doesn't support speed control:
- Option A: Post-process audio (change playback speed)
- Option B: Use different model that supports speed
- Option C: Accept limitation and document it

### 3. Improve File Management

- Use two-step process: get file ID, then retrieve audio
- Better caching and expiration handling
- Support for file metadata retrieval

### 4. Add Speaker Selection

- Map `voice` parameter to `speaker` (built-in) or `speaker_wav` (custom)
- Provide list of available speakers
- Support voice cloning with reference audio

---

## Testing Checklist

- [ ] Health check works
- [ ] Get speakers list works
- [ ] Synthesize with default speaker works
- [ ] Synthesize with named speaker works
- [ ] Synthesize with voice cloning works
- [ ] Get audio by file ID works
- [ ] Error handling works correctly
- [ ] Settings hot-reload works

---

## Next Steps

1. **Fix voices endpoint** - Change to `/api/tts/speakers`
2. **Fix synthesize request** - Update to match XTTS API
3. **Update response handling** - Handle binary audio and headers correctly
4. **Test integration** - Verify all endpoints work
5. **Document limitations** - Speed control, etc.

---

**Status:** ⚠️ **NEEDS FIXES**  
**Priority:** High  
**Estimated Time:** 1-2 hours

