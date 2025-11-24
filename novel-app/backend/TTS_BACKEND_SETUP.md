# TTS Backend Setup Guide
# Hướng dẫn Thiết lập TTS Backend

## Overview / Tổng quan

The novel-app backend now supports multiple TTS backends with automatic voice mapping.
Novel-app backend hiện hỗ trợ nhiều TTS backend với ánh xạ giọng tự động.

## Supported Backends / Các Backend được Hỗ trợ

### 1. VietTTS (dangvansam-VietTTS-backend)
- **Model Name**: `viettts` or `viet-tts`
- **Default Port**: `11111`
- **Base URL**: `http://127.0.0.1:11111`
- **Environment Variable**: `VIETTTS_BACKEND_URL`

### 2. VieNeu-TTS (vieneu-tts-backend)
- **Model Name**: `vieneu-tts`
- **Default Port**: `11112`
- **Base URL**: `http://127.0.0.1:11112`
- **Environment Variable**: `VIENEU_TTS_BACKEND_URL`

## Voice ID Mapping / Ánh xạ Voice ID

The system automatically maps voice IDs between backends:
Hệ thống tự động ánh xạ voice ID giữa các backend:

| Voice ID | Description | VietTTS Voice | VieNeu-TTS Voice |
|----------|-------------|---------------|------------------|
| `id_0001` | giọng nam nhẹ nhàng | `nsnd-le-chuc` | `id_0001` |
| `id_0002` | giọng nữ cao | `diep-chi` | `id_0002` |
| `id_0003` | giọng nam cao | `cdteam` | `id_0003` |
| `id_0004` | giọng nữ nhẹ nhàng, dùng để dẫn truyện | `quynh` | `id_0004` |
| `id_0005` | giọng nam cao | `cdteam` | `id_0005` |
| `id_0007` | giọng nam trầm | `cdteam` | `id_0007` |

## Configuration / Cấu hình

### Environment Variables / Biến Môi trường

```bash
# Default TTS backend (viettts or vieneu-tts)
TTS_DEFAULT_BACKEND=viettts

# Or use model name
TTS_DEFAULT_MODEL=vieneu-tts

# Backend URLs (optional, uses defaults if not set)
VIETTTS_BACKEND_URL=http://127.0.0.1:11111
VIENEU_TTS_BACKEND_URL=http://127.0.0.1:11112

# Default voice (will be mapped automatically)
TTS_DEFAULT_VOICE=id_0004
```

### Switching Backends / Chuyển đổi Backend

#### Option 1: Environment Variable / Biến Môi trường
```bash
# Use VietTTS backend
export TTS_DEFAULT_BACKEND=viettts

# Use VieNeu-TTS backend
export TTS_DEFAULT_BACKEND=vieneu-tts
```

#### Option 2: In Code / Trong Code
```javascript
// Use VietTTS
const ttsService = new TTSService();
await ttsService.generateAudio(text, {
  model: 'viettts',
  voice: 'id_0004'  // Will be mapped to 'quynh' for VietTTS
});

// Use VieNeu-TTS
await ttsService.generateAudio(text, {
  model: 'vieneu-tts',
  voice: 'id_0004'  // Will be mapped to 'id_0004' for VieNeu-TTS
});
```

## Starting Backends / Khởi động Backend

### Start VietTTS Backend
```bash
cd tts/dangvansam-VietTTS-backend
python start_backend.py
# Or
npm run start  # if using npm script
```

### Start VieNeu-TTS Backend
```bash
cd tts/vieneu-tts-backend
python start_backend.py
# Or
npm run start  # if using npm script
```

### Start Both Backends
You can run both backends simultaneously on different ports:
Bạn có thể chạy cả hai backend đồng thời trên các cổng khác nhau:

```bash
# Terminal 1: VietTTS on port 11111
cd tts/dangvansam-VietTTS-backend
python start_backend.py

# Terminal 2: VieNeu-TTS on port 11112
cd tts/vieneu-tts-backend
python start_backend.py
```

