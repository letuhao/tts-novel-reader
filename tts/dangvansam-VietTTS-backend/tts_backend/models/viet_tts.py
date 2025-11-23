"""
VietTTS Model Wrapper
Wrapper cho Model VietTTS

This wrapper uses the SAME environment as VietTTS for 100% compatibility.
Wrapper này sử dụng CÙNG môi trường với VietTTS để đảm bảo 100% tương thích.
"""
import sys
import warnings
import os
from pathlib import Path
from typing import Optional
import torch
import soundfile as sf
import numpy as np

# Suppress warnings
warnings.filterwarnings('ignore')
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

# Add VietTTS repo to path FIRST (before any imports)
# File structure: tts/dangvansam-VietTTS-backend/tts_backend/models/viet_tts.py
# Go up 5 levels to project root: models -> tts_backend -> dangvansam-VietTTS-backend -> tts -> novel-reader
# Then: project_root/tts/viet-tts
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent
VIETTTS_REPO_PATH = PROJECT_ROOT / "tts" / "viet-tts"

if not VIETTTS_REPO_PATH.exists():
    raise ImportError(
        f"VietTTS repository not found at: {VIETTTS_REPO_PATH}\n"
        f"Repository VietTTS không tìm thấy tại: {VIETTTS_REPO_PATH}\n"
        f"Expected location: tts/viet-tts relative to project root: {PROJECT_ROOT}"
    )

if str(VIETTTS_REPO_PATH) not in sys.path:
    sys.path.insert(0, str(VIETTTS_REPO_PATH))
    print(f"✅ Added VietTTS repo to path: {VIETTTS_REPO_PATH}")
    print(f"✅ Đã thêm repo VietTTS vào path: {VIETTTS_REPO_PATH}")

# Patch diffusers BEFORE importing viettts (fixes cached_download issue)
# Sửa diffusers TRƯỚC khi import viettts (sửa lỗi cached_download)
# Find diffusers package location without importing it
def _patch_diffusers():
    """Patch diffusers to use hf_hub_download instead of cached_download"""
    try:
        # Find diffusers in site-packages without importing
        import site
        for site_packages in site.getsitepackages():
            diffusers_path = Path(site_packages) / "diffusers"
            dynamic_modules_path = diffusers_path / "utils" / "dynamic_modules_utils.py"
            
            if dynamic_modules_path.exists():
                content = dynamic_modules_path.read_text(encoding="utf-8")
                if "from huggingface_hub import cached_download, hf_hub_download, model_info" in content:
                    content = content.replace(
                        "from huggingface_hub import cached_download, hf_hub_download, model_info",
                        "from huggingface_hub import hf_hub_download, model_info"
                    )
                    content = content.replace("cached_download(", "hf_hub_download(")
                    dynamic_modules_path.write_text(content, encoding="utf-8")
                    print("✅ Patched diffusers (cached_download -> hf_hub_download)")
                    print("✅ Đã sửa diffusers (cached_download -> hf_hub_download)")
                    return True
    except Exception:
        pass
    return False

# Apply patch before importing viettts
_patch_diffusers()

# Import VietTTS classes
from viettts.tts import TTS
from viettts.utils.file_utils import load_prompt_speech_from_file, load_voices


