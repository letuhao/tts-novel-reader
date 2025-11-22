# ✅ Speed Control Implementation / Triển khai Điều khiển Tốc độ

## 🎯 Narrator Speed Control / Điều khiển Tốc độ Narrator

Speech speed has been adjusted to be **15% slower** for better story comprehension.

Tốc độ giọng nói đã được điều chỉnh **chậm hơn 15%** để dễ hiểu câu chuyện hơn.

## 📊 Speed Configuration / Cấu hình Tốc độ

### Default Speed Factor / Hệ số Tốc độ Mặc định

- **Speed Factor:** `0.85` (15% slower than normal)
- **Normal Speed:** `1.0` (original speed)
- **Recommended:** `0.85` for novels (130-140 WPM)

### Speed Range / Khoảng Tốc độ

- **Minimum:** `0.80` (20% slower - very easy to follow)
- **Recommended:** `0.85` (15% slower - optimal for comprehension)
- **Standard:** `0.90` (10% slower - comfortable narration)
- **Normal:** `1.0` (original speed - fast conversation)

## 🔧 Implementation Details / Chi tiết Triển khai

### 1. **Dia TTS Wrapper** (`app/tts_backend/models/dia_tts.py`)

Added `speed_factor` parameter:
```python
def synthesize(
    self,
    text: str,
    speed_factor: float = 0.85,  # Default 15% slower
    ...
):
    # Generate audio first
    wav = self.model.generate(...)
    
    # Then slow down by resampling
    if speed_factor < 1.0:
        # Resample audio to make it slower
        target_len = int(original_len / speed_factor)
        wav = np.interp(x_resampled, x_original, wav)
```

### 2. **TTS API** (`app/tts_backend/api.py`)

Added `speed_factor` to API request:
```python
class TTSSynthesizeRequest(BaseModel):
    speed_factor: Optional[float] = 0.85  # Default slower
```

### 3. **Novel App TTS Service** (`novel-app/backend/src/services/ttsService.js`)

Default speed factor in service:
```javascript
speedFactor = 0.85  // Default 15% slower for narration
```

### 4. **Worker Service** (`novel-app/backend/src/services/worker.js`)

Worker uses slower speed by default:
```javascript
this.speedFactor = 0.85  // Slower for narration
```

## 🎧 How to Use / Cách Sử dụng

### API Request / Yêu cầu API

```json
POST /api/tts/synthesize
{
  "text": "[05] Your text here...",
  "model": "dia",
  "speed_factor": 0.85  // Adjust as needed
}
```

### Novel App Service / Dịch vụ Novel App

```javascript
await ttsService.generateAudio(text, {
  speakerId: '05',
  speedFactor: 0.85  // Slower for narration
});
```

### Adjust Speed / Điều chỉnh Tốc độ

- **For easier comprehension:** `speedFactor: 0.80` (20% slower)
- **Recommended:** `speedFactor: 0.85` (15% slower)
- **Standard narration:** `speedFactor: 0.90` (10% slower)
- **Normal speed:** `speedFactor: 1.0` (original speed)

## 📈 Benefits / Lợi ích

1. **Better Comprehension** - More time to understand story
2. **Natural Pace** - Matches professional narrator speed (130-140 WPM)
3. **Comfortable Listening** - Not too slow, not too fast
4. **Adjustable** - Can be customized per request

---

**Speech is now 15% slower (0.85x) for better story comprehension!**  
**Giọng nói giờ chậm hơn 15% (0.85x) để dễ hiểu câu chuyện hơn!**

