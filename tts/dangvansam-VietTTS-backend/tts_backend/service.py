"""
TTS Service - VietTTS backend service
Dịch vụ TTS - Dịch vụ backend VietTTS
"""
from typing import Optional, Literal, TYPE_CHECKING
import torch

if TYPE_CHECKING:
    from .models.viet_tts import VietTTSWrapper

from .config import ModelConfig

def detect_device() -> str:
    """
    Detect available device (cuda/cpu) / Phát hiện thiết bị có sẵn (cuda/cpu)
    
    Checks both PyTorch CUDA and ONNX Runtime CUDA provider.
    Kiểm tra cả PyTorch CUDA và ONNX Runtime CUDA provider.
    
    Returns:
        "cuda" if GPU is available, "cpu" otherwise
        "cuda" nếu GPU có sẵn, "cpu" nếu không
    """
    # Check PyTorch CUDA first (for main models)
    # Kiểm tra PyTorch CUDA trước (cho các model chính)
    if torch.cuda.is_available():
        return "cuda"
    
    # Check ONNX Runtime CUDA provider (for ONNX models)
    # Kiểm tra ONNX Runtime CUDA provider (cho các model ONNX)
    try:
        import onnxruntime
        providers = onnxruntime.get_available_providers()
        if "CUDAExecutionProvider" in providers:
            print("⚠️  PyTorch CUDA not available, but ONNX Runtime CUDA is available")
            print("⚠️  PyTorch CUDA không khả dụng, nhưng ONNX Runtime CUDA có sẵn")
            print("   PyTorch models will use CPU, ONNX models will use GPU")
            print("   Model PyTorch sẽ dùng CPU, model ONNX sẽ dùng GPU")
            # Still return "cuda" for ONNX parts, but note PyTorch limitation
            # Vẫn trả về "cuda" cho phần ONNX, nhưng lưu ý giới hạn PyTorch
            return "cuda"
    except ImportError:
        pass
    
    return "cpu"

# Model types / Loại model
ModelType = Literal["viet-tts"]

class TTSService:
    """Unified TTS service / Dịch vụ TTS thống nhất"""
    
    def __init__(self, default_model: ModelType = "viet-tts", preload_default: bool = True):
        """
        Initialize TTS service / Khởi tạo dịch vụ TTS
        
        Args:
            default_model: Default model to use / Model mặc định sử dụng
            preload_default: Whether to preload default model at startup / Có tải trước model mặc định khi khởi động không
        """
        self.default_model = default_model
        self.viet_tts = None
        self.device = detect_device()
        print(f"Initializing TTS Service on device: {self.device}")
        print(f"Khởi tạo Dịch vụ TTS trên thiết bị: {self.device}")
        
        # Show detailed device info
        # Hiển thị thông tin thiết bị chi tiết
        if torch.cuda.is_available():
            print(f"✅ PyTorch CUDA: Available (GPU: {torch.cuda.get_device_name(0)})")
            print(f"✅ PyTorch CUDA: Có sẵn (GPU: {torch.cuda.get_device_name(0)})")
        else:
            print("⚠️  PyTorch CUDA: Not available (CPU-only PyTorch)")
            print("⚠️  PyTorch CUDA: Không khả dụng (PyTorch chỉ CPU)")
        
        try:
            import onnxruntime
            providers = onnxruntime.get_available_providers()
            if "CUDAExecutionProvider" in providers:
                print(f"✅ ONNX Runtime CUDA: Available (Providers: {providers})")
                print(f"✅ ONNX Runtime CUDA: Có sẵn (Providers: {providers})")
            else:
                print(f"⚠️  ONNX Runtime CUDA: Not available (Providers: {providers})")
                print(f"⚠️  ONNX Runtime CUDA: Không khả dụng (Providers: {providers})")
        except ImportError:
            print("⚠️  ONNX Runtime: Not installed")
            print("⚠️  ONNX Runtime: Chưa được cài đặt")
        print(f"Default model: {default_model}")
        print(f"Model mặc định: {default_model}")
        
        # Preload default model at startup to avoid loading delay on first request
        # Tải trước model mặc định khi khởi động để tránh độ trễ tải ở request đầu tiên
        if preload_default:
            print(f"Preloading default model: {default_model}...")
            print(f"Đang tải trước model mặc định: {default_model}...")
            try:
                viet_tts = self.get_viet_tts()  # Preload VietTTS model
                print("✅ VietTTS model preloaded to GPU")
                print("✅ Model VietTTS đã được tải trước lên GPU")
                
                # Warmup model to prepare for fast inference
                # Làm nóng model để chuẩn bị cho inference nhanh
                if self.device == "cuda":
                    print("🔥 Warming up model (this may take 30-60 seconds)...")
                    print("🔥 Đang làm nóng model (có thể mất 30-60 giây)...")
                    viet_tts.warmup()
            except Exception as e:
                print(f"⚠️  Failed to preload VietTTS: {e}")
                print(f"⚠️  Không thể tải trước VietTTS: {e}")
                import traceback
                traceback.print_exc()
            print("✅ Default model ready")
            print("✅ Model mặc định đã sẵn sàng")
    
    def get_viet_tts(self):
        """Get or load VietTTS model / Lấy hoặc tải model VietTTS"""
        if self.viet_tts is None:
            print("Loading VietTTS model...")
            print("Đang tải model VietTTS...")
            from .models.viet_tts import VietTTSWrapper
            self.viet_tts = VietTTSWrapper(device=self.device)
        return self.viet_tts
    
    def synthesize(
        self,
        text: str,
        model: Optional[ModelType] = None,
        voice: Optional[str] = None,
        voice_file: Optional[str] = None,
        speed: float = 1.0,
        batch_chunks: Optional[int] = None,
        **kwargs
    ):
        """
        Synthesize speech using specified model / Tổng hợp giọng nói sử dụng model chỉ định
        
        Args:
            text: Input text / Văn bản đầu vào
            model: Model to use (viet-tts) / Model sử dụng
            voice: Voice name from built-in voices / Tên giọng từ giọng có sẵn
            voice_file: Path to custom voice file / Đường dẫn file giọng tùy chỉnh
            speed: Speech speed (0.5-2.0, default: 1.0) / Tốc độ giọng nói
            **kwargs: Additional model-specific parameters / Tham số bổ sung theo model
            
        Returns:
            Audio array / Mảng audio
        """
        model = model or self.default_model
        
        if model == "viet-tts":
            viet_tts = self.get_viet_tts()
            return viet_tts.synthesize(
                text=text,
                voice=voice,
                voice_file=voice_file,
                speed=speed,
                batch_chunks=batch_chunks,
                **kwargs
            )
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
        if model == "viet-tts":
            viet_tts = self.get_viet_tts()
            return {
                "model": "DangVanSam VietTTS",
                "sample_rate": viet_tts.get_sample_rate(),
                "device": viet_tts.device,
                "requires_reference": False,  # Uses built-in voices or voice files
                "available_voices": list(viet_tts.list_voices().keys())
            }
        else:
            raise ValueError(f"Unknown model: {model}")

# Global service instance / Instance dịch vụ toàn cục
_service_instance: Optional[TTSService] = None

def get_service() -> TTSService:
    """Get global TTS service instance / Lấy instance dịch vụ TTS toàn cục"""
    global _service_instance
    if _service_instance is None:
        _service_instance = TTSService(default_model="viet-tts", preload_default=True)
    return _service_instance

