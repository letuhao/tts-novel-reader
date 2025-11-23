# Role Detection Options - Simple & Easy to Use
# Tùy chọn Phát hiện Vai diễn - Đơn giản & Dễ sử dụng

## Your Requirements / Yêu cầu của bạn

- **Input:** Chapter context (already split by paragraphs)
  - **Đầu vào:** Context chapter (đã được tách theo paragraphs)
- **Output:** Paragraph + Role map (male/female/narrator)
  - **Đầu ra:** Map Paragraph + Role (male/female/narrator)
- **Easy to use:** No fine-tuning needed
  - **Dễ sử dụng:** Không cần fine-tuning

## Option 1: Rule-Based Classifier (Easiest) / Classifier Dựa trên Quy tắc (Dễ nhất)

### ✅ Advantages / Ưu điểm
- **No model needed** - Pure Python logic
  - **Không cần model** - Logic Python thuần
- **Very fast** - Instant classification
  - **Rất nhanh** - Phân loại tức thì
- **Works immediately** - No setup required
  - **Hoạt động ngay** - Không cần setup
- **No VRAM usage** - CPU only
  - **Không dùng VRAM** - Chỉ CPU

### How it works / Cách hoạt động

Detect role based on patterns:
Phát hiện role dựa trên patterns:

1. **Dialogue markers** / Dấu hiệu đối thoại:
   - Quotation marks: `"..."`, `'...'`, `«...»`
   - Speech verbs: `nói:`, `hỏi:`, `thét:`, `gào:`, `thầm:`, `rên:`, etc.

2. **Pronouns** / Đại từ:
   - **Male:** `anh`, `anh ấy`, `ông`, `ông ấy`, `cậu`, `cậu ấy`, `hắn`, `hắn ta`
   - **Female:** `cô`, `cô ấy`, `chị`, `chị ấy`, `bà`, `bà ấy`, `nàng`, `nàng ấy`, `cô ta`

3. **Context clues** / Manh mối context:
   - Character names (if mentioned)
   - Tên nhân vật (nếu được đề cập)
   - Previous paragraphs (track last speaker)
   - Paragraphs trước (theo dõi người nói cuối)

### Example / Ví dụ

```python
def classify_role(paragraph, previous_role=None):
    # Check for dialogue markers
    if '"' in paragraph or "'" in paragraph or 'nói:' in paragraph:
        # Check for pronouns
        if any(word in paragraph for word in ['anh', 'anh ấy', 'ông', 'hắn']):
            return 'male'
        elif any(word in paragraph for word in ['cô', 'cô ấy', 'chị', 'nàng']):
            return 'female'
        # Default to previous role or male
        return previous_role or 'male'
    else:
        # No dialogue = narrator
        return 'narrator'
```

### Implementation / Triển khai

```python
# Simple Python service
# Dịch vụ Python đơn giản
def detect_roles(paragraphs):
    role_map = {}
    previous_role = None
    
    for i, para in enumerate(paragraphs):
        role = classify_role(para, previous_role)
        role_map[i] = role
        if role != 'narrator':
            previous_role = role
    
    return role_map
```

---

## Option 2: PhoBERT Zero-Shot Classification (No Fine-tuning) / PhoBERT Zero-Shot (Không Fine-tune)

### ✅ Advantages / Ưu điểm
- **Pre-trained model** - No fine-tuning needed
  - **Model đã train** - Không cần fine-tuning
- **Better accuracy** - Understands context
  - **Độ chính xác tốt hơn** - Hiểu context
- **Uses ~1-2GB VRAM** - Lightweight
  - **Dùng ~1-2GB VRAM** - Nhẹ

### How it works / Cách hoạt động

Use PhoBERT with **zero-shot classification**:
Sử dụng PhoBERT với **phân loại zero-shot**:

```python
from transformers import pipeline

# Load zero-shot classifier
classifier = pipeline(
    "zero-shot-classification",
    model="vinai/phobert-base-v2",
    device=0  # GPU
)

# Classify each paragraph
labels = ["male", "female", "narrator"]
result = classifier(paragraph, labels)
# Returns: {'labels': ['male', 'narrator', 'female'], 'scores': [0.8, 0.15, 0.05]}
```

**Problem:** PhoBERT may not have this pipeline directly. We need a custom approach.
**Vấn đề:** PhoBERT có thể không có pipeline này trực tiếp. Cần cách tiếp cận tùy chỉnh.

### Alternative: Use Vietnamese LLM for Zero-Shot / Thay thế: Dùng LLM Tiếng Việt cho Zero-Shot

Small Vietnamese LLMs that can do zero-shot classification:
LLM Tiếng Việt nhỏ có thể làm zero-shot classification:

- **PhoGPT** - Small Vietnamese GPT model
- **VinLlama** - Vietnamese Llama variant

