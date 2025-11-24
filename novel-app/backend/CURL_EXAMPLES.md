# CURL Examples for TTS Backends
# Ví dụ CURL cho TTS Backends

## VieNeu-TTS Backend - Narrator Voice (id_0004)
## VieNeu-TTS Backend - Giọng Dẫn Truyện (id_0004)

### Basic Request / Yêu cầu Cơ bản

```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là một đoạn văn dẫn truyện. Người kể chuyện đang mô tả cảnh vật và tình huống trong câu chuyện.",
    "model": "vieneu-tts",
    "voice": "id_0004",
    "auto_chunk": true,
    "max_chars": 256,
    "store": true,
    "return_audio": true
  }'
```

### With Auto Voice Detection / Với Tự động Phát hiện Giọng

```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Cô gái bước vào phòng và nhìn xung quanh. Cô cảm thấy một cảm giác lạ lẫm.",
    "model": "vieneu-tts",
    "voice": "id_0004",
    "auto_voice": false,
    "auto_chunk": true,
    "max_chars": 256
  }'
```

### Long Text with Chunking / Văn bản Dài với Chunking

```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là một đoạn văn rất dài. Nó sẽ được tự động chia nhỏ thành nhiều phần để xử lý. Mỗi phần sẽ được tạo audio riêng biệt và sau đó được kết hợp lại thành một file audio hoàn chỉnh. Quá trình này đảm bảo chất lượng tốt nhất cho văn bản dài.",
    "model": "vieneu-tts",
    "voice": "id_0004",
    "auto_chunk": true,
    "max_chars": 256,
    "store": true,
    "expiry_hours": 24,
    "return_audio": false
  }'
```

### Save Audio to File / Lưu Audio vào File

```bash
# Request with return_audio=true and save to file
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Xin chào, đây là giọng dẫn truyện id_0004.",
    "model": "vieneu-tts",
    "voice": "id_0004",
    "return_audio": true
  }' \
  --output narrator_audio.wav
```

### Get File ID Only (No Audio in Response) / Chỉ Lấy File ID (Không có Audio trong Response)

```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là một đoạn văn dẫn truyện ngắn.",
    "model": "vieneu-tts",
    "voice": "id_0004",
    "store": true,
    "return_audio": false,
    "expiry_hours": 48
  }' \
  -v
```

### Using Custom Reference (Advanced) / Sử dụng Tham chiếu Tùy chỉnh (Nâng cao)

```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là văn bản sử dụng giọng tùy chỉnh.",
    "model": "vieneu-tts",
    "ref_audio_path": "D:/Works/source/novel-reader/tts/VieNeu-TTS/sample/id_0004.wav",
    "ref_text": "Đây là văn bản tham chiếu tương ứng với audio tham chiếu.",
    "auto_chunk": false
  }'
```

## All Available Voices / Tất cả Giọng Có sẵn

### id_0001 - Giọng nam nhẹ nhàng
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là giọng nam nhẹ nhàng id_0001.",
    "model": "vieneu-tts",
    "voice": "id_0001"
  }'
```

### id_0002 - Giọng nữ cao
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là giọng nữ cao id_0002.",
    "model": "vieneu-tts",
    "voice": "id_0002"
  }'
```

### id_0003 - Giọng nam cao
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là giọng nam cao id_0003.",
    "model": "vieneu-tts",
    "voice": "id_0003"
  }'
```

### id_0004 - Giọng nữ nhẹ nhàng (Narrator - Dẫn truyện) ⭐
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là giọng nữ nhẹ nhàng id_0004, dùng để dẫn truyện.",
    "model": "vieneu-tts",
    "voice": "id_0004"
  }'
```

### id_0005 - Giọng nam cao
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là giọng nam cao id_0005.",
    "model": "vieneu-tts",
    "voice": "id_0005"
  }'
```

### id_0007 - Giọng nam trầm
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là giọng nam trầm id_0007.",
    "model": "vieneu-tts",
    "voice": "id_0007"
  }'
```

## Using Gender Selection / Sử dụng Lựa chọn Giới tính

### Auto-detect Gender / Tự động Phát hiện Giới tính
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Cô gái bước vào phòng. Anh trai đang đợi ở đó.",
    "model": "vieneu-tts",
    "auto_voice": true,
    "auto_chunk": true
  }'
```

### Explicit Male Voice / Giọng Nam Rõ ràng
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là giọng nam.",
    "model": "vieneu-tts",
    "voice": "male",
    "auto_chunk": true
  }'
```

### Explicit Female Voice / Giọng Nữ Rõ ràng
```bash
curl -X POST http://127.0.0.1:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đây là giọng nữ.",
    "model": "vieneu-tts",
    "voice": "female",
    "auto_chunk": true
  }'
```

## Health Check / Kiểm tra Sức khỏe

```bash
curl http://127.0.0.1:11111/api/tts/health
```

## Get Available Voices / Lấy Danh sách Giọng Có sẵn

```bash
curl http://127.0.0.1:11111/api/tts/voices
```

## Get Model Info / Lấy Thông tin Model

```bash
curl -X POST http://127.0.0.1:11111/api/tts/model/info \
  -H "Content-Type: application/json" \
  -d '{
    "model": "vieneu-tts"
  }'
```

## Response Format / Định dạng Phản hồi

### Success Response / Phản hồi Thành công
```json
{
  "success": true,
  "file_id": "uuid-here",
  "file_metadata": {
    "file_id": "uuid-here",
    "expires_at": "2024-12-01T12:00:00",
    "sample_rate": 24000,
    "duration_seconds": 5.2
  },
  "audio": "base64-encoded-audio-data"  // Only if return_audio=true
}
```

### Error Response / Phản hồi Lỗi
```json
{
  "detail": "Error message here"
}
```

## PowerShell Examples (Windows) / Ví dụ PowerShell (Windows)

### Basic Request / Yêu cầu Cơ bản
```powershell
$body = @{
    text = "Đây là giọng dẫn truyện id_0004."
    model = "vieneu-tts"
    voice = "id_0004"
    auto_chunk = $true
    return_audio = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:11111/api/tts/synthesize" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Save Audio to File / Lưu Audio vào File
```powershell
$body = @{
    text = "Đây là giọng dẫn truyện id_0004."
    model = "vieneu-tts"
    voice = "id_0004"
    return_audio = $true
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://127.0.0.1:11111/api/tts/synthesize" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

# Decode base64 and save
[System.Convert]::FromBase64String($response.audio) | Set-Content -Path "narrator_audio.wav" -Encoding Byte
```

