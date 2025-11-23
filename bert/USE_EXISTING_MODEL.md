# Using Existing Model: qwen3-abliterated-erotic
# Sử dụng Model Có Sẵn: qwen3-abliterated-erotic

## Model Info / Thông tin Model

- **Name:** `qwen3-abliterated-erotic:latest`
- **Location:** `E:\AI\Models\Ollama`
- **Size:** 18 GB
- **Format:** Ollama (GGUF)
- **Status:** ✅ Available in Ollama
- **Base:** Qwen3 (Multilingual LLM - supports Vietnamese)

## Why This Model Works / Tại sao Model này Phù hợp

✅ **Multilingual** - Supports Vietnamese  
✅ **Large context** - Qwen3 supports long context windows  
✅ **18GB** - Will fit in your RTX 4090 (24GB VRAM)  
✅ **No download needed** - Already available!  
✅ **Ollama format** - Easy to use with Ollama API  

---

## Usage Method 1: Ollama API (Recommended) / Phương pháp 1: Ollama API (Đề xuất)

### Setup / Thiết lập

**Check if Ollama service is running:**
```bash
# Check if Ollama is running
ollama list

# If not running, start Ollama (usually auto-starts)
# Nếu không chạy, khởi động Ollama (thường tự khởi động)
```

### Python Service / Dịch vụ Python

```python
import requests
import json
from typing import List, Dict

class OllamaRoleDetection:
    """
    Role detection using Ollama API.
    Phát hiện vai diễn sử dụng Ollama API.
    """
    
    def __init__(self, model_name="qwen3-abliterated-erotic", base_url="http://localhost:11434"):
        self.model_name = model_name
        self.base_url = base_url
        self.api_url = f"{base_url}/api/generate"
    
    def detect_roles(self, paragraphs: List[str], chapter_context: str = "") -> Dict[int, str]:
        """
        Detect roles for paragraphs.
        Phát hiện vai diễn cho paragraphs.
        
        Args:
            paragraphs: List of paragraph texts
            chapter_context: Optional full chapter text for context
            
        Returns:
            Dict mapping paragraph index to role (narrator/male/female)
        """
        # Build classification prompt
        prompt = self._build_classification_prompt(paragraphs, chapter_context)
        
        # Call Ollama API
        response = self._call_ollama(prompt)
        
        # Parse response
        role_map = self._parse_response(response, len(paragraphs))
        
        return role_map
    
    def _build_classification_prompt(self, paragraphs: List[str], chapter_context: str) -> str:
        """Build prompt for classification / Xây dựng prompt cho classification"""
        
        paragraphs_text = "\n".join([
            f"{i+1}. {para}" for i, para in enumerate(paragraphs)
        ])
        
        prompt = f"""Bạn là một hệ thống phân loại văn bản tiểu thuyết tiếng Việt.

Nhiệm vụ: Phân loại mỗi đoạn văn sau thành một trong ba loại:
- narrator: Văn bản dẫn chuyện, mô tả, tường thuật của tác giả
- male: Lời nói, suy nghĩ, hoặc hành động của nhân vật nam
- female: Lời nói, suy nghĩ, hoặc hành động của nhân vật nữ

Ngữ cảnh chapter (để tham khảo):
{chapter_context[:2000] if chapter_context else "Không có"}...

Danh sách đoạn văn cần phân loại:
{paragraphs_text}

Yêu cầu:
1. Phân tích từng đoạn văn dựa trên ngữ cảnh
2. Xác định xem đoạn văn là dẫn chuyện hay lời nhân vật
3. Nếu là lời nhân vật, xác định giới tính (nam/nữ)
4. Trả lời DẠNG JSON duy nhất, không có giải thích thêm

Định dạng trả lời (JSON):
{{"1": "narrator", "2": "male", "3": "female", "4": "narrator", ...}}

Chỉ trả lời JSON, không có văn bản khác."""
        
        return prompt
    
    def _call_ollama(self, prompt: str) -> str:
        """Call Ollama API / Gọi Ollama API"""
        try:
            response = requests.post(
                self.api_url,
                json={
                    'model': self.model_name,
                    'prompt': prompt,
                    'stream': False,
                    'options': {
                        'temperature': 0.1,  # Low temperature for consistent classification
                        'num_predict': 1000,  # Max tokens for response
                    },
                    'format': 'json'  # Request JSON format
                },
                timeout=120  # 2 minute timeout for long chapters
            )
            response.raise_for_status()
            result = response.json()
            return result.get('response', '')
        except requests.exceptions.RequestException as e:
            raise Exception(f"Ollama API error: {e}")
    
    def _parse_response(self, response: str, num_paragraphs: int) -> Dict[int, str]:
        """Parse JSON response / Parse phản hồi JSON"""
        try:
            # Try to extract JSON from response
            # Cố gắng trích xuất JSON từ response
            response = response.strip()
            
            # Remove markdown code blocks if present
            # Xóa markdown code blocks nếu có
            if response.startswith('```'):
                lines = response.split('\n')
                response = '\n'.join(lines[1:-1]) if lines[-1].strip() == '```' else '\n'.join(lines[1:])
            
            # Find JSON object
            # Tìm JSON object
            start = response.find('{')
            end = response.rfind('}') + 1
            
            if start == -1 or end == 0:
                raise ValueError("No JSON found in response")
            
            json_str = response[start:end]
            role_map = json.loads(json_str)
            
            # Convert string keys to int and validate
            # Chuyển đổi keys string sang int và validate
            result = {}
            for key, value in role_map.items():
                try:
                    idx = int(key) - 1  # Convert 1-based to 0-based
                    if 0 <= idx < num_paragraphs:
                        role = value.lower().strip()
                        if role in ['narrator', 'male', 'female']:
                            result[idx] = role
                        else:
                            result[idx] = 'narrator'  # Default fallback
                except (ValueError, TypeError):
                    continue
            
            # Fill missing indices with narrator
            # Điền các indices thiếu bằng narrator
            for i in range(num_paragraphs):
                if i not in result:
                    result[i] = 'narrator'
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing error: {e}")
            print(f"Response: {response[:500]}")
            # Fallback: return all narrator
            # Fallback: trả về tất cả narrator
            return {i: 'narrator' for i in range(num_paragraphs)}
