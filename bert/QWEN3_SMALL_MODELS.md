# Qwen3 Small Models for Role Detection
# Model Qwen3 Nhỏ cho Role Detection

## Problem / Vấn đề

- Current model (`qwen3-abliterated-erotic:latest`): 18GB → 23GB VRAM (too heavy!)
- Model hiện tại: 18GB → 23GB VRAM (quá nặng!)
- Need smaller model for classification task
- Cần model nhỏ hơn cho nhiệm vụ classification

## Recommended Small Qwen3 Models / Model Qwen3 Nhỏ Đề xuất

### Option 1: Qwen3-1.8B-Instruct (Best Balance) / Qwen3-1.8B-Instruct (Cân bằng Tốt nhất) ⭐

**Specifications:**
- **Parameters:** 1.8B
- **VRAM (FP16):** ~4-5GB
- **VRAM (4-bit):** ~1.5-2GB ✅ (Perfect for your 7GB available!)
- **Context:** 32K tokens ✅ (Can process full chapter!)
- **Language:** Multilingual (includes Vietnamese)

**Ollama Model Name:**
```
qwen3:1.8b-instruct
```
or
```
qwen3:1.8b
```

**Download Command:**
```bash
ollama pull qwen3:1.8b-instruct
```

**Why Recommended:**
- ✅ Lightweight (1.5-2GB VRAM)
- ✅ Long context (32K tokens)
- ✅ Good for classification tasks
- ✅ Fast inference

---

### Option 2: Qwen2.5-3B-Instruct (Alternative) / Qwen2.5-3B-Instruct (Thay thế)

**Specifications:**
- **Parameters:** 3B
- **VRAM (FP16):** ~6GB
- **VRAM (4-bit):** ~2-3GB ✅
- **Context:** 32K tokens ✅
- **Language:** Multilingual

**Ollama Model Name:**
```
qwen2.5:3b-instruct
```

**Download Command:**
```bash
ollama pull qwen2.5:3b-instruct
```

**Why Consider:**
- ✅ Slightly larger (more accurate)
- ✅ Still fits in 7GB VRAM
- ✅ Qwen2.5 is well-tested

---

### Option 3: Qwen3-0.5B-Instruct (Lightest) / Qwen3-0.5B-Instruct (Nhẹ nhất)

**Specifications:**
- **Parameters:** 0.5B
- **VRAM (FP16):** ~1.5GB
- **VRAM (4-bit):** ~0.5-1GB ✅
- **Context:** 32K tokens ✅
- **Language:** Multilingual

**Ollama Model Name:**
```
qwen3:0.5b-instruct
```

**Download Command:**
```bash
ollama pull qwen3:0.5b-instruct
```

**Trade-offs:**
- ✅ Very lightweight
- ⚠️ May be less accurate (smaller model)
- ✅ Fastest inference

---

## Model Comparison / So sánh Model

| Model | Parameters | VRAM (4-bit) | Context | Speed | Accuracy | Recommendation |
|-------|------------|--------------|---------|-------|----------|----------------|
| **Qwen3-1.8B-Instruct** | 1.8B | 1.5-2GB ✅ | 32K ✅ | Fast | Good | ⭐ **Best** |
| **Qwen2.5-3B-Instruct** | 3B | 2-3GB ✅ | 32K ✅ | Medium | Better | Good alternative |
| **Qwen3-0.5B-Instruct** | 0.5B | 0.5-1GB ✅ | 32K ✅ | Fastest | Lower | Lightest option |
| qwen3-abliterated-erotic | ~?B | 23GB ❌ | ? | Slow | Good | Too heavy ❌ |

---

## Recommended: Qwen3-1.8B-Instruct / Đề xuất: Qwen3-1.8B-Instruct

### Why / Tại sao:

1. ✅ **Perfect VRAM fit** - 1.5-2GB leaves 5-6GB for TTS
   - **Vừa VRAM** - 1.5-2GB còn lại 5-6GB cho TTS
2. ✅ **Long context** - 32K tokens (process full chapter!)
   - **Context dài** - 32K tokens (xử lý cả chapter!)
3. ✅ **Good balance** - Accuracy vs Speed
   - **Cân bằng tốt** - Độ chính xác vs Tốc độ
4. ✅ **Fast inference** - 1.8B is fast for classification
   - **Inference nhanh** - 1.8B nhanh cho classification

---

## Download & Setup / Tải xuống & Thiết lập

### Step 1: Download Model / Bước 1: Tải Model

```bash
# Recommended model
ollama pull qwen3:1.8b-instruct

# Or alternative
ollama pull qwen2.5:3b-instruct
```

### Step 2: Verify Model / Bước 2: Xác minh Model

```bash
# Check if model is downloaded
ollama list

# Test model
ollama run qwen3:1.8b-instruct "Xin chào, bạn có hiểu tiếng Việt không?"
```

### Step 3: Test Classification / Bước 3: Test Classification

```python
import requests
import json

def test_role_detection():
    prompt = """Phân loại đoạn văn sau: "Anh ấy nói: Xin chào." 
    Trả lời chỉ một từ: narrator, male, hoặc female"""
    
    response = requests.post('http://localhost:11434/api/generate', json={
        'model': 'qwen3:1.8b-instruct',
        'prompt': prompt,
        'stream': False,
        'format': 'json'
    })
    
    print(response.json())
```

---

## VRAM Management / Quản lý VRAM

### With TTS Models Running / Với TTS Models đang chạy:

**Current VRAM Usage:**
- VietTTS: ~7GB
- Available: ~17GB (24GB total - 7GB used)

**With Qwen3-1.8B-Instruct:**
- Qwen3-1.8B: ~2GB (4-bit)
- VietTTS: ~7GB
- **Total: ~9GB / 24GB** ✅ (Still plenty of space!)

**With Qwen2.5-3B-Instruct:**
- Qwen2.5-3B: ~3GB (4-bit)
- VietTTS: ~7GB
- **Total: ~10GB / 24GB** ✅ (Still good!)

---

## Next Steps / Bước Tiếp theo

1. ⏭️ **Download recommended model:**
   ```bash
   ollama pull qwen3:1.8b-instruct
   ```

2. ⏭️ **Test model with Vietnamese text**

3. ⏭️ **Create role detection service using new model**

4. ⏭️ **Integrate with novel pipeline**

---

## Alternative: Check Available Models / Thay thế: Kiểm tra Model Có sẵn

You can also check what Qwen models are available in Ollama:
Bạn cũng có thể kiểm tra model Qwen nào có sẵn trong Ollama:

```bash
# Search for Qwen models
ollama search qwen

# Or check online:
# https://ollama.com/library?q=qwen
```

Common available models:
- `qwen3:1.8b-instruct`
- `qwen2.5:3b-instruct`
- `qwen:7b` (may be too large)
- `qwen2:1.5b-instruct` (older version)

