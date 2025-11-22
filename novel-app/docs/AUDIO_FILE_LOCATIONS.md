# Audio File Locations / Vị trí File Audio

## 📁 Storage Structure / Cấu trúc Lưu trữ

Audio files are stored in two locations with different purposes:

File audio được lưu ở hai vị trí với mục đích khác nhau:

### 1. **TTS Backend Storage** (Primary Storage) / Lưu trữ TTS Backend (Lưu trữ Chính)

**Location / Vị trí:**
```
D:\Works\source\novel-reader\app\storage\audio\
```

**Files / Files:**
- `{file_id}.wav` - Actual audio files / File audio thực tế
- `metadata/{file_id}.json` - File metadata

**Purpose / Mục đích:**
- Primary storage for all generated audio files
- Managed by TTS backend microservice
- Files organized by file ID (flat structure)

- Lưu trữ chính cho tất cả file audio được tạo
- Được quản lý bởi TTS backend microservice
- File được tổ chức theo file ID (cấu trúc phẳng)

**Access / Truy cập:**
```
http://127.0.0.1:11111/api/tts/audio/{file_id}
```

### 2. **Novel App Organized Storage** (Metadata & Tracking) / Lưu trữ Novel App Có Tổ chức (Metadata & Tracking)

**Location / Vị trí:**
```
D:\Works\source\novel-reader\novel-app\storage\audio\{novel_id}/chapter_XXX/paragraph_YYY/
```

**Structure / Cấu trúc:**
```
storage/audio/
└── {novel_id}/
    └── chapter_001/
        ├── paragraph_000/
        │   ├── {file_id}.json  (metadata)
        │   └── {file_id}.wav   (optional local copy)
        ├── paragraph_001/
        │   ├── {file_id}.json
        │   └── {file_id}.wav
        └── ...
```

**Purpose / Mục đích:**
- Organize audio files by novel/chapter/paragraph
- Track paragraph-level audio generation
- Store metadata for easy retrieval
- Enable seamless frontend playback

- Tổ chức file audio theo novel/chapter/paragraph
- Theo dõi tạo audio theo paragraph
- Lưu metadata để truy xuất dễ dàng
- Cho phép phát liền mạch ở frontend

## 🔍 Finding Audio Files / Tìm File Audio

### Method 1: Via API / Qua API

**Get all paragraph audio files for a chapter:**
```bash
GET /api/audio/:novelId/:chapterNumber?speakerId=05
```

**Response:**
```json
{
  "success": true,
  "chapterNumber": 1,
  "totalParagraphs": 112,
  "audioFileCount": 110,
  "audioFiles": [
    {
      "paragraphNumber": 0,
      "fileId": "abc123...",
      "audioURL": "http://127.0.0.1:11111/api/tts/audio/abc123..."
    }
  ]
}
```

### Method 2: Direct File Access / Truy cập File Trực tiếp

**TTS Backend Storage:**
```powershell
# List all audio files
Get-ChildItem "D:\Works\source\novel-reader\app\storage\audio\*.wav"
```

**Novel App Organized Storage:**
```powershell
# List paragraph directories
Get-ChildItem "D:\Works\source\novel-reader\novel-app\storage\audio\{novel_id}\chapter_001\paragraph_*" -Directory
```

### Method 3: Check Database / Kiểm tra Database

**Query audio_cache table:**
```sql
SELECT * FROM audio_cache 
WHERE novel_id = '522e13ed-db50-4d2a-a0d9-92a3956d527d' 
  AND chapter_number = 1
ORDER BY paragraph_number ASC;
```

## 📊 Current Chapter 1 Audio Files / File Audio Chapter 1 Hiện tại

**Generation Status:**
- Total Paragraphs: 112
- Status: Generating (paragraph-level)
- Storage: TTS Backend + Novel App metadata

**File Organization:**
- Paragraph 0: `paragraph_000/` directory
- Paragraph 1: `paragraph_001/` directory
- ... and so on

**Access Pattern:**
1. Frontend gets list of paragraph audio files via API
2. Files are accessed via TTS backend URLs
3. Frontend plays files sequentially for seamless narration

## 💡 Key Points / Điểm Chính

1. **Audio files** are stored in TTS backend storage (flat structure)
2. **Metadata** is organized by novel/chapter/paragraph (hierarchical structure)
3. **Frontend** gets file list from API and streams from TTS backend
4. **Each paragraph** has its own audio file for seamless playback

1. **File audio** được lưu trong TTS backend storage (cấu trúc phẳng)
2. **Metadata** được tổ chức theo novel/chapter/paragraph (cấu trúc phân cấp)
3. **Frontend** lấy danh sách file từ API và stream từ TTS backend
4. **Mỗi paragraph** có file audio riêng để phát liền mạch

---

**Audio files are organized by paragraph for seamless playback!**  
**File audio được tổ chức theo paragraph để phát liền mạch!**
