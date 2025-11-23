# Worker Update for VieNeu-TTS Backend
# Cập nhật Worker cho VieNeu-TTS Backend

## ✅ Changes Summary / Tóm tắt Thay đổi

The worker has been updated to be fully compatible with the new VieNeu-TTS backend.

Worker đã được cập nhật để tương thích hoàn toàn với backend VieNeu-TTS mới.

### 1. **TTS Service (`ttsService.js`)**

**Default Model Changed:**
- **Before:** `'dia'`
- **After:** `'vieneu-tts'`

**Added VieNeu-TTS Parameters:**
- `voice` - Voice selection (default: `'id_0004'` - female)
- `autoVoice` - Auto-detect gender from text (default: `false`)
- `autoChunk` - Auto-chunk long text (default: `true`)
- `maxChars` - Max characters per chunk (default: `256`)

**Request Format:**
```javascript
{
  text: "Your text here",
  model: "vieneu-tts",
  voice: "id_0004",  // or "female", "male", or specific ID
  auto_voice: false,  // Auto-detect gender
  auto_chunk: true,   // Auto-chunk long text
  max_chars: 256,     // Max chars per chunk
  store: true,
  return_audio: false
}
```

### 2. **Worker Service (`worker.js`)**

**Added VieNeu-TTS Options to Constructor:**
```javascript
constructor(options = {}) {
  // ... existing options ...
  this.voice = options.voice || 'id_0004';  // Default female voice
  this.autoVoice = options.autoVoice || false;
  this.autoChunk = options.autoChunk !== false;  // Default true
  this.maxChars = options.maxChars || 256;
}
```

**Updated `generateAndStore` Call:**
Now passes VieNeu-TTS parameters:
```javascript
{
  model: 'vieneu-tts',
  voice: this.voice,
  autoVoice: this.autoVoice,
  autoChunk: this.autoChunk,
  maxChars: this.maxChars,
  // ... other options ...
}
```

**Updated Model References:**
- All `model: 'dia'` changed to `model: 'vieneu-tts'`
- Progress tracking, audio cache, etc.

### 3. **Audio Storage (`audioStorage.js`)**

**Default Model Changed:**
- **Before:** `model = 'dia'`
- **After:** `model = 'vieneu-tts'`

**Added VieNeu-TTS Parameters:**
```javascript
const {
  model = 'vieneu-tts',
  voice = 'id_0004',
  autoVoice = false,
  autoChunk = true,
  maxChars = 256,
  // ... other options ...
} = options;
```

**Passes to TTS Service:**
```javascript
await this.ttsService.generateAudio(normalizedText, {
  model: model,
  voice: voice,
  autoVoice: autoVoice,
  autoChunk: autoChunk,
  maxChars: maxChars,
  // ... other options ...
});
```

### 4. **Worker Routes (`routes/worker.js`)**

**Added VieNeu-TTS Parameters:**
```javascript
const {
  voice = 'id_0004',
  autoVoice = false,
  autoChunk = true,
  maxChars = 256,
  // ... other options ...
} = req.body;
```

**Passes to Worker:**
```javascript
const worker = getWorker({
  voice: voice,
  autoVoice: autoVoice,
  autoChunk: autoChunk,
  maxChars: maxChars,
  // ... other options ...
});
```

## 📋 Default Configuration / Cấu hình Mặc định

- **Model:** `vieneu-tts` (100% compatible backend)
- **Voice:** `id_0004` (female voice / giọng nữ)
- **Auto Voice:** `false` (manual selection / lựa chọn thủ công)
- **Auto Chunk:** `true` (automatic chunking for long text / tự động chia nhỏ văn bản dài)
- **Max Chars:** `256` (per chunk / mỗi chunk)

## 🚀 Usage Examples / Ví dụ Sử dụng

### Basic Usage (Default) / Sử dụng Cơ bản (Mặc định)

```javascript
// Uses default configuration:
// - Model: vieneu-tts
// - Voice: id_0004 (female)
// - Auto-chunk: true
// - Max chars: 256

await worker.generateChapterAudio(novelId, chapterNumber, {
  speakerId: '05',
  forceRegenerate: false
});
```

### Custom Voice / Giọng Tùy chỉnh

```javascript
// Use specific voice
await worker.generateChapterAudio(novelId, chapterNumber, {
  voice: 'id_0002',  // Different female voice
  // or
  voice: 'male',     // Use male voice
  // or
  voice: 'id_0001',  // Specific voice ID
});
```

### Auto-Detect Gender / Tự động Phát hiện Giới tính

```javascript
// Let VieNeu-TTS detect gender from text
await worker.generateChapterAudio(novelId, chapterNumber, {
  autoVoice: true,  // Auto-detect gender from text
});
```

### Via API Route / Qua Route API

```bash
curl -X POST http://localhost:3000/api/worker/generate/chapter \
  -H "Content-Type: application/json" \
  -d '{
    "novelId": "abc123",
    "chapterNumber": 1,
    "voice": "id_0004",
    "autoVoice": false,
    "autoChunk": true,
    "maxChars": 256
  }'
```

## 🔄 Backward Compatibility / Tương thích Ngược

The worker still supports Dia model if explicitly specified:

Worker vẫn hỗ trợ model Dia nếu được chỉ định rõ:

```javascript
// Still works - explicitly use Dia
await worker.generateChapterAudio(novelId, chapterNumber, {
  model: 'dia',  // Use Dia model
  speakerId: '05'
});
```

## ✅ What's Different / Những gì Khác biệt

### Before (Dia Model) / Trước (Model Dia)
```javascript
{
  text: "[05] Your text here",
  model: "dia",
  temperature: 1.3,
  top_p: 0.95,
  cfg_scale: 3.0,
  speed_factor: 1.0
}
```

### After (VieNeu-TTS Model) / Sau (Model VieNeu-TTS)
```javascript
{
  text: "Your text here",
  model: "vieneu-tts",
  voice: "id_0004",  // or "female", "male"
  auto_voice: false,
  auto_chunk: true,
  max_chars: 256
}
```

## 🎯 Key Benefits / Lợi ích Chính

1. ✅ **100% Compatible:** Uses cloned VieNeu-TTS environment (no import errors)
2. ✅ **Long Text Support:** Auto-chunks text > 256 characters
3. ✅ **Voice Selection:** Easy voice switching (male/female/auto-detect)
4. ✅ **Performance:** Reference audio encoded once, reused for all chunks
5. ✅ **Consistent:** Same voice across all chunks in long text

1. ✅ **100% Tương thích:** Sử dụng môi trường VieNeu-TTS đã sao chép (không lỗi import)
2. ✅ **Hỗ trợ Văn bản Dài:** Tự động chia nhỏ văn bản > 256 ký tự
3. ✅ **Lựa chọn Giọng:** Dễ dàng chuyển đổi giọng (nam/nữ/tự động phát hiện)
4. ✅ **Hiệu suất:** Audio tham chiếu được mã hóa một lần, tái sử dụng cho tất cả chunks
5. ✅ **Nhất quán:** Cùng giọng trên tất cả chunks trong văn bản dài