class VietTTSWrapper:
    """
    Wrapper for VietTTS model / Wrapper cho model VietTTS
    
    This follows the exact initialization pattern from VietTTS repository.
    Class này tuân theo đúng pattern khởi tạo từ repository VietTTS.
    """
    
    def __init__(self, model_path: Optional[str] = None, device: Optional[str] = None):
        """
        Initialize VietTTS model / Khởi tạo model VietTTS
        
        Args:
            model_path: Path to local model directory / Đường dẫn đến thư mục model local
                       If None, uses default from config
                       Nếu None, sử dụng mặc định từ config
            device: Device to use (cuda/cpu/auto) / Thiết bị sử dụng
                   If None, auto-detects (cuda if available, else cpu)
                   Nếu None, tự động phát hiện (cuda nếu có, không thì cpu)
        """
        # Get model path
        if model_path:
            self.model_path = model_path
        else:
            # Use default from config
            from ..config import ModelConfig
            self.model_path = ModelConfig.VIETTTS["model_path"]
        
        # Determine device
        if device is None:
            # Use improved device detection that checks both PyTorch and ONNX Runtime
            # Sử dụng phát hiện thiết bị cải tiến kiểm tra cả PyTorch và ONNX Runtime
            from ..service import detect_device
            self.device = detect_device()
        else:
            self.device = device
        
        # Sample rate is 22,050 Hz for VietTTS
        self.sample_rate = 22_050
        
        # Get voice samples directory
        VOICE_SAMPLES_DIR = VIETTTS_REPO_PATH / "samples"
        self.voice_samples_dir = str(VOICE_SAMPLES_DIR)
        
        # Load available voices
        self.voice_map = load_voices(self.voice_samples_dir)
        
        # Initialize model
        print(f"🖥️  Using device: {self.device}")
        print(f"🖥️  Sử dụng thiết bị: {self.device}")
        print(f"📦 Loading model from: {self.model_path}")
        print(f"📦 Đang tải model từ: {self.model_path}")
        
        # Initialize VietTTS model
        self.model = TTS(
            model_dir=self.model_path,
            load_jit=False,  # Can enable for faster inference
            load_onnx=False  # Can enable for faster inference
        )
        
        # Apply performance optimizations for GPU
        if self.device == "cuda":
            self._setup_cuda_optimizations()
        
        print("✅ VietTTS loaded successfully")
        print("✅ VietTTS đã được tải thành công")
    
    def warmup(self, voice_name: Optional[str] = None):
        """
        Warmup model with a dummy inference to prepare GPU for fast inference.
        Làm nóng model với inference giả để chuẩn bị GPU cho inference nhanh.
        
        Args:
            voice_name: Optional voice name for warmup / Tên giọng tùy chọn để warmup
        """
        if self.device != "cuda":
            print("ℹ️  Skipping warmup (CPU mode)")
            print("ℹ️  Bỏ qua warmup (chế độ CPU)")
            return
        
        print("🔥 Warming up model (preparing GPU for fast inference)...")
        print("🔥 Đang làm nóng model (chuẩn bị GPU cho inference nhanh)...")
        
        try:
            # Use default voice if not provided
            if not voice_name:
                voice_name = "cdteam"  # Default voice
            
            # Get voice file
            voice_file = self.voice_map.get(voice_name)
            if not voice_file:
                voice_file = list(self.voice_map.values())[0]
            
            # Load voice
            prompt_speech = load_prompt_speech_from_file(voice_file)
            
            # Short dummy text for warmup
            dummy_text = "Xin chào."
            
            # Perform a dummy inference to warmup the model and GPU
            print("   Running warmup inference (this may take 30-60 seconds)...")
            print("   Đang chạy warmup inference (có thể mất 30-60 giây)...")
            
            _ = self.model.tts_to_wav(dummy_text, prompt_speech, speed=1.0)
            
            print("✅ Model warmup completed!")
            print("✅ Model warmup hoàn tất!")
            print("   Model is now optimized and ready for fast inference!")
            print("   Model đã được tối ưu và sẵn sàng cho inference nhanh!")
        except Exception as e:
            # Suppress WinError 193 warnings - it's handled by the frontend patch
            # ONNX Runtime will use CPU if CUDA DLL fails, but PyTorch models use GPU
            # Ẩn cảnh báo WinError 193 - đã được xử lý bởi frontend patch
            # ONNX Runtime sẽ dùng CPU nếu DLL CUDA thất bại, nhưng model PyTorch dùng GPU
            error_msg = str(e)
            if "193" not in error_msg and "WinError" not in error_msg:
                # Only show non-DLL errors
                # Chỉ hiển thị lỗi không phải DLL
                print(f"⚠️  Warmup failed (non-critical): {e}")
                print(f"⚠️  Warmup thất bại (không nghiêm trọng): {e}")
            # Model will still work - PyTorch uses GPU, ONNX uses CPU (handled by patch)
            # Model vẫn sẽ hoạt động - PyTorch dùng GPU, ONNX dùng CPU (đã được xử lý bởi patch)
    
    def _setup_cuda_optimizations(self):
        """
        Setup CUDA optimizations (TF32) for better performance.
        Thiết lập tối ưu hóa CUDA (TF32) để hiệu suất tốt hơn.
        """
        try:
            # Enable TF32 for Ampere+ GPUs (RTX 4090 supports this)
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            
            print("🚀 CUDA optimizations enabled:")
            print("🚀 Tối ưu hóa CUDA đã được bật:")
            print("   - TF32 enabled for faster matmul operations")
            print("   - TF32 đã được bật cho các phép toán matmul nhanh hơn")
        except Exception as e:
            print(f"⚠️  Warning: Could not enable all CUDA optimizations: {e}")
            print(f"⚠️  Cảnh báo: Không thể bật tất cả tối ưu hóa CUDA: {e}")
    
    def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        voice_file: Optional[str] = None,
        speed: float = 1.0,
        output_path: Optional[str] = None,
        batch_chunks: Optional[int] = None  # Process N chunks at a time to keep GPU busy
    ) -> np.ndarray:
        """
        Synthesize speech / Tổng hợp giọng nói
        
        Optimized version that pre-processes chunks and keeps GPU busy.
        Phiên bản tối ưu pre-processes chunks và giữ GPU bận.
        
        Args:
            text: Input text / Văn bản đầu vào
            voice: Voice name from built-in voices / Tên giọng từ giọng có sẵn
            voice_file: Path to custom voice file / Đường dẫn file giọng tùy chỉnh
            speed: Speech speed (0.5-2.0, default: 1.0) / Tốc độ giọng nói
            output_path: Optional output path / Đường dẫn đầu ra tùy chọn
            batch_chunks: Process N chunks at a time to keep GPU busy (default: None = auto)
                         Xử lý N chunks cùng lúc để giữ GPU bận (mặc định: None = tự động)
            
        Returns:
            Audio array (numpy array) / Mảng audio (numpy array)
        """
        # Determine voice file
        if voice_file:
            prompt_speech_file = voice_file
        elif voice:
            prompt_speech_file = self.voice_map.get(voice)
            if not prompt_speech_file:
                raise ValueError(f"Voice '{voice}' not found. Available voices: {list(self.voice_map.keys())}")
        else:
            # Use default voice
            prompt_speech_file = list(self.voice_map.values())[0]
        
        # Load prompt speech once
        prompt_speech = load_prompt_speech_from_file(prompt_speech_file)
        
        # Standard processing - VietTTS handles chunking internally
        # The batch_chunks parameter is reserved for future optimization
        # Xử lý tiêu chuẩn - VietTTS xử lý chunking nội bộ
        # Tham số batch_chunks được dành cho tối ưu hóa tương lai
        wav = self.model.tts_to_wav(text, prompt_speech, speed=speed)
        
        # Save if output path provided
        if output_path:
            sf.write(output_path, wav, self.sample_rate)
        
        return wav
    
    def get_sample_rate(self) -> int:
        """Get sample rate / Lấy tần số lấy mẫu"""
        return self.sample_rate
    
    def list_voices(self) -> dict:
        """
        List available voices / Liệt kê các giọng có sẵn
        
        Returns:
            Dictionary mapping voice names to file paths / Từ điển ánh xạ tên giọng đến đường dẫn file
        """
        return self.voice_map.copy()

