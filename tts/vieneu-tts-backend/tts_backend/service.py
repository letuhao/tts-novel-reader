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
from .logging_utils import get_logger, PerformanceTracker

# Model types / Loại model
ModelType = Literal["vieneu-tts", "dia"]

class TTSService:
    """Unified TTS service / Dịch vụ TTS thống nhất"""
    
    def __init__(self, default_model: ModelType = "vieneu-tts", preload_default: bool = True):
        """
        Initialize TTS service / Khởi tạo dịch vụ TTS
        
        Args:
            default_model: Default model to use / Model mặc định sử dụng
            preload_default: Whether to preload default model at startup / Có tải trước model mặc định khi khởi động không
        """
        self.logger = get_logger("tts_backend.service")
        self.default_model = default_model
        self.vieneu_tts = None
        self.dia_tts = None
        self.dia_available = None  # Cache availability check
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.logger.info("Initializing TTS Service on %s (default model=%s)", self.device, default_model)
        
        # Preload default model at startup to avoid loading delay on first request
        # Tải trước model mặc định khi khởi động để tránh độ trễ tải ở request đầu tiên
        if preload_default:
            self.logger.info("Preloading default model: %s", default_model)
            if default_model == "dia":
                try:
                    self.get_dia_tts()  # Preload Dia model
                except (ImportError, ModuleNotFoundError) as e:
                    self.logger.warning("Dia TTS not available: %s - falling back to VieNeu-TTS", e)
                    self.default_model = "vieneu-tts"
            elif default_model == "vieneu-tts":
                # Preload VieNeu-TTS model (backbone and codec will be loaded to GPU)
                # Tải trước model VieNeu-TTS (backbone và codec sẽ được tải lên GPU)
                try:
                    vieneu_tts = self.get_vieneu_tts()  # Preload VieNeu-TTS model
                    self.logger.info("VieNeu-TTS model preloaded to %s", self.device)
                    
                    if self.device == "cuda":
                        self.logger.info("Warming up VieNeu-TTS model...")
                        vieneu_tts.warmup()
                except Exception as e:
                    self.logger.exception("Failed to preload VieNeu-TTS: %s", e)
            self.logger.info("Default model ready")
    
    def get_vieneu_tts(self):
        """Get or load VieNeu-TTS model / Lấy hoặc tải model VieNeu-TTS"""
        if self.vieneu_tts is None:
            self.logger.info("Loading VieNeu-TTS model")
            from .models.vieneu_tts import VieNeuTTSWrapper
            self.vieneu_tts = VieNeuTTSWrapper(device=self.device)
        return self.vieneu_tts
    
    def is_dia_available(self) -> bool:
        """Check if Dia TTS is available / Kiểm tra xem Dia TTS có khả dụng không"""
        if self.dia_available is None:
            try:
                from .models.dia_tts import DiaTTSWrapper
                self.dia_available = True
            except (ImportError, ModuleNotFoundError):
                self.dia_available = False
        return self.dia_available
    
    def get_dia_tts(self):
        """Get or load Dia TTS model / Lấy hoặc tải model Dia TTS"""
        if not self.is_dia_available():
            raise ImportError(
                "Dia TTS is not available. Install dependencies: "
                "descript-audio-codec>=1.0.0 transformers>=4.35.0 bitsandbytes>=0.39.0"
            )
        if self.dia_tts is None:
            self.logger.info("Loading Dia TTS model")
            from .models.dia_tts import DiaTTSWrapper
            self.dia_tts = DiaTTSWrapper(device=self.device)
        return self.dia_tts
    
    def synthesize(
        self,
        text: str,
        model: Optional[ModelType] = None,
        ref_audio_path: Optional[str] = None,
        ref_text: Optional[str] = None,
        request_id: Optional[str] = None,
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
        request_id = kwargs.pop("request_id", request_id)
        perf = PerformanceTracker(self.logger, request_id)
        perf.log("Starting synthesis", model=model, text_chars=len(text))
        
        if model == "vieneu-tts":
            if not ref_audio_path or not ref_text:
                raise ValueError("VieNeu-TTS requires ref_audio_path and ref_text")
            vieneu = self.get_vieneu_tts()
            max_chars = kwargs.get("max_chars", 256)
            auto_chunk = kwargs.get("auto_chunk", True)
            # Direct call - performance tracking is handled inside vieneu.synthesize()
            # Gọi trực tiếp - theo dõi hiệu suất được xử lý bên trong vieneu.synthesize()
            return vieneu.synthesize(
                text, 
                ref_audio_path, 
                ref_text, 
                max_chars=max_chars,
                auto_chunk=auto_chunk,
                request_id=request_id,
                **{k: v for k, v in kwargs.items() if k not in ["max_chars", "auto_chunk"]}
            )
        
        elif model == "dia":
            if not self.is_dia_available():
                raise ValueError(
                    "Dia TTS is not available. "
                    "Use 'vieneu-tts' model instead, or install Dia dependencies."
                )
            dia = self.get_dia_tts()
            with perf.stage("dia_synthesize"):
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
            if not self.is_dia_available():
                raise ValueError("Dia TTS is not available")
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
        # Default to "vieneu-tts" model (this is a VieNeu-TTS backend!)
        # Mặc định model "vieneu-tts" (đây là backend VieNeu-TTS!)
        # Dia is optional and will be used if available
        # Dia là tùy chọn và sẽ được sử dụng nếu có
        _service_instance = TTSService(default_model="vieneu-tts", preload_default=True)
    return _service_instance

