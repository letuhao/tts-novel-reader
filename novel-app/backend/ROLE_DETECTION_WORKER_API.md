# Role Detection Worker API Documentation
# Tài liệu API Worker Phát hiện Vai diễn

## Overview / Tổng quan

API để trigger role detection worker cho một chapter, tự động phát hiện vai diễn (male/female/narrator) và voice ID cho tất cả paragraphs trong chapter.
API để trigger role detection worker cho một chapter, tự động phát hiện vai diễn (male/female/narrator) và voice ID cho tất cả paragraphs trong chapter.

## Storage / Lưu trữ

Role và voice_id được lưu vào **CẢ 2 nơi**:
1. **SQLite Database** (chính):
   - `paragraphs.role` - Role detected (male/female/narrator)
   - `paragraphs.voice_id` - Voice ID mapped (cdteam/quynh/nu-nhe-nhang)

2. **Metadata File** (backup/reference):
   - `storage/audio/{novelId}/chapter_{number}/metadata/role_detection.json`
   - Contains full detection results, role map, voice map, and statistics

## API Endpoints / Điểm cuối API

### 1. Detect Roles for Chapter / Phát hiện Vai diễn cho Chapter

**POST** `/api/role-detection/detect-chapter`

Trigger role detection worker for all paragraphs in a chapter.
Kích hoạt worker phát hiện vai diễn cho tất cả paragraphs trong một chapter.

**Request Body:**
```json
{
  "novelId": "novel-uuid",
  "chapterNumber": 1,
  "updateProgress": true,  // Optional, default: true
  "saveMetadata": true     // Optional, default: true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role detection completed successfully",
  "data": {
    "novelId": "novel-uuid",
    "chapterNumber": 1,
    "totalParagraphs": 162,
    "updatedParagraphs": 162,
    "roleCounts": {
      "narrator": 55,
      "male": 54,
      "female": 53
    },
    "voiceCounts": {
      "quynh": 55,
      "cdteam": 54,
      "nu-nhe-nhang": 53
    },
    "processingTime": "13.63",
    "roleMap": { "0": "narrator", "1": "male", ... },
    "voiceMap": { "0": "quynh", "1": "cdteam", ... }
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:11110/api/role-detection/detect-chapter \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "novel-uuid",
    "chapterNumber": 1
  }'
```

**Processing Time:**
- ~0.08 seconds per paragraph
- 162 paragraphs: ~13-15 seconds
- Progress is tracked in `generation_progress` table

---

### 2. Get Chapter Status / Lấy Trạng thái Chapter

**GET** `/api/role-detection/chapter-status/:novelId/:chapterNumber`

Get role detection status for a chapter.
Lấy trạng thái phát hiện vai diễn cho một chapter.

**Response:**
```json
{
  "success": true,
  "data": {
    "novelId": "novel-uuid",
    "chapterNumber": 1,
    "totalParagraphs": 162,
    "paragraphsWithRoles": 162,
    "progressPercent": 100,
    "isComplete": true,
    "roleCounts": {
      "narrator": 55,
      "male": 54,
      "female": 53
    },
    "voiceCounts": {
      "quynh": 55,
      "cdteam": 54,
      "nu-nhe-nhang": 53
    }
  }
}
```

**cURL Example:**
```bash
curl http://localhost:11110/api/role-detection/chapter-status/novel-uuid/1
```

---

## Usage Flow / Luồng Sử dụng

### Step 1: Detect Roles / Bước 1: Phát hiện Vai diễn

```bash
# Trigger role detection
curl -X POST http://localhost:11110/api/role-detection/detect-chapter \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "your-novel-id",
    "chapterNumber": 1
  }'
```

### Step 2: Check Status / Bước 2: Kiểm tra Trạng thái

```bash
# Check if detection is complete
curl http://localhost:11110/api/role-detection/chapter-status/your-novel-id/1
```

### Step 3: Use in Audio Generation / Bước 3: Sử dụng trong Tạo Audio

After role detection, paragraphs will have `role` and `voiceId` fields. Audio generation can use these automatically.
Sau khi phát hiện vai diễn, paragraphs sẽ có fields `role` và `voiceId`. Tạo audio có thể tự động sử dụng các fields này.

---

## Database Schema / Schema Database

### Paragraphs Table

```sql
CREATE TABLE paragraphs (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  paragraph_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  lines TEXT,
  role TEXT,              -- NEW: male/female/narrator
  voice_id TEXT,          -- NEW: cdteam/quynh/nu-nhe-nhang
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  ...
);
```

---

## Metadata File Structure / Cấu trúc File Metadata

```json
{
  "novelId": "novel-uuid",
  "novelTitle": "Novel Title",
  "chapterNumber": 1,
  "chapterTitle": "Chapter 1",
  "totalParagraphs": 162,
  "detectedAt": "2024-01-01T12:00:00.000Z",
  "roleDetection": {
    "roleMap": { "0": "narrator", "1": "male", ... },
    "voiceMap": { "0": "quynh", "1": "cdteam", ... },
    "roleCounts": {
      "narrator": 55,
      "male": 54,
      "female": 53
    },
    "voiceCounts": {
      "quynh": 55,
      "cdteam": 54,
      "nu-nhe-nhang": 53
    }
  },
  "paragraphs": [
    {
      "paragraphNumber": 1,
      "role": "narrator",
      "voiceId": "quynh",
      "textPreview": "..."
    },
    ...
  ]
}
```

**Location:** `storage/audio/{novelId}/chapter_{number}/metadata/role_detection.json`

---

## Error Responses / Phản hồi Lỗi

### 400 Bad Request
```json
{
  "success": false,
  "error": "novelId and chapterNumber are required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Chapter not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Role detection service is not available. Make sure Ollama is running with qwen3:8b model."
}
```

---

## Integration / Tích hợp

### Frontend Button Example

```javascript
// Detect roles button
async function detectRoles(novelId, chapterNumber) {
  try {
    const response = await fetch('/api/role-detection/detect-chapter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novelId, chapterNumber })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Roles detected:', result.data.roleCounts);
      // Update UI to show roles are ready
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Check Status Example

```javascript
// Check if roles are detected
async function checkRoleStatus(novelId, chapterNumber) {
  const response = await fetch(
    `/api/role-detection/chapter-status/${novelId}/${chapterNumber}`
  );
  const result = await response.json();
  
  if (result.success && result.data.isComplete) {
    console.log('Roles ready:', result.data.roleCounts);
  }
}
```

---

## Notes / Lưu ý

1. **Processing Time**: ~0.08 seconds per paragraph (162 paragraphs ≈ 13 seconds)
2. **Progress Tracking**: Progress is tracked in `generation_progress` table
3. **Dual Storage**: Roles saved to both SQLite and metadata file
4. **Ollama Required**: Make sure Ollama is running with `qwen3:8b` model
5. **Automatic Voice Mapping**: Voice IDs are automatically assigned based on roles