## Usage Examples / Ví dụ Sử dụng

### Example 1: Using Default Backend / Sử dụng Backend Mặc định
```javascript
import { TTSService } from './services/ttsService.js';

const ttsService = new TTSService();

// Will use default backend (from TTS_DEFAULT_BACKEND env var)
// Sẽ sử dụng backend mặc định (từ biến môi trường TTS_DEFAULT_BACKEND)
const result = await ttsService.generateAudio('Xin chào', {
  voice: 'id_0004'  // Automatically mapped to correct backend voice
});
```

### Example 2: Explicitly Specify Backend / Chỉ định Rõ ràng Backend
```javascript
// Use VietTTS
const result1 = await ttsService.generateAudio('Xin chào', {
  model: 'viettts',
  voice: 'id_0004'  // Mapped to 'quynh'
});

// Use VieNeu-TTS
const result2 = await ttsService.generateAudio('Xin chào', {
  model: 'vieneu-tts',
  voice: 'id_0004'  // Uses 'id_0004' directly
});
```

## Voice Mapping Details / Chi tiết Ánh xạ Giọng

The voice mapping system ensures that when you use a voice ID like `id_0004`, it automatically:
Hệ thống ánh xạ giọng đảm bảo khi bạn sử dụng voice ID như `id_0004`, nó tự động:

1. **Detects the backend** being used / Phát hiện backend đang được sử dụng
2. **Maps the voice ID** to the correct voice for that backend / Ánh xạ voice ID sang giọng đúng cho backend đó
3. **Falls back** to the original voice ID if no mapping exists / Dự phòng về voice ID gốc nếu không có ánh xạ

### Mapping Logic / Logic Ánh xạ

- Voice IDs starting with `id_` are mapped using the `VOICE_MAPPING` config
- Voice IDs không bắt đầu bằng `id_` are used directly (e.g., 'quynh', 'male', 'female')
- Voice IDs bắt đầu bằng `id_` được ánh xạ bằng cấu hình `VOICE_MAPPING`
- Voice IDs không bắt đầu bằng `id_` được sử dụng trực tiếp (ví dụ: 'quynh', 'male', 'female')

## Troubleshooting / Khắc phục Sự cố

### Backend Not Responding / Backend Không Phản hồi

1. Check if backend is running / Kiểm tra backend có đang chạy không:
```bash
# Check VietTTS
curl http://127.0.0.1:11111/api/tts/health

# Check VieNeu-TTS
curl http://127.0.0.1:11112/api/tts/health
```

2. Check backend logs / Kiểm tra log backend:
```bash
# VietTTS logs
tail -f tts/dangvansam-VietTTS-backend/logs/backend_output.log

# VieNeu-TTS logs
tail -f tts/vieneu-tts-backend/logs/backend_output.log
```

### Voice Mapping Not Working / Ánh xạ Giọng Không Hoạt động

1. Check voice ID format / Kiểm tra định dạng voice ID:
   - Should start with `id_` for mapping (e.g., `id_0004`)
   - Nên bắt đầu bằng `id_` để ánh xạ (ví dụ: `id_0004`)

2. Check backend config / Kiểm tra cấu hình backend:
   - Verify `ttsConfig.js` has correct mappings
   - Xác minh `ttsConfig.js` có ánh xạ đúng

3. Check console logs / Kiểm tra log console:
   - Look for "Voice mapping: X → Y" messages
   - Tìm thông báo "Voice mapping: X → Y"

## Configuration File / Tệp Cấu hình

The voice mapping is defined in:
Ánh xạ giọng được định nghĩa trong:

```
novel-app/backend/src/config/ttsConfig.js
```

To modify voice mappings, edit this file:
Để sửa đổi ánh xạ giọng, chỉnh sửa tệp này:

```javascript
export const VOICE_MAPPING = {
  'id_0001': {
    viettts: 'nsnd-le-chuc',
    vieneuTTS: 'id_0001',
    // ...
  },
  // Add more mappings here
  // Thêm ánh xạ khác ở đây
};
```

