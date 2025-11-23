# Recommended Small Models for Role Detection
# Model Nhỏ Đề xuất cho Role Detection

## Current Situation / Tình hình Hiện tại

- **Current model:** `qwen3-abliterated-erotic:latest` → **23GB VRAM** ❌ (Too heavy!)
- **Available VRAM:** ~7GB (after TTS uses ~7GB)
- **Need:** Model that uses <3GB VRAM
- **Cần:** Model dùng <3GB VRAM

---

## Recommended Models / Model Đề xuất

### ⭐ Option 1: Qwen3-8B (Best Balance - Recommended) / Qwen3-8B (Cân bằng Tốt nhất - Đề xuất)

**Ollama Model Name:**
```
qwen3:8b
```

**Specifications:**
- **Parameters:** 8B
- **VRAM (FP16):** ~16GB
- **VRAM (4-bit):** ~4-5GB ✅ (Fits with TTS!)
- **Context:** 32K tokens ✅ (Can process full chapter!)
- **Language:** Multilingual (Vietnamese supported)

**Download Command:**
```bash
ollama pull qwen3:8b
```

**VRAM Usage with TTS:**
- Qwen3-8B (4-bit): ~5GB
- VietTTS: ~7GB
- **Total: ~12GB / 24GB** ✅ (Perfect fit! 12GB free)

**Why Recommended:**
- ✅ Better accuracy than 1.7B (larger model)
- ✅ Still fits comfortably (12GB free)
- ✅ Long context (32K tokens)
- ✅ Good balance: Accuracy vs VRAM

---

### Option 2: Qwen3-1.7B-Instruct (Lightweight) / Qwen3-1.7B-Instruct (Nhẹ)

**Ollama Model Name:**
```
qwen3:1.7b-instruct
```
or
```
qwen3:1.7b
```

**Specifications:**
- **Parameters:** 1.7B
- **Disk Size:** ~1.67 GB
- **VRAM (FP16):** ~3-4GB
- **VRAM (4-bit):** ~1.5-2GB ✅ (Perfect!)
- **Context:** 32K tokens ✅ (Can process full chapter!)
- **Language:** Multilingual (Vietnamese supported)

**Download Command:**
```bash
ollama pull qwen3:1.7b-instruct
```

**VRAM Usage with TTS:**
- Qwen3-1.7B (4-bit): ~2GB
- VietTTS: ~7GB
- **Total: ~9GB / 24GB** ✅ (Perfect fit!)

---

### Option 2: Qwen3-0.6B-Instruct (Lightest) / Qwen3-0.6B-Instruct (Nhẹ nhất)

**Ollama Model Name:**
```
qwen3:0.6b-instruct
```

**Specifications:**
- **Parameters:** 0.6B
- **VRAM (4-bit):** ~0.5-1GB ✅
- **Context:** 32K tokens ✅
- **Language:** Multilingual

**Download Command:**
```bash
ollama pull qwen3:0.6b-instruct
```

**Trade-offs:**
- ✅ Very lightweight (0.5-1GB VRAM)
- ⚠️ May have lower accuracy (smallest model)
- ✅ Fastest inference

---

### Option 3: Qwen2.5-3B-Instruct (If Available) / Qwen2.5-3B-Instruct (Nếu Có)

**Ollama Model Name:**
```
qwen2.5:3b-instruct
```

**Specifications:**
- **Parameters:** 3B
- **VRAM (4-bit):** ~2-3GB ✅
- **Context:** 32K tokens ✅
- **Language:** Multilingual (well-tested)

**Download Command:**
```bash
ollama pull qwen2.5:3b-instruct
```

---

## Model Comparison Table / Bảng So sánh Model

