# LLM Classification Options for Role Detection
# Tùy chọn Phân loại LLM cho Phát hiện Vai diễn

## Overview / Tổng quan

Using an LLM model for zero-shot/few-shot classification to detect male/female/narrator roles.
Sử dụng model LLM cho zero-shot/few-shot classification để phát hiện vai diễn male/female/narrator.

## Why LLM? / Tại sao LLM?

### Advantages / Ưu điểm
- ✅ **No fine-tuning needed** - Zero-shot classification
  - **Không cần fine-tuning** - Phân loại zero-shot
- ✅ **Context understanding** - Understands dialogue context
  - **Hiểu context** - Hiểu context đối thoại
- ✅ **Flexible** - Can handle various writing styles
  - **Linh hoạt** - Xử lý nhiều phong cách viết
- ✅ **Easy to use** - Prompt-based classification
  - **Dễ sử dụng** - Phân loại dựa trên prompt

### Disadvantages / Nhược điểm
- ⚠️ **Slower** - LLM inference is slower than classifier
  - **Chậm hơn** - Inference LLM chậm hơn classifier
- ⚠️ **More VRAM** - Needs more memory
  - **Dùng nhiều VRAM hơn** - Cần nhiều bộ nhớ hơn

---

## Vietnamese LLM Options / Tùy chọn LLM Tiếng Việt

### Option 1: PhoGPT-4B-Chat (Recommended for Vietnamese) / PhoGPT-4B-Chat (Đề xuất cho Tiếng Việt)

**Model:** `vinai/PhoGPT-4B-Chat`
- **Parameters:** 4B
- **VRAM (FP16):** ~8GB
- **VRAM (4-bit):** ~3-4GB ✅ (Fits in your 7GB available!)
- **Context:** 2048 tokens (~4000-8000 Vietnamese characters)
- **Language:** Vietnamese (optimized)
- **Type:** Chat model (perfect for classification)

**Advantages:**
- ✅ Optimized for Vietnamese
- ✅ Chat format (easy prompting)
- ✅ 4-bit quantization available (fits in 7GB)

**Usage:**
```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

# Load model with 4-bit quantization
model_name = "vinai/PhoGPT-4B-Chat"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    load_in_4bit=True,  # 4-bit quantization
    device_map="auto"
)

# Classification prompt
def classify_role(paragraph, chapter_context=""):
    prompt = f"""Phân loại đoạn văn sau thành một trong ba loại:
- narrator: Văn bản dẫn chuyện, mô tả, tường thuật
- male: Lời nói/hành động của nhân vật nam
- female: Lời nói/hành động của nhân vật nữ

Đoạn văn: {paragraph}

Trả lời chỉ một từ: narrator, male, hoặc female"""

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(**inputs, max_new_tokens=10, do_sample=False)
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Extract answer
    answer = response.split()[-1].strip().lower()
    if answer in ['narrator', 'male', 'female']:
        return answer
    return 'narrator'  # Default
```

---

### Option 2: VinLlama-7B (Quantized) / VinLlama-7B (Đã Quantize)

**Model:** `VinAIResearch/VinLlama-7B-Chat`
- **Parameters:** 7B
- **VRAM (FP16):** ~14GB (too large)
- **VRAM (4-bit):** ~4-5GB ✅
- **Context:** 2048 tokens
- **Language:** Vietnamese

**Advantages:**
- ✅ Better accuracy (larger model)
- ✅ Vietnamese optimized

**Disadvantages:**
- ⚠️ Larger than PhoGPT
- ⚠️ More VRAM needed

---

### Option 3: Qwen2.5-3B (Multilingual) / Qwen2.5-3B (Đa ngôn ngữ)

**Model:** `Qwen/Qwen2.5-3B-Instruct`
- **Parameters:** 3B
- **VRAM (FP16):** ~6GB ✅
- **VRAM (4-bit):** ~2-3GB ✅
- **Context:** 32K tokens! ✅ (Can handle full chapter!)
- **Language:** Multilingual (includes Vietnamese)

**Advantages:**
- ✅ Very long context (32K tokens = ~60K Vietnamese characters)
- ✅ Can process entire chapter at once
- ✅ Lighter than PhoGPT
- ✅ Good Vietnamese support

**Disadvantages:**
- ⚠️ Not specifically optimized for Vietnamese
- ⚠️ May need better prompts for Vietnamese

**Usage:**
```python
from transformers import AutoModelForCausalLM, AutoTokenizer

model_name = "Qwen/Qwen2.5-3B-Instruct"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,  # FP16
    device_map="auto"
)

# Can process full chapter context!
def classify_paragraphs(chapter_text, paragraphs):
    prompt = f"""Phân loại các đoạn văn trong chapter sau:

Chapter text:
{chapter_text}

Danh sách đoạn văn (mỗi đoạn trên một dòng, đánh số từ 1):
{chr(10).join(f'{i+1}. {p}' for i, p in enumerate(paragraphs))}

Trả lời dạng JSON:
{{"1": "narrator", "2": "male", "3": "female", ...}}

Chỉ trả lời JSON, không giải thích."""

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    outputs = model.generate(**inputs, max_new_tokens=500)
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Parse JSON response
    import json
    json_str = response.split('{')[1].split('}')[0]
    role_map = json.loads('{' + json_str + '}')
    return role_map
```

---

### Option 4: Gemma-2B (Very Lightweight) / Gemma-2B (Rất Nhẹ)

