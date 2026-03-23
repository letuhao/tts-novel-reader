# Enhanced Voice Mapping Implementation
# Triển Khai Ánh Xạ Giọng Nâng Cao

## ✅ Implementation Status / Trạng Thái Triển Khai

### Completed / Đã Hoàn Thành

1. ✅ **Enhanced Voice Mapping Service** (`enhancedVoiceMapping.js`)
   - Per-model voice configuration
   - Automatic round-robin voice assignment
   - Voice reuse when TTS model has fewer voices
   - Backward compatibility (male → male_1, female → female_1)

2. ✅ **Coqui XTTS-v2 Backend Configuration**
   - Added to `ttsConfig.js`
   - 58 speaker voices configured
   - Voice mapping support

3. ✅ **Enhanced Role Detection**
   - Updated to support multiple characters (`male_1`, `male_2`, `female_1`, etc.)
   - Dynamic role list based on max characters
   - Backward compatible with old 3-role system

4. ✅ **Worker Service Integration**
   - Updated to use `EnhancedVoiceMapping`
   - Supports per-novel voice mapping
   - Automatic voice assignment

5. ✅ **TTS Service Updates**
   - Coqui XTTS-v2 API support
   - Speaker parameter handling
   - Language parameter support

6. ✅ **Database Models**
   - `NovelVoiceMappingModel` for per-novel voice storage
   - Database tables for voice mappings and configs

---

## 📋 Remaining Tasks / Nhiệm Vụ Còn Lại

### 1. Database Migration Script
- Create migration to add `novel_voice_mappings` and `novel_voice_configs` tables
- Add indexes for performance

### 2. API Endpoints
- `GET /api/novels/:id/voice-mapping` - Get voice mapping for novel
- `PUT /api/novels/:id/voice-mapping` - Update voice mapping
- `GET /api/tts/voices/:model` - Get available voices for model
- `PUT /api/novels/:id/voice-strategy` - Set assignment strategy

### 3. Frontend Integration
- Voice selection UI per novel
- Voice preview functionality
- Assignment strategy toggle (automatic/manual)

### 4. Enhanced Voice Mapping Loading
- Implement async loading of novel mappings
- Cache novel mappings in memory
- Background refresh of mappings

---

## 🏗️ Architecture / Kiến Trúc

### Enhanced Voice Mapping Flow

```
Paragraph Text
    ↓
[Enhanced Role Detection]
    ↓
Role: "male_1", "female_2", "narrator", etc.
    ↓
[Enhanced Voice Mapping]
    ├─ Check novel-specific mapping (from DB)
    ├─ Check default model mapping
    └─ Automatic round-robin assignment
    ↓
Voice ID: "Andrew Chipper", "id_0004", "quynh", etc.
    ↓
[Backend-Specific Mapping]
    ↓
TTS Backend Request
    ↓
Audio Generated
```

### Database Schema

```sql
-- Novel voice mappings
CREATE TABLE novel_voice_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  novel_id TEXT NOT NULL,
  model TEXT NOT NULL,
  role TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(novel_id, model, role)
);

-- Novel voice configs
CREATE TABLE novel_voice_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  novel_id TEXT NOT NULL UNIQUE,
  assignment_strategy TEXT NOT NULL DEFAULT 'round-robin',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 🔧 Configuration / Cấu Hình

### Default Voice Mappings

**VietTTS:**
- `narrator`: `quynh`
- `male_1` to `male_5`: Various male voices
- `female_1` to `female_5`: Various female voices

**VieNeu-TTS:**
- `narrator`: `id_0004`
- `male_1` to `male_5`: Various male voices
- `female_1` to `female_5`: Various female voices

**Coqui XTTS-v2:**
- `narrator`: `Claribel Dervla`
- `male_1` to `male_10`: 10 diverse male speakers
- `female_1` to `female_10`: 10 diverse female speakers

### Voice Reuse Strategy

When a novel has more characters than available voices:
- Voices are reused using round-robin (modulo)
- Example: If 15 male characters but only 10 male voices, voices 1-10 are reused for characters 11-15

---

## 📝 Usage Examples / Ví Dụ Sử Dụng

### Automatic Voice Assignment (Default)

```javascript
const enhancedMapping = getEnhancedVoiceMapping();

// Get voice for role (automatic round-robin)
const voice = await enhancedMapping.getVoiceForRole('male_3', 'coqui-xtts-v2', novelId);
// Returns: "Damien Black" (3rd male voice in Coqui)

// If novel has 15 male characters but only 10 voices:
const voice15 = await enhancedMapping.getVoiceForRole('male_15', 'coqui-xtts-v2', novelId);
// Returns: "Andrew Chipper" (15 % 10 = 5, but 0-based index 4 = 5th voice)
```

### Manual Voice Assignment

```javascript
const { NovelVoiceMappingModel } = require('./models/NovelVoiceMapping.js');

// Set custom voice for novel
await NovelVoiceMappingModel.setMapping(
  novelId,
  'coqui-xtts-v2',
  'male_1',
  'Craig Gutsy'  // Custom voice instead of default
);

// Set assignment strategy to manual
await NovelVoiceMappingModel.setAssignmentStrategy(novelId, 'manual');
```

---

## 🔄 Backward Compatibility / Tương Thích Ngược

### Old Role System Support

- `male` → automatically normalized to `male_1`
- `female` → automatically normalized to `female_1`
- `narrator` → unchanged

### Migration Path

Existing novels with old 3-role system:
1. Continue to work with backward compatibility
2. Can be migrated to new system via role detection
3. Voice mapping automatically handles conversion

---

## 🎯 Next Steps / Bước Tiếp Theo

1. **Create Database Migration**
   - Add tables for novel voice mappings
   - Test migration on existing databases

2. **Create API Endpoints**
   - Voice mapping CRUD operations
   - Voice list endpoints
   - Strategy management

3. **Frontend Integration**
   - Voice selection UI
   - Voice preview
   - Strategy toggle

4. **Testing**
   - Test with English novels (Coqui XTTS-v2)
   - Test with Vietnamese novels (existing backends)
   - Test voice reuse with many characters

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Core Implementation Complete  
**Remaining:** API Endpoints, Frontend Integration, Testing

