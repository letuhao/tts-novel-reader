"""
TTS Service - VietTTS backend service
Dịch vụ TTS - Dịch vụ backend VietTTS
"""
from typing import Optional, Literal, TYPE_CHECKING
import torch
import asyncio
import threading
import queue
import contextlib
import time
from datetime import datetime

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

class ModelPool:
    """Model Pool for concurrent inference / Pool Model cho inference đồng thời"""
    
    def __init__(self, pool_size: int = 2, device: str = "cuda"):
        """
        Initialize model pool / Khởi tạo pool model
        
        Args:
            pool_size: Number of model instances in pool / Số lượng instance model trong pool
            device: Device to use (cuda/cpu) / Thiết bị sử dụng
        """
        self.pool_size = pool_size
        self.device = device
        self.pool = queue.Queue(maxsize=pool_size)
        self._lock = threading.Lock()
        self._initialized = False
        
    def _initialize_pool(self):
        """Initialize model instances in pool / Khởi tạo các instance model trong pool"""
        if self._initialized:
            return
            
        with self._lock:
            if self._initialized:
                return
                
            print(f"🔄 Creating Model Pool with {self.pool_size} instances...")
            print(f"🔄 Đang tạo Model Pool với {self.pool_size} instances...")
            
            for i in range(self.pool_size):
                print(f"   Loading model instance {i+1}/{self.pool_size}...")
                print(f"   Đang tải model instance {i+1}/{self.pool_size}...")
                from .models.viet_tts import VietTTSWrapper
                model = VietTTSWrapper(device=self.device)
                
                # Warmup if CUDA
                if self.device == "cuda":
                    print(f"   Warming up instance {i+1}/{self.pool_size}...")
                    print(f"   Đang làm nóng instance {i+1}/{self.pool_size}...")
                    try:
                        model.warmup()
                    except Exception as e:
                        print(f"   ⚠️  Warmup failed for instance {i+1} (non-critical): {e}")
                
                self.pool.put(model)
                print(f"   ✅ Instance {i+1}/{self.pool_size} ready")
                print(f"   ✅ Instance {i+1}/{self.pool_size} sẵn sàng")
            
            self._initialized = True
            print(f"✅ Model Pool initialized with {self.pool_size} instances")
            print(f"✅ Model Pool đã được khởi tạo với {self.pool_size} instances")
    
    @contextlib.contextmanager
    def get_model(self):
        """
        Get a model from pool (context manager) / Lấy một model từ pool (context manager)
        
        Usage / Cách dùng:
            with pool.get_model() as model:
                result = model.synthesize(...)
        """
        self._initialize_pool()  # Initialize on first use / Khởi tạo khi dùng lần đầu
        
        # Get model from pool (blocks if pool is empty)
        # Lấy model từ pool (block nếu pool trống)
        model = self.pool.get()
        
        try:
            yield model
        finally:
            # Return model to pool
            # Trả model về pool
            self.pool.put(model)
    
    def get_pool_size(self) -> int:
        """Get pool size / Lấy kích thước pool"""
        return self.pool_size


