# English TTS Models for Novel/Fiction Reading
# Mô hình TTS tiếng Anh cho đọc tiểu thuyết/tiểu thuyết

## 🎯 Overview / Tổng quan

This document provides recommendations for English TTS models that are:
- ✅ Suitable for long-form content (novels, fiction, audiobooks)
- ✅ Self-hostable
- ✅ Optimized for RTX 4090 (CUDA support)
- ✅ High quality, natural-sounding voices

Tài liệu này cung cấp các đề xuất cho mô hình TTS tiếng Anh:
- ✅ Phù hợp với nội dung dài (tiểu thuyết, tiểu thuyết, sách nói)
- ✅ Có thể tự lưu trữ
- ✅ Tối ưu cho RTX 4090 (hỗ trợ CUDA)
- ✅ Chất lượng cao, giọng nói tự nhiên

---

## 🏆 Top Recommendations / Đề xuất Hàng đầu

### 1. **XTTS-v2 (Coqui TTS)** ⭐ RECOMMENDED

**Why it's great:**
- ✅ **High quality**: Natural, expressive speech
- ✅ **Voice cloning**: Clone any voice with 3-6 seconds of reference audio
- ✅ **Multilingual**: Supports English + 16+ languages
- ✅ **Long-form optimized**: Handles long texts efficiently
- ✅ **GPU optimized**: Excellent CUDA support, works great on RTX 4090
- ✅ **Active development**: Well-maintained by Coqui AI
- ✅ **Community support**: Large community, good documentation

