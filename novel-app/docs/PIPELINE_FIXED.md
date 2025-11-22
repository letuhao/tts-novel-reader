# Pipeline Fixed - Correct Microservice Pattern
# Pipeline Đã Sửa - Mô Hình Microservice Đúng

## ✅ Changes Applied / Các Thay Đổi Đã Áp Dụng

### 1. TTS Backend: Short-Term Cache / Cache Ngắn Hạn

**File**: `app/tts_backend/config.py`

**Changed**:
```python
# Before / Trước:
DEFAULT_EXPIRY_HOURS = 24  # Too long for temporary cache

# After / Sau:
DEFAULT_EXPIRY_HOURS = 2  # 2 hours - short-term temporary cache
CLEANUP_INTERVAL_MINUTES = 30  # More frequent cleanup
```

**Purpose / Mục Đích**:
- TTS backend storage is now truly temporary (2 hours)
- Files auto-expire quickly if not downloaded
- Automatic cleanup every 30 minutes

- Lưu trữ TTS backend giờ là tạm thời thực sự (2 giờ)
- File tự động hết hạn nhanh nếu không được tải xuống
- Dọn dẹp tự động mỗi 30 phút

### 2. Novel Backend: Immediate Download (Mandatory) / Tải Xuống Ngay Lập Tức (Bắt Buộc)

**File**: `novel-app/backend/src/services/audioStorage.js`

**Changed**:
```javascript
// Before / Trước:
const {
  expiryHours = 365 * 24,  // Wrong: too long for TTS cache
  downloadAudio = true     // Optional: can be skipped
} = options;

// After / Sau:
const {
  ttsExpiryHours = 2,  // Correct: short-term cache
  deleteFromTTSAfterDownload = true  // Clean up after download
} = options;

// Download is now MANDATORY - no optional flag
// Tải xuống giờ là BẮT BUỘC - không có cờ tùy chọn
```

**Purpose / Mục Đích**:
- Download is now part of the core flow (not optional)
- Immediate download after generation
- Proper error handling if download fails

- Tải xuống giờ là một phần của luồng chính (không tùy chọn)
- Tải xuống ngay lập tức sau khi tạo
- Xử lý lỗi đúng nếu tải xuống thất bại

### 3. Optional Cleanup: Delete from TTS Cache / Dọn Dẹp Tùy Chọn: Xóa Khỏi Cache TTS

**File**: `novel-app/backend/src/services/audioStorage.js`

**Added**:
```javascript
// After successful download:
if (deleteFromTTSAfterDownload) {
  await this.ttsService.deleteAudio(audioMetadata.fileId);
  // Free up TTS backend storage immediately
  // Giải phóng lưu trữ TTS backend ngay lập tức
}
```

**Purpose / Mục Đích**:
- Optional cleanup to free TTS backend storage immediately
- If cleanup fails, file will expire naturally in 2 hours anyway
- Reduces disk usage in TTS backend

- Dọn dẹp tùy chọn để giải phóng lưu trữ TTS backend ngay lập tức
- Nếu dọn dẹp thất bại, file sẽ tự động hết hạn sau 2 giờ
- Giảm sử dụng dung lượng trong TTS backend

### 4. Updated Worker Configuration / Cập Nhật Cấu Hình Worker

**File**: `novel-app/backend/src/services/worker.js`

**Changed**:
```javascript
// Before / Trước:
{
  expiryHours: expiryHours,  // 365 days - wrong!
  downloadAudio: true
}

// After / Sau:
{
  ttsExpiryHours: 2,  // 2 hours for TTS cache
  deleteFromTTSAfterDownload: true  // Clean up after download
}
```

## 📊 Correct Pipeline Flow / Luồng Pipeline Đúng

### Flow Diagram / Sơ Đồ Luồng:

