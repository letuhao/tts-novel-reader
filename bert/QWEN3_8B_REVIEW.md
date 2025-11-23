# Qwen3-8B Review for Role Detection
# Đánh giá Qwen3-8B cho Role Detection

## Model Specifications / Thông số Model

**Name:** `qwen3:8b` (in Ollama)
- **Parameters:** 8.19B (~8.2B)
- **Base:** Qwen3 (Multilingual LLM)
- **Context:** 32K tokens ✅ (Perfect for full chapters!)
- **Language:** Multilingual (Vietnamese supported)

## VRAM Requirements / Yêu cầu VRAM

### With Different Quantizations / Với các Quantization khác nhau:

| Format | VRAM Usage | Notes |
|--------|------------|-------|
| **FP16** | ~16-20GB | Too heavy ❌ |
| **FP8** | ~12GB | Tight with TTS ⚠️ |
| **4-bit (Q4_K_M)** | **~7.5-8GB** ✅ | **Recommended!** |

### VRAM Calculation with TTS / Tính toán VRAM với TTS:

**Your System:**
- RTX 4090: **24GB VRAM**
- VietTTS: ~7GB
- **Available:** ~17GB

**With Qwen3-8B (4-bit):**
- Qwen3-8B: ~8GB
- VietTTS: ~7GB
- **Total: ~15GB / 24GB** ✅
- **Free: ~9GB** (Plenty of headroom!)

---

## Comparison with Other Models / So sánh với Model khác

| Model | Parameters | VRAM (4-bit) | Accuracy | Speed | Recommendation |
|-------|------------|--------------|----------|-------|----------------|
| **qwen3:8b** | 8.2B | **~8GB** | **Best** ✅ | Medium | ⭐ **Great choice!** |
| qwen3:1.7b | 1.7B | ~2GB | Good | Fast | Lightweight |
| qwen3:0.6b | 0.6B | ~1GB | Lower | Fastest | Lightest |
| qwen3-abliterated-erotic | ? | **23GB** ❌ | Good | Slow | Too heavy |

---

## Why Qwen3-8B is Good Choice / Tại sao Qwen3-8B là Lựa chọn Tốt

### ✅ Advantages / Ưu điểm

1. **Better Accuracy** - 8B parameters = more accurate classification
   - **Độ chính xác tốt hơn** - 8B parameters = classification chính xác hơn
   - Expected: **90-98% accuracy** (vs 85-95% for 1.7B)

2. **Long Context** - 32K tokens = can process full chapter at once
   - **Context dài** - 32K tokens = xử lý cả chapter cùng lúc
   - Better understanding of dialogue context
   - Hiểu context đối thoại tốt hơn

3. **Still Fits** - ~8GB VRAM leaves 9GB free
   - **Vẫn vừa** - ~8GB VRAM còn 9GB trống
   - Comfortable margin for TTS and system
   - Khoảng dư thoải mái cho TTS và system

4. **Good Balance** - Accuracy vs VRAM vs Speed
   - **Cân bằng tốt** - Độ chính xác vs VRAM vs Tốc độ

### ⚠️ Considerations / Xem xét

1. **Slower than 1.7B** - Medium speed (still acceptable)
   - **Chậm hơn 1.7B** - Tốc độ trung bình (vẫn chấp nhận được)
   - Per chapter: ~15-30 seconds

2. **Larger download** - Model file is bigger
   - **Tải xuống lớn hơn** - File model lớn hơn

---

## VRAM Usage Breakdown / Phân tích Sử dụng VRAM

### Scenario 1: Qwen3-8B + VietTTS

```
RTX 4090 (24GB)
├── VietTTS: ~7GB
├── Qwen3-8B (4-bit): ~8GB
├── System overhead: ~1GB
└── Free: ~8GB ✅ (Comfortable!)
```

**Status:** ✅ **Perfect fit!**

---

## Download & Setup / Tải xuống & Thiết lập

### Check Model Name / Kiểm tra Tên Model

The exact Ollama model name might vary. Check:
Tên model Ollama chính xác có thể khác. Kiểm tra:

```bash
# List available models
ollama list

# Try pulling (Ollama will suggest correct name if wrong)
ollama pull qwen3:8b
```

**Possible names:**
- `qwen3:8b`
- `qwen3:8b-instruct`
- `qwen:8b`

### Download Command / Lệnh Tải

```bash
# Download Qwen3-8B
ollama pull qwen3:8b

# Verify
ollama list
```

### Test Model / Test Model

```bash
# Test Vietnamese understanding
ollama run qwen3:8b "Xin chào, bạn có hiểu tiếng Việt không?"

# Test classification
ollama run qwen3:8b "Phân loại đoạn văn: 'Anh ấy nói: Xin chào.' Chỉ trả lời: narrator, male, hoặc female"
```

---

## Expected Performance / Hiệu suất Dự kiến

### Classification Speed / Tốc độ Classification

- **Per chapter:** ~15-30 seconds (depending on chapter length)
  - Single inference for full chapter (32K context)
  - Một lần inference cho cả chapter (32K context)
- **Per paragraph (batch):** ~1-2 seconds average

### Accuracy / Độ chính xác

- **Expected:** 90-98% accuracy for Vietnamese novel classification ✅
- **Độ chính xác dự kiến:** 90-98% cho classification tiểu thuyết tiếng Việt ✅
- Better than 1.7B due to larger model size
- Tốt hơn 1.7B do kích thước model lớn hơn

---

## Recommendation / Đề xuất

### ⭐ **Yes, Qwen3-8B is a Great Choice!**

**Reasons:**
1. ✅ **Better accuracy** - 8B parameters
2. ✅ **Fits comfortably** - ~8GB VRAM, leaves 9GB free
3. ✅ **Long context** - Process full chapter at once
4. ✅ **Good balance** - Best accuracy while still fitting

**If you want lighter:**
- `qwen3:1.7b` (2GB VRAM, slightly less accurate)

**If you want best accuracy:**
- `qwen3:8b` ✅ (8GB VRAM, best accuracy in this range)

---

## Next Steps / Bước Tiếp theo

1. ⏭️ **Download model:**
   ```bash
   ollama pull qwen3:8b
   ```

2. ⏭️ **Test with Vietnamese text**

3. ⏭️ **Verify VRAM usage (~8GB)**

4. ⏭️ **Proceed with role detection service setup**

