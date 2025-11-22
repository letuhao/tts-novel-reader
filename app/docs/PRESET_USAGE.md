# Using Voice Presets / Sử dụng Preset Giọng nói

## ✅ Saved Preset / Preset Đã Lưu

**Female Narrator - Speaker 05**  
- File: `presets/female_narrator_preset.json`
- Sample: `dia_female_05.wav` (Your preferred voice)
- Speaker ID: `[05]`

## 🚀 Quick Usage / Sử dụng Nhanh

### Generate Speech with Your Preferred Preset / Tạo Giọng nói với Preset Yêu thích

```powershell
python generate_with_preset.py "Your Vietnamese text here"
```

### Example / Ví dụ

```powershell
# Simple usage
python generate_with_preset.py "Xin chào, đây là một ví dụ về tổng hợp giọng nói."

# With custom output file
python generate_with_preset.py "Your text" --output my_audio.wav

# Check preset settings
cat presets/female_narrator_preset.json
```

## 📋 What's Saved / Đã Lưu Gì

- **Speaker ID:** `05` (Your preferred female narrator)
- **Model:** `dia`
- **Temperature:** `1.3`
- **top_p:** `0.95`
- **cfg_scale:** `3.0`

## 💡 Using in API Calls / Sử dụng trong API Calls

You can also use this preset directly in API calls:

```json
{
  "text": "[05] Your Vietnamese text here",
  "model": "dia",
  "temperature": 1.3,
  "top_p": 0.95,
  "cfg_scale": 3.0
}
```

---

**Your preferred female narrator voice (Speaker 05) is now saved as a preset!**  
**Giọng nữ người dẫn chuyện bạn yêu thích (Speaker 05) đã được lưu làm preset!**

