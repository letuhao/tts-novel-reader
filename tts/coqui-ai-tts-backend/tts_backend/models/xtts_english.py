"""
XTTS-v2 English TTS Wrapper
Wrapper cho Model XTTS-v2 tiếng Anh

This is a minimal wrapper that adapts Coqui TTS API to match
the interface expected by the service layer.
Đây là wrapper tối thiểu điều chỉnh API Coqui TTS để khớp
với interface mà service layer mong đợi.
"""
import sys
from pathlib import Path
from typing import Optional
import torch
import numpy as np

# Import Coqui TTS API
# Try installed package first (coqui-tts)
# Thử package đã cài đặt trước (coqui-tts)
try:
    from TTS.api import TTS
except ImportError:
    # If package not installed, try repository as fallback
    # Nếu package chưa cài đặt, thử repository làm dự phòng
    # File structure: tts/coqui-ai-tts-backend/tts_backend/models/xtts_english.py
    # Go up 5 levels to project root: models -> tts_backend -> coqui-ai-tts-backend -> tts -> novel-reader
    # Then: project_root/tts/coqui-ai-TTS
    PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent
    COQUI_TTS_REPO_PATH = PROJECT_ROOT / "tts" / "coqui-ai-TTS"
    
    if COQUI_TTS_REPO_PATH.exists():
        # Repository exists, add to path and try again
        # Repository tồn tại, thêm vào path và thử lại
        if str(COQUI_TTS_REPO_PATH) not in sys.path:
            sys.path.insert(0, str(COQUI_TTS_REPO_PATH))
        try:
            from TTS.api import TTS
        except ImportError:
            raise ImportError(
                f"Coqui TTS not found. Repository exists at {COQUI_TTS_REPO_PATH} but import failed.\n"
                f"Please install with: pip install coqui-tts\n"
                f"Hoặc cài đặt với: pip install coqui-tts"
            )
    else:
        raise ImportError(
            "Coqui TTS not found. Please install with: pip install coqui-tts\n"
            "Hoặc cài đặt với: pip install coqui-tts\n"
            f"Or ensure Coqui TTS repository exists at: {COQUI_TTS_REPO_PATH}"
        )

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
            device: Device to use (cuda/cpu) / Thiết bị sử dụng
            model_path: Optional path to local model directory / Đường dẫn tùy chọn đến thư mục model local
        """
        self.device = device if torch.cuda.is_available() else "cpu"
        self.sample_rate = 24000  # XTTS output sample rate
        
        # Get model path from config if not provided
        # Lấy đường dẫn model từ config nếu không được cung cấp
        if model_path is None:
            try:
                model_path = ModelConfig.XTTS_ENGLISH.get("model_path")
            except AttributeError:
                # Fallback to default path
                # Dự phòng về đường dẫn mặc định
                BASE_DIR = Path(__file__).parent.parent.parent.parent.parent
                model_path = str(BASE_DIR / "models" / "coqui-XTTS-v2")
        
        print(f"Loading XTTS-v2 English model on {self.device}...")
        print(f"Đang tải model XTTS-v2 tiếng Anh trên {self.device}...")
        print(f"Model path: {model_path}")
        print(f"Đường dẫn model: {model_path}")
        
        # Initialize Coqui TTS
        # If model_path is provided and exists, use it; otherwise use model name
        # Nếu model_path được cung cấp và tồn tại, sử dụng nó; nếu không dùng tên model
        model_path_obj = Path(model_path) if model_path else None
        
        if model_path_obj and model_path_obj.exists():
            # Load from local path
            # Tải từ đường dẫn local
            config_path = model_path_obj / "config.json"
            if config_path.exists():
                print(f"Loading from local path: {model_path}")
                print(f"Đang tải từ đường dẫn local: {model_path}")
                self.tts = TTS(
                    model_path=str(model_path_obj),
                    config_path=str(config_path),
                    progress_bar=True
                )
                # Move to device after initialization (new API)
                # Di chuyển đến thiết bị sau khi khởi tạo (API mới)
                if self.device == "cuda":
                    self.tts.to("cuda")
            else:
                # Config not found, use model name instead
                # Không tìm thấy config, dùng tên model thay thế
                print(f"⚠️  Config not found at {config_path}, using model name instead")
                print(f"⚠️  Không tìm thấy config tại {config_path}, sử dụng tên model thay thế")
                self.tts = TTS(
                    model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                    progress_bar=True
                )
                # Move to device after initialization (new API)
                # Di chuyển đến thiết bị sau khi khởi tạo (API mới)
                if self.device == "cuda":
                    self.tts.to("cuda")
        else:
            # Load by name (will download if needed)
            # Tải theo tên (sẽ tải xuống nếu cần)
            print("Loading XTTS-v2 by model name (will download if needed)...")
            print("Đang tải XTTS-v2 theo tên model (sẽ tải xuống nếu cần)...")
            self.tts = TTS(
                model_name="tts_models/multilingual/multi-dataset/xtts_v2",
                progress_bar=True
            )
            # Move to device after initialization (new API)
            # Di chuyển đến thiết bị sau khi khởi tạo (API mới)
            if self.device == "cuda":
                self.tts.to("cuda")
        
        print("✅ XTTS-v2 English model loaded")
        print("✅ Model XTTS-v2 tiếng Anh đã được tải")
    
    def synthesize(
        self,
        text: str,
        speaker_wav: Optional[str] = None,
        speaker: Optional[str] = None,
        language: str = "en",
        **kwargs
    ) -> np.ndarray:
        """
        Synthesize speech
        Tổng hợp giọng nói
        
        Args:
            text: Input text / Văn bản đầu vào
            speaker_wav: Path to reference audio for voice cloning (optional)
                        Đường dẫn audio tham chiếu cho nhân bản giọng nói (tùy chọn)
            speaker: Built-in speaker name (e.g., "Ana Florence") - used if speaker_wav not provided
                    Tên giọng có sẵn (ví dụ: "Ana Florence") - được sử dụng nếu speaker_wav không được cung cấp
            language: Language code (default: "en") / Mã ngôn ngữ (mặc định: "en")
            **kwargs: Additional parameters / Tham số bổ sung
            
        Returns:
            Audio array (numpy) / Mảng audio (numpy)
        """
        # XTTS-v2 requires either speaker_wav or speaker
        # If neither provided, use default built-in speaker
        # XTTS-v2 yêu cầu speaker_wav hoặc speaker
        # Nếu không có, sử dụng giọng có sẵn mặc định
        if not speaker_wav and not speaker:
            # Use first available speaker as default
            # Sử dụng giọng có sẵn đầu tiên làm mặc định
            if hasattr(self.tts, 'speakers') and self.tts.speakers:
                speaker = self.tts.speakers[0]
                print(f"Using default speaker: {speaker}")
                print(f"Sử dụng giọng mặc định: {speaker}")
            else:
                # Fallback to a known Coqui speaker name
                # Dự phòng về tên giọng Coqui đã biết
                speaker = "Claribel Dervla"
                print(f"Using fallback speaker: {speaker}")
                print(f"Sử dụng giọng dự phòng: {speaker}")
        
        # Call Coqui TTS API
        # Gọi API Coqui TTS
        wav = self.tts.tts(
            text=text,
            speaker_wav=speaker_wav,
            speaker=speaker,
            language=language,
            **kwargs
        )
        
        # Ensure it's a numpy array
        # Đảm bảo nó là numpy array
        if not isinstance(wav, np.ndarray):
            wav = np.array(wav)
        
        return wav
    
    def get_sample_rate(self) -> int:
        """
        Get sample rate
        Lấy tần số lấy mẫu
        """
        return self.sample_rate
    
    def list_languages(self):
        """
        List supported languages
        Liệt kê các ngôn ngữ được hỗ trợ
        """
        if hasattr(self.tts, 'languages') and self.tts.languages:
            return self.tts.languages
        # Default XTTS-v2 languages
        return [
            "en", "es", "fr", "de", "it", "pt", "pl", "tr", "ru", "nl",
            "cs", "ar", "zh-cn", "hu", "ko", "ja", "hi"
        ]

