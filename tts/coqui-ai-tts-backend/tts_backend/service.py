"""
TTS Service - XTTS-v2 English TTS backend service
Dịch vụ TTS - Dịch vụ TTS backend XTTS-v2 tiếng Anh
"""
from typing import Optional, Literal, TYPE_CHECKING
import torch

if TYPE_CHECKING:
    from .models.xtts_english import XTTSEnglishWrapper

from .config import ModelConfig

# Model types / Loại model
ModelType = Literal["xtts-english"]

class TTSService:
    """XTTS-v2 English TTS service / Dịch vụ TTS XTTS-v2 tiếng Anh"""
    
    def __init__(self, default_model: ModelType = "xtts-english", preload_default: bool = True):
        """
        Initialize TTS service / Khởi tạo dịch vụ TTS
        
        Args:
            default_model: Default model to use / Model mặc định sử dụng
            preload_default: Whether to preload default model at startup / Có tải trước model mặc định khi khởi động không
        """
        self.default_model = default_model
        self.xtts_english = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Initializing TTS Service on {self.device} (default model={default_model})")
        print(f"Đang khởi tạo Dịch vụ TTS trên {self.device} (model mặc định={default_model})")
        
        # Preload default model at startup to avoid loading delay on first request
        # Tải trước model mặc định khi khởi động để tránh độ trễ tải ở request đầu tiên
        if preload_default:
            print(f"Preloading default model: {default_model}")
            print(f"Đang tải trước model mặc định: {default_model}")
            if default_model == "xtts-english":
                try:
                    self.get_xtts_english()  # Preload XTTS English model
                    print("✅ XTTS English model preloaded")
                    print("✅ Model XTTS tiếng Anh đã được tải trước")
                except Exception as e:
                    print(f"⚠️  Failed to preload XTTS English: {e}")
                    print(f"⚠️  Không thể tải trước XTTS tiếng Anh: {e}")
            print("✅ Default model ready")
            print("✅ Model mặc định sẵn sàng")
    
    def get_xtts_english(self):
        """Get or load XTTS English model / Lấy hoặc tải model XTTS tiếng Anh"""
        if self.xtts_english is None:
            print("Loading XTTS English model...")
            print("Đang tải model XTTS tiếng Anh...")
            from .models.xtts_english import XTTSEnglishWrapper
            self.xtts_english = XTTSEnglishWrapper(device=self.device)
        return self.xtts_english
    
    def synthesize(
        self,
        text: str,
        model: Optional[ModelType] = None,
        speaker_wav: Optional[str] = None,
        speaker: Optional[str] = None,
        language: Optional[str] = None,
        **kwargs
    ):
        """
        Synthesize speech using specified model / Tổng hợp giọng nói sử dụng model chỉ định
        
        Args:
            text: Input text / Văn bản đầu vào
            model: Model to use (xtts-english) / Model sử dụng
            speaker_wav: Reference audio path for voice cloning (optional)
                        Đường dẫn audio tham chiếu cho nhân bản giọng nói (tùy chọn)
            speaker: Built-in speaker name (optional, used if speaker_wav not provided)
                    Tên giọng có sẵn (tùy chọn, được sử dụng nếu speaker_wav không được cung cấp)
            language: Language code (default: "en") / Mã ngôn ngữ (mặc định: "en")
            **kwargs: Additional model-specific parameters / Tham số bổ sung theo model
            
        Returns:
            Audio array / Mảng audio
        """
        model = model or self.default_model
        
        if model == "xtts-english":
            xtts = self.get_xtts_english()
            lang = language or "en"
            return xtts.synthesize(text, speaker_wav=speaker_wav, speaker=speaker, language=lang, **kwargs)
        else:
            raise ValueError(f"Unknown model: {model}")
    
    def get_model_info(self, model: ModelType) -> dict:
        """
        Get model information / Lấy thông tin model
        
        Args:
            model: Model type / Loại model
            
        Returns:
            Model information dictionary / Từ điển thông tin model
        """
        if model == "xtts-english":
            xtts = self.get_xtts_english()
            return {
                "model": "XTTS-v2 English",
                "sample_rate": xtts.get_sample_rate(),
                "device": xtts.device,
                "requires_reference": False,  # Optional, but recommended for voice cloning
                "languages": xtts.list_languages()
            }
        else:
            raise ValueError(f"Unknown model: {model}")

# Global service instance / Instance dịch vụ toàn cục
_service_instance: Optional[TTSService] = None

def get_service() -> TTSService:
    """Get global TTS service instance / Lấy instance dịch vụ TTS toàn cục"""
    global _service_instance
    if _service_instance is None:
        _service_instance = TTSService(default_model="xtts-english", preload_default=True)
    return _service_instance