```
┌─────────────────────────────────────────────┐
│  Novel Backend (Worker Service)             │
│  - Requests audio generation                │
└─────────────────┬───────────────────────────┘
                  │
                  │ 1. POST /api/tts/synthesize
                  ▼
┌─────────────────────────────────────────────┐
│  TTS Backend                                │
│  - Generates audio                          │
│  - Stores temporarily (2 hours cache)       │
│  - Returns file_id                          │
└─────────────────┬───────────────────────────┘
                  │
                  │ 2. Returns file_id
                  ▼
┌─────────────────────────────────────────────┐
│  Novel Backend (AudioStorage)               │
│  - IMMEDIATELY downloads audio              │
│  - Stores in organized structure            │
│  - Saves metadata                           │
│  - Deletes from TTS cache (optional)        │
└─────────────────────────────────────────────┘
```

### Step-by-Step Flow / Luồng Từng Bước:

1. **Novel Backend requests generation**
   - Worker calls `audioStorage.generateAndStore()`
   - TTS service sends request to TTS backend

2. **TTS Backend generates and caches**
   - Generates audio from text
   - Stores temporarily in `app/storage/audio/{file_id}.wav`
   - Sets expiration: 2 hours
   - Returns `file_id` immediately

3. **Novel Backend immediately downloads**
   - Downloads audio file using `file_id`
   - Saves to organized structure: `novel-app/storage/audio/{novel_id}_{title}/chapter_{number}_{title}/paragraph_{number}/paragraph_{number}.wav`
   - Creates metadata file: `paragraph_{number}_metadata.json`

4. **Optional cleanup**
   - Deletes file from TTS backend cache
   - Frees up disk space immediately
   - If cleanup fails, file expires naturally in 2 hours

## 🎯 Storage Strategy / Chiến Lược Lưu Trữ

### TTS Backend Storage (`app/storage/audio`)
- **Purpose**: Temporary cache only
- **Lifetime**: 2 hours (auto-expires)
- **Structure**: Flat `{file_id}.wav`
- **Cleanup**: Automatic every 30 minutes
- **Status**: Short-term temporary storage

### Novel App Storage (`novel-app/storage/audio`)
- **Purpose**: Permanent organized storage
- **Lifetime**: No expiration (permanent)
- **Structure**: `{novel_id}_{title}/chapter_{number}_{title}/paragraph_{number}/`
- **Files**: `paragraph_{number}.wav` + `paragraph_{number}_metadata.json`
- **Status**: Source of truth for audio files

## ✅ Benefits / Lợi Ích

✅ **Clear Separation**: TTS backend is stateless cache, Novel backend owns data
✅ **No Duplication**: Files moved from temporary cache to permanent storage
✅ **Immediate Download**: No delay, files downloaded right after generation
✅ **Automatic Cleanup**: TTS cache auto-expires, optional immediate cleanup
✅ **Better Organization**: Permanent storage has proper structure with metadata
✅ **Reduced Disk Usage**: TTS cache doesn't accumulate old files
✅ **Faster Cleanup**: 2-hour expiration instead of 365 days

✅ **Tách Biệt Rõ Ràng**: TTS backend là cache không trạng thái, Novel backend sở hữu dữ liệu
✅ **Không Trùng Lặp**: File được di chuyển từ cache tạm thời sang lưu trữ vĩnh viễn
✅ **Tải Xuống Ngay Lập Tức**: Không trì hoãn, file được tải ngay sau khi tạo
✅ **Dọn Dẹp Tự Động**: Cache TTS tự động hết hạn, dọn dẹp ngay lập tức tùy chọn
✅ **Tổ Chức Tốt Hơn**: Lưu trữ vĩnh viễn có cấu trúc đúng với metadata
✅ **Giảm Sử Dụng Dung Lượng**: Cache TTS không tích lũy file cũ
✅ **Dọn Dẹp Nhanh Hơn**: Hết hạn 2 giờ thay vì 365 ngày

## 🔄 Migration Notes / Lưu Ý Di Chuyển

### Existing Files / File Hiện Tại:

- Files in TTS backend storage will auto-expire after 2 hours
- Files already in novel app storage remain unchanged
- New files will follow the correct pipeline

- File trong lưu trữ TTS backend sẽ tự động hết hạn sau 2 giờ
- File đã có trong lưu trữ novel app không thay đổi
- File mới sẽ tuân theo pipeline đúng

---

**Status: ✅ FIXED - Correct Microservice Pattern Implemented**  
**Trạng thái: ✅ ĐÃ SỬA - Mô Hình Microservice Đúng Đã Triển Khai**

