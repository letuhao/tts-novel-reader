# Voice Mapping Enhancement Proposal
# Đề Xuất Nâng Cấp Ánh Xạ Giọng Nói

## 🎯 Goals / Mục Tiêu

1. **Support Coqui XTTS-v2** for English novels
2. **Flexible Role System** - Support multiple characters (not just 3 roles)
3. **Dynamic Voice Mapping** - Map roles to voices per TTS model
4. **Character Tracking** - Track and maintain character consistency

---

## 📊 Current Limitations / Hạn Chế Hiện Tại

### 1. Limited Role System
- **Current:** Only 3 roles (`male`, `female`, `narrator`)
- **Problem:** Novels have many characters (multiple males, multiple females)
- **Impact:** All male characters use same voice, all female characters use same voice

### 2. Hardcoded Voice Mapping
- **Current:** Fixed 3 voices (`cdteam`, `nu-nhe-nhang`, `quynh`)
- **Problem:** Cannot customize per novel or character
- **Impact:** Limited voice variety, cannot distinguish characters

### 3. No Character Tracking
- **Current:** No character database/model
- **Problem:** Cannot track which character is speaking
- **Impact:** Cannot maintain character consistency across chapters

### 4. No Coqui TTS Support
- **Current:** Only VietTTS and VieNeu-TTS
- **Problem:** Cannot use XTTS-v2 for English novels
- **Impact:** Missing 58 high-quality English voices

---

## 🏗️ Proposed Architecture / Kiến Trúc Đề Xuất

### 1. Enhanced Role System / Hệ Thống Vai Diễn Nâng Cao

#### Option A: Character-Based Roles (Recommended)
```javascript
// Role format: "character_{id}" or "character_{name}"
{
  "0": "narrator",
  "1": "character_1",      // First character (male)
  "2": "character_2",      // Second character (female)
  "3": "character_3",      // Third character (male)
  "4": "narrator",
  "5": "character_1"       // Same character as paragraph 1
}
```

**Pros:**
- Tracks individual characters
- Maintains consistency across chapters
- Can assign unique voices per character

**Cons:**
- Requires character detection/identification
- More complex role detection

#### Option B: Character Group Roles
```javascript
// Role format: "male_1", "female_1", "male_2", etc.
{
  "0": "narrator",
  "1": "male_1",           // First male character
  "2": "female_1",         // First female character
  "3": "male_2",           // Second male character
  "4": "narrator"
}
```

**Pros:**
- Simpler than character-based
- Still supports multiple characters
- Easier role detection

**Cons:**
- Less precise than character-based
- May confuse different characters of same gender

#### Option C: Named Character Roles
```javascript
// Role format: Character name or ID
{
  "0": "narrator",
  "1": "john",             // Character name
  "2": "mary",             // Character name
  "3": "narrator"
}
```

**Pros:**
- Most intuitive
- Easy to understand
- Natural character tracking

**Cons:**
- Requires character name extraction
- May have duplicate names

**Recommendation:** Start with **Option B** (Character Group Roles), then evolve to **Option A** (Character-Based Roles) for better tracking.

---

### 2. Flexible Voice Mapping System / Hệ Thống Ánh Xạ Giọng Linh Hoạt

#### Architecture:
```javascript
// Voice Mapping Configuration
{
  // Per TTS Model Configuration
  "viettts": {
    "narrator": "quynh",
    "male_1": "cdteam",
    "male_2": "nguyen-ngoc-ngan",
    "female_1": "nu-nhe-nhang",
    "female_2": "diep-chi"
  },
  "vieneu-tts": {
    "narrator": "id_0004",
    "male_1": "id_0007",
    "male_2": "id_0001",
    "female_1": "id_0004",
    "female_2": "id_0002"
  },
  "coqui-xtts-v2": {
    "narrator": "Claribel Dervla",
    "male_1": "Andrew Chipper",
    "male_2": "Craig Gutsy",
    "male_3": "Damien Black",
    "female_1": "Daisy Studious",
    "female_2": "Gracie Wise",
    "female_3": "Ana Florence"
  }
}
```

#### Per-Novel Voice Configuration:
```javascript
// Novel-specific voice mapping (optional override)
{
  "novel_id": "abc123",
  "voice_mapping": {
    "coqui-xtts-v2": {
      "narrator": "Claribel Dervla",
      "male_1": "Andrew Chipper",
      "female_1": "Daisy Studious"
    }
  }
}
```

---

### 3. Character Database Model / Mô Hình Database Nhân Vật

