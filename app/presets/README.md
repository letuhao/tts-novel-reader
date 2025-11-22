# Voice Presets / Preset Giọng nói

## 📁 Saved Presets / Preset Đã Lưu

### Female Narrator - Speaker 05
- **File:** `female_narrator_preset.json`
- **Speaker ID:** `05`
- **Model:** Dia TTS
- **Sample:** `dia_female_05.wav` (User preferred)
- **Description:** Preferred female narrator voice

## 🚀 Usage / Sử dụng

### Generate Speech with Preset / Tạo Giọng nói với Preset

```powershell
# Using the preset script
python generate_with_preset.py "Your Vietnamese text here"

# With custom output file
python generate_with_preset.py "Your Vietnamese text here" --output my_output.wav

# With custom preset file
python generate_with_preset.py "Your text" --preset presets/my_preset.json
```

### Example / Ví dụ

```powershell
python generate_with_preset.py "Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt với giọng nữ người dẫn chuyện."
```

## 📝 Preset Format / Định dạng Preset

```json
{
  "name": "Preset Name",
  "description": "Description of the preset",
  "speaker_id": "05",
  "model": "dia",
  "temperature": 1.3,
  "top_p": 0.95,
  "cfg_scale": 3.0,
  "sample_audio": "sample_file.wav",
  "notes": "Additional notes"
}
```

## 🔧 Create New Preset / Tạo Preset Mới

1. Copy an existing preset file
2. Modify the `speaker_id` and other settings
3. Update the `name` and `description`
4. Save as a new JSON file in the `presets/` directory

## 💡 Tips / Mẹo

- **Speaker ID:** Use the speaker ID you prefer (e.g., `05`, `kenhCoVan`)
- **Temperature:** Lower = more consistent, Higher = more varied (default: 1.3)
- **top_p:** Controls diversity in generation (default: 0.95)
- **cfg_scale:** Classifier-free guidance scale (default: 3.0)

