# VieNeu-TTS Model Review & Test Guide

## 📋 Model Overview

**VieNeu-TTS** is a Vietnamese Text-to-Speech model that uses voice cloning (reference audio) to generate speech.

### Key Characteristics:
- **Sample Rate**: 24,000 Hz (vs Dia's 44,100 Hz)
- **Model Type**: Voice cloning / Zero-shot TTS
- **Device**: CUDA (if available) or CPU
- **Model Path**: `models/vieneu-tts`
- **Codec**: `neuphonic/neucodec`

## 🔍 Comparison with Dia TTS

| Feature | VieNeu-TTS | Dia TTS |
|---------|------------|---------|
| **Sample Rate** | 24 kHz | 44.1 kHz |
| **Speed** | ✅ Faster (lower sample rate) | ⚠️ Slower |
| **Model Size** | ✅ Smaller | ⚠️ Larger (6.4GB) |
| **Reference Audio** | ⚠️ Required | ✅ Not required |
| **Voice Quality** | Good (24kHz) | Excellent (44.1kHz) |
| **Voice Cloning** | ✅ Yes (zero-shot) | ❌ No |
| **Multi-speaker** | ✅ Yes (via ref audio) | ✅ Yes (built-in) |

## ⚙️ Implementation Details

### Model Loading (`app/tts_backend/models/vieneu_tts.py`)

```python
class VieNeuTTSWrapper:
    def __init__(self, model_path=None, device=None):
        # Loads VieNeuTTS model with:
        # - backbone_repo: model_path (local or HuggingFace)
        # - backbone_device: cuda/cpu
        # - codec_repo: "neuphonic/neucodec"
        # - codec_device: cuda/cpu
    
    def synthesize(text, ref_audio_path, ref_text):
        # 1. Encode reference audio
        ref_codes = self.model.encode_reference(ref_audio_path)
        # 2. Generate speech
        wav = self.model.infer(text, ref_codes, ref_text)
        return wav
```

### Key Differences from Dia:
1. **Requires Reference Audio**: Must provide `ref_audio_path` and `ref_text`
2. **Voice Cloning**: Can clone any voice from reference audio
3. **Faster Inference**: Lower sample rate = faster generation
4. **No Speaker IDs**: Uses reference audio instead of speaker IDs

## 🚀 API Usage

### Endpoint
```
POST http://127.0.0.1:11111/api/tts/synthesize
```

### Request Body
```json
{
  "text": "Your text to synthesize",
  "model": "vieneu-tts",
  "ref_audio_path": "path/to/reference/audio.wav",
  "ref_text": "Text that matches the reference audio",
  "return_audio": true,
  "store": false
}
```

### Required Parameters:
- `text`: Text to synthesize
- `model`: Must be `"vieneu-tts"`
- `ref_audio_path`: **REQUIRED** - Path to reference audio file
- `ref_text`: **REQUIRED** - Text that matches reference audio

## 📝 CURL Test Commands

### Test 1: Basic Synthesis (Windows PowerShell)

```powershell
# Using sample reference audio from VieNeu-TTS repo
$refAudio = "D:\Works\source\novel-reader\tts\VieNeu-TTS\sample\id_0001.wav"
$refText = "Đến cuối thế kỷ 19, ngành đánh bắt cá được thương mại hóa."
$testText = "Xin chào, đây là một bài kiểm tra với VieNeu-TTS model."

$body = @{
    text = $testText
    model = "vieneu-tts"
    ref_audio_path = $refAudio
    ref_text = $refText
    return_audio = $true
    store = $false
} | ConvertTo-Json

curl.exe -X POST http://127.0.0.1:11111/api/tts/synthesize `
  -H "Content-Type: application/json" `
  -d $body `
  --output vieneu_test_output.wav
```

### Test 2: Using curl (Linux/Mac/Git Bash)

```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào, đây là một bài kiểm tra với VieNeu-TTS model.",
    "model": "vieneu-tts",
    "ref_audio_path": "D:/Works/source/novel-reader/tts/VieNeu-TTS/sample/id_0001.wav",
    "ref_text": "Đến cuối thế kỷ 19, ngành đánh bắt cá được thương mại hóa.",
    "return_audio": true,
    "store": false
  }' \
  --output vieneu_test_output.wav
```

### Test 3: Get Model Info

```bash
curl -X POST http://127.0.0.1:11111/api/tts/model/info \
  -H "Content-Type: application/json" \
  -d '{"model": "vieneu-tts"}'
```

### Test 4: Health Check

```bash
curl http://127.0.0.1:11111/health
```

## 🎯 Sample Reference Files

Available in `tts/VieNeu-TTS/sample/`:
- `id_0001.wav` + `id_0001.txt` - "Đến cuối thế kỷ 19, ngành đánh bắt cá được thương mại hóa."
- `id_0002.wav` + `id_0002.txt`
- `id_0003.wav` + `id_0003.txt`
- `id_0004.wav` + `id_0004.txt`
- `id_0005.wav` + `id_0005.txt`
- `id_0007.wav` + `id_0007.txt`

## ⚡ Performance Notes

### Why VieNeu-TTS Might Be Faster:
1. **Lower Sample Rate**: 24kHz vs 44.1kHz = ~45% less data to process
2. **Smaller Model**: Typically smaller than Dia's 6.4GB
3. **Simpler Architecture**: Voice cloning model vs. diffusion model

### Potential Issues:
1. **Reference Audio Required**: Must provide reference for each request
2. **Path Resolution**: Reference audio path must be accessible from backend
3. **Voice Consistency**: Quality depends on reference audio quality

## 🔧 Troubleshooting

### Error: "VieNeu-TTS requires ref_audio_path and ref_text"
- **Solution**: Ensure both `ref_audio_path` and `ref_text` are provided in request

### Error: Reference audio file not found
- **Solution**: Use absolute path or ensure path is relative to backend working directory

### Slow Performance
- **Check**: Is model using CUDA? Check backend logs
- **Solution**: Ensure CUDA is available and model is loaded on GPU

## 📊 Expected Performance

Based on typical TTS models:
- **24kHz generation**: ~10-20 tokens/second on RTX 4090
- **Inference time**: ~0.5-1 second per 100 characters
- **Memory usage**: ~2-4GB VRAM (much less than Dia)

## 💡 Recommendations

1. **For Speed**: Use VieNeu-TTS (24kHz, faster)
2. **For Quality**: Use Dia TTS (44.1kHz, better quality)
3. **For Voice Cloning**: Use VieNeu-TTS (requires reference audio)
4. **For Multi-speaker**: Use Dia TTS (built-in speaker IDs)

