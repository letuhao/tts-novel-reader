# Role Detection Setup for Vietnamese Novels
# Thiết lập Phát hiện Vai diễn cho Tiểu thuyết Tiếng Việt

## Overview / Tổng quan

This service detects male/female/narrator roles in Vietnamese text to automatically select the correct voice for TTS.
Dịch vụ này phát hiện vai diễn nam/nữ/narrator trong văn bản tiếng Việt để tự động chọn giọng đúng cho TTS.

## Model Recommendations / Đề xuất Model

### Option 1: PhoBERT-based Classifier (Recommended) / PhoBERT Classifier (Đề xuất)
**Why:** Lightweight, fast, excellent for Vietnamese text classification
**Tại sao:** Nhẹ, nhanh, xuất sắc cho phân loại văn bản tiếng Việt

**Model:** `vinai/phobert-base-v2`
- **Size:** ~135M parameters (~500MB)
- **VRAM:** ~1-2GB
- **Context:** 256 tokens (sufficient for sentence-level classification)
- **Speed:** Very fast inference

**Approach:**
1. Split chapter into sentences/paragraphs
2. Classify each segment as: `male`, `female`, `narrator`
3. Use classification result to select voice

### Option 2: PhoBERT + Fine-tuned Classifier / PhoBERT + Classifier Fine-tuned
**Model:** `vinai/phobert-base-v2` + custom classification head
- **Training:** Fine-tune on Vietnamese novel dialogue dataset
- **Labels:** `male_speech`, `female_speech`, `narrator`, `mixed`

### Option 3: Small Vietnamese LLM (For Complex Context) / LLM Tiếng Việt Nhỏ (Cho Context Phức tạp)
**Models:**
- **PhoGPT-4B-Chat** (~4B parameters, ~8GB)
- **VinLlama-7B** (quantized 4-bit, ~4GB VRAM)
- **Gemma-2B-Vietnamese** (if available)

**Why use LLM:**
- Better understanding of context
- Can handle complex dialogue attribution
- Can detect speaker from context, not just speech markers

**Trade-off:** Slower inference, more VRAM

## Recommended Architecture / Kiến trúc Đề xuất

### PhoBERT Classifier (Lightweight & Fast) / PhoBERT Classifier (Nhẹ & Nhanh)

```
┌─────────────────────────────────────────┐
│  Chapter Text (~20,000 characters)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Sentence Segmentation                  │
│  (Split into sentences/paragraphs)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  PhoBERT Classifier                     │
│  - Input: Sentence + Context           │
│  - Output: male/female/narrator        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Voice Selection                        │
│  - male → male voice preset            │
│  - female → female voice preset        │
│  - narrator → narrator voice preset    │
└─────────────────────────────────────────┘
```

### Processing Flow / Luồng Xử lý

1. **Chapter Input** (~20k characters)
   - **Input Chapter** (~20k ký tự)

2. **Preprocessing** / Tiền xử lý
   - Split into sentences/paragraphs
   - Tách thành câu/đoạn văn
   - Extract dialogue markers (quotation marks, "nói:", "hỏi:", etc.)
   - Trích xuất dấu hiệu đối thoại (dấu ngoặc kép, "nói:", "hỏi:", v.v.)

3. **Classification** / Phân loại
   - For each segment:
     - Extract features (context, dialogue markers, pronouns)
     - Trích xuất đặc trưng (context, dấu hiệu đối thoại, đại từ)
     - Classify with PhoBERT: `male` / `female` / `narrator`
     - Phân loại với PhoBERT: `male` / `female` / `narrator`

4. **Voice Selection** / Chọn giọng
   - Map classification to voice preset
   - Ánh xạ phân loại vào voice preset
   - Apply to TTS generation
   - Áp dụng cho TTS generation

## Implementation Plan / Kế hoạch Triển khai

### Phase 1: Basic Classifier / Classifier Cơ bản

1. **Setup PhoBERT**
   ```bash
   pip install transformers torch
   ```

2. **Create Role Detection Service**
   - File: `novel-app/backend/src/services/roleDetection.js`
   - Python service (better for ML models)
   - File: `tts/role-detection-backend/`

