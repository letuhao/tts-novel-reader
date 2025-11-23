# Review Existing Model: Qwen3-abliterated-erotic
# Đánh giá Model Có Sẵn: Qwen3-abliterated-erotic

## Model Location / Vị trí Model
- **Path:** `E:\AI\Models\Ollama`
- **Format:** Likely Ollama format (GGUF) / Có thể là format Ollama (GGUF)

## Model Information / Thông tin Model

**Name:** `qwen3-abliterated-erotic`

**Likely Specification:**
- Base: Qwen3 model (Chinese/Multilingual LLM)
- Variant: Modified/fine-tuned version
- Format: Ollama (GGUF)

## Usage Options / Tùy chọn Sử dụng

### Option 1: Use Ollama API (Easiest) / Dùng Ollama API (Dễ nhất)

If Ollama is installed and model is loaded:
Nếu Ollama đã được cài và model đã được load:

**Advantages:**
- ✅ No conversion needed / Không cần convert
- ✅ Easy API calls / API calls dễ dàng
- ✅ Handles model management / Tự quản lý model

**Setup:**
```python
import requests
import json

def classify_with_ollama(paragraphs, chapter_context=""):
    """
    Use Ollama API for classification.
    Sử dụng Ollama API cho classification.
    """
    prompt = f"""Phân loại các đoạn văn sau thành một trong ba loại:
- narrator: Văn bản dẫn chuyện, mô tả, tường thuật
- male: Lời nói/hành động của nhân vật nam
- female: Lời nói/hành động của nhân vật nữ

Chapter context:
{chapter_context}

Đoạn văn:
{chr(10).join(f'{i+1}. {p}' for i, p in enumerate(paragraphs))}

Trả lời dạng JSON (chỉ JSON, không giải thích):
{{"1": "narrator", "2": "male", ...}}"""

    response = requests.post('http://localhost:11434/api/generate', json={
        'model': 'qwen3-abliterated-erotic',
        'prompt': prompt,
        'stream': False,
        'format': 'json'  # Request JSON format
    })
    
    result = response.json()
    role_map_json = result['response']
    
    # Parse JSON
    import json
    role_map = json.loads(role_map_json)
    return role_map
```

**Check if Ollama is running:**
```bash
curl http://localhost:11434/api/tags
# Or check if Ollama service is running
```

---

### Option 2: Convert GGUF to Transformers Format / Convert GGUF sang Format Transformers

If model is in GGUF format and we want to use it directly with transformers:
Nếu model ở format GGUF và muốn dùng trực tiếp với transformers:

**Tools:**
- `llama.cpp` with Python bindings
- Or convert GGUF → safetensors (complex)

**Using llama-cpp-python:**
```python
from llama_cpp import Llama

# Load GGUF model
llm = Llama(
    model_path=r"E:\AI\Models\Ollama\qwen3-abliterated-erotic\model.gguf",
    n_ctx=32768,  # Context length
    n_threads=4,
    n_gpu_layers=35  # Offload layers to GPU
)

def classify_with_llama_cpp(paragraphs, chapter_context=""):
    prompt = build_classification_prompt(paragraphs, chapter_context)
    
    output = llm(
        prompt,
        max_tokens=500,
        temperature=0.1,  # Low temperature for consistent classification
        stop=["</s>"],
        echo=False
    )
    
    response = output['choices'][0]['text']
    role_map = parse_json_response(response)
    return role_map
```

---

### Option 3: Use Ollama Python Library / Dùng Thư viện Ollama Python

**Install:**
```bash
pip install ollama
```

**Usage:**
```python
import ollama

def classify_with_ollama_lib(paragraphs, chapter_context=""):
    prompt = build_classification_prompt(paragraphs, chapter_context)
    
    response = ollama.generate(
        model='qwen3-abliterated-erotic',
        prompt=prompt,
        options={
            'temperature': 0.1,  # Low for consistent classification
            'num_predict': 500,
            'format': 'json'  # Request JSON output
        }
    )
    
    role_map_json = response['response']
    role_map = json.loads(role_map_json)
    return role_map
```

