# TTS Backend Microservice Optimization / Tối ưu TTS Backend Microservice

## ✅ Optimizations Completed / Tối ưu Đã Hoàn thành

### 1. **Audio Storage Management / Quản lý Lưu trữ Audio**

- ✅ Automatic file storage with metadata
- ✅ Expiration time management
- ✅ Background cleanup thread
- ✅ File ID system for tracking
- ✅ Metadata caching

**Features / Tính năng:**
- Store generated audio files automatically
- Track expiration times
- Auto-cleanup expired files
- Query file metadata

### 2. **Enhanced API Endpoints / Điểm cuối API Nâng cao**

#### New Endpoints / Điểm cuối Mới:

**Get Audio File / Lấy File Audio:**
```
GET /api/tts/audio/{file_id}
```

**Get File Metadata / Lấy Metadata File:**
```
GET /api/tts/audio/{file_id}/metadata
```

**Delete Audio File / Xóa File Audio:**
```
DELETE /api/tts/audio/{file_id}
```

**Storage Statistics / Thống kê Lưu trữ:**
```
GET /api/tts/storage/stats
```

**Manual Cleanup / Dọn dẹp Thủ công:**
```
POST /api/tts/storage/cleanup
```

#### Enhanced Synthesize Endpoint / Điểm cuối Synthesize Nâng cao:

**New Parameters / Tham số Mới:**
- `store: bool = True` - Store audio file
- `expiry_hours: int = None` - Expiration hours (default: 24)
- `return_audio: bool = True` - Return audio in response

**Response Headers / Header Phản hồi:**
- `X-Request-ID` - Request tracking ID
- `X-File-ID` - File ID for storage management
- `X-Expires-At` - Expiration timestamp

### 3. **Microservice Features / Tính năng Microservice**

- ✅ **Request ID tracking** - Track requests across services
- ✅ **File ID system** - Unique IDs for audio files
- ✅ **Expiration management** - Automatic cleanup
- ✅ **Metadata storage** - Full file metadata
- ✅ **Storage statistics** - Monitor storage usage
- ✅ **Background cleanup** - Automatic expired file removal

## 📋 Usage Examples / Ví dụ Sử dụng

### Generate and Store Audio / Tạo và Lưu Audio

```json
POST /api/tts/synthesize
{
  "text": "[05] Xin chào, đây là ví dụ.",
  "model": "dia",
  "store": true,
  "expiry_hours": 48,
  "return_audio": true
}
```

**Response Headers:**
```
X-Request-ID: 123e4567-e89b-12d3-a456-426614174000
X-File-ID: abc123def456...
X-Expires-At: 2025-01-01T12:00:00
```

### Get Stored Audio / Lấy Audio Đã Lưu

```bash
GET /api/tts/audio/{file_id}
```

### Get File Metadata / Lấy Metadata File

```bash
GET /api/tts/audio/{file_id}/metadata
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "file_id": "abc123...",
    "file_path": "storage/audio/abc123.wav",
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

### Check Storage Statistics / Kiểm tra Thống kê Lưu trữ

```bash
GET /api/tts/storage/stats
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

### Manual Cleanup / Dọn dẹp Thủ công

```bash
POST /api/tts/storage/cleanup
```

**Response:**
```json
{
  "success": true,
  "cleanup": {
    "deleted_count": 5,
    "deleted_size_mb": 2.1,
    "cleanup_time": "2025-01-01T12:00:00"
  }
}
```

## 🔧 Configuration / Cấu hình

### Environment Variables / Biến Môi trường

```powershell
# Storage directory / Thư mục lưu trữ
$env:TTS_STORAGE_DIR = "storage/audio"

# Default expiration hours / Giờ hết hạn mặc định
$env:TTS_DEFAULT_EXPIRY_HOURS = "24"

# Cleanup interval (minutes) / Khoảng thời gian dọn dẹp (phút)
$env:TTS_CLEANUP_INTERVAL_MINUTES = "60"
```

### Configuration File / File Cấu hình

See `tts_backend/config.py` for all configuration options.

## 📊 Storage Structure / Cấu trúc Lưu trữ

```
storage/
├── audio/
│   ├── abc123.wav          # Audio files
│   ├── def456.wav
│   └── metadata/
│       ├── abc123.json     # Metadata files
│       └── def456.json
```

## 🎯 Benefits for Microservice / Lợi ích cho Microservice

1. **Separation of Concerns / Tách biệt Trách nhiệm:**
   - TTS service handles generation
   - Other services can manage storage/lifecycle

2. **Scalability / Khả năng Mở rộng:**
   - Stateless requests with file IDs
   - Easy to scale horizontally

3. **Storage Management / Quản lý Lưu trữ:**
   - Automatic cleanup
   - Expiration management
   - Storage statistics

4. **Request Tracking / Theo dõi Yêu cầu:**
   - Request IDs for logging
   - File IDs for retrieval
   - Metadata for auditing

5. **Flexible Usage / Sử dụng Linh hoạt:**
   - Generate and stream (traditional)
   - Generate and store (microservice)
   - Generate, store, and return metadata only

## 🚀 Next Steps / Các Bước Tiếp theo

1. **Add File Service:**
   - Manage file lifecycle
   - Handle downloads
   - CDN integration

2. **Add Notification Service:**
   - Notify when generation complete
   - Webhook support

3. **Add Queue System:**
   - Handle long generations
   - Job status tracking

---

**TTS Backend is now optimized as a microservice!**  
**TTS Backend đã được tối ưu như một microservice!**