class TTSService:
    """Unified TTS service / Dịch vụ TTS thống nhất"""
    
    def __init__(self, default_model: ModelType = "viet-tts", preload_default: bool = True, use_model_pool: bool = False, model_pool_size: int = 2):
        """
        Initialize TTS service / Khởi tạo dịch vụ TTS
        
        Args:
            default_model: Default model to use / Model mặc định sử dụng
            preload_default: Whether to preload default model at startup / Có tải trước model mặc định khi khởi động không
            use_model_pool: Use model pool for concurrent inference / Sử dụng model pool cho inference đồng thời
            model_pool_size: Number of model instances in pool / Số lượng instance model trong pool
        """
        self.default_model = default_model
        self.viet_tts = None
        self.device = detect_device()
        self.use_model_pool = use_model_pool and self.device == "cuda"  # Only use pool for GPU
        self.model_pool_size = model_pool_size
        
        # Model pool for concurrent inference / Pool model cho inference đồng thời
        if self.use_model_pool:
            self.model_pool = ModelPool(pool_size=model_pool_size, device=self.device)
            print(f"✅ Using Model Pool with {model_pool_size} instances for concurrent inference")
            print(f"✅ Sử dụng Model Pool với {model_pool_size} instances cho inference đồng thời")
        else:
            self.model_pool = None
            # Thread lock for single model instance (fallback)
            # Khóa thread cho instance model đơn (dự phòng)
            self._inference_lock = threading.Lock()
            print(f"⚠️  Using single model instance with lock (sequential processing)")
            print(f"⚠️  Sử dụng instance model đơn với lock (xử lý tuần tự)")
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
            # Safely check for available providers (handle partially uninstalled modules)
            # Kiểm tra providers có sẵn một cách an toàn (xử lý module bị gỡ một phần)
            if hasattr(onnxruntime, 'get_available_providers'):
                providers = onnxruntime.get_available_providers()
                if "CUDAExecutionProvider" in providers:
                    print(f"✅ ONNX Runtime CUDA: Available (Providers: {providers})")
                    print(f"✅ ONNX Runtime CUDA: Có sẵn (Providers: {providers})")
                else:
                    print(f"⚠️  ONNX Runtime CUDA: Not available (Providers: {providers})")
                    print(f"⚠️  ONNX Runtime CUDA: Không khả dụng (Providers: {providers})")
            else:
                print("⚠️  ONNX Runtime: Module corrupted or incomplete (missing get_available_providers)")
                print("⚠️  ONNX Runtime: Module bị hỏng hoặc không đầy đủ (thiếu get_available_providers)")
                print("   Please reinstall: pip install onnxruntime-gpu")
                print("   Vui lòng cài đặt lại: pip install onnxruntime-gpu")
        except ImportError:
            print("⚠️  ONNX Runtime: Not installed")
            print("⚠️  ONNX Runtime: Chưa được cài đặt")
        except Exception as e:
            print(f"⚠️  ONNX Runtime: Error checking providers: {e}")
            print(f"⚠️  ONNX Runtime: Lỗi kiểm tra providers: {e}")
        print(f"Default model: {default_model}")
        print(f"Model mặc định: {default_model}")
        
        # Preload default model at startup with warmup to eliminate 10s setup delay per request
        # Tải trước model mặc định khi khởi động với warmup để loại bỏ độ trễ setup 10s mỗi request
        if preload_default and not self.use_model_pool:
            print(f"Preloading default model: {default_model}...")
            print(f"Đang tải trước model mặc định: {default_model}...")
            try:
                viet_tts = self.get_viet_tts()  # Preload VietTTS model
                print("✅ VietTTS model preloaded to GPU")
                print("✅ Model VietTTS đã được tải trước lên GPU")
                
                # Warmup to compile CUDA kernels once (eliminates 10s setup delay on each request)
                # Warmup để compile CUDA kernels một lần (loại bỏ độ trễ setup 10s ở mỗi request)
                if self.device == "cuda":
                    print("🔥 Warming up model (compiling CUDA kernels - eliminates 10s setup delay)...")
                    print("🔥 Đang làm nóng model (compile CUDA kernels - loại bỏ độ trễ setup 10s)...")
                    viet_tts.warmup(voice_name="quynh")  # Use default voice for warmup
            except Exception as e:
                print(f"⚠️  Failed to preload VietTTS: {e}")
                print(f"⚠️  Không thể tải trước VietTTS: {e}")
                import traceback
                traceback.print_exc()
            print("✅ Default model ready (warmed up, CUDA kernels compiled)")
            print("✅ Model mặc định đã sẵn sàng (đã warmup, CUDA kernels đã compile)")
        elif self.use_model_pool:
            print(f"ℹ️  Model Pool will initialize lazily on first request (faster startup)")
            print(f"ℹ️  Model Pool sẽ khởi tạo lazy ở request đầu tiên (khởi động nhanh hơn)")
    
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
        
        NOTE: This method supports concurrent inference via Model Pool (if enabled).
        LƯU Ý: Method này hỗ trợ inference đồng thời qua Model Pool (nếu được bật).
        
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
        
        if model != "viet-tts":
            raise ValueError(f"Unknown model: {model}")
        
        service_start = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [Service] Starting synthesize - Model: {model}, Voice: {voice or voice_file or 'default'}")
        print(f"[{timestamp}] [Service] Bắt đầu synthesize - Model: {model}, Giọng: {voice or voice_file or 'default'}")
        
        # Get model instance
        get_model_start = time.time()
        viet_tts = self.get_viet_tts()
        get_model_duration = time.time() - get_model_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [Service] Get model instance: {get_model_duration*1000:.2f}ms")
        print(f"[{timestamp}] [Service] Lấy instance model: {get_model_duration*1000:.2f}ms")
        
        # Call synthesize
        synthesize_start = time.time()
        result = viet_tts.synthesize(
            text=text,
            voice=voice,
            voice_file=voice_file,
            speed=speed,
            batch_chunks=batch_chunks,
            **kwargs
        )
        synthesize_duration = time.time() - synthesize_start
        service_total = time.time() - service_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        
        print(f"[{timestamp}] [Service] Synthesize call duration: {synthesize_duration:.3f}s")
        print(f"[{timestamp}] [Service] Thời gian gọi synthesize: {synthesize_duration:.3f}s")
        print(f"[{timestamp}] [Service] Service total time: {service_total:.3f}s")
        print(f"[{timestamp}] [Service] Tổng thời gian service: {service_total:.3f}s")
        
        return result
    
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