**Technical Details:**
- **Model Size**: ~1.7GB
- **VRAM Usage**: ~4-6GB (perfect for RTX 4090's 24GB)
- **Inference Speed**: ~1-2x real-time on RTX 4090
- **Sample Rate**: 22050 Hz (can be upsampled to 44100 Hz)
- **License**: Apache 2.0 (commercial use allowed)

**GitHub**: https://github.com/coqui-ai/TTS
**Hugging Face**: https://huggingface.co/coqui/XTTS-v2

**Installation:**
```bash
pip install TTS
```

**Quick Start:**
```python
from TTS.api import TTS

# Initialize XTTS-v2
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=True)

# Synthesize with voice cloning
tts.tts_to_file(
    text="Your novel text here...",
    speaker_wav="path/to/reference_voice.wav",
    language="en",
    file_path="output.wav"
)
```

**Pros:**
- Best balance of quality, speed, and features
- Voice cloning is excellent for character voices
- Well-documented and actively maintained
- Easy to integrate into existing backend

**Cons:**
- Requires reference audio for voice cloning (but has default voices too)
- Slightly slower than some alternatives

---

### 2. **StyleTTS2** ⭐ HIGH QUALITY

**Why it's great:**
- ✅ **Exceptional quality**: One of the best-sounding TTS models
- ✅ **Natural prosody**: Excellent intonation and rhythm
- ✅ **Voice cloning**: Clone voices with reference audio
- ✅ **GPU optimized**: Works well on RTX 4090
- ✅ **Long-form capable**: Handles long texts

**Technical Details:**
- **Model Size**: ~500MB
- **VRAM Usage**: ~3-5GB
- **Inference Speed**: ~0.5-1x real-time (slower than XTTS)
- **Sample Rate**: 24000 Hz
- **License**: MIT (commercial use allowed)

**GitHub**: https://github.com/yl4579/StyleTTS2

**Pros:**
- Highest quality output
- Very natural-sounding
- Good for audiobook narration

**Cons:**
- Slower inference speed
- Less active community than XTTS
- More complex setup

---

### 3. **Piper TTS** ⚡ FAST & LIGHTWEIGHT

**Why it's great:**
- ✅ **Very fast**: Real-time synthesis on CPU, even faster on GPU
- ✅ **Lightweight**: Small model size (~50-200MB per voice)
- ✅ **Multiple voices**: 100+ pre-trained English voices
- ✅ **Good quality**: Natural-sounding for its size
- ✅ **Easy integration**: Simple API

**Technical Details:**
- **Model Size**: ~50-200MB per voice
- **VRAM Usage**: ~1-2GB
- **Inference Speed**: ~10-20x real-time on RTX 4090
- **Sample Rate**: 22050 Hz
- **License**: MIT (commercial use allowed)

**GitHub**: https://github.com/rhasspy/piper
**Voice Samples**: https://rhasspy.github.io/piper-samples/

**Pros:**
- Extremely fast
- Low resource usage
- Many voice options
- Easy to use

**Cons:**
- Quality not as high as XTTS or StyleTTS2
- Less expressive than advanced models
- No voice cloning

---

### 4. **Tortoise-TTS** 🎭 EXPRESSIVE

**Why it's great:**
- ✅ **Highly expressive**: Great for character voices
- ✅ **Voice cloning**: Excellent voice cloning capabilities
- ✅ **Emotional control**: Can control emotion and style
- ✅ **High quality**: Very natural output

**Technical Details:**
- **Model Size**: ~2GB
- **VRAM Usage**: ~6-8GB
- **Inference Speed**: ~0.1-0.3x real-time (very slow)
- **Sample Rate**: 22050 Hz
- **License**: Apache 2.0

**GitHub**: https://github.com/neonbjb/tortoise-tts

**Pros:**
- Most expressive output
- Excellent for character voices
- Great voice cloning

**Cons:**
- Very slow (10-30 seconds per sentence)
- High VRAM usage
- Not ideal for long-form content due to speed

---

### 5. **Kitten-TTS-Server** 🐱 LIGHTWEIGHT SERVER

**Why it's great:**
- ✅ **Ultra-lightweight**: Model under 25MB
- ✅ **Server-ready**: Built as a web server
- ✅ **GPU acceleration**: ONNX runtime with GPU support
- ✅ **Long-form optimized**: Automatic text chunking
- ✅ **Web interface**: Built-in UI

**Technical Details:**
- **Model Size**: ~25MB
- **VRAM Usage**: ~1-2GB
- **Inference Speed**: ~5-10x real-time
- **Sample Rate**: 22050 Hz
- **License**: MIT

**GitHub**: https://github.com/devnen/Kitten-TTS-Server

**Pros:**
- Very lightweight
- Server-ready out of the box
- Good for quick setup

**Cons:**
- Lower quality than XTTS/StyleTTS2
- Limited voice options
- Less flexible than other options

---

## 🎯 Recommendation for Your Use Case / Đề xuất cho Trường hợp Sử dụng

### **Best Overall: XTTS-v2** ⭐

For a novel reader application with RTX 4090, **XTTS-v2** is the best choice because:

1. **Quality**: Excellent natural-sounding speech
2. **Speed**: Fast enough for real-time or near real-time synthesis
3. **Features**: Voice cloning allows different character voices
4. **Integration**: Easy to integrate into your existing TTS backend architecture
5. **Resources**: Perfect fit for RTX 4090 (uses ~4-6GB VRAM, leaving room for other tasks)
6. **Long-form**: Handles long texts efficiently
7. **Community**: Active development and good documentation

### **Alternative: StyleTTS2** (if quality is top priority)

If you prioritize absolute best quality over speed, StyleTTS2 is excellent but slower.

### **Alternative: Piper TTS** (if speed is critical)

If you need maximum speed and can accept slightly lower quality, Piper is great.

---

## 🔧 Integration Plan / Kế hoạch Tích hợp

### Step 1: Install XTTS-v2

```bash
# In your Python environment
pip install TTS
```

### Step 2: Create Wrapper (Similar to existing Dia/VieNeu wrappers)

Create `app/tts_backend/models/xtts_english.py`:

```python
"""
XTTS-v2 English TTS Wrapper
"""
from TTS.api import TTS
import torch
import numpy as np
from typing import Optional

class XTTSEnglishWrapper:
    """XTTS-v2 English TTS wrapper"""
    
    def __init__(self, device: str = "cuda"):
        self.device = device if torch.cuda.is_available() else "cpu"
        print(f"Loading XTTS-v2 English model on {self.device}...")
        
        # Initialize XTTS-v2
        self.tts = TTS(
            model_name="tts_models/multilingual/multi-dataset/xtts_v2",
            gpu=(self.device == "cuda")
        )
        
        print("✅ XTTS-v2 English model loaded")
    
    def synthesize(
        self,
        text: str,
        speaker_wav: Optional[str] = None,
        language: str = "en",
        **kwargs
    ) -> np.ndarray:
        """
        Synthesize speech
        
        Args:
            text: Input text
            speaker_wav: Path to reference audio for voice cloning (optional)
            language: Language code (default: "en")
            **kwargs: Additional parameters
            
        Returns:
            Audio array (numpy)
        """
        # Use default voice if no reference provided
        if speaker_wav is None:
            # XTTS has built-in voices, use default
            speaker_wav = None  # Will use default voice
        
        # Synthesize
        wav = self.tts.tts(
            text=text,
            speaker_wav=speaker_wav,
            language=language,
            **kwargs
        )
        
        return np.array(wav)
    
    def get_sample_rate(self) -> int:
        """Get sample rate"""
        return 22050  # XTTS default sample rate
```

### Step 3: Update Service

Add to `app/tts_backend/service.py`:

```python
ModelType = Literal["vieneu-tts", "dia", "xtts-english"]

def get_xtts_english(self):
    """Get or load XTTS English model"""
    if self.xtts_english is None:
        from .models.xtts_english import XTTSEnglishWrapper
        self.xtts_english = XTTSEnglishWrapper(device=self.device)
    return self.xtts_english

def synthesize(self, text: str, model: Optional[ModelType] = None, ...):
    # Add XTTS handling
    elif model == "xtts-english":
        xtts = self.get_xtts_english()
        return xtts.synthesize(text, **kwargs)
```

### Step 4: Update API

Add to `app/tts_backend/api.py`:

```python
model: Optional[Literal["vieneu-tts", "dia", "xtts-english"]] = "xtts-english"
speaker_wav: Optional[str] = None  # Reference audio for voice cloning
language: Optional[str] = "en"  # Language code
```

---

## 📊 Comparison Table / Bảng So sánh

| Model | Quality | Speed | VRAM | Voice Cloning | Long-form | Setup Difficulty |
|-------|---------|-------|------|---------------|-----------|------------------|
| **XTTS-v2** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 4-6GB | ✅ Yes | ✅ Excellent | ⭐ Easy |
| **StyleTTS2** | ⭐⭐⭐⭐⭐ | ⭐⭐ | 3-5GB | ✅ Yes | ✅ Good | ⭐⭐ Medium |
| **Piper TTS** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 1-2GB | ❌ No | ✅ Good | ⭐ Very Easy |
| **Tortoise-TTS** | ⭐⭐⭐⭐⭐ | ⭐ | 6-8GB | ✅ Yes | ⚠️ Slow | ⭐⭐⭐ Hard |
| **Kitten-TTS** | ⭐⭐⭐ | ⭐⭐⭐⭐ | 1-2GB | ❌ No | ✅ Good | ⭐ Easy |

---

## 🚀 Quick Start Guide / Hướng dẫn Bắt đầu Nhanh

### Option 1: XTTS-v2 (Recommended)

```bash
# 1. Install
pip install TTS

# 2. Test
python -c "from TTS.api import TTS; tts = TTS('tts_models/multilingual/multi-dataset/xtts_v2', gpu=True); tts.tts_to_file('Hello, this is a test of English TTS.', file_path='test.wav')"
```

### Option 2: Piper TTS (Fast & Simple)

```bash
# 1. Install
pip install piper-tts

# 2. Download voice model
# Visit: https://github.com/rhasspy/piper/releases

# 3. Test
piper --model en_US-lessac-medium --output_file test.wav --text "Hello, this is a test."
```

---

## 📝 Notes / Ghi chú

1. **RTX 4090**: All these models will work excellently on your RTX 4090 (24GB VRAM)
2. **Long-form**: XTTS-v2 and Piper handle long texts best
3. **Voice Cloning**: XTTS-v2 and StyleTTS2 support voice cloning for character voices
4. **Integration**: XTTS-v2 integrates easiest with your existing architecture
5. **License**: All recommended models allow commercial use

---

## 🔗 Resources / Tài nguyên

- **XTTS-v2**: https://github.com/coqui-ai/TTS
- **StyleTTS2**: https://github.com/yl4579/StyleTTS2
- **Piper TTS**: https://github.com/rhasspy/piper
- **Tortoise-TTS**: https://github.com/neonbjb/tortoise-tts
- **Kitten-TTS**: https://github.com/devnen/Kitten-TTS-Server

---

## 💡 Next Steps / Bước Tiếp theo

1. **Test XTTS-v2** locally to verify quality and speed
2. **Create wrapper** following the pattern of existing Dia/VieNeu wrappers
3. **Integrate into backend** by updating service.py and api.py
4. **Add voice cloning** support for character voices in novels
5. **Test with long-form content** to ensure performance

Would you like me to help implement the XTTS-v2 integration into your existing backend?

