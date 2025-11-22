# TTS Microservice Usage Guide / Hướng dẫn Sử dụng TTS Microservice

## 🎯 Overview / Tổng quan

The TTS backend is now optimized as a microservice with:
- **Audio storage management** - Automatic file storage
- **Expiration management** - Automatic cleanup
- **Metadata tracking** - Full file metadata
- **Request tracking** - Request IDs for logging

TTS backend đã được tối ưu như microservice với:
- **Quản lý lưu trữ audio** - Lưu file tự động
- **Quản lý hết hạn** - Dọn dẹp tự động
- **Theo dõi metadata** - Metadata đầy đủ
- **Theo dõi request** - Request ID để log

## 📡 API Endpoints / Điểm cuối API

### 1. Synthesize Speech (Enhanced) / Tổng hợp Giọng nói (Nâng cao)

**Endpoint:** `POST /api/tts/synthesize`

**Request Body:**
```json
{
  "text": "[05] Xin chào, đây là ví dụ.",
  "model": "dia",
  "store": true,
  "expiry_hours": 48,
  "return_audio": true,
  "temperature": 1.3,
  "top_p": 0.95,
  "cfg_scale": 3.0
}
```

**Response Headers:**
```
X-Request-ID: 123e4567-e89b-12d3-a456-426614174000
X-File-ID: abc123def456...
X-Expires-At: 2025-01-01T12:00:00
```

**Options:**
- `store: true` - Store audio file (default)
- `expiry_hours: 48` - Custom expiration (default: 24 hours)
- `return_audio: true` - Return audio in response (default: true)

### 2. Get Stored Audio / Lấy Audio Đã Lưu

**Endpoint:** `GET /api/tts/audio/{file_id}`

**Usage:**
```bash
curl http://127.0.0.1:8000/api/tts/audio/abc123def456
```

### 3. Get File Metadata / Lấy Metadata File

**Endpoint:** `GET /api/tts/audio/{file_id}/metadata`

**Usage:**
```bash
curl http://127.0.0.1:8000/api/tts/audio/abc123def456/metadata
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "file_id": "abc123...",
    "file_name": "abc123.wav",
    "text": "[05] Xin chào...",
    "speaker_id": "05",
    "model": "dia",
    "created_at": "2025-01-01T10:00:00",
    "expires_at": "2025-01-03T10:00:00",
    "expiry_hours": 48,
    "file_size": 123456,
    "file_size_mb": 0.12
  }
}
```

### 4. Delete Audio File / Xóa File Audio

**Endpoint:** `DELETE /api/tts/audio/{file_id}`

**Usage:**
```bash
curl -X DELETE http://127.0.0.1:8000/api/tts/audio/abc123def456
```

### 5. Storage Statistics / Thống kê Lưu trữ

**Endpoint:** `GET /api/tts/storage/stats`

**Usage:**
```bash
curl http://127.0.0.1:8000/api/tts/storage/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_files": 100,
    "total_size_mb": 45.2,
    "expired_files": 5,
    "active_files": 95,
    "storage_dir": "storage/audio"
  }
}
```

### 6. Manual Cleanup / Dọn dẹp Thủ công

**Endpoint:** `POST /api/tts/storage/cleanup`

**Usage:**
```bash
curl -X POST http://127.0.0.1:8000/api/tts/storage/cleanup
```

## 💡 Microservice Workflow / Quy trình Microservice

### Workflow 1: Generate and Store / Tạo và Lưu

```python
# 1. Generate and store
response = requests.post("http://tts-service:8000/api/tts/synthesize", json={
    "text": "[05] Your text",
    "model": "dia",
    "store": True,
    "expiry_hours": 48,
    "return_audio": False  # Only return metadata
})

file_metadata = response.json()["file_metadata"]
file_id = file_metadata["file_id"]

# 2. Other service manages the file
# Your service can now:
# - Store file_id in database
# - Track expiration
# - Handle downloads
# - Manage cleanup
```

### Workflow 2: Retrieve Later / Lấy Sau

```python
# Get audio file
audio_response = requests.get(f"http://tts-service:8000/api/tts/audio/{file_id}")

# Get metadata
metadata_response = requests.get(f"http://tts-service:8000/api/tts/audio/{file_id}/metadata")
metadata = metadata_response.json()["metadata"]

# Check expiration
expires_at = datetime.fromisoformat(metadata["expires_at"])
if datetime.now() > expires_at:
    # File expired, regenerate or handle
    pass
```

### Workflow 3: Generate and Stream (Traditional) / Tạo và Stream (Truyền thống)

```python
# Generate without storing
response = requests.post("http://tts-service:8000/api/tts/synthesize", json={
    "text": "[05] Your text",
    "model": "dia",
    "store": False,
    "return_audio": True
})

# Stream audio directly
audio_data = response.content
```

## 🔧 Configuration / Cấu hình

### Environment Variables / Biến Môi trường

```powershell
# Storage directory / Thư mục lưu trữ
$env:TTS_STORAGE_DIR = "storage/audio"

# Default expiration (hours) / Hết hạn mặc định (giờ)
$env:TTS_DEFAULT_EXPIRY_HOURS = "24"

# Cleanup interval (minutes) / Khoảng dọn dẹp (phút)
$env:TTS_CLEANUP_INTERVAL_MINUTES = "60"
```

## 📊 Benefits / Lợi ích

1. **Separation of Concerns:**
   - TTS service: Generation only
   - Other services: Storage/lifecycle management

2. **Scalability:**
   - Stateless requests with file IDs
   - Easy horizontal scaling

3. **Storage Management:**
   - Automatic cleanup
   - Expiration tracking
   - Storage statistics

4. **Request Tracking:**
   - Request IDs for logging
   - File IDs for retrieval
   - Metadata for auditing

---

**Ready for microservice architecture!**  
**Sẵn sàng cho kiến trúc microservice!**