| Model | Parameters | VRAM (4-bit) | Context | Speed | Accuracy | Fit? |
|-------|------------|--------------|---------|-------|----------|------|
| **qwen3:8b** | 8B | **4-5GB** ✅ | 32K ✅ | Medium | **Best** | ⭐ **Recommended** |
| **qwen3:1.7b-instruct** | 1.7B | **1.5-2GB** ✅ | 32K ✅ | Fast | Good | Lightweight |
| **qwen3:0.6b-instruct** | 0.6B | **0.5-1GB** ✅ | 32K ✅ | Fastest | Lower | Lightest |
| **qwen2.5:3b-instruct** | 3B | **2-3GB** ✅ | 32K ✅ | Medium | Better | Alternative |
| qwen3-abliterated-erotic | ? | **23GB** ❌ | ? | Slow | Good | Too heavy ❌ |

---

## Recommendation / Đề xuất

### **Start with: Qwen3-1.7B-Instruct**

**Why:**
1. ✅ **Perfect VRAM fit** - 1.5-2GB leaves 5-6GB for TTS
2. ✅ **Long context** - 32K tokens (process full chapter at once!)
3. ✅ **Good accuracy** - 1.7B is sufficient for classification
4. ✅ **Fast inference** - Quick classification per chapter

**If you want lighter model (more VRAM free):**
- `qwen3:1.7b-instruct` (1.5-2GB VRAM, less accurate)

**If you need lightest:**
- `qwen3:0.6b-instruct` (0.5-1GB VRAM, lowest accuracy)

---

## Download & Setup Steps / Các Bước Tải xuống & Thiết lập

### Step 1: Check Available Models / Bước 1: Kiểm tra Model Có sẵn

```bash
# Check Ollama library for Qwen models
ollama search qwen

# Or check online:
# https://ollama.com/library?q=qwen
```

### Step 2: Download Recommended Model / Bước 2: Tải Model Đề xuất

```bash
# Recommended
ollama pull qwen3:8b

# Or lighter alternative
ollama pull qwen3:1.7b-instruct

# Verify download
ollama list
```

### Step 3: Test Model / Bước 3: Test Model

```bash
# Test basic Vietnamese understanding
ollama run qwen3:8b "Xin chào, bạn có hiểu tiếng Việt không?"

# Test classification
ollama run qwen3:8b "Phân loại đoạn văn sau: 'Anh ấy nói: Xin chào.' Trả lời: narrator, male, hoặc female"
```

### Step 4: Verify VRAM Usage / Bước 4: Xác minh Sử dụng VRAM

```bash
# Check GPU usage while model is loaded
nvidia-smi
```

Expected: ~4-5GB VRAM for Qwen3-8B (4-bit quantization)

---

## Alternative: Check Exact Model Names / Thay thế: Kiểm tra Tên Model Chính xác

Model names in Ollama may vary. Check available models:
Tên model trong Ollama có thể khác. Kiểm tra model có sẵn:

```bash
# List all available models
ollama list

# Search for Qwen models
ollama search qwen

# Try pulling common names:
ollama pull qwen3:1.7b
ollama pull qwen3:1.7b-instruct
ollama pull qwen:1.7b
```

Or check Ollama library website:
Hoặc kiểm tra website Ollama library:
- https://ollama.com/library
- Search for "qwen"

---

## Expected Performance / Hiệu suất Dự kiến

### With Qwen3-8B:

**Classification Speed:**
- **Per chapter:** ~10-30 seconds (depending on chapter length)
- **Per paragraph:** ~1-2 seconds

**Accuracy:**
- **Expected:** 90-98% accuracy for Vietnamese novel classification ✅
- **Độ chính xác dự kiến:** 90-98% cho classification tiểu thuyết tiếng Việt ✅

**VRAM:**
- **Model only:** ~5GB (4-bit)
- **With TTS:** ~12GB total (leaves 12GB free) ✅

---

## Next Steps / Bước Tiếp theo

1. ⏭️ **Download model:**
   ```bash
   ollama pull qwen3:8b
   ```

2. ⏭️ **Test with Vietnamese text**

3. ⏭️ **Verify VRAM usage (<3GB)**

4. ⏭️ **Wait for your command to proceed with service setup**

---

## Notes / Lưu ý

- **Model names may vary** - Check with `ollama search qwen`
- **4-bit quantization** - Ollama handles this automatically
- **Context length** - All recommended models support 32K tokens
- **Vietnamese support** - All Qwen models are multilingual

