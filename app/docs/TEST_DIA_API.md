# Testing Dia TTS via Backend API / Kiểm tra Dia TTS qua Backend API

## 🚀 Starting the Backend / Khởi động Backend

The backend service is running at: **http://127.0.0.1:11111**

## 📝 API Endpoints / Điểm cuối API

### 1. Health Check / Kiểm tra Sức khỏe

```bash
GET http://127.0.0.1:11111/health
```

Or visit: http://127.0.0.1:11111/health

### 2. API Documentation / Tài liệu API

Visit: **http://127.0.0.1:11111/docs**

This provides an interactive Swagger UI where you can test the API directly!  
Đây cung cấp Swagger UI tương tác nơi bạn có thể kiểm tra API trực tiếp!

### 3. Get Dia TTS Model Info / Lấy Thông tin Model Dia TTS

```bash
POST http://127.0.0.1:11111/api/tts/model/info
Content-Type: application/json

{
  "model": "dia"
}
```

### 4. Synthesize Speech with Dia TTS / Tổng hợp Giọng nói với Dia TTS

```bash
POST http://127.0.0.1:11111/api/tts/synthesize
Content-Type: application/json

{
  "text": "[01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt sử dụng model Dia.",
  "model": "dia",
  "temperature": 1.3,
  "top_p": 0.95,
  "cfg_scale": 3.0
}
```

**Response:** Audio file (WAV format)

## 🧪 Testing with curl / Kiểm tra với curl

### Test 1: Health Check

```powershell
curl http://127.0.0.1:11111/health
```

### Test 2: Get Model Info

```powershell
curl -X POST "http://127.0.0.1:11111/api/tts/model/info" `
  -H "Content-Type: application/json" `
  -d '{"model": "dia"}'
```

### Test 3: Generate Speech

```powershell
curl -X POST "http://127.0.0.1:11111/api/tts/synthesize" `
  -H "Content-Type: application/json" `
  -d '{
    "text": "[01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt.",
    "model": "dia",
    "temperature": 1.3,
    "top_p": 0.95,
    "cfg_scale": 3.0
  }' `
  --output dia_output.wav
```

## 🌐 Testing with Browser / Kiểm tra với Trình duyệt

1. **Open:** http://127.0.0.1:11111/docs
2. **Click on:** `/api/tts/model/info` → Try it out
3. **Enter:**
   ```json
   {
     "model": "dia"
   }
   ```
4. **Execute** → See model information

5. **Click on:** `/api/tts/synthesize` → Try it out
6. **Enter:**
   ```json
   {
     "text": "[01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt.",
     "model": "dia",
     "temperature": 1.3,
     "top_p": 0.95,
     "cfg_scale": 3.0
   }
   ```
7. **Execute** → Download audio file

## 📊 Expected Response / Phản hồi Mong đợi

### Model Info Response

```json
{
  "success": true,
  "info": {
    "model": "Dia-Finetuning-Vietnamese",
    "sample_rate": 44100,
    "device": "cuda",
    "requires_reference": false
  }
}
```

### Synthesize Response

- Content-Type: `audio/wav`
- Body: Binary audio data
- File: Downloadable WAV file

## 🎯 Text Format for Dia / Định dạng Văn bản cho Dia

### Single Speaker / Đơn giọng

```
[01] Your Vietnamese text here.
```

### Multi-Speaker / Đa giọng

```
[01] First speaker text. [02] Second speaker text.
```

**Note:** Speaker IDs like `[01]`, `[02]` are predefined in the model.  
**Lưu ý:** ID người nói như `[01]`, `[02]` được định nghĩa sẵn trong model.

## ✅ Success Indicators / Chỉ báo Thành công

- ✅ Backend starts without errors
- ✅ Health check returns `{"status": "healthy"}`
- ✅ Model info returns Dia TTS information
- ✅ Synthesize returns audio file
- ✅ Audio file plays correctly

---

**Test via http://127.0.0.1:11111/docs for easiest testing!**  
**Kiểm tra qua http://127.0.0.1:11111/docs để kiểm tra dễ nhất!**

