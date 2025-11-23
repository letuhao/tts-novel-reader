# Novel Role Detection API Documentation
# Tài liệu API Phát hiện Vai diễn cho Novel

## Overview / Tổng quan

API để phát hiện vai diễn cho **toàn bộ novel** (tất cả chapters). Tự động skip các chapter đã được phân loại hoàn toàn và overwrite các chapter chưa hoàn tất.
API để phát hiện vai diễn cho **toàn bộ novel** (tất cả chapters). Tự động skip các chapter đã được phân loại hoàn toàn và overwrite các chapter chưa hoàn tất.

## Features / Tính năng

- ✅ **Skip complete chapters** - Tự động bỏ qua các chapter đã phân loại xong
- ✅ **Overwrite incomplete** - Ghi đè các chapter phân loại chưa xong
- ✅ **Sequential processing** - Xử lý từng chapter một để độ chính xác cao nhất
- ✅ **Progress tracking** - Theo dõi tiến độ cho toàn bộ novel

## API Endpoints / Điểm cuối API

### 1. Detect Roles for Entire Novel / Phát hiện Vai diễn cho Toàn bộ Novel

**POST** `/api/role-detection/detect-novel`

Detect roles for all chapters in a novel. Skip chapters that are already complete, overwrite incomplete chapters.
Phát hiện vai diễn cho tất cả chapters trong một novel. Bỏ qua các chapter đã complete, ghi đè các chapter chưa hoàn tất.

**Request Body:**
```json
{
  "novelId": "novel-uuid",
  "overwriteComplete": false,  // Optional, default: false (skip complete chapters)
  "updateProgress": true,       // Optional, default: true
  "saveMetadata": true          // Optional, default: true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Novel role detection completed successfully",
  "data": {
    "novelId": "novel-uuid",
    "novelTitle": "Novel Title",
    "totalChapters": 10,
    "processedChapters": 7,
    "skippedChapters": 3,
    "totalParagraphsProcessed": 1134,
    "totalParagraphsUpdated": 1134,
    "aggregatedRoleCounts": {
      "narrator": 378,
      "male": 378,
      "female": 378
    },
    "aggregatedVoiceCounts": {
      "quynh": 378,
      "cdteam": 378,
      "nu-nhe-nhang": 378
    },
    "chapterResults": [
      {
        "chapterNumber": 1,
        "totalParagraphs": 162,
        "updatedParagraphs": 162,
        "roleCounts": { "narrator": 55, "male": 54, "female": 53 },
        "voiceCounts": { "quynh": 55, "cdteam": 54, "nu-nhe-nhang": 53 },
        "processingTime": "13.63"
      },
      ...
    ],
    "skippedChapters": [
      {
        "chapterNumber": 2,
        "chapterTitle": "Chapter 2",
        "totalParagraphs": 150,
        "alreadyClassified": 150
      },
      ...
    ],
    "errors": []  // Only present if there were errors
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:11110/api/role-detection/detect-novel \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "novel-uuid"
  }'
```

**Processing Logic:**
1. Get all chapters for novel
2. Check each chapter:
   - If all paragraphs have role → **SKIP** (already complete)
   - If some paragraphs missing role → **PROCESS** (overwrite)
3. Process chapters **sequentially** (one at a time) for best accuracy
4. Track overall progress

---

### 2. Get Novel Status / Lấy Trạng thái Novel

**GET** `/api/role-detection/novel-status/:novelId`

Get role detection status for entire novel (all chapters).
Lấy trạng thái phát hiện vai diễn cho toàn bộ novel (tất cả chapters).

**Response:**
```json
{
  "success": true,
  "data": {
    "novelId": "novel-uuid",
    "novelTitle": "Novel Title",
    "totalChapters": 10,
    "completeChapters": 3,
    "incompleteChapters": 7,
    "totalParagraphs": 1500,
    "paragraphsWithRoles": 450,
    "overallProgress": 30,
    "isComplete": false,
    "chapterStatuses": [
      {
        "chapterNumber": 1,
        "chapterTitle": "Chapter 1",
        "totalParagraphs": 162,
        "paragraphsWithRoles": 162,
        "isComplete": true,
        "progressPercent": 100
      },
      {
        "chapterNumber": 2,
        "chapterTitle": "Chapter 2",
        "totalParagraphs": 150,
        "paragraphsWithRoles": 50,
        "isComplete": false,
        "progressPercent": 33
      },
      ...
    ]
  }
}
```

