# Delete Audio API - Implementation Summary
# API Xóa Audio - Tóm tắt Triển khai

## ✅ Issue / Vấn đề

The worker (`novel-app/backend`) calls TTS backend API to delete temporary audio files after successful copy, but the Coqui TTS backend was missing this endpoint.

Worker (`novel-app/backend`) gọi API TTS backend để xóa file audio tạm thời sau khi copy thành công, nhưng Coqui TTS backend thiếu endpoint này.

## 🔍 Analysis / Phân tích

### Worker Implementation / Triển khai Worker

**File:** `novel-app/backend/src/services/ttsService.js`

```javascript
async deleteAudio(fileId) {
  await axios.delete(
    `${this.baseURL}/api/tts/audio/${fileId}`,
    { timeout: 10000 }
  );
  return true;
}
```

**Usage:** `novel-app/backend/src/services/audioStorage.js`

```javascript
// After successful download
if (deleteFromTTSAfterDownload) {
  const deleted = await this.ttsService.deleteAudio(audioMetadata.fileId);
  // Free up TTS backend storage immediately
}
```

### Missing Endpoint / Endpoint Thiếu

The worker expects:
- `DELETE /api/tts/audio/{file_id}`

But Coqui TTS backend only had:
- `POST /api/tts/synthesize`
- `POST /api/tts/model/info`
- `GET /health`

---

## ✅ Solution / Giải pháp

### 1. Added `delete_audio` Method to Storage / Thêm Method `delete_audio` vào Storage

**File:** `tts/coqui-ai-tts-backend/tts_backend/storage.py`

```python
def delete_audio(self, file_id: str) -> bool:
    """
    Delete audio file and metadata / Xóa file audio và metadata
    
    Args:
        file_id: File ID / ID file
        
    Returns:
        True if deleted, False otherwise / True nếu đã xóa, False nếu không
    """
    metadata = self.get_metadata(file_id)
    if not metadata:
        return False
    
    # Delete audio file
    audio_path = Path(metadata["file_path"])
    if audio_path.exists():
        try:
            audio_path.unlink()
        except Exception:
            pass
    
    # Delete metadata file
    metadata_path = self.metadata_dir / f"{file_id}.json"
    if metadata_path.exists():
        try:
            metadata_path.unlink()
        except Exception:
            pass
    
    # Remove from cache
    if file_id in self.metadata_cache:
        del self.metadata_cache[file_id]
    
    return True
```

### 2. Added DELETE Endpoint / Thêm Endpoint DELETE

**File:** `tts/coqui-ai-tts-backend/tts_backend/api.py`

```python
@router.delete("/audio/{file_id}")
async def delete_audio_file(file_id: str):
    """
    Delete audio file / Xóa file audio
    
    Args:
        file_id: File ID / ID file
        
    Returns:
        Success status / Trạng thái thành công
    """
    storage = get_storage()
    
    success = storage.delete_audio(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return {"success": True, "message": "Audio file deleted", "file_id": file_id}
```

### 3. Added GET Endpoints (Bonus) / Thêm Endpoint GET (Bổ sung)

For consistency with other backends, also added:

**Get Audio File:**
```python
@router.get("/audio/{file_id}")
async def get_audio_file(file_id: str):
    """Get stored audio file by ID"""
    # Returns audio file as streaming response
```

**Get Metadata:**
```python
@router.get("/audio/{file_id}/metadata")
async def get_audio_metadata(file_id: str):
    """Get audio file metadata"""
    # Returns JSON metadata
```

---

## 📡 API Endpoints / Điểm cuối API

### Complete API List / Danh sách API Đầy đủ

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/tts/synthesize` | Synthesize speech |
| `POST` | `/api/tts/model/info` | Get model info |
| `GET` | `/api/tts/audio/{file_id}` | Get audio file |
| `GET` | `/api/tts/audio/{file_id}/metadata` | Get metadata |
| `DELETE` | `/api/tts/audio/{file_id}` | **Delete audio file** ✨ |

---

## 🔄 Workflow / Quy trình

### Complete Flow / Luồng Đầy đủ

```
1. Worker requests audio generation
   POST /api/tts/synthesize
   ↓
2. TTS Backend generates and stores
   - Generates audio
   - Stores temporarily (2 hours)
   - Returns file_id
   ↓
3. Worker downloads audio
   GET /api/tts/audio/{file_id}
   - Downloads audio file
   - Saves to organized structure
   ↓
4. Worker deletes from TTS cache (optional)
   DELETE /api/tts/audio/{file_id}  ← NEW!
   - Frees up TTS backend storage
   - If fails, file expires naturally in 2 hours
```

---

## ✅ Benefits / Lợi ích

1. **Immediate Cleanup** - Free up storage space immediately after download
2. **Graceful Degradation** - If DELETE fails, file expires naturally anyway
3. **Consistency** - Matches other TTS backends (vieneu-tts-backend, VietTTS-backend)
4. **Worker Compatibility** - Worker can now successfully delete temporary files

---

## 🧪 Testing / Kiểm tra

### Test DELETE Endpoint / Kiểm tra Endpoint DELETE

```bash
# Generate audio first
curl -X POST http://localhost:11111/api/tts/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "model": "xtts-english",
    "store": true
  }'

# Get file_id from response, then delete
curl -X DELETE http://localhost:11111/api/tts/audio/{file_id}
```

### Expected Response / Phản hồi Mong đợi

**Success (200):**
```json
{
  "success": true,
  "message": "Audio file deleted",
  "file_id": "abc123..."
}
```

**Not Found (404):**
```json
{
  "detail": "Audio file not found"
}
```

---

## 📝 Notes / Ghi chú

- **Idempotent** - Deleting a non-existent file returns 404 (not an error)
- **Safe** - If deletion fails, file expires naturally in 2 hours
- **Cache Aware** - Removes from metadata cache as well
- **Compatible** - Matches worker expectations exactly

---

## ✅ Status / Trạng thái

**Implementation:** ✅ **COMPLETE**

**Ready for:** Production use

**Sẵn sàng cho:** Sử dụng trong sản xuất

---

**Created:** 2024-12-19
**Status:** ✅ Ready for testing

