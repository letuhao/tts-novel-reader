# Testing Coqui TTS Backend API
# Kiểm tra API Coqui TTS Backend

## 🧪 Test Commands / Lệnh Kiểm tra

### 1. Health Check / Kiểm tra Sức khỏe

```bash
curl http://localhost:11111/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "Coqui TTS (XTTS-v2) English Backend",
  "version": "1.0.0"
}
```

---

### 2. Get Speakers List / Lấy Danh sách Giọng nói

```bash
curl http://localhost:11111/api/tts/speakers
```

**Expected Response:**
```json
{
  "success": true,
  "total": 58,
  "speakers": [
    "Claribel Dervla",
    "Daisy Studious",
    "Gracie Wise",
    ...
  ]
}
```

---

### 3. Get Model Info / Lấy Thông tin Model

```bash
curl -X POST http://localhost:11111/api/tts/model/info \
  -H "Content-Type: application/json" \
  -d "{\"model\": \"xtts-english\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "info": {
    "model": "XTTS-v2 English",
    "sample_rate": 24000,
    "device": "cuda",
    "requires_reference": false,
    "languages": ["en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl", "cs", "ar", "zh-cn", "hu", "ko", "ja", "hi"]
  }
}
```

---

### 4. Synthesize Speech (Basic) / Tổng hợp Giọng nói (Cơ bản)

```bash
curl -X POST http://localhost:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"Hello, this is a test of English text-to-speech using XTTS-v2.\",
    \"model\": \"xtts-english\",
    \"language\": \"en\",
    \"store\": true,
    \"return_audio\": true
  }" \
  --output test_output.wav
```

**Expected Response:**
- Audio file saved to `test_output.wav`
- Response headers include metadata

---

### 5. Synthesize Speech (With Voice Cloning) / Tổng hợp Giọng nói (Với Nhân bản Giọng)

```bash
curl -X POST http://localhost:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"This is a test of voice cloning with XTTS-v2.\",
    \"model\": \"xtts-english\",
    \"speaker_wav\": \"/path/to/reference_voice.wav\",
    \"language\": \"en\",
    \"store\": true,
    \"return_audio\": true
  }" \
  --output test_cloned.wav
```

**Note:** Replace `/path/to/reference_voice.wav` with actual path to 6+ seconds reference audio.

**Lưu ý:** Thay `/path/to/reference_voice.wav` bằng đường dẫn thực tế đến audio tham chiếu 6+ giây.

---

### 6. Synthesize Speech (Get File ID Only) / Tổng hợp Giọng nói (Chỉ Lấy File ID)

```bash
curl -X POST http://localhost:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"This will return file metadata without audio in response.\",
    \"model\": \"xtts-english\",
    \"language\": \"en\",
    \"store\": true,
    \"return_audio\": false
  }"
```

**Expected Response:**
```json
{
  "success": true,
  "request_id": "uuid-here",
  "model": "xtts-english",
  "sample_rate": 24000,
  "duration_seconds": 3.5,
  "file_metadata": {
    "file_id": "abc123...",
    "file_path": "...",
    "file_name": "abc123....wav",
    "text": "...",
    "created_at": "...",
    "expires_at": "..."
  }
}
```

---

### 7. Get Audio File / Lấy File Audio

```bash
# First, get file_id from synthesize response, then:
curl http://localhost:11111/api/tts/audio/{file_id} \
  --output downloaded_audio.wav
```

**Replace `{file_id}` with actual file ID from synthesize response.**

---

### 8. Get Audio Metadata / Lấy Metadata Audio

```bash
curl http://localhost:11111/api/tts/audio/{file_id}/metadata
```

**Expected Response:**
```json
{
  "success": true,
  "metadata": {
    "file_id": "...",
    "file_path": "...",
    "text": "...",
    "created_at": "...",
    "expires_at": "...",
    "file_size": 123456,
    "file_size_mb": 0.12
  }
}
```

---

### 9. Delete Audio File / Xóa File Audio

```bash
curl -X DELETE http://localhost:11111/api/tts/audio/{file_id}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Audio file deleted",
  "file_id": "..."
}
```

---

### 10. Get Storage Statistics / Lấy Thống kê Lưu trữ

```bash
curl http://localhost:11111/api/tts/storage/stats
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "total_files": 10,
    "total_size_mb": 5.2,
    "expired_files": 2,
    "active_files": 8,
    "storage_dir": "..."
  }
}
```

---

### 11. Manual Cleanup / Dọn dẹp Thủ công

```bash
curl -X POST http://localhost:11111/api/tts/storage/cleanup
```

**Expected Response:**
```json
{
  "success": true,
  "cleanup": {
    "deleted_count": 5,
    "deleted_size_mb": 2.1,
    "cleanup_time": "2024-12-19T..."
  }
}
```

---

## 🎯 Quick Test Script / Script Kiểm tra Nhanh

### PowerShell Test Script

```powershell
# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Cyan
curl http://localhost:11111/health
Write-Host ""

# Test 2: Model Info
Write-Host "2. Testing Model Info..." -ForegroundColor Cyan
curl -X POST http://localhost:11111/api/tts/model/info `
  -H "Content-Type: application/json" `
  -d '{\"model\": \"xtts-english\"}'
Write-Host ""

# Test 3: Synthesize (Basic)
Write-Host "3. Testing Synthesize (Basic)..." -ForegroundColor Cyan
$response = curl -X POST http://localhost:11111/api/tts/synthesize `
  -H "Content-Type: application/json" `
  -d '{\"text\": \"Hello, this is a test.\", \"model\": \"xtts-english\", \"language\": \"en\", \"store\": true, \"return_audio\": true}' `
  --output test_output.wav

if (Test-Path test_output.wav) {
    Write-Host "✅ Audio file created: test_output.wav" -ForegroundColor Green
    $fileInfo = Get-Item test_output.wav
    Write-Host "   Size: $($fileInfo.Length) bytes" -ForegroundColor Gray
} else {
    Write-Host "❌ Audio file not created" -ForegroundColor Red
}
```

---

## 📝 Notes / Ghi chú

### Language Codes / Mã Ngôn ngữ

XTTS-v2 supports these languages:
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

### Voice Cloning / Nhân bản Giọng nói

- Requires 6+ seconds of reference audio
- Provide path via `speaker_wav` parameter
- Works best with clear, single-speaker audio

- Yêu cầu 6+ giây audio tham chiếu
- Cung cấp đường dẫn qua tham số `speaker_wav`
- Hoạt động tốt nhất với audio rõ ràng, một người nói

---

**Last Updated:** 2024-12-19

