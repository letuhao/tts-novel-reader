# Role Detection API Documentation
# Tài liệu API Phát hiện Vai diễn

## Overview / Tổng quan

API để phát hiện vai diễn (male/female/narrator) cho các đoạn văn trong tiểu thuyết, sử dụng Qwen3-8B qua Ollama.
API để phát hiện vai diễn (male/female/narrator) cho các đoạn văn trong tiểu thuyết, sử dụng Qwen3-8B qua Ollama.

## Prerequisites / Yêu cầu

1. **Ollama** đang chạy
2. **Qwen3-8B** model đã được cài đặt:
   ```bash
   ollama pull qwen3:8b
   ```

3. **Environment variables** (optional):
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_DEFAULT_MODEL=qwen3:8b
   OLLAMA_TIMEOUT=120000
   ```

## Architecture / Kiến trúc

```
┌─────────────────┐
│   API Route     │  /api/role-detection/detect
│  roleDetection  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│RoleDetection    │  Service layer
│Service          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OllamaProvider │  Reusable Ollama client
│  (Reusable)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Ollama API    │  http://localhost:11434
└─────────────────┘
```

## API Endpoints / Điểm cuối API

### 1. Detect Roles / Phát hiện Vai diễn

**POST** `/api/role-detection/detect`

Detect roles (male/female/narrator) for paragraphs.
Phát hiện vai diễn (male/female/narrator) cho các đoạn văn.

**Request Body:**
```json
{
  "paragraphs": [
    "Đây là đoạn dẫn chuyện của tác giả.",
    "Anh ấy nói: 'Xin chào.'",
    "Cô ấy đáp lại một cách nhẹ nhàng."
  ],
  "chapterContext": "Optional full chapter text for better context...",
  "returnVoiceIds": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "role_map": {
      "0": "narrator",
      "1": "male",
      "2": "female"
    },
    "voice_map": {
      "0": "quynh",
      "1": "cdteam",
      "2": "nu-nhe-nhang"
    }
  },
  "count": 3
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:11110/api/role-detection/detect \
  -H "Content-Type: application/json" \
  -d '{
    "paragraphs": [
      "Đây là đoạn dẫn chuyện.",
      "Anh ấy nói: \"Xin chào.\"",
      "Cô ấy đáp lại."
    ],
    "returnVoiceIds": true
  }'
