# Audio Storage Organization / Tổ chức Lưu trữ Audio

## 📁 Storage Structure / Cấu trúc Lưu trữ

Audio files are now organized by novel and chapter for better management.

File audio giờ được tổ chức theo novel và chapter để quản lý tốt hơn.

### Structure / Cấu trúc

```
storage/
└── audio/
    └── {novel_id}/
        └── chapter_{XXX}/
            ├── {file_id}.wav          # Audio file
            └── {file_id}.json         # Metadata file
```

### Example / Ví dụ

```
storage/
└── audio/
    └── 522e13ed-db50-4d2a-a0d9-92a3956d527d/
        ├── chapter_001/
        │   ├── 4c9f1f853f5989be5b6759aee3d51c99.wav
        │   └── 4c9f1f853f5989be5b6759aee3d51c99.json
        ├── chapter_002/
        │   ├── abc123def456.wav
        │   └── abc123def456.json
        └── chapter_003/
            └── ...
```

## 🎯 Benefits / Lợi ích

1. **Organized by Novel** - Easy to find all audio for a novel
2. **Organized by Chapter** - Easy to find specific chapter audio
3. **Clear Structure** - Predictable file locations
4. **Easy Cleanup** - Can delete by novel or chapter
5. **Better Management** - Track storage per novel/chapter

1. **Tổ chức theo Novel** - Dễ tìm tất cả audio của một novel
2. **Tổ chức theo Chapter** - Dễ tìm audio của chapter cụ thể
3. **Cấu trúc Rõ ràng** - Vị trí file có thể dự đoán
4. **Dọn dẹp Dễ dàng** - Có thể xóa theo novel hoặc chapter
5. **Quản lý Tốt hơn** - Theo dõi lưu trữ theo novel/chapter

## 📡 API Endpoints / Điểm cuối API

### Get Storage Structure / Lấy Cấu trúc Lưu trữ

```bash
GET /api/worker/storage/:novelId
```

**Response:**
```json
{
  "success": true,
  "structure": {
    "novelId": "uuid",
    "baseDir": "storage/audio/uuid",
    "chapters": [
      {
        "chapterNumber": 1,
        "chapterDir": "chapter_001",
        "audioCount": 1,
        "metadataCount": 1
      }
    ]
  }
}
```

## 🔧 Features / Tính năng

1. ✅ **Automatic Organization** - Files organized automatically
2. ✅ **Directory Creation** - Directories created as needed
3. ✅ **Local Caching** - Audio files cached locally
4. ✅ **Metadata Storage** - Metadata stored alongside audio
5. ✅ **Path Management** - Easy to get file paths

## 📊 Path Functions / Hàm Đường dẫn

- `getStoragePath(novelId, chapterNumber, paragraphNumber)` - Get storage directory
- `getAudioFilePath(novelId, chapterNumber, fileId, paragraphNumber)` - Get audio file path
- `getMetadataFilePath(novelId, chapterNumber, fileId, paragraphNumber)` - Get metadata file path
- `getStorageStructure(novelId)` - Get storage structure info

---

**Storage is now organized by novel and chapter!**  
**Lưu trữ giờ được tổ chức theo novel và chapter!**

