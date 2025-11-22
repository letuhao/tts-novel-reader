# Audio Generation Worker / Worker Tạo Audio

## ✅ Worker is Ready! / Worker Đã Sẵn sàng!

The worker successfully generated audio for Chapter 1!  
Worker đã tạo audio thành công cho Chapter 1!

## 🎉 Test Results / Kết quả Kiểm tra

**Chapter 1 Audio Generated:**
- ✅ Generated in 64.2 seconds
- ✅ File ID: `4c9f1f853f5989be5b6759aee3d51c99`
- ✅ Audio URL: `http://127.0.0.1:8000/api/tts/audio/4c9f1f853f5989be5b6759aee3d51c99`
- ✅ Expires: 2026-11-22 (365 days)
- ✅ Status: Valid

## 📡 API Endpoints / Điểm cuối API

### Generate Single Chapter / Tạo Một Chapter

```bash
POST /api/worker/generate/chapter
{
  "novelId": "522e13ed-db50-4d2a-a0d9-92a3956d527d",
  "chapterNumber": 1,
  "speakerId": "05",
  "expiryHours": 8760,
  "forceRegenerate": false
}
```

### Check Status / Kiểm tra Trạng thái

```bash
GET /api/worker/status/:novelId/:chapterNumber
```

### Generate Multiple Chapters / Tạo Nhiều Chapters

```bash
POST /api/worker/generate/batch
{
  "novelId": "522e13ed-db50-4d2a-a0d9-92a3956d527d",
  "chapterNumbers": [1, 2, 3],
  "speakerId": "05"
}
```

### Generate All Chapters / Tạo Tất cả Chapters

```bash
POST /api/worker/generate/all
{
  "novelId": "522e13ed-db50-4d2a-a0d9-92a3956d527d",
  "speakerId": "05"
}
```

## 🧪 Testing / Kiểm tra

```bash
cd backend
python test_worker.py
```

## 💡 Features / Tính năng

1. ✅ **Pre-generation** - Generate audio before playback
2. ✅ **Caching** - Avoid regenerating existing audio
3. ✅ **Batch Processing** - Generate multiple chapters
4. ✅ **Status Tracking** - Check if audio exists
5. ✅ **Progress Updates** - Track generation progress

## 📊 Usage Example / Ví dụ Sử dụng

Generate audio for Chapter 1:
```python
import requests

response = requests.post(
    "http://127.0.0.1:3000/api/worker/generate/chapter",
    json={
        "novelId": "522e13ed-db50-4d2a-a0d9-92a3956d527d",
        "chapterNumber": 1,
        "speakerId": "05"
    }
)

result = response.json()
audio_url = result["result"]["audioURL"]
```

Check status:
```python
response = requests.get(
    "http://127.0.0.1:3000/api/worker/status/522e13ed-db50-4d2a-a0d9-92a3956d527d/1"
)

status = response.json()["status"]
if status["hasAudio"]:
    print(f"Audio URL: {status['audioURL']}")
```

---

**Worker is ready to pre-generate audio for all chapters!**  
**Worker sẵn sàng tạo audio trước cho tất cả chapters!**