---

## Model Compatibility Check / Kiểm tra Tương thích

### Questions to Check / Câu hỏi Cần Kiểm tra:

1. **Model Size?**
   - Qwen3 variants can be 3B, 7B, 14B, etc.
   - Need to check VRAM requirements / Cần kiểm tra yêu cầu VRAM

2. **Context Length?**
   - Qwen3 typically supports long context (8K-32K)
   - Important for chapter processing / Quan trọng cho xử lý chapter

3. **Vietnamese Support?**
   - Qwen3 is multilingual and should support Vietnamese
   - May need testing / Có thể cần test

4. **Model Format?**
   - GGUF (Ollama format) / GGUF (format Ollama)
   - Need to check file extension / Cần kiểm tra extension

---

## Recommended Approach / Phương pháp Đề xuất

### **Step 1: Check Model Details** / **Bước 1: Kiểm tra Chi tiết Model**

```bash
# Check if Ollama is installed and model is available
ollama list

# Or check model files directly
dir "E:\AI\Models\Ollama" /s
```

### **Step 2: Test Model** / **Bước 2: Test Model**

```python
# Test 1: Check if Ollama API works
import requests
response = requests.get('http://localhost:11434/api/tags')
print(response.json())

# Test 2: Try generating with model
response = requests.post('http://localhost:11434/api/generate', json={
    'model': 'qwen3-abliterated-erotic',
    'prompt': 'Xin chào, bạn có hiểu tiếng Việt không?',
    'stream': False
})
print(response.json())
```

### **Step 3: Create Classification Service** / **Bước 3: Tạo Classification Service**

Based on what works, create a service wrapper:
Dựa trên cái gì hoạt động, tạo wrapper service:

```python
class RoleDetectionService:
    def __init__(self, method='ollama'):
        self.method = method
        if method == 'ollama':
            # Check if Ollama is available
            try:
                import ollama
                self.client = ollama
            except ImportError:
                raise ImportError("Please install ollama: pip install ollama")
    
    def detect_roles(self, paragraphs, chapter_context=""):
        if self.method == 'ollama':
            return self._detect_with_ollama(paragraphs, chapter_context)
    
    def _detect_with_ollama(self, paragraphs, chapter_context):
        # Build prompt
        prompt = self._build_classification_prompt(paragraphs, chapter_context)
        
        # Call Ollama
        response = self.client.generate(
            model='qwen3-abliterated-erotic',
            prompt=prompt,
            options={'temperature': 0.1, 'format': 'json'}
        )
        
        # Parse and return
        role_map = json.loads(response['response'])
        return role_map
```

---

## Next Steps / Bước Tiếp theo

1. ⏭️ **Check model format and size**
   - Kiểm tra format và kích thước model
   - Verify Ollama installation
   - Xác minh Ollama đã được cài

2. ⏭️ **Test model with Vietnamese text**
   - Test model với văn bản tiếng Việt
   - Check Vietnamese understanding
   - Kiểm tra khả năng hiểu tiếng Việt

3. ⏭️ **Test classification prompt**
   - Test prompt classification
   - Verify JSON output format
   - Xác minh format output JSON

4. ⏭️ **Create service wrapper**
   - Tạo service wrapper
   - Integrate with novel pipeline
   - Tích hợp với novel pipeline

---

## Notes / Lưu ý

- **Model name:** "abliterated-erotic" suggests it may be NSFW-filtered variant
  - **Tên model:** "abliterated-erotic" cho thấy có thể là variant đã lọc NSFW
- **Classification should still work** - Just need proper prompts
  - **Classification vẫn hoạt động** - Chỉ cần prompt đúng
- **May need prompt tuning** for Vietnamese classification
  - **Có thể cần điều chỉnh prompt** cho classification tiếng Việt

