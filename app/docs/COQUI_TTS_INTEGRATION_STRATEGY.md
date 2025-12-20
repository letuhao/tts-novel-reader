# Coqui TTS Integration Strategy
# Chiến lược Tích hợp Coqui TTS

## 🤔 Question / Câu hỏi

**Do we need a new wrapper for Coqui TTS or can we use `tts\coqui-ai-TTS` directly with minimal migration?**

**Chúng ta có cần tạo wrapper mới cho Coqui TTS hay có thể sử dụng `tts\coqui-ai-TTS` trực tiếp với migration tối thiểu?**

---

## 📊 Analysis / Phân tích

### Current Wrapper Pattern / Pattern Wrapper Hiện tại

Looking at existing wrappers (`VieNeuTTSWrapper`, `DiaTTSWrapper`), they all implement:

Nhìn vào các wrapper hiện tại (`VieNeuTTSWrapper`, `DiaTTSWrapper`), chúng đều implement:

1. **Required Interface / Interface Bắt buộc:**
   ```python
   class Wrapper:
       def __init__(self, device: str = "cuda")
       def synthesize(self, text: str, ...) -> np.ndarray
       def get_sample_rate(self) -> int
       @property device: str
   ```

2. **Service Layer Integration / Tích hợp Service Layer:**
   - Service expects consistent interface
   - Service gọi `wrapper.synthesize()` và `wrapper.get_sample_rate()`
   - Service quản lý device qua wrapper

3. **Path Management / Quản lý Đường dẫn:**
   - Wrappers handle model path resolution
   - Point to local model files
   - Handle repository paths

### Coqui TTS API / API Coqui TTS

Coqui TTS provides:
Coqui TTS cung cấp:

```python
from TTS.api import TTS

tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=True)
wav = tts.tts(text="...", speaker_wav="...", language="en")
```

**Key Differences / Khác biệt Chính:**
- ✅ Returns numpy array (matches)
- ✅ Has device management (`gpu` parameter)
- ❌ Different method signature (`tts()` vs `synthesize()`)
- ❌ No `get_sample_rate()` method
- ❌ No `device` attribute
- ❌ Model path handling is different

---

## ✅ Recommendation / Đề xuất

### **YES - Create a MINIMAL Wrapper** / **CÓ - Tạo Wrapper TỐI THIỂU**

**Why? / Tại sao?**

1. **Interface Consistency / Nhất quán Interface**
   - Service layer expects `synthesize()` method
   - Service layer expects `get_sample_rate()` method
   - Service layer expects `device` attribute

2. **Path Management / Quản lý Đường dẫn**
   - Need to point to local model: `models/coqui-XTTS-v2`
   - Need to handle model path resolution
   - Need to integrate with config system

3. **Integration / Tích hợp**
   - Follows existing pattern
   - Easy to add to service layer
   - Consistent with other models

4. **But MUCH Simpler / Nhưng ĐƠN GIẢN Hơn nhiều**
   - No complex patches needed (unlike VietTTS)
   - No complex path management (unlike VietTTS)
   - Just wrap the TTS class and match interface

---

## 📝 Minimal Wrapper Implementation / Triển khai Wrapper Tối thiểu

### Simple Wrapper / Wrapper Đơn giản

```python
# app/tts_backend/models/xtts_english.py
"""
XTTS-v2 English TTS Wrapper
Wrapper cho Model XTTS-v2 tiếng Anh
"""
from pathlib import Path
from typing import Optional
import torch
import numpy as np

# Import Coqui TTS API
from TTS.api import TTS

from ..config import ModelConfig


class XTTSEnglishWrapper:
    """
    Wrapper for XTTS-v2 English TTS model
    Wrapper cho model XTTS-v2 tiếng Anh
    
    This is a minimal wrapper that adapts Coqui TTS API to match
    the interface expected by the service layer.
    Đây là wrapper tối thiểu điều chỉnh API Coqui TTS để khớp
    với interface mà service layer mong đợi.
    """
    
    def __init__(self, device: str = "cuda", model_path: Optional[str] = None):
        """
        Initialize XTTS-v2 model
        Khởi tạo model XTTS-v2
        
        Args:
            device: Device to use (cuda/cpu)
            model_path: Optional path to local model directory
        """
        self.device = device if torch.cuda.is_available() else "cpu"
        self.sample_rate = 24000  # XTTS output sample rate
        
        # Get model path from config if not provided
        if model_path is None:
            from ..config import ModelConfig
            model_path = ModelConfig.XTTS_ENGLISH.get("model_path")
        
        print(f"Loading XTTS-v2 English model on {self.device}...")
        print(f"Đang tải model XTTS-v2 tiếng Anh trên {self.device}...")
        
        # Initialize Coqui TTS
        # If model_path is provided, use it; otherwise use model name
        if model_path and Path(model_path).exists():
            # Load from local path
            self.tts = TTS(
                model_path=model_path,
                config_path=str(Path(model_path) / "config.json"),
                gpu=(self.device == "cuda")
            )
        else:
            # Load by name (will download if needed)
            self.tts = TTS(
                model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                gpu=(self.device == "cuda")
            )
        
        print("✅ XTTS-v2 English model loaded")
        print("✅ Model XTTS-v2 tiếng Anh đã được tải")
    
    def synthesize(
        self,
        text: str,
        speaker_wav: Optional[str] = None,
        language: str = "en",
        **kwargs
    ) -> np.ndarray:
        """
        Synthesize speech
        Tổng hợp giọng nói
        
        Args:
            text: Input text
            speaker_wav: Path to reference audio for voice cloning (optional)
            language: Language code (default: "en")
            **kwargs: Additional parameters
            
        Returns:
            Audio array (numpy)
        """
        # Call Coqui TTS API
        wav = self.tts.tts(
            text=text,
            speaker_wav=speaker_wav,
            language=language,
            **kwargs
        )
        
        # Ensure it's a numpy array
        if not isinstance(wav, np.ndarray):
            wav = np.array(wav)
        
        return wav
    
    def get_sample_rate(self) -> int:
        """Get sample rate / Lấy tần số lấy mẫu"""
        return self.sample_rate
```