```sql
-- Characters table
CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  novel_id TEXT NOT NULL,
  character_name TEXT,
  character_id TEXT,  -- Unique ID within novel (e.g., "character_1")
  gender TEXT,         -- "male", "female", "unknown"
  role_type TEXT,      -- "male_1", "female_1", "character_1", etc.
  default_voice_id TEXT,  -- Default voice for this character
  metadata JSON,       -- Additional character info
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (novel_id) REFERENCES novels(id)
);

-- Character appearances (track which paragraphs use which characters)
CREATE TABLE character_appearances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paragraph_id INTEGER NOT NULL,
  character_id INTEGER NOT NULL,
  confidence REAL,     -- Detection confidence (0.0-1.0)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paragraph_id) REFERENCES paragraphs(id),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

---

### 4. Enhanced Role Detection / Phát Hiện Vai Diễn Nâng Cao

#### Current Prompt (3 roles):
```
- narrator
- male
- female
```

#### Enhanced Prompt (Multiple characters):
```
Bạn là hệ thống phân loại vai diễn cho tiểu thuyết.

Nhiệm vụ: Phân loại mỗi đoạn văn thành một trong các loại:
- narrator: Văn bản dẫn chuyện, mô tả
- male_1: Lời nói/suy nghĩ của nhân vật nam đầu tiên
- male_2: Lời nói/suy nghĩ của nhân vật nam thứ hai
- female_1: Lời nói/suy nghĩ của nhân vật nữ đầu tiên
- female_2: Lời nói/suy nghĩ của nhân vật nữ thứ hai
- ... (thêm nhiều hơn nếu cần)

Ngữ cảnh: [chapter context]

Trả lời JSON: {"1": "narrator", "2": "male_1", "3": "female_1", ...}
```

#### Character-Aware Detection:
```javascript
// Enhanced role detection with character tracking
async detectRolesWithCharacters(paragraphs, options = {}) {
  const {
    maxMaleCharacters = 5,    // Max male characters to track
    maxFemaleCharacters = 5,  // Max female characters to track
    chapterContext = '',
    previousCharacters = []    // Characters from previous chapters
  } = options;
  
  // Build dynamic role list
  const roles = ['narrator'];
  for (let i = 1; i <= maxMaleCharacters; i++) {
    roles.push(`male_${i}`);
  }
  for (let i = 1; i <= maxFemaleCharacters; i++) {
    roles.push(`female_${i}`);
  }
  
  // Use enhanced prompt with dynamic roles
  const prompt = this._buildEnhancedPrompt(paragraphs, roles, chapterContext);
  // ... detection logic
}
```

---

### 5. Voice Mapping Service / Dịch Vụ Ánh Xạ Giọng

```javascript
// Enhanced Voice Mapping Service
export class EnhancedVoiceMapping {
  constructor() {
    // Default mappings per TTS model
    this.modelMappings = {
      'viettts': {
        'narrator': 'quynh',
        'male_1': 'cdteam',
        'male_2': 'nguyen-ngoc-ngan',
        'female_1': 'nu-nhe-nhang',
        'female_2': 'diep-chi'
      },
      'vieneu-tts': {
        'narrator': 'id_0004',
        'male_1': 'id_0007',
        'male_2': 'id_0001',
        'female_1': 'id_0004',
        'female_2': 'id_0002'
      },
      'coqui-xtts-v2': {
        'narrator': 'Claribel Dervla',
        'male_1': 'Andrew Chipper',
        'male_2': 'Craig Gutsy',
        'male_3': 'Damien Black',
        'male_4': 'Badr Odhiambo',
        'male_5': 'Dionisio Schuyler',
        'female_1': 'Daisy Studious',
        'female_2': 'Gracie Wise',
        'female_3': 'Ana Florence',
        'female_4': 'Tammie Ema',
        'female_5': 'Alison Dietlinde'
      }
    };
    
    // Novel-specific overrides
    this.novelMappings = {};
  }
  
  /**
   * Get voice for role and model
   */
  getVoiceForRole(role, model, novelId = null) {
    // Check novel-specific mapping first
    if (novelId && this.novelMappings[novelId]?.[model]?.[role]) {
      return this.novelMappings[novelId][model][role];
    }
    
    // Use default model mapping
    const modelMapping = this.modelMappings[model];
    if (modelMapping && modelMapping[role]) {
      return modelMapping[role];
    }
    
    // Fallback to narrator
    return modelMapping?.narrator || this._getDefaultVoice(model);
  }
  
  /**
   * Set novel-specific voice mapping
   */
  setNovelMapping(novelId, model, role, voiceId) {
    if (!this.novelMappings[novelId]) {
      this.novelMappings[novelId] = {};
    }
    if (!this.novelMappings[novelId][model]) {
      this.novelMappings[novelId][model] = {};
    }
    this.novelMappings[novelId][model][role] = voiceId;
  }
  
  /**
   * Get available voices for a model
   */
  getAvailableVoices(model) {
    if (model === 'coqui-xtts-v2') {
      // Fetch from Coqui TTS API
      return this._fetchCoquiSpeakers();
    }
    // Return predefined voices for other models
    return this._getPredefinedVoices(model);
  }
}
```

---

## 🔄 Enhanced Data Flow / Luồng Dữ Liệu Nâng Cao

```
Paragraph Text
    ↓
