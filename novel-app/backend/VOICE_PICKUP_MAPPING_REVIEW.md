# Voice Pickup and Mapping Logic Review
# Đánh Giá Logic Chọn và Ánh Xạ Giọng Nói

## 📋 Overview / Tổng Quan

This document reviews the voice pickup and mapping logic in the novel-app backend.

Tài liệu này đánh giá logic chọn và ánh xạ giọng nói trong backend novel-app.

---

## 🏗️ Architecture / Kiến Trúc

### Components / Các Thành Phần

1. **Voice Mapping (`backend/src/utils/voiceMapping.js`)**
   - Maps roles (male/female/narrator) to voice IDs
   - Ánh xạ vai diễn (male/female/narrator) sang voice IDs

2. **TTS Config (`backend/src/config/ttsConfig.js`)**
   - Maps voice IDs between different TTS backends (VietTTS ↔ VieNeu-TTS)
   - Ánh xạ voice ID giữa các TTS backend khác nhau (VietTTS ↔ VieNeu-TTS)

3. **TTS Service (`backend/src/services/ttsService.js`)**
   - Uses voice mapping to convert voice IDs for specific backends
   - Sử dụng voice mapping để chuyển đổi voice ID cho backend cụ thể

4. **Role Detection Service (`backend/src/services/roleDetectionService.js`)**
   - Detects roles (male/female/narrator) from paragraph text
   - Phát hiện vai diễn (male/female/narrator) từ văn bản paragraph

5. **Worker Service (`backend/src/services/worker.js`)**
   - Orchestrates voice selection based on detected roles
   - Điều phối việc chọn giọng dựa trên vai diễn đã phát hiện

---

## 🔄 Voice Pickup Flow / Luồng Chọn Giọng

### Step 1: Role Detection / Phát Hiện Vai Diễn

**Location:** `backend/src/services/roleDetectionService.js`

**Process:**
1. Paragraphs are analyzed using Ollama (qwen3:8b model)
2. Each paragraph is classified as: `narrator`, `male`, or `female`
3. Results stored in `role_map`: `{paragraph_index: role}`

**Example:**
```javascript
{
  "0": "narrator",
  "1": "male",
  "2": "female",
  "3": "narrator"
}
```

**Code:**
```javascript
// RoleDetectionService._detectRolesBatch()
const roleMap = await this._detectRolesBatch(paragraphs, chapterContext);
```

---

### Step 2: Role to Voice Mapping / Ánh Xạ Vai Diễn Sang Giọng

**Location:** `backend/src/utils/voiceMapping.js`

**Default Mapping:**
```javascript
const DEFAULT_VOICE_MAPPING = {
  male: 'cdteam',        // VietTTS voice name
  female: 'nu-nhe-nhang', // VietTTS voice name
  narrator: 'quynh'      // VietTTS voice name
};
```

**Process:**
1. Role detection returns role (male/female/narrator)
2. `VoiceMapping.getVoiceForRole(role)` maps role to voice ID
3. Returns VietTTS voice name (e.g., "quynh", "cdteam", "nu-nhe-nhang")

**Code:**
```javascript
// VoiceMapping.getVoiceForRole()
getVoiceForRole(role) {
  const normalizedRole = String(role).toLowerCase().trim();
  return this.mapping[normalizedRole] || this.mapping.narrator;
}
```

**Example:**
- `role = "narrator"` → `voiceId = "quynh"`
- `role = "male"` → `voiceId = "cdteam"`
- `role = "female"` → `voiceId = "nu-nhe-nhang"`

---

### Step 3: Voice ID Mapping for Backend / Ánh Xạ Voice ID Cho Backend

**Location:** `backend/src/config/ttsConfig.js`

**Purpose:**
- Maps VietTTS voice names to VieNeu-TTS voice IDs
- Maps voice IDs between different TTS backends

**Reverse Mapping (VietTTS → VieNeu-TTS):**
```javascript
const VIETTTS_TO_VIENEU_MAPPING = {
  'quynh': 'id_0004',        // narrator → female voice 2
  'nu-nhe-nhang': 'id_0004', // female → female voice 2
  'cdteam': 'id_0007',       // male → male voice 4 (deep)
  // ... more mappings
};
```

