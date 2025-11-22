# Dia-Finetuning-Vietnamese Review / Đánh giá Dia-Finetuning-Vietnamese

## 📋 Overview / Tổng quan

**Repository:** https://github.com/TuananhCR/Dia-Finetuning-Vietnamese  
**Model:** https://huggingface.co/cosrigel/dia-finetuning-vnese  
**Demo:** https://huggingface.co/spaces/cosrigel/Dia-Vietnamese

**Base Model:** nari-labs/Dia-1.6B (1.6 billion parameters)  
**Fine-tuned on:** capleaf/viVoice dataset (1,016.97 hours of Vietnamese speech)  
**Output Quality:** 44.1 kHz (higher than VieNeu-TTS's 24 kHz)

## ✨ Key Features / Tính năng chính

### ✅ Advantages / Ưu điểm

1. **High Quality / Chất lượng cao:**
   - 44.1 kHz output (vs 24 kHz for VieNeu-TTS)
   - Fine-tuned on 1,000+ hours of Vietnamese data
   - Natural Vietnamese speech generation

2. **Multi-Speaker Support / Hỗ trợ đa giọng:**
   - **North-male** / Giọng nam miền Bắc
   - **South-male** / Giọng nam miền Nam
   - **North-female** / Giọng nữ miền Bắc
   - **South-female** / Giọng nữ miền Nam

3. **GPU Optimized / Tối ưu GPU:**
   - Uses `torch.compile` for speed
   - `bfloat16` precision
   - 8-bit optimizer
   - **Requires GPU (CPU is very slow)** / **Cần GPU (CPU rất chậm)**

4. **Controllable Parameters / Tham số có thể điều chỉnh:**
   - `temperature` - Control randomness
   - `top_p` - Nucleus sampling
   - `cfg_scale` - Classifier-free guidance scale

5. **User-Friendly / Thân thiện người dùng:**
   - Gradio inference interface included
   - Local deployment (`app_local.py`)
   - CLI interface (`cli.py`)

### ⚠️ Requirements / Yêu cầu

- **Storage:** 150GB free space
- **RAM:** 16GB minimum
- **GPU:** Required (NVIDIA GPU recommended)
  - CPU is very slow (not recommended)
  - MPS (Apple Silicon) supported but slower
- **Python:** Compatible versions (not specified, but likely 3.8+)

### 📊 Performance / Hiệu năng

**Benchmark on RTX A6000:**
- **1,000 words: ~79 seconds** using CUDA
- Much faster than CPU inference

**Your RTX 4090 should be even faster!**  
**RTX 4090 của bạn sẽ còn nhanh hơn!**

## 🔧 Installation Steps / Các bước cài đặt

### Step 1: Clone and Setup / Bước 1: Clone và thiết lập

```bash
git clone https://github.com/TuananhCR/Dia-Finetuning-Vietnamese
cd Dia-Finetuning-Vietnamese
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate.ps1 on Windows
pip install -e .
```

### Step 2: Hugging Face Login / Bước 2: Đăng nhập Hugging Face

1. **Create Hugging Face account** (if needed)
   - Sign up at: https://huggingface.co/join

2. **Request access to model:**
   - Visit: https://huggingface.co/cosrigel/dia-finetuning-vnese
   - Agree to share contact information to access the model

3. **Create Access Token:**
   - Go to: https://huggingface.co/settings/tokens
   - Create a new token (read access is enough)
   - **Copy and save it** (format: `hf_XXXXXXXXX`)

### Step 3: Download Model / Bước 3: Tải model

```bash
# Install Hugging Face CLI
python -m pip install -U "huggingface_hub[cli]"

# Login with your token
huggingface-cli login --token <YOUR_TOKEN_HERE> --add-to-git-credential

# Download model (this will download to ./dia folder)
python -c 'from huggingface_hub import snapshot_download; snapshot_download("cosrigel/dia-finetuning-vnese", local_dir="dia", repo_type="model")'
```

### Step 4: Run Inference / Bước 4: Chạy inference

```bash
# Run Gradio interface
python app_local.py

# Or specify device
python app_local.py --device cuda  # for GPU
python app_local.py --device cpu   # for CPU (slow!)
```

## 📝 Usage / Sử dụng

### Text Format / Định dạng văn bản

**Single Speaker:**
```
[01] Your Vietnamese text here
```

**Multi-Speaker:**
```
[01] First speaker text. [02] Second speaker text.
```

**With Speaker Tags:**
```
[KienThucQuanSu] Thủ tướng cũng yêu cầu các Bộ...
[CoBaBinhDuong] Kiểm tra việc sắp xếp, xử lý...
```

- Speaker IDs are available in the Gradio interface speaker table
- For multi-speaker, change speaker after the dot (`.`) in text

### Example Code / Ví dụ code

```python
from dia import DiaModel  # Assuming this is how it's imported

# Initialize model
model = DiaModel.from_pretrained("./dia")

# Generate speech
text = "[01] Xin chào, đây là một ví dụ về tổng hợp giọng nói tiếng Việt."
audio = model.generate(text)
```

## 🆚 Comparison with VieNeu-TTS / So sánh với VieNeu-TTS

| Feature | VieNeu-TTS | Dia-Finetuning-Vietnamese |
|---------|------------|---------------------------|
| **Sample Rate** | 24 kHz | **44.1 kHz** ⭐ |
| **Model Size** | ~0.6B params | **1.6B params** |
| **Training Data** | 1000 hours | 1,017 hours |
| **GPU Required** | No (but slow on CPU) | **Yes (CPU very slow)** |
| **Multi-Speaker** | Yes (6 voices) | **Yes (4 accents)** |
| **Voice Cloning** | ✅ Instant | ⚠️ Fine-tune required |
| **GPU Optimization** | Basic | **Advanced** ⭐ |
| **Setup Complexity** | Easy | Moderate (needs HF login) |
| **Inference Speed (GPU)** | ~1s | ~0.08s per 1000 chars ⭐ |

## 💡 Recommendations / Khuyến nghị

### ✅ Best For / Phù hợp cho:

1. **High-quality Vietnamese TTS** / TTS tiếng Việt chất lượng cao
2. **Multi-speaker applications** / Ứng dụng đa giọng
3. **Applications with GPU available** / Ứng dụng có GPU
4. **Production use** / Sử dụng sản xuất

### ⚠️ Considerations / Cân nhắc:

1. **GPU Required:** Won't work well on CPU (too slow)
2. **Larger Model:** 1.6B vs 0.6B (more VRAM needed)
3. **Setup:** Requires Hugging Face access token
4. **Storage:** Needs 150GB (model is large)

## 🚀 Quick Start for Your System / Bắt đầu nhanh cho hệ thống của bạn

With your **RTX 4090**, this should work excellently!  
Với **RTX 4090** của bạn, điều này sẽ hoạt động tuyệt vời!

### Estimated Performance on RTX 4090 / Hiệu năng ước tính trên RTX 4090

- **Faster than RTX A6000** (which got 79s for 1000 words)
- **Real-time or faster** for short texts
- **Much better than CPU** (which is very slow)

---

## 📚 Additional Resources / Tài nguyên bổ sung

- **GitHub:** https://github.com/TuananhCR/Dia-Finetuning-Vietnamese
- **Hugging Face Model:** https://huggingface.co/cosrigel/dia-finetuning-vnese
- **Demo:** https://huggingface.co/spaces/cosrigel/Dia-Vietnamese
- **Base Model:** https://huggingface.co/nari-labs/Dia-1.6B

---

## ⏳ Waiting for Your Command / Đang chờ lệnh của bạn

Ready to proceed when you give the command!  
Sẵn sàng tiến hành khi bạn đưa ra lệnh!

**What would you like to do next?**
- Install and setup Dia-Finetuning-Vietnamese?
- Compare it with VieNeu-TTS?
- Test performance?
- Something else?

