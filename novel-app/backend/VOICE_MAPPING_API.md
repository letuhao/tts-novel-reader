# Enhanced Voice Mapping API Documentation
# Tài Liệu API Ánh Xạ Giọng Nâng Cao

## Overview / Tổng Quan

The Enhanced Voice Mapping API provides endpoints for managing voice assignments for TTS models, supporting multiple characters per gender, per-novel voice overrides, and flexible assignment strategies.

API Ánh Xạ Giọng Nâng Cao cung cấp các endpoint để quản lý gán giọng cho các model TTS, hỗ trợ nhiều nhân vật mỗi giới tính, ghi đè giọng theo novel, và các chiến lược gán linh hoạt.

---

## Base URL / URL Cơ Sở

```
/api/voice-mapping
```

---

## Endpoints / Các Điểm Cuối

### 1. Get All TTS Models
**GET** `/api/voice-mapping/models`

Get list of all available TTS models.

**Response:**
```json
{
  "success": true,
  "models": [
    {
      "name": "viettts",
      "displayName": "VietTTS (dangvansam)",
      "model": "viettts",
      "baseURL": "http://127.0.0.1:11111",
      "defaultVoice": "quynh"
    },
    {
      "name": "vieneu-tts",
      "displayName": "VieNeu-TTS",
      "model": "vieneu-tts",
      "baseURL": "http://127.0.0.1:11111",
      "defaultVoice": "id_0004"
    },
    {
      "name": "coqui-xtts-v2",
      "displayName": "Coqui XTTS-v2",
      "model": "coqui-xtts-v2",
      "baseURL": "http://127.0.0.1:11111",
      "defaultVoice": "Claribel Dervla"
    }
  ],
  "count": 3
}
```

---

### 2. Get Available Voices
**GET** `/api/voice-mapping/voices/:model`

Get available voices for a specific TTS model.

**Parameters:**
- `model` (path): TTS model name (e.g., `coqui-xtts-v2`, `viettts`, `vieneu-tts`)

**Query Parameters:**
- `gender` (optional): Filter by gender (`male`, `female`, `narrator`, or `all`). Default: `all`

**Example:**
```
GET /api/voice-mapping/voices/coqui-xtts-v2?gender=male
```

**Response:**
```json
{
  "success": true,
  "model": "coqui-xtts-v2",
  "gender": "male",
  "voices": [
    "Andrew Chipper",
    "Craig Gutsy",
    "Damien Black",
    ...
  ],
  "count": 28
}
```

---

### 3. Get Default Voice Mappings
**GET** `/api/voice-mapping/default/:model`

Get default voice mappings for a TTS model.

**Parameters:**
- `model` (path): TTS model name

**Example:**
```
GET /api/voice-mapping/default/coqui-xtts-v2
```

**Response:**
```json
{
  "success": true,
  "model": "coqui-xtts-v2",
  "mappings": {
    "narrator": "Claribel Dervla",
    "male_1": "Andrew Chipper",
    "male_2": "Craig Gutsy",
    "male_3": "Damien Black",
    "female_1": "Daisy Studious",
    "female_2": "Gracie Wise",
    ...
  }
}
```

---

### 4. Get Novel Voice Mappings
**GET** `/api/voice-mapping/novel/:novelId`

Get voice mappings for a specific novel.

**Parameters:**
- `novelId` (path): Novel ID

**Query Parameters:**
- `model` (optional): TTS model name. If not provided, returns mappings for all models.

**Example:**
```
GET /api/voice-mapping/novel/novel-123?model=coqui-xtts-v2
```

**Response:**
```json
{
  "success": true,
  "novelId": "novel-123",
  "novelTitle": "My Novel",
  "model": "coqui-xtts-v2",
  "novelMappings": {
    "male_1": "Craig Gutsy",
    "female_1": "Ana Florence"
  },
  "defaultMappings": {
    "narrator": "Claribel Dervla",
    "male_1": "Andrew Chipper",
    ...
  },
  "hasCustomMappings": true
}
```

---