```

---

## Usage Method 2: Ollama Python Library / Phương pháp 2: Thư viện Ollama Python

**Install:**
```bash
pip install ollama
```

**Usage:**
```python
import ollama
import json

def detect_roles_with_ollama_lib(paragraphs: List[str], chapter_context: str = ""):
    """Use ollama Python library / Sử dụng thư viện ollama Python"""
    
    prompt = build_classification_prompt(paragraphs, chapter_context)
    
    response = ollama.generate(
        model='qwen3-abliterated-erotic',
        prompt=prompt,
        options={
            'temperature': 0.1,
            'num_predict': 1000,
        },
        format='json'
    )
    
    role_map_json = response['response']
    role_map = json.loads(role_map_json)
    return role_map
```

---

## Integration with Novel Pipeline / Tích hợp với Novel Pipeline

### Step 1: Create Role Detection Service / Bước 1: Tạo Role Detection Service

**File:** `novel-app/backend/src/services/roleDetection.js` (Node.js wrapper)

Or Python service: `bert/role-detection-backend/`

### Step 2: Add Role Detection Endpoint / Bước 2: Thêm Role Detection Endpoint

**API:** `POST /api/role-detection/detect`

```javascript
// novel-app/backend/src/routes/roleDetection.js
router.post('/detect', async (req, res) => {
  const { paragraphs, chapterContext } = req.body;
  
  // Call Python service or Ollama directly
  const roleMap = await detectRolesWithOllama(paragraphs, chapterContext);
  
  res.json({
    success: true,
    role_map: roleMap
  });
});
```

### Step 3: Batch Detection for Novel / Bước 3: Batch Detection cho Novel

**Endpoint:** `POST /api/novels/:id/detect-roles`

```javascript
router.post('/:id/detect-roles', async (req, res) => {
  const novel = await NovelModel.getById(req.params.id);
  
  for (const chapter of novel.chapters) {
    const paragraphs = chapter.paragraphs;
    const chapterText = paragraphs.map(p => p.text).join('\n\n');
    
    // Detect roles for all paragraphs in chapter
    const roleMap = await detectRolesWithOllama(
      paragraphs.map(p => p.text),
      chapterText
    );
    
    // Update paragraphs with roles
    for (const [idx, role] of Object.entries(roleMap)) {
      await ParagraphModel.updateRole(paragraphs[idx].id, role);
    }
  }
  
  res.json({ success: true });
});
```

---

## Testing / Kiểm thử

### Test 1: Check Ollama is Running / Kiểm tra Ollama đang chạy

```bash
ollama list
# Should show: qwen3-abliterated-erotic:latest

# Test API
curl http://localhost:11434/api/tags
```

### Test 2: Test Classification / Test Classification

```python
from ollama_role_detection import OllamaRoleDetection

detector = OllamaRoleDetection()

paragraphs = [
    "Đây là đoạn dẫn chuyện của tác giả.",
    'Anh ấy nói: "Xin chào, tôi là nam giới."',
    "Cô ấy đáp lại một cách nhẹ nhàng."
]

role_map = detector.detect_roles(paragraphs)
print(role_map)
# Expected: {0: "narrator", 1: "male", 2: "female"}
```

---

## Performance Considerations / Xem xét Hiệu suất

### Model Size: 18GB / Kích thước Model: 18GB

**VRAM Usage:**
- **FP16:** ~18GB VRAM (may not fit with TTS models running)
- **With TTS:** May need to offload to CPU or use smaller batch

**Options:**
1. **Use Ollama** - Handles memory management automatically
2. **Load only when needed** - Don't keep model loaded permanently
3. **Batch processing** - Process multiple chapters at once when model is loaded

### Context Length / Độ dài Context

**Qwen3 typically supports:**
- 8K-32K tokens context
- ~16K-64K Vietnamese characters
- Enough for full chapter! ✅

### Speed / Tốc độ

- **Per chapter:** ~10-30 seconds (depending on chapter length)
- **Per paragraph:** ~1-3 seconds
- **Batch processing:** Faster overall

---

## Next Steps / Bước Tiếp theo

1. ✅ Model confirmed available
2. ⏭️ Create Ollama role detection service
3. ⏭️ Test with sample Vietnamese novel text
4. ⏭️ Integrate with novel pipeline
5. ⏭️ Add role column to paragraphs table
6. ⏭️ Create batch detection endpoint

