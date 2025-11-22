# Narrator Speech Speed / Tốc độ Giọng nói Narrator

## 📊 Normal Narrator Speed / Tốc độ Narrator Bình thường

### Professional Standards / Tiêu chuẩn Chuyên nghiệp

**Audiobook Narrators / Narrator Sách nói:**
- **Average:** 130-160 words per minute (WPM) / Từ mỗi phút
- **Comfortable Listening:** 140-160 WPM
- **For Comprehension:** 120-140 WPM (slower for better understanding)
- **For Storytelling:** 130-150 WPM

**Optimal for Novel Reading / Tối ưu cho Đọc Tiểu thuyết:**
- **Narrator Speed:** 130-140 WPM
- **Speed Factor:** 0.85-0.90 (15% slower for comprehension)

## ⚙️ Speed Factor Configuration / Cấu hình Hệ số Tốc độ

### Speed Factor Range / Khoảng Hệ số Tốc độ

- **1.0** = Normal speed (fast, conversational) / Tốc độ bình thường
- **0.90** = 10% slower (good for narration) / Chậm hơn 10%
- **0.85** = 15% slower (optimal for comprehension) / Chậm hơn 15% (tối ưu)
- **0.80** = 20% slower (very easy to follow) / Chậm hơn 20% (rất dễ theo dõi)

### Recommended Settings / Cài đặt Được Khuyến nghị

**For Novel Reading / Cho Đọc Tiểu thuyết:**
- **Default:** `speed_factor: 0.85` (15% slower)
- **Range:** 0.80 - 0.90
- **Why:** Allows time to comprehend story, process information, and enjoy the narrative

## 🎯 Implementation / Triển khai

### TTS Backend / Backend TTS

**Default Configuration:**
```python
speed_factor: float = 0.85  # 15% slower for narration
```

**API Parameter:**
```json
{
  "text": "...",
  "model": "dia",
  "speed_factor": 0.85  // 0.8-1.0, lower = slower
}
```

### Novel App / Ứng dụng Novel

**Default in TTSService:**
```javascript
speedFactor: 0.85  // Slower for narration
```

**Usage:**
```javascript
await ttsService.generateAudio(text, {
  speakerId: '05',
  speedFactor: 0.85  // Adjust as needed
});
```

## 📈 Speed Comparison / So sánh Tốc độ

| Speed Factor | Description | Use Case |
|-------------|-------------|----------|
| 1.0 | Normal speed | Fast conversation |
| 0.95 | Slightly slower | Quick narration |
| 0.90 | 10% slower | Standard narration |
| **0.85** | **15% slower** | **Recommended for novels** |
| 0.80 | 20% slower | Easy comprehension |

## 💡 Why 0.85 is Recommended / Tại sao 0.85 được Khuyến nghị

1. **Comprehension:** Allows time to process and understand story
2. **Comfort:** Not too slow, not too fast - natural listening pace
3. **Engagement:** Maintains engagement without rushing
4. **Standard:** Matches professional audiobook narration speeds (130-140 WPM)

## 🔧 Adjusting Speed / Điều chỉnh Tốc độ

You can adjust speed per request:

```javascript
// Slower for difficult content
speedFactor: 0.80  // 20% slower

// Faster for review
speedFactor: 0.90  // 10% slower

// Custom per novel/chapter
speedFactor: 0.85  // Recommended default
```

---

**Default speed is now 15% slower (0.85x) for better comprehension!**  
**Tốc độ mặc định giờ chậm hơn 15% (0.85x) để dễ hiểu hơn!**