**Model:** `google/gemma-2b-it`
- **Parameters:** 2B
- **VRAM (FP16):** ~4GB ✅
- **VRAM (4-bit):** ~1.5-2GB ✅
- **Context:** 8K tokens
- **Language:** Multilingual

**Advantages:**
- ✅ Very lightweight
- ✅ Fast inference

**Disadvantages:**
- ⚠️ Smaller model (may be less accurate)
- ⚠️ Not Vietnamese-optimized

---

## Recommended Model / Model Đề xuất

### **Qwen2.5-3B-Instruct** (Best Balance) / **Qwen2.5-3B-Instruct** (Cân bằng Tốt nhất)

**Why? / Tại sao?**
1. ✅ **Long context (32K tokens)** - Can process entire chapter at once!
   - **Context dài (32K tokens)** - Có thể xử lý toàn bộ chapter cùng lúc!
2. ✅ **Fits in 7GB VRAM** - FP16 or 4-bit
   - **Vừa trong 7GB VRAM** - FP16 hoặc 4-bit
3. ✅ **Good Vietnamese support** - Multilingual model
   - **Hỗ trợ tiếng Việt tốt** - Model đa ngôn ngữ
4. ✅ **Fast inference** - 3B parameters
   - **Inference nhanh** - 3B parameters

### **PhoGPT-4B-Chat** (Alternative - Vietnamese Optimized) / **PhoGPT-4B-Chat** (Thay thế - Tối ưu cho Tiếng Việt)

**Why? / Tại sao?**
1. ✅ **Vietnamese optimized** - Specifically trained for Vietnamese
   - **Tối ưu cho tiếng Việt** - Được train riêng cho tiếng Việt
2. ✅ **Fits with 4-bit quantization** - ~3-4GB VRAM
   - **Vừa với 4-bit quantization** - ~3-4GB VRAM
3. ✅ **Chat format** - Easy to use
   - **Định dạng chat** - Dễ sử dụng

---

## Implementation Approach / Cách Triển khai

### For Long Context (Qwen2.5-3B) / Cho Context Dài (Qwen2.5-3B)

**Process entire chapter at once:**
Xử lý toàn bộ chapter cùng lúc:

```python
def detect_roles_for_chapter(chapter_text, paragraphs):
    """
    Detect roles for all paragraphs in a chapter.
    Phát hiện vai diễn cho tất cả paragraphs trong một chapter.
    
    Args:
        chapter_text: Full chapter text (for context)
        paragraphs: List of paragraph texts
        
    Returns:
        dict: {paragraph_index: role}
    """
    # Build prompt with all paragraphs
    prompt = build_classification_prompt(chapter_text, paragraphs)
    
    # Get classification from LLM
    response = llm.generate(prompt)
    
    # Parse response (JSON format)
    role_map = parse_json_response(response)
    
    return role_map
```

**Advantages:**
- ✅ Single inference for entire chapter (very fast!)
- ✅ Better context understanding
- ✅ Consistent classification

### For Shorter Context (PhoGPT) / Cho Context Ngắn (PhoGPT)

**Process paragraphs in batches:**
Xử lý paragraphs theo batch:

```python
def detect_roles_for_paragraphs(paragraphs, context_window=5):
    """
    Detect roles with sliding context window.
    Phát hiện vai diễn với context window trượt.
    """
    role_map = {}
    
    for i, paragraph in enumerate(paragraphs):
        # Get context (previous paragraphs)
        start = max(0, i - context_window)
        context = paragraphs[start:i]
        
        # Classify with context
        role = classify_paragraph_with_context(paragraph, context)
        role_map[i] = role
    
    return role_map
```

---

## Performance Comparison / So sánh Hiệu suất

| Model | VRAM (4-bit) | Context | Speed | Accuracy | Vietnamese |
|-------|--------------|---------|-------|----------|------------|
| **Qwen2.5-3B** | 2-3GB | 32K ✅ | Fast | High | Good ✅ |
| **PhoGPT-4B** | 3-4GB | 2K | Medium | High | Excellent ✅ |
| **VinLlama-7B** | 4-5GB | 2K | Slower | Very High | Excellent ✅ |
| **Gemma-2B** | 1.5-2GB | 8K | Fastest | Medium | Good |

---

## Recommendation / Đề xuất

### **Start with Qwen2.5-3B-Instruct**

**Reasons:**
1. ✅ **32K token context** - Process entire chapter at once (faster!)
2. ✅ **Fits in 7GB** - Easy to run alongside TTS
3. ✅ **Good performance** - 3B parameters is sufficient for classification
4. ✅ **Flexible** - Can experiment with different prompt styles

### If Vietnamese accuracy is not good enough:
### Nếu độ chính xác tiếng Việt không đủ tốt:

**Switch to PhoGPT-4B-Chat** (with 4-bit quantization)
**Chuyển sang PhoGPT-4B-Chat** (với 4-bit quantization)

---

## Next Steps / Bước Tiếp theo

1. ⏭️ Setup Qwen2.5-3B-Instruct
2. ⏭️ Create classification prompt template
3. ⏭️ Test with sample Vietnamese novel chapters
4. ⏭️ Optimize prompt for better accuracy
5. ⏭️ Integrate with novel pipeline

**Would you like me to set up Qwen2.5-3B-Instruct for role classification?**
**Bạn có muốn tôi setup Qwen2.5-3B-Instruct cho role classification không?**

