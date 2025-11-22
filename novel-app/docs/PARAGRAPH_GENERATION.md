# ✅ Paragraph-Level Audio Generation / Tạo Audio theo Paragraph

## 🎯 New Generation Strategy / Chiến lược Tạo Mới

Chapters are now split into **paragraphs** and each paragraph generates a **separate audio file**.

Chapters giờ được chia thành **paragraphs** và mỗi paragraph tạo một **file audio riêng**.

## 🔧 Why This Approach / Tại sao Cách Tiếp cận Này

### Problems with Single Chapter Audio / Vấn đề với Audio Chapter Đơn

1. **Token Limits** - Very long chapters exceed TTS model token limits
2. **Generation Failures** - Single failure breaks entire chapter
3. **No Granularity** - Can't skip/cache individual parts
4. **Frontend Flexibility** - Harder to implement seamless playback

1. **Giới hạn Token** - Chapter rất dài vượt quá giới hạn token của model TTS
2. **Lỗi Tạo** - Một lỗi làm hỏng toàn bộ chapter
3. **Không Có Tính Chi tiết** - Không thể bỏ qua/cache từng phần
4. **Tính Linh hoạt Frontend** - Khó triển khai phát liền mạch

### Benefits of Paragraph-Level / Lợi ích theo Paragraph

1. ✅ **No Token Limits** - Each paragraph is small enough
2. ✅ **Error Resilience** - One paragraph failure doesn't break entire chapter
3. ✅ **Better Caching** - Cache individual paragraphs
4. ✅ **Frontend Control** - Easy seamless playback between files
5. ✅ **Progress Tracking** - Track generation progress per paragraph

1. ✅ **Không Giới hạn Token** - Mỗi paragraph đủ nhỏ
2. ✅ **Khả năng Chịu Lỗi** - Một paragraph lỗi không làm hỏng toàn bộ chapter
3. ✅ **Cache Tốt hơn** - Cache từng paragraph
4. ✅ **Điều khiển Frontend** - Dễ phát liền mạch giữa các file
5. ✅ **Theo dõi Tiến độ** - Theo dõi tiến độ tạo theo paragraph

## 📊 Current Implementation / Triển khai Hiện tại

### Chapter Structure / Cấu trúc Chapter

```javascript
{
  chapterNumber: 1,
  paragraphs: [
    {
      paragraphNumber: 0,
      paragraphId: "uuid",
      text: "Paragraph text...",
      lines: ["Line 1", "Line 2"]
    },
    // ... more paragraphs
  ]
}
```

### Generation Flow / Luồng Tạo

1. **Split Chapter** - Get all paragraphs from chapter
2. **Check Cache** - Check if paragraph audio already exists
3. **Generate Per Paragraph** - Generate audio for each paragraph separately
4. **Store Metadata** - Store paragraph audio metadata in database
5. **Organize Storage** - Files organized by novel/chapter/paragraph

### Storage Organization / Tổ chức Lưu trữ

```
storage/audio/
└── {novel_id}/
    └── chapter_001/
        ├── paragraph_000/
        │   ├── {file_id}.wav
        │   └── {file_id}.json
        ├── paragraph_001/
        │   ├── {file_id}.wav
        │   └── {file_id}.json
        └── ...
```

## 🚀 API Endpoints / Điểm cuối API

### Generate Chapter Audio (Paragraph-Level)
```bash
POST /api/worker/generate/chapter
{
  "novelId": "uuid",
  "chapterNumber": 1,
  "speakerId": "05",
  "speedFactor": 1.0,  // Normal speed (matches preset)
  "forceRegenerate": false
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "chapterNumber": 1,
    "totalParagraphs": 112,
    "successCount": 110,
    "failedCount": 2,
    "cachedCount": 5,
    "generatedCount": 105,
    "paragraphResults": [
      {
        "paragraphNumber": 0,
        "paragraphId": "uuid",
        "fileId": "file_id",
        "audioURL": "http://...",
        "cached": false
      }
    ],
    "errors": []
  }
}
```

### Get Chapter Audio Files
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
      "paragraphId": "uuid",
      "fileId": "file_id",
      "audioURL": "http://...",
      "expiresAt": "..."
    }
  ]
}
```

### Get Specific Paragraph Audio
```bash
GET /api/audio/:novelId/:chapterNumber/:paragraphNumber?speakerId=05
```

**Response:** Redirects to TTS backend audio file

## ⚙️ Configuration / Cấu hình

### Speed Factor
- **Default:** `1.0` (normal speed - matches preset `dia_female_05.wav`)
- **Range:** `0.8 - 1.0` (lower = slower)
- **Recommendation:** Use `1.0` for best voice quality matching preset

### Processing Delays
- **Delay Between Items:** 1000ms (1 second between paragraphs)
- **Purpose:** Avoid overloading TTS backend

## 📈 Performance / Hiệu năng

### Example: Chapter 1 (112 paragraphs)

- **Total Paragraphs:** 112
- **Average Paragraph:** ~100-200 characters
- **Generation Time:** ~5-10 minutes (for all paragraphs)
- **Per Paragraph:** ~3-5 seconds

**Benefits:**
- ✅ Each paragraph is small (no token limit issues)
- ✅ Failures are isolated per paragraph
- ✅ Can resume failed paragraphs
- ✅ Better progress tracking

## 💡 Frontend Integration / Tích hợp Frontend

### Seamless Playback / Phát Liền mạch

Frontend can now:
1. Get all paragraph audio files for a chapter
2. Play them sequentially for continuous narration
3. Handle gaps/seeking per paragraph
4. Show progress per paragraph

**Example:**
```javascript
// Get all paragraph audio files
const audioFiles = await getChapterAudio(novelId, chapterNumber);

// Play sequentially
for (const file of audioFiles) {
  await playAudio(file.audioURL);
  // Automatically play next when current finishes
}
```

---

**Chapters are now split into paragraphs for better generation and playback!**  
**Chapters giờ được chia thành paragraphs để tạo và phát tốt hơn!**

