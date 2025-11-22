# Storage Pipeline Review / Đánh Giá Pipeline Lưu Trữ

## 🔍 Current Architecture / Kiến Trúc Hiện Tại

### Two Storage Locations / Hai Vị Trí Lưu Trữ:

1. **TTS Backend Storage** (Temporary Cache / Cache Tạm Thời)
   - Location: `D:\Works\source\novel-reader\app\storage\audio`
   - Purpose: Temporary storage for generated audio
   - Structure: Flat structure with `{file_id}.wav`
   - Expiration: 365 days (TOO LONG for temporary cache!)

2. **Novel App Storage** (Permanent Organized Storage / Lưu Trữ Có Tổ Chức Vĩnh Viễn)
   - Location: `D:\Works\source\novel-reader\novel-app\storage\audio`
   - Purpose: Organized storage with metadata
   - Structure: `{novel_id}_{title}/chapter_{number}_{title}/paragraph_{number}/`
   - Files: `paragraph_{number}.wav` + `paragraph_{number}_metadata.json`

## ❌ Problems with Current Implementation / Vấn Đề Với Triển Khai Hiện Tại

### 1. TTS Backend Storage is NOT Temporary
- **Problem**: Configured for 365 days expiration
- **Should be**: 1-24 hours (short-term cache only)
- **Issue**: Files accumulate and never get cleaned up

### 2. Download is NOT Immediate
- **Problem**: Download happens AFTER generation, but it's optional (`downloadAudio` flag)
- **Should be**: Immediate download as part of the generation flow
- **Issue**: If download fails, audio stays only in TTS backend

### 3. Duplication of Storage
- **Problem**: Audio exists in both locations
- **Should be**: TTS backend is temporary cache, Novel backend is permanent storage
- **Issue**: Wasted disk space, confusion about which is "source of truth"

## ✅ Correct Pipeline / Pipeline Đúng

### Microservice Pattern / Mô Hình Microservice:

Based on real-world microservice patterns:
- **Service A (TTS Backend)**: Stateless, generates and caches temporarily
- **Service B (Novel Backend)**: Stateful, owns the data and organizes it

### Correct Flow / Luồng Đúng:

```
1. Novel Backend requests audio generation
   ↓
2. TTS Backend generates audio
   ↓
3. TTS Backend temporarily stores (cache for 1-24 hours)
   ↓
4. TTS Backend returns file_id immediately
   ↓
5. Novel Backend immediately downloads audio
   ↓
6. Novel Backend stores in organized structure
   ↓
7. Novel Backend optionally deletes from TTS cache (or let it expire)
```

## 🔧 Recommended Changes / Các Thay Đổi Đề Xuất

### 1. Make TTS Backend Storage Truly Temporary

**File**: `app/tts_backend/config.py`

**Change**:
```python
# Current (TOO LONG):
DEFAULT_EXPIRY_HOURS = int(os.getenv("TTS_DEFAULT_EXPIRY_HOURS", "24"))  # Actually 365 in novel app!

# Should be:
DEFAULT_EXPIRY_HOURS = int(os.getenv("TTS_DEFAULT_EXPIRY_HOURS", "2"))  # 2 hours is enough
```

**Purpose**: TTS backend storage should be a short-term cache, not permanent storage

### 2. Make Download Immediate and Required

**File**: `novel-app/backend/src/services/audioStorage.js`

**Current**: Download is optional (`downloadAudio = true` by default, but can be skipped)

**Should be**: Always download immediately after generation, make it part of the core flow

**Change**: Remove `downloadAudio` flag, always download and save to organized structure

### 3. Delete from TTS Cache After Download (Optional but Recommended)

**File**: `novel-app/backend/src/services/audioStorage.js`

**After successful download**: Optionally delete from TTS backend cache to free space

**Implementation**: Add cleanup step after successful download:
```javascript
// After successful download
if (localAudioPath) {
  // Optionally delete from TTS backend cache
  // (or let it expire naturally in 2 hours)
  await this.ttsService.deleteAudio(audioMetadata.fileId);
}
```

### 4. Update Expiration in Novel Backend

**File**: `novel-app/backend/src/services/audioStorage.js`

**Current**: `expiryHours = 365 * 24` (too long)

**Should be**: Novel backend storage is permanent, no expiration needed
- TTS backend: 2 hours (temporary cache)
- Novel backend: No expiration (permanent organized storage)

## 📊 Comparison with Real-World Patterns / So Sánh Với Mô Hình Thực Tế

### Example 1: Image Processing Microservice
- **Processing Service**: Generates images, caches for 1 hour
- **Application Service**: Downloads immediately, stores permanently
- **Result**: No duplication, clear ownership

### Example 2: Video Processing Microservice
- **Encoding Service**: Encodes videos, stores temporarily (2-4 hours)
- **Media Service**: Downloads, stores in CDN with organized structure
- **Result**: Temporary cache vs. permanent storage separation

### Example 3: Document Processing
- **PDF Service**: Converts documents, caches for 24 hours
- **Document Service**: Downloads, stores with metadata
- **Result**: Clear separation of concerns

## ✅ Proposed Correct Pipeline / Pipeline Đúng Đề Xuất

### Flow / Luồng:

```
┌─────────────────┐
│  Novel Backend  │
│                 │
│  Worker Service │
└────────┬────────┘
         │
         │ 1. Request generation
         ▼
┌─────────────────┐
│  TTS Backend    │
│                 │
│  2. Generate    │
│  3. Cache       │
│     (2 hours)   │
│  4. Return ID   │
└────────┬────────┘
         │
         │ 5. File ID
         ▼
┌─────────────────┐
│  Novel Backend  │
│                 │
│  6. Download    │
│  7. Organize    │
│  8. Save        │
│  9. Delete from │
│     TTS cache   │
│     (optional)  │
└─────────────────┘
```

### Storage Strategy / Chiến Lược Lưu Trữ:

1. **TTS Backend Storage** (`app/storage/audio`)
   - **Purpose**: Temporary cache
   - **Lifetime**: 2 hours
   - **Structure**: Flat `{file_id}.wav`
   - **Cleanup**: Automatic after 2 hours

2. **Novel App Storage** (`novel-app/storage/audio`)
   - **Purpose**: Permanent organized storage
   - **Lifetime**: No expiration (permanent)
   - **Structure**: `{novel_id}_{title}/chapter_{number}_{title}/paragraph_{number}/`
   - **Files**: `paragraph_{number}.wav` + metadata.json

## 🎯 Benefits / Lợi Ích

✅ **Clear Separation**: TTS backend is stateless cache, Novel backend owns data
✅ **No Duplication**: Files exist in TTS cache temporarily, then move to permanent storage
✅ **Automatic Cleanup**: TTS cache auto-expires, novel storage is permanent
✅ **Better Organization**: Permanent storage has proper structure
✅ **Reduced Disk Usage**: TTS cache doesn't accumulate old files
✅ **Faster Cleanup**: 2-hour expiration instead of 365 days

---

**Status: 📋 REVIEWED - Ready for Implementation**  
**Trạng thái: 📋 ĐÃ ĐÁNH GIÁ - Sẵn Sàng Triển Khai**

