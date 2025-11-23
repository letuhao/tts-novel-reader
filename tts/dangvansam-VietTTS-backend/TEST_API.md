# Test API with cURL
# Kiểm tra API với cURL

## 🚀 Quick Test Commands / Lệnh Kiểm tra Nhanh

### 1. Health Check / Kiểm tra Sức khỏe
```bash
curl http://127.0.0.1:11111/health
```

### 2. Get Available Voices / Lấy Giọng có sẵn
```bash
curl http://127.0.0.1:11111/api/tts/voices
```

### 3. Get Model Info / Lấy Thông tin Model
```bash
curl -X POST http://127.0.0.1:11111/api/tts/model/info \
  -H "Content-Type: application/json" \
  -d '{"model": "viet-tts"}'
```

### 4. Synthesize Speech (Simple) / Tổng hợp Giọng nói (Đơn giản)
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào Việt Nam",
    "model": "viet-tts",
    "voice": "cdteam",
    "speed": 1.0
  }' \
  --output test_output.wav
```

### 5. Synthesize Speech (With Custom Voice File) / Tổng hợp với File Giọng Tùy chỉnh
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt",
    "model": "viet-tts",
    "voice_file": "D:/path/to/your/voice.wav",
    "speed": 1.0
  }' \
  --output test_custom_voice.wav
```

### 6. Synthesize Speech (Metadata Only) / Tổng hợp (Chỉ Metadata)
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào Việt Nam",
    "model": "viet-tts",
    "voice": "cdteam",
    "return_audio": false,
    "store": true
  }'
```

### 7. Get Audio File by ID / Lấy File Audio theo ID
```bash
# First, get file_id from synthesize response (with return_audio=false)
# Sau đó, lấy file_id từ phản hồi synthesize (với return_audio=false)

curl http://127.0.0.1:11111/api/tts/audio/{file_id} \
  --output retrieved_audio.wav
```

### 8. Get Storage Stats / Lấy Thống kê Lưu trữ
```bash
curl http://127.0.0.1:11111/api/tts/storage/stats
```

## 📝 Example Responses / Ví dụ Phản hồi

### Health Check Response:
```json
{
  "status": "healthy",
  "service": "Vietnamese TTS Backend (DangVanSam VietTTS)",
  "version": "1.0.0",
  "environment": "VietTTS compatible"
}
```

### Voices Response:
```json
{
  "success": true,
  "voices": ["cdteam", "nsnd-le-chuc", "atuan", ...],
  "voice_map": {
    "cdteam": "D:/Works/source/novel-reader/tts/viet-tts/samples/cdteam.wav",
    ...
  }
}
```

### Synthesize Response (with audio):
- Returns WAV file directly
- Headers include:
  - `X-Request-ID`: Request identifier
  - `X-File-ID`: File ID for storage
  - `X-Expires-At`: Expiration timestamp

### Synthesize Response (metadata only):
```json
{
  "success": true,
  "request_id": "uuid-here",
  "model": "viet-tts",
  "sample_rate": 22050,
  "duration_seconds": 2.5,
  "file_metadata": {
    "file_id": "abc123...",
    "file_name": "abc123.wav",
    "expires_at": "2024-11-23T18:39:28",
    ...
  }
}
```

## 🎙️ Available Voices / Giọng có sẵn

Common voices you can use:
- `cdteam` - Male voice
- `nsnd-le-chuc` - Male voice
- `atuan` - Male voice
- `diep-chi` - Male voice
- `speechify_1` through `speechify_12` - Female voices
- `nguyen-ngoc-ngan` - Female voice
- `nu-nhe-nhang` - Female voice
- `quynh` - Female voice
- `son-tung-mtp` - Male voice

## 💡 Tips / Mẹo

1. **Test with short text first:**
   ```bash
   curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
     -H "Content-Type: application/json" \
     -d '{"text": "Xin chào", "voice": "cdteam"}' \
     --output test.wav
   ```

2. **Check voice availability:**
   ```bash
   curl http://127.0.0.1:11111/api/tts/voices | python -m json.tool
   ```

3. **Adjust speed:**
   - `speed: 0.5` - Very slow
   - `speed: 0.8` - Slow
   - `speed: 1.0` - Normal (default)
   - `speed: 1.5` - Fast
   - `speed: 2.0` - Very fast

4. **View API documentation:**
   Open in browser: http://127.0.0.1:11111/docs

