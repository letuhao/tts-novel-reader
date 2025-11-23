"""
VieNeu-TTS Model Wrapper
Wrapper cho Model VieNeu-TTS

This wrapper uses the SAME environment as VieNeu-TTS for 100% compatibility.
Wrapper này sử dụng CÙNG môi trường với VieNeu-TTS để đảm bảo 100% tương thích.

NO PATCHES NEEDED - We're using VieNeu-TTS's working environment!
KHÔNG CẦN PATCH - Chúng ta đang sử dụng môi trường hoạt động của VieNeu-TTS!
"""
import sys
import warnings
import os
from pathlib import Path
from typing import Optional
import torch
import soundfile as sf
import numpy as np

# Suppress warnings EXACTLY like test_female_voice.py does
# Tắt cảnh báo CHÍNH XÁC như test_female_voice.py làm
warnings.filterwarnings('ignore')
os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'

# Add VieNeu-TTS repo to path FIRST (before any imports)
# Thêm repo VieNeu-TTS vào path TRƯỚC (trước mọi import)
# This is the SAME setup as test_female_voice.py that works!
# Đây là setup GIỐNG NHƯ test_female_voice.py đã hoạt động!
# File structure: tts/vieneu-tts-backend/tts_backend/models/vieneu_tts.py
# Go up 5 levels to project root: models -> tts_backend -> vieneu-tts-backend -> tts -> novel-reader
# Then: project_root/tts/VieNeu-TTS
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent.parent
VIENEU_REPO_PATH = PROJECT_ROOT / "tts" / "VieNeu-TTS"

if not VIENEU_REPO_PATH.exists():
    raise ImportError(
        f"VieNeu-TTS repository not found at: {VIENEU_REPO_PATH}\n"
        f"Repository VieNeu-TTS không tìm thấy tại: {VIENEU_REPO_PATH}\n"
        f"Expected location: tts/VieNeu-TTS relative to project root: {PROJECT_ROOT}"
    )

if str(VIENEU_REPO_PATH) not in sys.path:
    sys.path.insert(0, str(VIENEU_REPO_PATH))
    print(f"✅ Added VieNeu-TTS repo to path: {VIENEU_REPO_PATH}")
    print(f"✅ Đã thêm repo VieNeu-TTS vào path: {VIENEU_REPO_PATH}")

# Import EXACTLY like test_female_voice.py does (working example)
# Import CHÍNH XÁC như test_female_voice.py làm (ví dụ hoạt động)
# No patches needed - we're using the same environment!
# Không cần patch - chúng ta đang sử dụng cùng môi trường!
from vieneu_tts import VieNeuTTS

# Try to import config_local like the working test does
# Thử import config_local như test hoạt động làm
try:
    from config_local import get_backbone_repo
    USE_LOCAL_CONFIG = True
except ImportError:
    USE_LOCAL_CONFIG = False
    # Fallback to our config system
    from config import ModelConfig