**Standard Mapping (id_xxx format):**
```javascript
const VOICE_MAPPING = {
  'id_0004': {
    viettts: 'quynh',
    vieneuTTS: 'id_0004',
    description: 'giọng nữ nhẹ nhàng, dùng để dẫn truyện',
    gender: 'female',
    tone: 'nhẹ nhàng',
    preferredForNarrator: true
  },
  // ... more mappings
};
```

**Process:**
1. Voice ID from role mapping (e.g., "quynh")
2. `getMappedVoice(voiceId, backendName)` converts to backend-specific voice ID
3. For VieNeu-TTS: "quynh" → "id_0004"
4. For VietTTS: "quynh" → "quynh" (unchanged)

**Code:**
```javascript
// ttsConfig.js - getMappedVoice()
export function getMappedVoice(voiceId, backendName) {
  if (backendName === 'vieneu-tts') {
    if (VIETTTS_TO_VIENEU_MAPPING[voiceId]) {
      return VIETTTS_TO_VIENEU_MAPPING[voiceId];
    }
    // ... handle id_xxx format
  }
  // ... handle VietTTS backend
}
```

---

### Step 4: Worker Voice Selection / Chọn Giọng Trong Worker

**Location:** `backend/src/services/worker.js`

**Process:**
1. Worker processes each paragraph
2. Checks if paragraph has `voiceId` (from role detection)
3. If `voiceId` exists: use it directly
4. If `role` exists: map role to voice using `VoiceMapping`
5. If neither: use fallback voice ("quynh")

**Code:**
```javascript
// Worker.generateParagraphAudio()
let selectedVoice = 'quynh';  // Default fallback

if (paragraph.voiceId) {
  // Use voice from role detection
  selectedVoice = paragraph.voiceId;
} else if (paragraph.role) {
  // Use voice mapping based on role
  const voiceMapping = getVoiceMapping();
  selectedVoice = voiceMapping.getVoiceForRole(paragraph.role);
} else {
  // No role detected, use fallback
  selectedVoice = 'quynh';
}
```

---

### Step 5: TTS Service Voice Mapping / Ánh Xạ Giọng Trong TTS Service

**Location:** `backend/src/services/ttsService.js`

**Process:**
1. TTS Service receives voice ID (e.g., "quynh")
2. Determines target backend (VietTTS or VieNeu-TTS)
3. Maps voice ID to backend-specific format
4. Sends request to TTS backend with mapped voice

**Code:**
```javascript
// TTSService.generateAudio()
const backendConfig = getBackendConfig(model);
const actualBackendName = backendConfig ? backendConfig.name : model;
const mappedVoice = this.mapVoiceId(voice, actualBackendName);

// Build request with mapped voice
requestBody.voice = mappedVoice;
```

**Example Flow:**
```
Role: "narrator"
  ↓
VoiceMapping: "narrator" → "quynh"
  ↓
TTS Config (VieNeu-TTS): "quynh" → "id_0004"
  ↓
TTS Backend Request: { voice: "id_0004", ... }
```

---

## 📊 Data Flow Diagram / Sơ Đồ Luồng Dữ Liệu

```
Paragraph Text
    ↓
[Role Detection Service]
    ↓
Role Map: {0: "narrator", 1: "male", 2: "female"}
    ↓
[Voice Mapping]
    ↓
Voice Map: {0: "quynh", 1: "cdteam", 2: "nu-nhe-nhang"}
    ↓
[Worker Service]
    ↓
Selected Voice: "quynh" (for paragraph 0)
    ↓
[TTS Service]
    ↓
Backend Mapping: "quynh" → "id_0004" (for VieNeu-TTS)
    ↓
[TTS Backend API]
    ↓
Audio Generated with Voice "id_0004"
```

---

## 🔍 Key Files / Các File Quan Trọng