3. **Simple Rule-based First** / Dựa trên Quy tắc Trước
   - Detect dialogue markers: "nói:", "hỏi:", "thét:", etc.
   - Detect pronouns: "anh", "chị", "cô", "ông", "bà", etc.
   - Detect quotation marks: "..." (dialogue)
   - Classify based on rules

### Phase 2: ML-Based Classifier / Classifier Dựa trên ML

1. **Setup PhoBERT Model**
   ```python
   from transformers import AutoTokenizer, AutoModel
   
   model_name = "vinai/phobert-base-v2"
   tokenizer = AutoTokenizer.from_pretrained(model_name)
   model = AutoModel.from_pretrained(model_name)
   ```

2. **Create Classification Pipeline**
   - Fine-tune PhoBERT for role classification
   - Or use zero-shot classification with prompts

3. **Context-Aware Classification** / Phân loại Có Nhận thức Context
   - Include surrounding sentences for context
   - Bao gồm các câu xung quanh cho context

### Phase 3: Voice Preset Integration / Tích hợp Voice Preset

1. **Create Voice Preset Config**
   ```json
   {
     "presets": {
       "male": {
         "voice": "male_voice_id",
         "speed": 1.0,
         "model": "viet-tts"
       },
       "female": {
         "voice": "female_voice_id",
         "speed": 1.0,
         "model": "viet-tts"
       },
       "narrator": {
         "voice": "narrator_voice_id",
         "speed": 0.85,
         "model": "viet-tts"
       }
     }
   }
   ```

2. **Integrate with TTS Service**
   - Pass role detection results to TTS
   - Select voice preset based on role

## Model Details / Chi tiết Model

### PhoBERT-base-v2
- **HuggingFace:** `vinai/phobert-base-v2`
- **Parameters:** 135M
- **Max Length:** 256 tokens
- **VRAM:** ~1-2GB (with batch processing)
- **Inference Speed:** ~100-200 sentences/second on GPU

### Usage Example / Ví dụ Sử dụng

```python
from transformers import AutoTokenizer, AutoModel
import torch

# Load model
model_name = "vinai/phobert-base-v2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

# Classify text
text = "Anh ấy nói: 'Xin chào, tôi là nam giới.'"
inputs = tokenizer(text, return_tensors="pt", max_length=256, truncation=True)
with torch.no_grad():
    outputs = model(**inputs)
    # Add classification head here
```

## Context Handling / Xử lý Context

### For 20k Character Chapters / Cho Chapter 20k Ký tự

**Strategy:**
1. Split chapter into sentences (preserve order)
2. Process sentences in batches of 50-100
3. Maintain context window (previous 2-3 sentences) for classification
4. Classify each sentence with context

**Token Estimation:**
- 20,000 Vietnamese characters ≈ 5,000-10,000 tokens
- PhoBERT max: 256 tokens per input
- Need to split into multiple segments
- Use sliding window with overlap for context

### Sliding Window Approach / Phương pháp Cửa sổ Trượt

```
Chapter: [Sentence1] [Sentence2] ... [Sentence100]
          ↓
Window 1: [S1] [S2] [S3] → Classify S2
Window 2: [S2] [S3] [S4] → Classify S3
Window 3: [S3] [S4] [S5] → Classify S4
...
```

## Integration Points / Điểm Tích hợp

1. **Novel Parser** (`novel-app/backend/src/services/novelParser.js`)
   - Add role detection after parsing paragraphs
   - Thêm role detection sau khi parse paragraphs

2. **TTS Service** (`novel-app/backend/src/services/ttsService.js`)
   - Accept role parameter
   - Select voice preset based on role

3. **Worker Service** (`novel-app/backend/src/services/worker.js`)
   - Pass role information to TTS generation
   - Track role per paragraph

## Next Steps / Bước Tiếp theo

1. ✅ Create role detection backend service
2. ✅ Setup PhoBERT model
3. ✅ Implement basic rule-based classifier (Phase 1)
4. ✅ Test with sample Vietnamese novel text
5. ⏭️ Fine-tune PhoBERT for role classification (Phase 2)
6. ⏭️ Integrate with TTS service
7. ⏭️ Create voice preset configuration system

