"""
TTS Service - Unified TTS backend service
Dịch vụ TTS - Dịch vụ TTS backend thống nhất
"""
from typing import Optional, Literal, TYPE_CHECKING
import torch

if TYPE_CHECKING:
    from .models.vieneu_tts import VieNeuTTSWrapper
    from .models.dia_tts import DiaTTSWrapper

from .config import ModelConfig

# Model types / Loại model
ModelType = Literal["vieneu-tts", "dia"]

class TTSService:
    """Unified TTS service / Dịch vụ TTS thống nhất"""
    
    def __init__(self, default_model: ModelType = "vieneu-tts"):
        """
        Initialize TTS service / Khởi tạo dịch vụ TTS
        
        Args:
            default_model: Default model to use / Model mặc định sử dụng
        """
        self.default_model = default_model
        self.vieneu_tts = None
        self.dia_tts = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Initializing TTS Service on device: {self.device}")
        print(f"Khởi tạo Dịch vụ TTS trên thiết bị: {self.device}")
    
    def get_vieneu_tts(self):
        """Get or load VieNeu-TTS model / Lấy hoặc tải model VieNeu-TTS"""
        if self.vieneu_tts is None:
            print("Loading VieNeu-TTS model...")
            print("Đang tải model VieNeu-TTS...")
            from .models.vieneu_tts import VieNeuTTSWrapper
            self.vieneu_tts = VieNeuTTSWrapper(device=self.device)
        return self.vieneu_tts
    
    def get_dia_tts(self):
        """Get or load Dia TTS model / Lấy hoặc tải model Dia TTS"""
        if self.dia_tts is None:
            print("Loading Dia TTS model...")
            print("Đang tải model Dia TTS...")
            from .models.dia_tts import DiaTTSWrapper
            self.dia_tts = DiaTTSWrapper(device=self.device)
        return self.dia_tts
    
    def synthesize(
        self,
        text: str,
        model: Optional[ModelType] = None,
        ref_audio_path: Optional[str] = None,
        ref_text: Optional[str] = None,
        **kwargs
    ):
        """
        Synthesize speech using specified model / Tổng hợp giọng nói sử dụng model chỉ định
        
        Args:
            text: Input text / Văn bản đầu vào
            model: Model to use (vieneu-tts or dia) / Model sử dụng
            ref_audio_path: Reference audio path (for VieNeu-TTS) / Đường dẫn audio tham chiếu
            ref_text: Reference text (for VieNeu-TTS) / Văn bản tham chiếu
            **kwargs: Additional model-specific parameters / Tham số bổ sung theo model
            
        Returns:
            Audio array / Mảng audio
        """
        model = model or self.default_model
        
        if model == "vieneu-tts":
            if not ref_audio_path or not ref_text:
                raise ValueError("VieNeu-TTS requires ref_audio_path and ref_text")
            vieneu = self.get_vieneu_tts()
            return vieneu.synthesize(text, ref_audio_path, ref_text, **kwargs)
        
        elif model == "dia":
            dia = self.get_dia_tts()
            return dia.synthesize(text, **kwargs)
        
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
        if model == "vieneu-tts":
            vieneu = self.get_vieneu_tts()
            return {
                "model": "VieNeu-TTS",
                "sample_rate": vieneu.get_sample_rate(),
                "device": vieneu.device,
                "requires_reference": True
            }
        elif model == "dia":
            dia = self.get_dia_tts()
            return {
                "model": "Dia-Finetuning-Vietnamese",
                "sample_rate": dia.get_sample_rate(),
                "device": dia.device,
                "requires_reference": False
            }
        else:
            raise ValueError(f"Unknown model: {model}")

# Global service instance / Instance dịch vụ toàn cục
_service_instance: Optional[TTSService] = None

def get_service() -> TTSService:
    """Get global TTS service instance / Lấy instance dịch vụ TTS toàn cục"""
    global _service_instance
    if _service_instance is None:
        _service_instance = TTSService()
    return _service_instance

