# Frequently Asked Questions (FAQ)

Common questions about the STT backend service.

## General Questions

### What is faster-whisper?

**faster-whisper** is an optimized implementation of OpenAI's Whisper model using CTranslate2. It provides 4-10x faster inference while maintaining the same accuracy as the original Whisper model.

### Why use faster-whisper instead of standard Whisper?

- **4-10x faster** inference speed
- **Lower memory usage** (~50% reduction)
- **Same accuracy** as original Whisper
- **Optimized for GPU** with CTranslate2 backend

### What model is being used?

The service uses **Whisper Large V3** in CTranslate2 format (faster-whisper), located at `models/faster-whisper-large-v3/`.

---

## Performance Questions

### How fast is the transcription?

On RTX 4090:
- **Latency:** 50-100ms per second of audio
- **Real-time Factor:** 0.05-0.1x (10-20x faster than real-time)
- **30-second audio:** ~1.5-3 seconds

### Can it handle real-time transcription?

Yes! The service is optimized for real-time transcription on RTX 4090. For real-time use:
- Process audio in small chunks (1-5 seconds)
- Use streaming approach (process chunks as they arrive)
- Expected latency: 50-100ms per chunk

### Why is the first request slow?

The first request loads the model into memory. This takes 5-10 seconds. Subsequent requests are fast. The model is preloaded at startup to minimize this delay.

---

## Configuration Questions

### What's the difference between FP16 and INT8?

- **FP16 (float16):** Best balance of speed and accuracy (recommended)
- **INT8:** Faster but slightly less accurate (~1-2% WER increase)

### Should I use GPU or CPU?

**Use GPU if available:**
- 10-30x faster than CPU
- RTX 4090 recommended
- Requires CUDA setup

**Use CPU if:**
- No GPU available
- GPU memory is limited
- Much slower but works

### What language codes are supported?

99 languages are supported. Common ones:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `auto` - Auto-detect

See [Whisper documentation](https://github.com/openai/whisper) for full list.

---

## Usage Questions

### What audio formats are supported?

- WAV
- MP3
- M4A
- FLAC
- OGG
- WebM
- And other formats supported by faster-whisper

### Can I transcribe long audio files?

Yes, but consider:
- Very long files (>10 minutes) may take time
- Split into chunks for better performance
- Monitor memory usage

### Can I translate speech to English?

Yes! Use `task=translate` parameter:
```bash
curl -X POST "http://localhost:11210/api/stt/transcribe?language=es&task=translate" \
  -F "audio=@spanish_audio.wav"
```

---

## Technical Questions

### How much VRAM does it use?

On RTX 4090 with FP16:
- **Base model:** ~4GB
- **Inference overhead:** ~2-4GB
- **Total:** ~6-8GB

### Can I run multiple instances?

Yes, but:
- Each instance uses ~6-8GB VRAM
- RTX 4090 (24GB) can handle 2-3 instances
- Consider request queuing for single instance

### Is the model loaded in memory?

Yes, the model is loaded into GPU memory at startup (or first request). This provides fast inference but uses VRAM.

---

## Integration Questions

### How do I integrate with my application?

See [Integration Guide](./INTEGRATION.md) for detailed examples:
- Node.js/TypeScript
- Python
- JavaScript/Browser
- English Tutor app

### Can I use it from a web browser?

Yes! Use the REST API from JavaScript:
```javascript
const formData = new FormData();
formData.append('audio', audioFile);

const response = await fetch('http://localhost:11210/api/stt/transcribe', {
  method: 'POST',
  body: formData
});
```

### How do I handle errors?

The API returns error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

Check the error message and handle accordingly. See [Troubleshooting Guide](./TROUBLESHOOTING.md).

---

## Troubleshooting Questions

### Service won't start

1. Check port 11210 is not in use
2. Verify dependencies are installed
3. Check model exists at correct path
4. See [Troubleshooting Guide](./TROUBLESHOOTING.md)

### CUDA errors

1. Verify GPU: `nvidia-smi`
2. Install CUDA Toolkit
3. Use CPU mode: `STT_DEVICE=cpu`
4. See [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Out of memory

1. Use INT8: `STT_COMPUTE_TYPE=int8_float16`
2. Close other GPU applications
3. Use CPU mode if needed
4. See [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

## See Also

- [Quick Start Guide](./QUICK_START.md) - Get started quickly
- [API Reference](./API_REFERENCE.md) - Complete API docs
- [Troubleshooting Guide](./TROUBLESHOOTING.md) - Common issues
- [Configuration Guide](./CONFIGURATION.md) - Configuration options

