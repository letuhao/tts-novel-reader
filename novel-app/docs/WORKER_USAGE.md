# Audio Generation Worker / Worker Tạo Audio

## 🎯 Overview / Tổng quan

The worker service pre-generates audio for novel chapters/paragraphs/lines:
- Generate audio for single chapter
- Batch generate multiple chapters
- Generate all chapters in a novel
- Track generation status
- Manage audio cache

Dịch vụ worker tạo audio trước cho chapters/paragraphs/lines của novel:
- Tạo audio cho một chapter
- Tạo batch nhiều chapters
- Tạo tất cả chapters trong novel
- Theo dõi trạng thái tạo
- Quản lý cache audio

## 📡 API Endpoints / Điểm cuối API

### Generate Single Chapter / Tạo Một Chapter

```bash
POST /api/worker/generate/chapter
Content-Type: application/json

{
  "novelId": "uuid",
  "chapterNumber": 1,
  "speakerId": "05",
  "expiryHours": 8760,
  "forceRegenerate": false
}
```

### Generate Multiple Chapters (Batch) / Tạo Nhiều Chapters (Batch)

```bash
POST /api/worker/generate/batch
Content-Type: application/json

{
  "novelId": "uuid",
  "chapterNumbers": [1, 2, 3],
  "speakerId": "05",
  "expiryHours": 8760,
  "forceRegenerate": false
}
```

### Generate All Chapters / Tạo Tất cả Chapters

```bash
POST /api/worker/generate/all
Content-Type: application/json

{
  "novelId": "uuid",
  "speakerId": "05",
  "expiryHours": 8760,
  "forceRegenerate": false
}
```

### Get Chapter Status / Lấy Trạng thái Chapter

```bash
GET /api/worker/status/:novelId/:chapterNumber
```

## 🧪 Testing / Kiểm tra

Test script available:
```bash
cd backend
python test_worker.py
```

## 💡 Features / Tính năng

1. **Pre-generation** - Generate audio before playback
2. **Caching** - Avoid regenerating existing audio
3. **Batch Processing** - Generate multiple chapters efficiently
4. **Status Tracking** - Check if audio exists and is valid
5. **Progress Updates** - Track generation progress (SSE support)

## 📊 Example Response / Ví dụ Phản hồi

```json
{
  "success": true,
  "result": {
    "success": true,
    "cached": false,
    "chapterNumber": 1,
    "fileId": "abc123...",
    "audioURL": "http://127.0.0.1:11111/api/tts/audio/abc123...",
    "expiresAt": "2026-01-01T12:00:00",
    "message": "Audio generated successfully"
  }
}
```

---

**Worker is ready to pre-generate audio!**  
**Worker sẵn sàng tạo audio trước!**