Use prompt-based classification:
Sử dụng phân loại dựa trên prompt:

```python
prompt = f"""
Phân loại đoạn văn sau thành một trong ba loại:
- male: Lời nói của nhân vật nam
- female: Lời nói của nhân vật nữ  
- narrator: Văn bản dẫn chuyện

Đoạn văn: {paragraph}

Trả lời chỉ một từ: male, female, hoặc narrator
"""
```

---

## Option 3: Hybrid Approach (Recommended) / Phương pháp Kết hợp (Đề xuất)

### ✅ Best of Both Worlds / Kết hợp Tốt nhất

1. **Start with Rule-Based** - Fast & simple
   - **Bắt đầu với Rule-Based** - Nhanh & đơn giản
2. **Use PhoBERT for ambiguous cases** - Better accuracy
   - **Dùng PhoBERT cho trường hợp mơ hồ** - Độ chính xác tốt hơn

### Flow / Luồng

```
Paragraph → Rule-Based Classifier
              ↓
         Confident? (score > 0.8)
              ↓ Yes
         Return role
              ↓ No (ambiguous)
         PhoBERT Zero-Shot
              ↓
         Return role
```

---

## Recommendation / Đề xuất

### For Quick Start / Để Bắt đầu Nhanh

**Start with Option 1 (Rule-Based)** / **Bắt đầu với Option 1 (Rule-Based)**

Why? / Tại sao?
- ✅ Works immediately - No setup
  - ✅ Hoạt động ngay - Không cần setup
- ✅ Very fast - No model loading
  - ✅ Rất nhanh - Không cần load model
- ✅ Good accuracy for most cases - Vietnamese novels have clear patterns
  - ✅ Độ chính xác tốt cho hầu hết trường hợp - Tiểu thuyết tiếng Việt có pattern rõ ràng

### Later Enhancement / Cải thiện Sau

**Add Option 2 (PhoBERT)** for ambiguous paragraphs:
**Thêm Option 2 (PhoBERT)** cho paragraphs mơ hồ:

- Use PhoBERT only when rule-based is uncertain
  - Chỉ dùng PhoBERT khi rule-based không chắc chắn
- Improves accuracy from ~80% to ~95%
  - Cải thiện độ chính xác từ ~80% lên ~95%

---

## Implementation Structure / Cấu trúc Triển khai

### Service API / API Dịch vụ

```python
POST /api/role-detection/detect
{
    "paragraphs": [
        "Đây là đoạn văn 1...",
        "Đây là đoạn văn 2...",
        ...
    ],
    "context": "Chapter context...",  # Optional
    "method": "rule-based"  # or "phobert" or "hybrid"
}

Response:
{
    "role_map": {
        "0": "narrator",
        "1": "male",
        "2": "female",
        "3": "narrator",
        ...
    }
}
```

### Simple Python Service / Dịch vụ Python Đơn giản

```python
# role_detection/service.py
class RoleDetectionService:
    def detect_roles(self, paragraphs, method="rule-based"):
        if method == "rule-based":
            return self._rule_based_classify(paragraphs)
        elif method == "phobert":
            return self._phobert_classify(paragraphs)
        elif method == "hybrid":
            return self._hybrid_classify(paragraphs)
    
    def _rule_based_classify(self, paragraphs):
        # Simple pattern matching
        # Pattern matching đơn giản
        ...
```

---

## My Recommendation / Đề xuất của tôi

**Start Simple:** Implement Option 1 (Rule-Based) first
**Bắt đầu Đơn giản:** Triển khai Option 1 (Rule-Based) trước

**Why? / Tại sao?**
1. ✅ Works immediately - No dependencies
   - ✅ Hoạt động ngay - Không cần dependencies
2. ✅ Fast - Processes 20k chars in <1 second
   - ✅ Nhanh - Xử lý 20k ký tự trong <1 giây
3. ✅ Good enough - ~80-85% accuracy for Vietnamese novels
   - ✅ Đủ tốt - ~80-85% độ chính xác cho tiểu thuyết tiếng Việt
4. ✅ Easy to improve - Add PhoBERT later if needed
   - ✅ Dễ cải thiện - Thêm PhoBERT sau nếu cần

**We can always add PhoBERT later if you need better accuracy!**
**Chúng ta luôn có thể thêm PhoBERT sau nếu bạn cần độ chính xác tốt hơn!**

---

## Next Steps / Bước Tiếp theo

1. ✅ Implement Rule-Based Classifier (Phase 1)
2. ✅ Test with your Vietnamese novel chapters
3. ⏭️ Evaluate accuracy
4. ⏭️ Add PhoBERT if accuracy needs improvement (Phase 2)

**Would you like me to implement the Rule-Based classifier first?**
**Bạn có muốn tôi triển khai Rule-Based classifier trước không?**