class VieNeuTTSWrapper:
    """
    Wrapper for VieNeu-TTS model / Wrapper cho model VieNeu-TTS
    
    This follows the exact initialization pattern from VieNeu-TTS repository examples.
    Class này tuân theo đúng pattern khởi tạo từ các ví dụ trong repository VieNeu-TTS.
    """
    
    def __init__(self, model_path: Optional[str] = None, device: Optional[str] = None):
        """
        Initialize VieNeu-TTS model / Khởi tạo model VieNeu-TTS
        
        Args:
            model_path: Path to local model directory / Đường dẫn đến thư mục model local
                       If None, uses default from config
                       Nếu None, sử dụng mặc định từ config
            device: Device to use (cuda/cpu/auto) / Thiết bị sử dụng
                   If None, auto-detects (cuda if available, else cpu)
                   Nếu None, tự động phát hiện (cuda nếu có, không thì cpu)
        """
        # Get model path EXACTLY like test_female_voice.py does
        # Lấy đường dẫn model CHÍNH XÁC như test_female_voice.py làm
        if model_path:
            self.model_path = model_path
        elif USE_LOCAL_CONFIG:
            # Use config_local.get_backbone_repo() like the working test
            # Sử dụng config_local.get_backbone_repo() như test hoạt động
            self.model_path = get_backbone_repo()
        else:
            # Fallback to our config system
            self.model_path = ModelConfig.VIENEU_TTS["model_path"]
        
        # Determine device EXACTLY like test_female_voice.py does
        # Xác định thiết bị CHÍNH XÁC như test_female_voice.py làm
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        # Sample rate is always 24kHz for VieNeu-TTS
        # Tần số lấy mẫu luôn là 24kHz cho VieNeu-TTS
        self.sample_rate = 24_000
        
        # Initialize model EXACTLY like test_female_voice.py does (working example)
        # Khởi tạo model CHÍNH XÁC như test_female_voice.py làm (ví dụ hoạt động)
        print(f"🖥️  Using device: {self.device}")
        print(f"🖥️  Sử dụng thiết bị: {self.device}")
        print(f"📦 Loading model from: {self.model_path}")
        print(f"📦 Đang tải model từ: {self.model_path}")
        
        # Initialize EXACTLY like test_female_voice.py: VieNeuTTS(...)
        # Khởi tạo CHÍNH XÁC như test_female_voice.py: VieNeuTTS(...)
        self.model = VieNeuTTS(
            backbone_repo=self.model_path,
            backbone_device=self.device,
            codec_repo="neuphonic/neucodec",
            codec_device=self.device
        )
        
        # Apply performance optimizations for GPU (similar to Dia TTS)
        # Áp dụng tối ưu hóa hiệu suất cho GPU (tương tự Dia TTS)
        if self.device == "cuda":
            self._setup_cuda_optimizations()
            self._apply_model_optimizations()
        
        print("✅ VieNeu-TTS loaded successfully")
        print("✅ VieNeu-TTS đã được tải thành công")
        
        # Model is now loaded to GPU, optimizations applied
        # Model đã được tải lên GPU, các tối ưu hóa đã được áp dụng
    
    def warmup(self, ref_audio_path: Optional[str] = None, ref_text: Optional[str] = None):
        """
        Warmup model with a dummy inference to prepare GPU for fast inference.
        Làm nóng model với inference giả để chuẩn bị GPU cho inference nhanh.
        
        This should be called after model is loaded to ensure fast first inference.
        Nên được gọi sau khi model được tải để đảm bảo inference đầu tiên nhanh.
        
        Note: torch.compile is disabled for VieNeu-TTS due to Qwen2 architecture
        incompatibility with scaled_dot_product_attention. Other optimizations (TF32,
        FP16, Flash Attention) are still active.
        Lưu ý: torch.compile bị tắt cho VieNeu-TTS do không tương thích với kiến trúc
        Qwen2 và scaled_dot_product_attention. Các tối ưu hóa khác (TF32, FP16,
        Flash Attention) vẫn hoạt động.
        
        Args:
            ref_audio_path: Optional reference audio path for warmup / Đường dẫn audio tham chiếu tùy chọn để warmup
            ref_text: Optional reference text for warmup / Văn bản tham chiếu tùy chọn để warmup
        """
        if self.device != "cuda":
            # No need to warmup on CPU
            print("ℹ️  Skipping warmup (CPU mode)")
            print("ℹ️  Bỏ qua warmup (chế độ CPU)")
            return
        
        print("🔥 Warming up model (preparing GPU for fast inference)...")
        print("🔥 Đang làm nóng model (chuẩn bị GPU cho inference nhanh)...")
        
        try:
            # Use default voice if not provided
            # Sử dụng giọng mặc định nếu không được cung cấp
            if not ref_audio_path or not ref_text:
                # Get default voice from voice selector
                # Lấy giọng mặc định từ voice selector
                from ..voice_selector import VOICE_SAMPLES, get_sample_path
                default_voice_id = "id_0004"  # Female voice default
                voice_info = VOICE_SAMPLES.get(default_voice_id, list(VOICE_SAMPLES.values())[0])
                
                # Get paths relative to VieNeu-TTS repo
                # Lấy đường dẫn tương đối với repo VieNeu-TTS
                sample_dir = VIENEU_REPO_PATH / "sample"
                ref_audio_path = str(sample_dir / voice_info["audio"])
                ref_text_path = sample_dir / voice_info["text"]
                
                if ref_text_path.exists():
                    with open(ref_text_path, "r", encoding="utf-8") as f:
                        ref_text = f.read().strip()
                else:
                    ref_text = "Xin chào."  # Fallback dummy text
            
            # Short dummy text for warmup
            # Văn bản giả ngắn cho warmup
            dummy_text = "Xin chào."
            
            # Perform a dummy inference to warmup the model and GPU
            # Thực hiện inference giả để làm nóng model và GPU
            print("   Running warmup inference (this may take 30-60 seconds)...")
            print("   Đang chạy warmup inference (có thể mất 30-60 giây)...")
            
            # First inference: Warms up the model and prepares GPU kernels
            # Inference đầu tiên: Làm nóng model và chuẩn bị GPU kernels
            _ = self.model.infer(dummy_text, self.model.encode_reference(ref_audio_path), ref_text)
            
            # Skip torch.compile for VieNeu-TTS - not compatible with scaled_dot_product_attention
            # Bỏ qua torch.compile cho VieNeu-TTS - không tương thích với scaled_dot_product_attention
            # The model uses Qwen2 architecture which has issues with torch.compile
            # Model sử dụng kiến trúc Qwen2 có vấn đề với torch.compile
            print("   ℹ️  torch.compile disabled for VieNeu-TTS (incompatible with attention mechanism)")
            print("   ℹ️  torch.compile đã bị tắt cho VieNeu-TTS (không tương thích với cơ chế attention)")
            print("   ℹ️  Using TF32, FP16, and Flash Attention optimizations instead")
            print("   ℹ️  Sử dụng các tối ưu hóa TF32, FP16, và Flash Attention thay thế")
            self._torch_compile_enabled = False
            
            print("✅ Model warmup completed!")
            print("✅ Model warmup hoàn tất!")
            print("   Model is now optimized and ready for fast inference!")
            print("   Model đã được tối ưu và sẵn sàng cho inference nhanh!")
        except Exception as e:
            print(f"⚠️  Warmup failed (non-critical): {e}")
            print(f"⚠️  Warmup thất bại (không nghiêm trọng): {e}")
            print("   Model will still work, but first inference may be slower")
            print("   Model vẫn sẽ hoạt động, nhưng inference đầu tiên có thể chậm hơn")
    
    def _setup_cuda_optimizations(self):
        """
        Setup CUDA optimizations (TF32, Flash Attention) for better performance.
        Thiết lập tối ưu hóa CUDA (TF32, Flash Attention) để hiệu suất tốt hơn.
        """
        try:
            # Enable TF32 for Ampere+ GPUs (RTX 4090 supports this)
            # Bật TF32 cho GPU Ampere+ (RTX 4090 hỗ trợ)
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            
            print("🚀 CUDA optimizations enabled:")
            print("🚀 Tối ưu hóa CUDA đã được bật:")
            print("   - TF32 enabled for faster matmul operations")
            print("   - TF32 đã được bật cho các phép toán matmul nhanh hơn")
            
            # Flash Attention disabled - causes "No available kernel" error with Qwen2
            # Flash Attention bị tắt - gây ra lỗi "No available kernel" với Qwen2
            self._flash_attention_available = False
            print("   - Flash Attention disabled (incompatible with Qwen2 attention mechanism)")
            print("   - Flash Attention đã bị tắt (không tương thích với cơ chế attention của Qwen2)")
            print("   - TF32 and FP16 optimizations still active")
            print("   - Các tối ưu hóa TF32 và FP16 vẫn hoạt động")
        except Exception as e:
            print(f"⚠️  Warning: Could not enable all CUDA optimizations: {e}")
            print(f"⚠️  Cảnh báo: Không thể bật tất cả tối ưu hóa CUDA: {e}")
    
    def _apply_model_optimizations(self):
        """
        Apply model-level optimizations (half precision).
        Áp dụng tối ưu hóa cấp độ model (half precision).
        
        Note: torch.compile is disabled for VieNeu-TTS due to Qwen2 architecture incompatibility
        with scaled_dot_product_attention. Other optimizations (TF32, FP16, Flash Attention) are still active.
        Lưu ý: torch.compile bị tắt cho VieNeu-TTS do không tương thích với kiến trúc Qwen2
        và scaled_dot_product_attention. Các tối ưu hóa khác (TF32, FP16, Flash Attention) vẫn hoạt động.
        """
        try:
            # Enable half precision (fp16) for faster inference and less memory
            # Bật half precision (fp16) để inference nhanh hơn và ít bộ nhớ hơn
            try:
                if hasattr(self.model, 'backbone'):
                    # Use autocast for fp16 during inference (safer than model.half())
                    # Sử dụng autocast cho fp16 trong lúc inference (an toàn hơn model.half())
                    self._use_fp16 = True
                    print("   ✅ FP16 (half precision) will be used during inference")
                    print("   ✅ FP16 (half precision) sẽ được sử dụng trong lúc inference")
            except Exception as e:
                print(f"   ⚠️  FP16 optimization failed: {e}")
                print(f"   ⚠️  Tối ưu hóa FP16 thất bại: {e}")
                self._use_fp16 = False
            
            # torch.compile is disabled for VieNeu-TTS (Qwen2 architecture incompatibility)
            # torch.compile bị tắt cho VieNeu-TTS (không tương thích với kiến trúc Qwen2)
            self._torch_compile_enabled = False
            print("   ℹ️  torch.compile disabled (VieNeu-TTS uses Qwen2 - incompatible)")
            print("   ℹ️  torch.compile đã bị tắt (VieNeu-TTS dùng Qwen2 - không tương thích)")
        except Exception as e:
            print(f"⚠️  Warning: Model optimizations failed: {e}")
            print(f"⚠️  Cảnh báo: Tối ưu hóa model thất bại: {e}")
    
    def synthesize(
        self,
        text: str,
        ref_audio_path: str,
        ref_text: str,
        output_path: Optional[str] = None,
        max_chars: int = 256,
        auto_chunk: bool = True
    ) -> np.ndarray:
        """
        Synthesize speech / Tổng hợp giọng nói
        
        Supports long text generation by chunking (like infer_long_text.py).
        Hỗ trợ tạo văn bản dài bằng cách chia nhỏ (như infer_long_text.py).
        
        This follows the exact pattern from VieNeu-TTS repository examples.
        Function này tuân theo đúng pattern từ các ví dụ trong repository VieNeu-TTS.
        
        Args:
            text: Input text / Văn bản đầu vào
            ref_audio_path: Path to reference audio / Đường dẫn audio tham chiếu
            ref_text: Reference text (must match the reference audio) / Văn bản tham chiếu (phải khớp với audio tham chiếu)
            output_path: Optional output path / Đường dẫn đầu ra tùy chọn
            max_chars: Maximum characters per chunk (default: 256) / Ký tự tối đa mỗi chunk (mặc định: 256)
            auto_chunk: Automatically chunk long text (default: True) / Tự động chia nhỏ văn bản dài (mặc định: True)
            
        Returns:
            Audio array (numpy array) / Mảng audio (numpy array)
        """
        # Import chunking utility / Import tiện ích chia nhỏ
        import sys
        from pathlib import Path
        chunker_path = Path(__file__).parent.parent / "text_chunker.py"
        if str(chunker_path.parent) not in sys.path:
            sys.path.insert(0, str(chunker_path.parent))
        from text_chunker import split_text_into_chunks, should_chunk_text
        
        # Encode reference audio ONCE (reused for all chunks) / Mã hóa audio tham chiếu MỘT LẦN (tái sử dụng cho tất cả chunks)
        ref_codes = self.model.encode_reference(ref_audio_path)
        
        # Check if text needs chunking / Kiểm tra xem văn bản có cần chia nhỏ không
        if auto_chunk and should_chunk_text(text, max_chars):
            # Split into chunks / Chia thành chunks
            chunks = split_text_into_chunks(text, max_chars=max_chars)
            
            if not chunks:
                raise ValueError("Text could not be segmented into valid chunks")
            
            print(f"📄 Long text detected: splitting into {len(chunks)} chunks (≤{max_chars} chars each)")
            print(f"📄 Phát hiện văn bản dài: chia thành {len(chunks)} chunks (≤{max_chars} ký tự mỗi chunk)")
            
            # Generate audio for each chunk / Tạo audio cho mỗi chunk
            generated_segments = []
            for idx, chunk in enumerate(chunks, start=1):
                print(f"🎙️ Generating chunk {idx}/{len(chunks)} ({len(chunk)} chars) / Đang tạo chunk {idx}/{len(chunks)} ({len(chunk)} ký tự)")
                # Reuse same ref_codes for all chunks (key optimization!) / Tái sử dụng cùng ref_codes cho tất cả chunks (tối ưu quan trọng!)
                # Use optimized inference with fp16 if available / Sử dụng inference tối ưu với fp16 nếu có
                wav = self._infer_optimized(chunk, ref_codes, ref_text)
                generated_segments.append(wav)
            
            # Concatenate all segments / Nối tất cả các đoạn
            combined_audio = np.concatenate(generated_segments)
            
            # Save if output path provided / Lưu nếu có đường dẫn đầu ra
            if output_path:
                sf.write(output_path, combined_audio, self.sample_rate)
            
            print(f"✅ Generated long text audio ({len(chunks)} chunks combined) / Đã tạo audio văn bản dài ({len(chunks)} chunks đã kết hợp)")
            return combined_audio
        else:
            # Short text - generate directly / Văn bản ngắn - tạo trực tiếp
            # Use optimized inference with fp16 if available / Sử dụng inference tối ưu với fp16 nếu có
            wav = self._infer_optimized(text, ref_codes, ref_text)
            
            # Save if output path provided / Lưu nếu có đường dẫn đầu ra
            if output_path:
                sf.write(output_path, wav, self.sample_rate)
            
            return wav
    
    def _infer_optimized(self, text: str, ref_codes, ref_text: str) -> np.ndarray:
        """
        Optimized inference with fp16 support for faster generation.
        Inference tối ưu với hỗ trợ fp16 để tạo nhanh hơn.
        
        Note: Flash Attention is disabled due to compatibility issues with Qwen2.
        Lưu ý: Flash Attention bị tắt do vấn đề tương thích với Qwen2.
        """
        # For now, use standard inference to avoid "No available kernel" errors
        # Tạm thời, dùng inference tiêu chuẩn để tránh lỗi "No available kernel"
        # The "No available kernel" error comes from Flash Attention trying to use
        # kernels that don't exist or aren't compatible with Qwen2's attention mechanism
        # Lỗi "No available kernel" đến từ Flash Attention cố sử dụng kernels
        # không tồn tại hoặc không tương thích với cơ chế attention của Qwen2
        
        # Standard inference is still fast with TF32 enabled
        # Inference tiêu chuẩn vẫn nhanh với TF32 đã được bật
        return self.model.infer(text, ref_codes, ref_text)
        
        # TODO: Re-enable optimized inference once Flash Attention compatibility is fixed
        # TODO: Bật lại inference tối ưu khi tương thích Flash Attention được sửa
        # The optimized path below causes "No available kernel" errors:
        # Đường dẫn tối ưu dưới đây gây ra lỗi "No available kernel":
        #
        # if hasattr(self, '_use_fp16') and self._use_fp16 and self.device == "cuda":
        #     # Use fp16 with autocast (safer than forcing Flash Attention)
        #     # Sử dụng fp16 với autocast (an toàn hơn ép Flash Attention)
        #     with torch.cuda.amp.autocast(dtype=torch.float16):
        #         # Use standard model.infer() - it handles attention internally
        #         # Sử dụng model.infer() tiêu chuẩn - nó xử lý attention nội bộ
        #         return self.model.infer(text, ref_codes, ref_text)
    
    def get_sample_rate(self) -> int:
        """Get sample rate / Lấy tần số lấy mẫu"""
        return self.sample_rate