[Enhanced Role Detection]
    ↓
Role Map: {0: "narrator", 1: "male_1", 2: "female_1", 3: "male_2"}
    ↓
[Character Tracking]
    ↓
Character Map: {1: "character_1", 2: "character_2", 3: "character_3"}
    ↓
[Enhanced Voice Mapping]
    ↓
Voice Map: {
  0: "Claribel Dervla" (narrator),
  1: "Andrew Chipper" (male_1),
  2: "Daisy Studious" (female_1),
  3: "Craig Gutsy" (male_2)
}
    ↓
[Backend-Specific Mapping]
    ↓
Coqui XTTS-v2: "Andrew Chipper" → "Andrew Chipper" (no change)
    ↓
[TTS Generation]
    ↓
Audio with Character-Specific Voices
```

---

## 📝 Implementation Plan / Kế Hoạch Triển Khai

### Phase 1: Enhanced Role System
1. ✅ Update role detection to support multiple characters
2. ✅ Add character group roles (`male_1`, `male_2`, `female_1`, etc.)
3. ✅ Update database schema for character tracking
4. ✅ Update role detection prompt

### Phase 2: Flexible Voice Mapping
1. ✅ Create `EnhancedVoiceMapping` service
2. ✅ Add Coqui XTTS-v2 voice mapping
3. ✅ Support per-novel voice configuration
4. ✅ Add voice selection API

### Phase 3: Character Tracking
1. ✅ Create `Character` model
2. ✅ Track character appearances
3. ✅ Maintain character consistency
4. ✅ Character management UI (future)

### Phase 4: Integration
1. ✅ Update worker to use enhanced mapping
2. ✅ Update TTS service for Coqui support
3. ✅ Add voice preview/selection
4. ✅ Testing and validation

---

## 🎨 Example Usage / Ví Dụ Sử Dụng

### English Novel with Coqui XTTS-v2:
```javascript
// Role detection result
{
  "0": "narrator",
  "1": "male_1",      // Protagonist (John)
  "2": "female_1",   // Love interest (Mary)
  "3": "male_2",     // Antagonist (Bob)
  "4": "narrator"
}

// Voice mapping (Coqui XTTS-v2)
{
  "0": "Claribel Dervla",    // narrator
  "1": "Andrew Chipper",     // male_1 (John)
  "2": "Daisy Studious",     // female_1 (Mary)
  "3": "Craig Gutsy",        // male_2 (Bob)
  "4": "Claribel Dervla"     // narrator
}

// Generated audio with distinct voices per character
```

### Vietnamese Novel with VieNeu-TTS:
```javascript
// Role detection result
{
  "0": "narrator",
  "1": "male_1",
  "2": "female_1",
  "3": "male_2"
}

// Voice mapping (VieNeu-TTS)
{
  "0": "id_0004",    // narrator
  "1": "id_0007",    // male_1
  "2": "id_0004",    // female_1
  "3": "id_0001"     // male_2
}
```

---

## 🔧 Configuration Files / File Cấu Hình

### `voiceMappingConfig.js` (New)
```javascript
export const VOICE_MAPPING_CONFIG = {
  // Default mappings per model
  defaultMappings: {
    'viettts': { /* ... */ },
    'vieneu-tts': { /* ... */ },
    'coqui-xtts-v2': { /* ... */ }
  },
  
  // Max characters per gender
  maxCharacters: {
    male: 10,
    female: 10
  },
  
  // Voice assignment strategy
  strategy: 'round-robin' // or 'character-based'
};
```

### Database Migration
```sql
-- Add character tracking columns
ALTER TABLE paragraphs ADD COLUMN character_id TEXT;
ALTER TABLE paragraphs ADD COLUMN character_role TEXT; -- "male_1", "female_1", etc.

-- Create characters table
CREATE TABLE characters (...);
```

---

## ✅ Benefits / Lợi Ích

1. **Multiple Characters:** Support many characters per novel
2. **Character Distinction:** Each character can have unique voice
3. **Coqui Support:** Use 58 high-quality English voices
4. **Flexibility:** Per-novel voice customization
5. **Consistency:** Character tracking across chapters
6. **Scalability:** Easy to add new TTS models

---

## ❓ Questions for Discussion / Câu Hỏi Thảo Luận

1. **Role System:** Which option (A/B/C) do you prefer?
2. **Character Limit:** How many characters per gender? (5, 10, unlimited?)
3. **Voice Assignment:** Automatic or manual per novel?
4. **Character Detection:** Use character names or just count?
5. **Backward Compatibility:** How to handle existing novels with 3-role system?

---

**Last Updated:** 2024-12-19  
**Status:** 📋 Proposal - Awaiting Discussion

