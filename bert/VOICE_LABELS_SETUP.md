# Voice Labels System Setup
# Thiết lập Hệ thống Voice Labels

## Overview / Tổng quan

System để map các giọng TTS với labels và tự động chọn giọng phù hợp dựa trên role detection (male/female/narrator).
Hệ thống để map các giọng TTS với labels và tự động chọn giọng phù hợp dựa trên role detection (male/female/narrator).

## Files Created / Files Đã Tạo

1. **`tts/dangvansam-VietTTS-backend/tts_backend/voice_labels.py`**
   - Voice database với tất cả giọng và metadata
   - Mapping functions để chọn giọng theo role
   - Voice filtering (Vietnamese only, by gender, etc.)

2. **`bert/role_detection_service.py`**
   - Service sử dụng Qwen3-8B (Ollama) để detect roles
   - Tự động chọn voice ID dựa trên role đã detect
   - API integration ready

3. **`bert/voice_selection_prompt.md`**
   - Prompt templates cho LLM
   - Hướng dẫn cách build prompts cho voice selection

4. **`bert/test_voice_selection.py`**
   - Test script để verify hệ thống
   - Examples sử dụng

## Voice Database / Cơ sở Dữ liệu Giọng

### Vietnamese Voices / Giọng Tiếng Việt

#### Male / Nam:
- **cdteam**: giọng nam trầm (high quality, recommended)
- **nguyen-ngoc-ngan**: giọng nam trầm (high quality)
- **nsnd-le-chuc**: giọng nam nhẹ nhàng (high quality)
- **son-tung-mtp**: giọng nam nhỏ, hơi khó nghe (medium quality)
- **doremon**: giọng nam rất cao (medium quality, special character)

#### Female / Nữ:
- **quynh**: giọng nữ nhẹ nhàng, dùng làm Narrator (high quality, **recommended for narrator**)
- **nu-nhe-nhang**: giọng nữ nhẹ nhàng (high quality)
- **diep-chi**: giọng nữ cao (high quality)

### Default Mapping / Mapping Mặc định

```python
{
    "male": "cdteam",
    "female": "nu-nhe-nhang",
    "narrator": "quynh"  # Always recommended
}
```

## Usage / Sử dụng

### Basic Usage / Sử dụng Cơ bản

```python
from voice_labels import get_recommended_voice, DEFAULT_VOICE_MAPPING

# Get recommended voice for role
voice_id = get_recommended_voice("narrator")  # Returns: "quynh"
voice_id = get_recommended_voice("male")      # Returns: "cdteam"
voice_id = get_recommended_voice("female")    # Returns: "nu-nhe-nhang"
```

### With Role Detection / Với Role Detection

```python
from role_detection_service import RoleDetectionService

# Initialize service
service = RoleDetectionService(model_name="qwen3:8b")

# Detect roles for paragraphs
paragraphs = [
    "Đây là đoạn dẫn chuyện...",
    'Anh ấy nói: "Xin chào..."',
    "Cô ấy đáp lại..."
]

result = service.detect_roles(
    paragraphs=paragraphs,
    chapter_context="",  # Optional full chapter for context
    return_voice_ids=True
)

# Result structure:
# {
#     "role_map": {0: "narrator", 1: "male", 2: "female"},
#     "voice_map": {0: "quynh", 1: "cdteam", 2: "nu-nhe-nhang"}
# }

# Use voice IDs for TTS
for idx, voice_id in result["voice_map"].items():
    text = paragraphs[idx]
    tts.generate(text, voice=voice_id)
```

### Get Voice Labels for LLM Prompt / Lấy Voice Labels cho LLM Prompt

```python
from voice_labels import get_voice_labels_for_llm

labels = get_voice_labels_for_llm()
# Returns formatted string with all Vietnamese voices
# and their descriptions for LLM prompt
```

## Integration with Novel Pipeline / Tích hợp với Novel Pipeline

### Step 1: Parse Novel / Bước 1: Parse Novel

```python
# Parse novel chapters into paragraphs
chapters = parse_novel(text)
paragraphs = chapters[0].paragraphs  # List of paragraph texts
```

### Step 2: Detect Roles / Bước 2: Phát hiện Vai diễn

```python
service = RoleDetectionService()
result = service.detect_roles(
    paragraphs=paragraphs,
    chapter_context=chapters[0].full_text,
    return_voice_ids=True
)
```

### Step 3: Generate Audio / Bước 3: Tạo Audio

```python
for idx, paragraph in enumerate(paragraphs):
    role = result["role_map"][idx]
    voice_id = result["voice_map"][idx]
    
    audio = tts_service.synthesize(
        text=paragraph,
        voice=voice_id,
        model="viet-tts"
    )
    
    save_audio(audio, chapter_id=0, paragraph_id=idx)
```

## Testing / Kiểm thử

### Test Voice Labels / Test Voice Labels

```bash
cd bert
python test_voice_selection.py
```

This will:
- List all Vietnamese voices
- Show voice labels for LLM
- Test recommended voices
- Optionally test role detection (requires Ollama)

### Manual Test with Ollama / Test Thủ công với Ollama

```bash
# Test Ollama connection
curl http://localhost:11434/api/tags

# Test Qwen3-8B
ollama run qwen3:8b "Xin chào, bạn có hiểu tiếng Việt không?"
```

## Voice ID Reference / Tham khảo Voice ID

| Voice ID | Gender | Tone | Language | Quality | Suitable For |
|----------|--------|------|----------|---------|--------------|
| **quynh** | female | nhẹ nhàng | Vietnamese | high | narrator ⭐, female |
| **cdteam** | male | trầm | Vietnamese | high | male, narrator_male |
| **nu-nhe-nhang** | female | nhẹ nhàng | Vietnamese | high | female |
| **nguyen-ngoc-ngan** | male | trầm | Vietnamese | high | male, narrator_male |
| **nsnd-le-chuc** | male | nhẹ nhàng | Vietnamese | high | male, narrator_male |
| **diep-chi** | female | cao | Vietnamese | high | female |
| son-tung-mtp | male | nhỏ | Vietnamese | medium | male (not recommended) |
| doremon | male | rất cao | Vietnamese | medium | male (special character) |

## Notes / Lưu ý

1. **Narrator**: Always use `quynh` (recommended by voice database)
2. **Quality**: Only use "high" quality voices for production
3. **Language**: Filter out non-Vietnamese voices (speechify_*, cross_lingual_prompt, etc.)
4. **Default Fallback**: If role detection fails, default to `narrator` → `quynh`

## Next Steps / Bước Tiếp theo

1. ✅ Voice labels system created
2. ✅ Role detection service created
3. ⏭️ Integrate with novel-app backend
4. ⏭️ Update worker to use role detection
5. ⏭️ Test with real novels