**cURL Example:**
```bash
curl http://localhost:11110/api/role-detection/novel-status/novel-uuid
```

---

## Logic Details / Chi tiết Logic

### Chapter Completion Check / Kiểm tra Hoàn thành Chapter

A chapter is considered **complete** if:
Một chapter được coi là **complete** nếu:

- All paragraphs in the chapter have both `role` AND `voice_id`
- Tất cả paragraphs trong chapter đều có cả `role` VÀ `voice_id`

```javascript
isComplete = totalParagraphs > 0 && paragraphsWithRoles === totalParagraphs
```

### Processing Strategy / Chiến lược Xử lý

1. **Sequential Processing** - Process one chapter at a time
   - Ensures best accuracy (full chapter context)
   - Đảm bảo độ chính xác tốt nhất (có đầy đủ context chapter)

2. **Skip Logic** - Automatically skip complete chapters
   - Saves processing time
   - Tiết kiệm thời gian xử lý

3. **Overwrite Logic** - Always overwrite incomplete chapters
   - Ensures consistency (all paragraphs have roles)
   - Đảm bảo tính nhất quán (tất cả paragraphs có roles)

---

## Usage Examples / Ví dụ Sử dụng

### JavaScript (Fetch API)

```javascript
// Detect roles for entire novel
async function detectNovelRoles(novelId) {
  const response = await fetch('/api/role-detection/detect-novel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novelId })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Processed:', result.data.processedChapters, 'chapters');
    console.log('Skipped:', result.data.skippedChapters, 'chapters');
    console.log('Updated:', result.data.totalParagraphsUpdated, 'paragraphs');
  }
}

// Check novel status
async function checkNovelStatus(novelId) {
  const response = await fetch(`/api/role-detection/novel-status/${novelId}`);
  const result = await response.json();
  
  if (result.success) {
    console.log(`Progress: ${result.data.overallProgress}%`);
    console.log(`Complete: ${result.data.completeChapters}/${result.data.totalChapters} chapters`);
  }
}
```

### Frontend Button Example

```javascript
// Button to detect roles for entire novel
async function handleDetectNovelRoles(novelId) {
  try {
    // Show loading state
    setLoading(true);
    
    // Start detection
    const response = await fetch('/api/role-detection/detect-novel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ novelId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show success message
      alert(`Detection completed!\n` +
            `Processed: ${result.data.processedChapters} chapters\n` +
            `Skipped: ${result.data.skippedChapters} chapters\n` +
            `Updated: ${result.data.totalParagraphsUpdated} paragraphs`);
      
      // Refresh UI
      loadNovelData();
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to detect roles: ' + error.message);
  } finally {
    setLoading(false);
  }
}
```

---

## Performance / Hiệu suất

### Processing Time / Thời gian Xử lý

- **Per paragraph**: ~0.08 seconds
- **Per chapter** (162 paragraphs): ~13 seconds
- **Novel** (10 chapters, 1500 paragraphs):
  - All new: ~2-3 minutes
  - 3 complete, 7 incomplete: ~1-2 minutes (skips complete chapters)

### Optimization / Tối ưu hóa

- ✅ Sequential processing (best accuracy per chapter)
- ✅ Skip complete chapters (saves time)
- ✅ Progress tracking (user can see status)
- ✅ Error handling (continues on chapter errors)

---

## Error Handling / Xử lý Lỗi

If a chapter fails, the process continues with other chapters:
Nếu một chapter lỗi, quá trình tiếp tục với các chapter khác:

```json
{
  "errors": [
    {
      "chapterNumber": 5,
      "error": "Chapter has no paragraphs"
    }
  ]
}
```

---

## Notes / Lưu ý

1. **Sequential Processing** - Chapters are processed one at a time for best accuracy
2. **Skip Complete** - Chapters with all paragraphs classified are automatically skipped
3. **Overwrite Incomplete** - Incomplete chapters are always re-processed
4. **Progress Tracking** - Overall progress is tracked in `generation_progress` table
5. **Ollama Required** - Make sure Ollama is running with `qwen3:8b` model