### 5. Set Novel Voice Mappings
**PUT** `/api/voice-mapping/novel/:novelId`

Set voice mappings for a specific novel.

**Parameters:**
- `novelId` (path): Novel ID

**Request Body:**
```json
{
  "model": "coqui-xtts-v2",
  "mappings": {
    "narrator": "Claribel Dervla",
    "male_1": "Craig Gutsy",
    "male_2": "Damien Black",
    "female_1": "Ana Florence",
    "female_2": "Gracie Wise"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Voice mappings updated",
  "novelId": "novel-123",
  "model": "coqui-xtts-v2",
  "mappings": {
    "narrator": "Claribel Dervla",
    "male_1": "Craig Gutsy",
    "male_2": "Damien Black",
    "female_1": "Ana Florence",
    "female_2": "Gracie Wise"
  }
}
```

**Error Responses:**
- `400`: Invalid model or voice IDs
- `404`: Novel not found

---

### 6. Clear Novel Voice Mappings
**DELETE** `/api/voice-mapping/novel/:novelId`

Clear voice mappings for a specific novel.

**Parameters:**
- `novelId` (path): Novel ID

**Query Parameters:**
- `model` (optional): TTS model name. If not provided, clears mappings for all models.

**Example:**
```
DELETE /api/voice-mapping/novel/novel-123?model=coqui-xtts-v2
```

**Response:**
```json
{
  "success": true,
  "message": "Voice mappings cleared for model coqui-xtts-v2",
  "novelId": "novel-123",
  "model": "coqui-xtts-v2"
}
```

---

### 7. Get Assignment Strategy
**GET** `/api/voice-mapping/novel/:novelId/strategy`

Get assignment strategy for a novel.

**Parameters:**
- `novelId` (path): Novel ID

**Response:**
```json
{
  "success": true,
  "novelId": "novel-123",
  "strategy": "round-robin",
  "description": "Automatically assign voices in round-robin fashion"
}
```

**Strategy Options:**
- `round-robin`: Automatically assign voices in round-robin fashion (default)
- `manual`: Use novel-specific voice mappings only

---

### 8. Set Assignment Strategy
**PUT** `/api/voice-mapping/novel/:novelId/strategy`

Set assignment strategy for a novel.

**Parameters:**
- `novelId` (path): Novel ID

**Request Body:**
```json
{
  "strategy": "manual"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Assignment strategy updated",
  "novelId": "novel-123",
  "strategy": "manual"
}
```

---

### 9. Resolve Voice for Role
**POST** `/api/voice-mapping/resolve`

Resolve voice for a role (useful for testing and debugging).

**Request Body:**
```json
{
  "role": "male_1",
  "model": "coqui-xtts-v2",
  "novelId": "novel-123"
}
```

**Response:**
```json
{
  "success": true,
  "role": "male_1",
  "normalizedRole": "male_1",
  "model": "coqui-xtts-v2",
  "novelId": "novel-123",
  "voice": "Craig Gutsy",
  "isNovelSpecific": true
}
```

---

## Error Responses / Phản Hồi Lỗi

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message"
}
```

**Common Status Codes:**
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (novel not found)
- `500`: Internal Server Error

---

## Examples / Ví Dụ

### Example 1: Get all voices for Coqui XTTS-v2
```bash
curl http://localhost:11110/api/voice-mapping/voices/coqui-xtts-v2
```

### Example 2: Set custom voice mappings for a novel
```bash
curl -X PUT http://localhost:11110/api/voice-mapping/novel/novel-123 \
  -H "Content-Type: application/json" \
  -d '{
    "model": "coqui-xtts-v2",
    "mappings": {
      "male_1": "Craig Gutsy",
      "female_1": "Ana Florence"
    }
  }'
```

### Example 3: Resolve voice for a role
```bash
curl -X POST http://localhost:11110/api/voice-mapping/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "role": "male_1",
    "model": "coqui-xtts-v2",
    "novelId": "novel-123"
  }'
```

---

**Last Updated:** 2024-12-19  
**Status:** ✅ API Endpoints Created

