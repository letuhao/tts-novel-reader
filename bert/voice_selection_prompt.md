# Voice Selection Prompt for Qwen3-8B
# Prompt Chọn Giọng cho Qwen3-8B

## Prompt Template / Template Prompt

This prompt is used to ask Qwen3-8B to select the correct voice ID based on role classification.
Prompt này được dùng để yêu cầu Qwen3-8B chọn đúng voice ID dựa trên role classification.

```python
def build_voice_selection_prompt(role: str, paragraph_text: str, context: str = "") -> str:
    """
    Build prompt for voice selection.
    Xây dựng prompt cho voice selection.
    
    Args:
        role: Detected role (male/female/narrator)
        paragraph_text: Text of the paragraph
        context: Optional context (surrounding paragraphs)
        
    Returns:
        Prompt string
    """
    
    voice_labels = get_voice_labels_for_llm()
    
    prompt = f"""Bạn là hệ thống chọn giọng TTS cho tiểu thuyết tiếng Việt.

Nhiệm vụ: Chọn đúng voice ID từ danh sách dưới đây dựa trên:
1. Vai diễn được phân loại: {role}
2. Ngữ cảnh của đoạn văn
3. Đặc điểm giọng phù hợp

{voice_labels}

Yêu cầu:
- Chọn ĐÚNG voice ID từ danh sách trên (phải đúng ID, không được sai)
- Ưu tiên giọng tiếng Việt chất lượng cao
- Narrator: Luôn dùng "quynh"
- Male: Chọn từ cdteam, nguyen-ngoc-ngan, nsnd-le-chuc
- Female: Chọn từ quynh, nu-nhe-nhang, diep-chi

Đoạn văn cần chọn giọng:
{paragraph_text}

Ngữ cảnh (tham khảo):
{context[:500] if context else "Không có"}

Trả lời CHỈ voice ID (ví dụ: quynh, cdteam, nu-nhe-nhang), không có giải thích khác.
Voice ID phải CHÍNH XÁC từ danh sách trên."""
    
    return prompt
```

## Usage in Role Detection / Sử dụng trong Role Detection

### Flow / Luồng

1. **Detect Role** - Qwen3 classifies paragraph as male/female/narrator
   - **Phát hiện Vai diễn** - Qwen3 phân loại paragraph là male/female/narrator
   
2. **Select Voice** - Use role + context to select exact voice ID
   - **Chọn Giọng** - Dùng role + context để chọn chính xác voice ID

3. **Return Voice ID** - Exact ID for TTS generation
   - **Trả về Voice ID** - ID chính xác cho TTS generation

### Example / Ví dụ

```python
# Step 1: Role detection
role = "female"  # Detected by Qwen3

# Step 2: Voice selection
prompt = build_voice_selection_prompt(
    role="female",
    paragraph_text="Cô ấy nói một cách nhẹ nhàng...",
    context="Previous paragraphs..."
)

# Step 3: Get voice ID from Qwen3
voice_id = call_qwen3(prompt)  # Returns: "quynh" or "nu-nhe-nhang"

# Step 4: Use in TTS
tts.generate(text, voice=voice_id)
```