```

---

### 2. Check Service Status / Kiểm tra Trạng thái Dịch vụ

**GET** `/api/role-detection/status`

Check if role detection service is available.
Kiểm tra dịch vụ phát hiện vai diễn có sẵn không.

**Response (Available):**
```json
{
  "success": true,
  "available": true,
  "model": "qwen3:8b",
  "message": "Role detection service is available"
}
```

**Response (Not Available):**
```json
{
  "success": false,
  "available": false,
  "message": "Role detection service is not available",
  "details": "Please check: 1) Ollama is running, 2) qwen3:8b model is installed"
}
```

---

### 3. Get Voice Mapping / Lấy Voice Mapping

**GET** `/api/role-detection/voices`

Get current voice mapping configuration.
Lấy cấu hình voice mapping hiện tại.

**Response:**
```json
{
  "success": true,
  "mappings": {
    "male": "cdteam",
    "female": "nu-nhe-nhang",
    "narrator": "quynh"
  },
  "default_mappings": {
    "male": "cdteam",
    "female": "nu-nhe-nhang",
    "narrator": "quynh"
  }
}
```

---

### 4. Update Voice Mapping / Cập nhật Voice Mapping

**PUT** `/api/role-detection/voices`

Update voice mapping for roles.
Cập nhật voice mapping cho các vai diễn.

**Request Body:**
```json
{
  "male": "cdteam",
  "female": "nu-nhe-nhang",
  "narrator": "quynh"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Voice mapping updated",
  "mappings": {
    "male": "cdteam",
    "female": "nu-nhe-nhang",
    "narrator": "quynh"
  }
}
```

## Error Responses / Phản hồi Lỗi

### 400 Bad Request
```json
{
  "success": false,
  "error": "paragraphs is required and must be a non-empty array"
}
```

### 503 Service Unavailable
```json
{
  "success": false,
  "error": "Role detection service is not available. Make sure Ollama is running with qwen3:8b model.",
  "details": "Please check: 1) Ollama is running, 2) qwen3:8b model is installed"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

## Voice Mapping / Ánh xạ Giọng

Default voice mapping:
- **male** → `cdteam` (giọng nam trầm)
- **female** → `nu-nhe-nhang` (giọng nữ nhẹ nhàng)
- **narrator** → `quynh` (giọng nữ nhẹ nhàng, recommended for narrator)

Available Vietnamese voices:
- `cdteam` - giọng nam trầm
- `nguyen-ngoc-ngan` - giọng nam trầm
- `nsnd-le-chuc` - giọng nam nhẹ nhàng
- `nu-nhe-nhang` - giọng nữ nhẹ nhàng
- `diep-chi` - giọng nữ cao
- `quynh` - giọng nữ nhẹ nhàng (narrator)

## Usage Examples / Ví dụ Sử dụng

### JavaScript (Fetch API)
```javascript
const response = await fetch('http://localhost:11110/api/role-detection/detect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    paragraphs: [
      "Đây là đoạn dẫn chuyện.",
      "Anh ấy nói: 'Xin chào.'",
      "Cô ấy đáp lại."
    ],
    returnVoiceIds: true
  })
});

const result = await response.json();
console.log(result.data.role_map);  // {0: "narrator", 1: "male", 2: "female"}
console.log(result.data.voice_map); // {0: "quynh", 1: "cdteam", 2: "nu-nhe-nhang"}
```

### Python (Requests)
```python
import requests

response = requests.post('http://localhost:11110/api/role-detection/detect', json={
    'paragraphs': [
        'Đây là đoạn dẫn chuyện.',
        'Anh ấy nói: "Xin chào."',
        'Cô ấy đáp lại.'
    ],
    'returnVoiceIds': True
})

result = response.json()
print(result['data']['role_map'])   # {0: 'narrator', 1: 'male', 2: 'female'}
print(result['data']['voice_map'])  # {0: 'quynh', 1: 'cdteam', 2: 'nu-nhe-nhang'}
```

## Integration with Novel Pipeline / Tích hợp với Novel Pipeline

### Example: Detect roles for chapter
```javascript
// Get chapter paragraphs
const chapter = await ChapterModel.getById(chapterId);
const paragraphs = chapter.paragraphs.map(p => p.text);

// Detect roles
const response = await fetch('http://localhost:11110/api/role-detection/detect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paragraphs: paragraphs,
    chapterContext: chapter.fullText,
    returnVoiceIds: true
  })
});

const { data } = await response.json();

// Use voice IDs for TTS generation
for (const [idx, voiceId] of Object.entries(data.voice_map)) {
  const paragraph = paragraphs[parseInt(idx)];
  await generateAudio(paragraph, voiceId);
}
```

## Files Created / Files Đã Tạo

1. **`src/services/ollamaProvider.js`**
   - Reusable Ollama API client
   - Methods: `generate()`, `generateJSON()`, `chat()`, `isAvailable()`, `isModelAvailable()`

2. **`src/services/roleDetectionService.js`**
   - Role detection service
   - Uses `ollamaProvider` for communication
   - Maps roles to voice IDs

3. **`src/utils/voiceMapping.js`**
   - Voice mapping utility
   - Manages role → voice ID mappings

4. **`src/routes/roleDetection.js`**
   - API routes for role detection
   - Endpoints: `/detect`, `/status`, `/voices`, `PUT /voices`

## Testing / Kiểm thử

1. **Check Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Check service status:**
   ```bash
   curl http://localhost:11110/api/role-detection/status
   ```

3. **Test role detection:**
   ```bash
   curl -X POST http://localhost:11110/api/role-detection/detect \
     -H "Content-Type: application/json" \
     -d '{"paragraphs": ["Đây là đoạn dẫn chuyện.", "Anh ấy nói: \"Xin chào.\""], "returnVoiceIds": true}'
   ```