### Why This is Minimal / Tại sao Đây là Tối thiểu

✅ **Simple / Đơn giản:**
- ~60 lines of code
- Just wraps the TTS class
- Matches required interface

✅ **No Complex Patches / Không có Patch Phức tạp:**
- Coqui TTS API is clean
- No need for compatibility fixes
- No need for path manipulation

✅ **Easy Integration / Dễ Tích hợp:**
- Follows existing pattern
- Easy to add to service layer
- Consistent with other wrappers

---

## 🔄 Alternative: Direct Usage (NOT Recommended) / Cách khác: Sử dụng Trực tiếp (KHÔNG Đề xuất)

### Why NOT Direct Usage? / Tại sao KHÔNG Sử dụng Trực tiếp?

❌ **Interface Mismatch / Không khớp Interface:**
- Service expects `synthesize()` but Coqui has `tts()`
- Service expects `get_sample_rate()` but Coqui doesn't have it
- Service expects `device` attribute but Coqui uses `gpu` parameter

❌ **Path Management / Quản lý Đường dẫn:**
- Would need to modify service layer
- Would break consistency with other models
- Would require more changes

❌ **More Complex / Phức tạp hơn:**
- Would need to modify service.py
- Would need to modify api.py
- Would break existing patterns

---

## 📋 Integration Steps / Các Bước Tích hợp

### Step 1: Create Minimal Wrapper / Bước 1: Tạo Wrapper Tối thiểu

1. Create `app/tts_backend/models/xtts_english.py`
2. Implement minimal wrapper (as shown above)
3. Add to `app/tts_backend/models/__init__.py`

### Step 2: Update Config / Bước 2: Cập nhật Config

```python
# app/tts_backend/config.py
XTTS_ENGLISH_MODEL_PATH = MODELS_DIR / "coqui-XTTS-v2"

class ModelConfig:
    XTTS_ENGLISH = {
        "model_path": str(XTTS_ENGLISH_MODEL_PATH),
        "sample_rate": 24000,
        "device": DEVICE,
    }
```

### Step 3: Update Service / Bước 3: Cập nhật Service

```python
# app/tts_backend/service.py
ModelType = Literal["vieneu-tts", "dia", "xtts-english"]

def get_xtts_english(self):
    if self.xtts_english is None:
        from .models.xtts_english import XTTSEnglishWrapper
        self.xtts_english = XTTSEnglishWrapper(device=self.device)
    return self.xtts_english

def synthesize(self, text: str, model: Optional[ModelType] = None, ...):
    # Add XTTS handling
    elif model == "xtts-english":
        xtts = self.get_xtts_english()
        return xtts.synthesize(text, speaker_wav=speaker_wav, language=language, **kwargs)
```

### Step 4: Update API / Bước 4: Cập nhật API

```python
# app/tts_backend/api.py
model: Optional[Literal["vieneu-tts", "dia", "xtts-english"]] = "xtts-english"
speaker_wav: Optional[str] = None
language: Optional[str] = "en"
```

---

## 🎯 Summary / Tóm tắt

### Answer / Câu trả lời

**✅ YES - Create a MINIMAL wrapper** (not a complex one like VietTTS)

**✅ CÓ - Tạo wrapper TỐI THIỂU** (không phức tạp như VietTTS)

### Why? / Tại sao?

1. **Interface Consistency** - Match existing pattern
2. **Easy Integration** - Follows existing structure
3. **Minimal Code** - ~60 lines, very simple
4. **No Complex Patches** - Coqui TTS API is clean

### What Makes It Minimal? / Điều gì Làm cho Nó Tối thiểu?

- ✅ Just wraps `TTS` class
- ✅ Matches required interface
- ✅ No complex patches
- ✅ No complex path management
- ✅ ~60 lines of code

### Comparison / So sánh

| Aspect | VietTTS Wrapper | XTTS Wrapper |
|--------|----------------|--------------|
| Lines of Code | ~600+ | ~60 |
| Complex Patches | ✅ Yes | ❌ No |
| Path Management | ✅ Complex | ✅ Simple |
| Compatibility Fixes | ✅ Many | ❌ None |
| Complexity | ⭐⭐⭐⭐⭐ | ⭐ |

---

**Conclusion:** Create a minimal wrapper (~60 lines) that just adapts the Coqui TTS API to match your service layer interface. This is much simpler than the VietTTS wrapper and follows the same pattern.

**Kết luận:** Tạo wrapper tối thiểu (~60 dòng) chỉ điều chỉnh API Coqui TTS để khớp với interface của service layer. Điều này đơn giản hơn nhiều so với wrapper VietTTS và tuân theo cùng pattern.