### 1. `backend/src/utils/voiceMapping.js`
- **Purpose:** Maps roles to voice IDs
- **Key Function:** `getVoiceForRole(role)`
- **Default Mapping:**
  - `male` → `'cdteam'`
  - `female` → `'nu-nhe-nhang'`
  - `narrator` → `'quynh'`

### 2. `backend/src/config/ttsConfig.js`
- **Purpose:** Maps voice IDs between backends
- **Key Function:** `getMappedVoice(voiceId, backendName)`
- **Mappings:**
  - `VIETTTS_TO_VIENEU_MAPPING`: VietTTS names → VieNeu-TTS IDs
  - `VOICE_MAPPING`: Standard id_xxx format mapping

### 3. `backend/src/services/ttsService.js`
- **Purpose:** TTS API integration with voice mapping
- **Key Function:** `mapVoiceId(voiceId, model)`
- **Process:** Converts voice IDs for specific backends

### 4. `backend/src/services/roleDetectionService.js`
- **Purpose:** Detects roles from text
- **Key Function:** `detectRoles(paragraphs, options)`
- **Output:** `{role_map: {...}, voice_map: {...}}`

### 5. `backend/src/services/worker.js`
- **Purpose:** Orchestrates voice selection
- **Key Logic:** Paragraph voice selection (lines 468-487)
- **Process:** 
  1. Check `paragraph.voiceId`
  2. Check `paragraph.role` → map to voice
  3. Fallback to default voice

---

## ⚠️ Current Limitations / Hạn Chế Hiện Tại

### 1. **Hardcoded Voice Mapping**
- Voice mapping is hardcoded in `voiceMapping.js`
- Cannot be customized per novel or chapter
- **Impact:** All novels use same voice mapping

### 2. **Limited Voice Options**
- Only 3 default voices (cdteam, nu-nhe-nhang, quynh)
- No support for custom voice selection
- **Impact:** Limited voice variety

### 3. **Backend-Specific Mapping**
- Mapping logic is complex with multiple backends
- Requires maintenance when adding new backends
- **Impact:** Difficult to add new TTS backends

### 4. **No Voice Persistence**
- Voice selection is not stored in database
- Cannot track which voice was used for each paragraph
- **Impact:** Cannot regenerate with same voice later

### 5. **Role Detection Dependency**
- Voice selection depends on role detection accuracy
- If role detection fails, uses fallback voice
- **Impact:** Inconsistent voice selection

---

## ✅ Recommendations / Đề Xuất

### 1. **Database Storage**
- Store `voiceId` in `Paragraph` model
- Persist voice selection for regeneration
- **File:** `backend/src/models/Paragraph.js`

### 2. **Custom Voice Mapping**
- Allow per-novel voice mapping configuration
- Support custom voice selection UI
- **File:** New `backend/src/models/VoiceConfig.js`

### 3. **Voice Selection API**
- Add API endpoint to get available voices
- Support voice preview
- **File:** `backend/src/routes/voices.js`

### 4. **Improved Fallback**
- Better fallback logic when role detection fails
- Support manual voice override
- **File:** `backend/src/services/worker.js`

### 5. **Voice Mapping Validation**
- Validate voice IDs before sending to TTS backend
- Better error handling for invalid voices
- **File:** `backend/src/services/ttsService.js`

---

## 📝 Summary / Tóm Tắt

### Current Flow / Luồng Hiện Tại:
1. **Role Detection** → Detects male/female/narrator
2. **Voice Mapping** → Maps role to voice ID (quynh/cdteam/nu-nhe-nhang)
3. **Backend Mapping** → Maps voice ID for specific backend (quynh → id_0004)
4. **TTS Generation** → Generates audio with mapped voice

### Key Components / Các Thành Phần Chính:
- `VoiceMapping`: Role → Voice ID
- `ttsConfig`: Voice ID → Backend-specific Voice ID
- `TTSService`: Handles voice mapping for API calls
- `Worker`: Orchestrates voice selection per paragraph

### Issues / Vấn Đề:
- Hardcoded mappings
- Limited voice options
- No persistence
- Complex backend mapping

---

**Last Updated:** 2024-12-19  
**Reviewed By:** AI Assistant  
**Status:** ✅ Complete Review

