"""
Dia TTS Model Wrapper
Wrapper cho Model Dia TTS
"""
import sys
from pathlib import Path
from typing import Optional
import torch
import numpy as np

# Add Dia repo to path
DIA_REPO_PATH = Path(__file__).parent.parent.parent.parent / "tts" / "Dia-Finetuning-Vietnamese"
sys.path.insert(0, str(DIA_REPO_PATH))

from dia.model import Dia as DiaModel
from ..config import ModelConfig


def trim_silence(audio: np.ndarray, threshold: float = 0.01, margin: int = 1000) -> np.ndarray:
    """
    Remove silence from the beginning and end of audio.
    Cắt bỏ vùng im lặng ở đầu và cuối audio.
    
    Improved algorithm: Only trims from start/end, never cuts content in middle.
    Thuật toán cải tiến: Chỉ cắt từ đầu/cuối, không bao giờ cắt nội dung ở giữa.
    
    Args:
        audio: Audio array / Mảng audio
        threshold: Amplitude threshold to consider as 'sound' / Ngưỡng biên độ để coi là 'có tiếng'
        margin: Keep some samples before and after the sound region / Giữ lại một ít mẫu trước và sau vùng có tiếng
        
    Returns:
        Trimmed audio array / Mảng audio đã cắt
    """
    if audio.size == 0:
        return audio
    
    # Use envelope detection to handle quiet but valid speech
    # Sử dụng phát hiện envelope để xử lý giọng nói yếu nhưng hợp lệ
    abs_audio = np.abs(audio)
    
    # Calculate windowed RMS (root mean square) for more robust detection
    # Tính RMS theo cửa sổ để phát hiện chính xác hơn
    # Use larger window to avoid cutting on brief pauses
    # Sử dụng cửa sổ lớn hơn để tránh cắt ở khoảng tạm dừng ngắn
    window_size = max(1000, int(0.02 * len(audio)))  # At least 1000 samples or 2% of audio
    if window_size > len(audio):
        window_size = len(audio)
    
    # Create sliding window RMS
    # Tạo RMS trượt
    window_half = window_size // 2
    rms_values = []
    
    for i in range(len(audio)):
        start_idx = max(0, i - window_half)
        end_idx = min(len(audio), i + window_half)
        window_audio = abs_audio[start_idx:end_idx]
        rms = np.sqrt(np.mean(window_audio ** 2))
        rms_values.append(rms)
    
    rms_array = np.array(rms_values)
    
    # Use RMS-based threshold (more robust than amplitude)
    # Sử dụng ngưỡng dựa trên RMS (chắc chắn hơn so với biên độ)
    # Lower threshold to avoid cutting valid quiet speech
    # Giảm ngưỡng để tránh cắt giọng nói yếu hợp lệ
    rms_threshold = threshold * 0.5  # More lenient for RMS
    non_silent_indices = np.where(rms_array > rms_threshold)[0]
    
    if non_silent_indices.size == 0:
        # Completely silent, return as is / Hoàn toàn im lặng, trả về như cũ
        return audio
    
    # Find start and end with margin / Tìm điểm bắt đầu và kết thúc có margin
    # Only trim from actual start/end, never from middle
    # Chỉ cắt từ đầu/cuối thực tế, không bao giờ từ giữa
    start = max(non_silent_indices[0] - margin, 0)
    end = min(non_silent_indices[-1] + margin + 1, len(audio))
    
    return audio[start:end]


def normalize_audio(audio: np.ndarray, target_db: float = -3.0, max_peak: float = 0.95) -> np.ndarray:
    """
    Normalize audio to target dB level and prevent clipping.
    Chuẩn hóa audio đến mức dB mục tiêu và ngăn chặn clipping.
    
    Args:
        audio: Audio array / Mảng audio
        target_db: Target dB level (negative value, e.g., -3.0 for -3dB) / Mức dB mục tiêu
        max_peak: Maximum peak value to prevent clipping / Giá trị peak tối đa để ngăn clipping
        
    Returns:
        Normalized audio array / Mảng audio đã chuẩn hóa
    """
    if audio.size == 0:
        return audio
    
    # Get current max value / Lấy giá trị max hiện tại
    current_max = np.max(np.abs(audio))
    
    if current_max == 0:
        # Silent audio, return as is / Audio im lặng, trả về như cũ
        return audio
    
    # Prevent clipping first / Ngăn clipping trước
    if current_max > max_peak:
        audio = audio * (max_peak / current_max)
        current_max = max_peak
    
    # Normalize to target dB if needed / Chuẩn hóa đến mức dB mục tiêu nếu cần
    if target_db is not None:
        # Convert dB to linear scale / Chuyển dB sang tỷ lệ tuyến tính
        target_linear = 10 ** (target_db / 20.0)
        
        # Calculate scale factor / Tính hệ số tỷ lệ
        scale_factor = target_linear / current_max
        
        # Ensure we don't clip / Đảm bảo không clip
        if scale_factor * current_max > max_peak:
            scale_factor = max_peak / current_max
        
        # Apply normalization / Áp dụng chuẩn hóa
        audio = audio * scale_factor
    
    return audio


def ensure_audio_format(audio: np.ndarray) -> np.ndarray:
    """
    Ensure audio is in correct format (float32, mono, clamped to [-1, 1]).
    Đảm bảo audio ở định dạng đúng (float32, mono, giới hạn trong [-1, 1]).
    
    Args:
        audio: Audio array / Mảng audio
        
    Returns:
        Formatted audio array / Mảng audio đã định dạng
    """
    if audio.size == 0:
        return audio
    
    # Convert to float32 if needed / Chuyển sang float32 nếu cần
    if audio.dtype != np.float32:
        if np.issubdtype(audio.dtype, np.integer):
            # Convert from integer to float / Chuyển từ integer sang float
            max_val = np.iinfo(audio.dtype).max
            audio = audio.astype(np.float32) / max_val
        else:
            audio = audio.astype(np.float32)
    
    # Ensure mono (take first channel if stereo) / Đảm bảo mono (lấy kênh đầu nếu stereo)
    if audio.ndim > 1:
        if audio.shape[0] == 2:  # (channels, samples)
            audio = np.mean(audio, axis=0)
        elif audio.shape[1] == 2:  # (samples, channels)
            audio = np.mean(audio, axis=1)
        else:
            audio = audio.flatten()
    
    # Clamp to [-1, 1] range / Giới hạn trong khoảng [-1, 1]
    audio = np.clip(audio, -1.0, 1.0)
    
    return audio


class DiaTTSWrapper:
    """Wrapper for Dia TTS model / Wrapper cho model Dia TTS"""
    
    def __init__(
        self,
        config_path: Optional[str] = None,
        checkpoint_path: Optional[str] = None,
        device: Optional[str] = None,
        use_half_precision: bool = True,  # Enable fp16 by default on CUDA for 2x speedup
        use_torch_compile: bool = True  # Enable torch.compile by default on CUDA for 20-30% speedup
    ):
        """
        Initialize Dia TTS model / Khởi tạo model Dia TTS
        
        Args:
            config_path: Path to config file / Đường dẫn file cấu hình
            checkpoint_path: Path to checkpoint file / Đường dẫn file checkpoint
            device: Device to use (cuda/cpu/auto) / Thiết bị sử dụng
            use_half_precision: Use fp16 precision on CUDA for faster inference / Sử dụng fp16 trên CUDA để inference nhanh hơn
            use_torch_compile: Use torch.compile on CUDA for faster inference / Sử dụng torch.compile trên CUDA để inference nhanh hơn
        """
        self.config_path = config_path or ModelConfig.DIA["config_path"]
        self.checkpoint_path = checkpoint_path or ModelConfig.DIA["checkpoint_path"]
        self.device = device or (ModelConfig.DIA["device"] if torch.cuda.is_available() else "cpu")
        self.device_obj = torch.device(self.device)
        self.sample_rate = ModelConfig.DIA["sample_rate"]
        self.use_half_precision = use_half_precision
        self.use_torch_compile = use_torch_compile
        self.model = None
        self.max_safe_tokens = None  # Will be calculated after model load
        self._load_model()
    
    def _get_gpu_memory_info(self):
        """
        Get GPU memory information and calculate safe max_tokens.
        Lấy thông tin bộ nhớ GPU và tính toán max_tokens an toàn.
        
        Returns:
            Tuple of (total_vram_gb, free_vram_gb, max_safe_tokens)
        """
        if self.device_obj.type != "cuda":
            return None, None, None
        
        try:
            # Get GPU memory stats
            # Lấy thống kê bộ nhớ GPU
            total_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)  # GB
            allocated_memory = torch.cuda.memory_allocated(0) / (1024**3)  # GB
            reserved_memory = torch.cuda.memory_reserved(0) / (1024**3)  # GB
            free_memory = total_memory - reserved_memory  # Available for new allocations
            
            # Estimate VRAM needed for model weights (Dia TTS ~3-4GB)
            # Ước tính VRAM cần cho model weights (Dia TTS ~3-4GB)
            model_base_memory = 4.0  # GB (conservative estimate)
            
            # Estimate VRAM needed per 1000 tokens during generation
            # Ước tính VRAM cần cho mỗi 1000 tokens trong lúc generation
            # Based on KV cache, decoder states, etc. (~0.5-1GB per 1000 tokens)
            # Dựa trên KV cache, decoder states, v.v. (~0.5-1GB mỗi 1000 tokens)
            tokens_per_gb = 1000  # Conservative: 1000 tokens per GB
            
            # Calculate safe max tokens: use 70% of available free memory
            # Tính max tokens an toàn: dùng 70% bộ nhớ trống có sẵn
            # Reserve 30% for PyTorch overhead, other allocations
            # Dự trữ 30% cho overhead PyTorch, các cấp phát khác
            available_for_tokens = free_memory - model_base_memory
            safe_memory_for_tokens = available_for_tokens * 0.7  # Use 70% of available
            
            max_safe_tokens = int(safe_memory_for_tokens * tokens_per_gb)
            
            # Round to nearest multiple of 128 (required by model)
            # Làm tròn đến bội số gần nhất của 128 (yêu cầu của model)
            max_safe_tokens = (max_safe_tokens // 128) * 128
            
            # Set reasonable bounds
            # Đặt giới hạn hợp lý
            min_max_tokens = 3072  # Minimum for reasonable audio length
            max_max_tokens = 12288  # Maximum to prevent OOM (hard limit)
            max_safe_tokens = max(min_max_tokens, min(max_safe_tokens, max_max_tokens))
            
            return total_memory, free_memory, max_safe_tokens
        except Exception as e:
            print(f"[DiaTTS] ⚠️ Failed to get GPU memory info: {e}")
            return None, None, None
    
    def _setup_cuda_optimizations(self):
        """
        Setup CUDA optimizations (TF32, Flash Attention) as in original setup.
        Thiết lập tối ưu hóa CUDA (TF32, Flash Attention) như trong setup gốc.
        """
        if self.device_obj.type != "cuda":
            return
        
        try:
            # Enable TF32: faster on Ampere+ while maintaining stability
            # Cho phép TF32: nhanh hơn trên Ampere+ mà vẫn ổn định
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True
            torch.set_float32_matmul_precision("high")
            print("[DiaTTS] ✅ TF32 optimizations enabled for CUDA")
            print("[DiaTTS] ✅ Tối ưu hóa TF32 đã được bật cho CUDA")
        except Exception as e:
            print(f"[DiaTTS] ⚠️ Failed to enable TF32: {e}")
        
        try:
            # Prioritize Flash Attention in SDPA if available
            # Ưu tiên Flash-Attention trong SDPA nếu có
            from torch.nn.attention import sdpa_kernel
            sdpa_kernel(enable_flash=True, enable_math=False, enable_mem_efficient=True)
            print("[DiaTTS] ✅ Flash Attention enabled for SDPA")
            print("[DiaTTS] ✅ Flash Attention đã được bật cho SDPA")
        except Exception as e:
            print(f"[DiaTTS] ⚠️ Failed to enable Flash Attention: {e}")
    
    def _load_model(self):
        """Load Dia TTS model / Tải model Dia TTS"""
        print(f"[DiaTTS] Loading Dia TTS from: {self.checkpoint_path}")
        print(f"[DiaTTS] Đang tải Dia TTS từ: {self.checkpoint_path}")
        print(f"[DiaTTS] Device: {self.device}")
        print(f"[DiaTTS] Thiết bị: {self.device}")
        
        # Setup CUDA optimizations (TF32, Flash Attention)
        # Thiết lập tối ưu hóa CUDA (TF32, Flash Attention)
        self._setup_cuda_optimizations()
        
        # Load model from local checkpoint
        # Tải model từ checkpoint local
        self.model = DiaModel.from_local(
            config_path=self.config_path,
            checkpoint_path=self.checkpoint_path,
            device=self.device_obj
        )
        
        # Apply performance optimizations on CUDA (as in original setup)
        # Áp dụng tối ưu hóa hiệu suất trên CUDA (như trong setup gốc)
        if self.device_obj.type == "cuda" and hasattr(self.model, "model"):
            # Apply half precision (fp16) BEFORE torch.compile to avoid dtype mismatches
            # Áp dụng half precision (fp16) TRƯỚC torch.compile để tránh lệch dtype
            # Note: Half precision and torch.compile can have dtype conflicts, so we use autocast instead
            # Lưu ý: Half precision và torch.compile có thể xung đột dtype, nên chúng ta dùng autocast thay thế
            if self.use_half_precision:
                try:
                    # Convert model to half precision (but not for torch.compile compatibility)
                    # Chuyển model sang half precision (nhưng không để tương thích torch.compile)
                    # Actually, let's skip model.half() and use autocast during inference instead
                    # Thực ra, hãy bỏ qua model.half() và dùng autocast trong lúc inference thay thế
                    print("[DiaTTS] ℹ️ Half precision will be handled via autocast during inference")
                    print("[DiaTTS] ℹ️ Half precision sẽ được xử lý qua autocast trong lúc inference")
                    # Store flag to use autocast during synthesis
                    # Lưu flag để dùng autocast trong lúc synthesis
                    self._use_autocast_fp16 = True
                except Exception as e:
                    print(f"[DiaTTS] ⚠️ Failed to setup half precision: {e}")
                    self._use_autocast_fp16 = False
            else:
                self._use_autocast_fp16 = False
            
            # Apply torch.compile for 20-30% additional speedup
            # Note: torch.compile works better with float32, use autocast for fp16 ops
            # Áp dụng torch.compile để tăng tốc thêm 20-30%
            # Lưu ý: torch.compile hoạt động tốt hơn với float32, dùng autocast cho ops fp16
            if self.use_torch_compile:
                try:
                    # Only compile if not using model.half() (compiled models have dtype issues)
                    # Chỉ compile nếu không dùng model.half() (model đã compile có vấn đề dtype)
                    if not self.use_half_precision:
                        self.model.model = torch.compile(self.model.model, backend="inductor")
                        print("[DiaTTS] ✅ torch.compile enabled (float32 mode)")
                        print("[DiaTTS] ✅ torch.compile đã được bật (chế độ float32)")
                    else:
                        print("[DiaTTS] ℹ️ torch.compile skipped (using autocast for fp16 instead)")
                        print("[DiaTTS] ℹ️ torch.compile đã bị bỏ qua (dùng autocast cho fp16 thay thế)")
                        self.use_torch_compile = False  # Disable to avoid conflicts
                except Exception as e:
                    print(f"[DiaTTS] ⚠️ Failed to enable torch.compile: {e}")
                    self.use_torch_compile = False
        
        print("✅ Dia TTS loaded successfully")
        print("✅ Dia TTS đã được tải thành công")
        
        # Calculate max safe tokens based on GPU memory after model is loaded
        # Tính toán max safe tokens dựa trên bộ nhớ GPU sau khi model được tải
        if self.device_obj.type == "cuda":
            total_vram, free_vram, max_safe_tokens = self._get_gpu_memory_info()
            if max_safe_tokens:
                self.max_safe_tokens = max_safe_tokens
                print(f"[DiaTTS] 💾 GPU Memory Info:")
                print(f"[DiaTTS] 💾 Thông tin Bộ nhớ GPU:")
                print(f"[DiaTTS]    Total VRAM: {total_vram:.2f} GB")
                print(f"[DiaTTS]    Free VRAM: {free_vram:.2f} GB")
                print(f"[DiaTTS]    Max Safe Tokens: {max_safe_tokens} (~{max_safe_tokens/102:.1f}s)")
                print(f"[DiaTTS]    Tổng VRAM: {total_vram:.2f} GB")
                print(f"[DiaTTS]    VRAM Trống: {free_vram:.2f} GB")
                print(f"[DiaTTS]    Max Tokens An Toàn: {max_safe_tokens} (~{max_safe_tokens/102:.1f}s)")
            else:
                # Fallback to conservative default
                # Dự phòng về giá trị mặc định bảo thủ
                self.max_safe_tokens = 6144
                print(f"[DiaTTS] ⚠️ Could not detect GPU memory, using conservative limit: {self.max_safe_tokens} tokens")
                print(f"[DiaTTS] ⚠️ Không thể phát hiện bộ nhớ GPU, dùng giới hạn bảo thủ: {self.max_safe_tokens} tokens")
    
    def synthesize(
        self,
        text: str,
        audio_prompt_path: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: float = 1.3,
        top_p: float = 0.95,
        cfg_scale: float = 3.0,
        use_cfg_filter: bool = True,
        cfg_filter_top_k: int = 35,
        speed_factor: float = 1.0,  # Normal speed (0.8-1.0, 1.0 = normal) / Tốc độ bình thường
        trim_silence: bool = False,  # Trim silence from beginning and end / Cắt im lặng ở đầu và cuối
        silence_threshold: float = 0.005,  # Threshold for silence detection (lowered for better speech detection) / Ngưỡng phát hiện im lặng (giảm để phát hiện giọng nói tốt hơn)
        silence_margin: int = 2000,  # Margin in samples to keep (increased to preserve more) / Margin tính bằng mẫu để giữ lại (tăng để giữ nhiều hơn)
        normalize: bool = True,  # Normalize audio levels / Chuẩn hóa mức audio
        normalize_target_db: float = -3.0,  # Target dB for normalization / Mức dB mục tiêu cho chuẩn hóa
        max_peak: float = 0.95,  # Maximum peak to prevent clipping / Peak tối đa để ngăn clipping
        output_path: Optional[str] = None
    ) -> np.ndarray:
        """
        Synthesize speech / Tổng hợp giọng nói
        
        Args:
            text: Input text with speaker tags (e.g., "[01] Your text") / Văn bản đầu vào có tag người nói
            audio_prompt_path: Optional audio prompt path for voice cloning / Đường dẫn audio prompt tùy chọn
            max_tokens: Maximum audio tokens / Số token audio tối đa
            temperature: Sampling temperature / Nhiệt độ lấy mẫu
            top_p: Nucleus sampling / Lấy mẫu nucleus
            cfg_scale: Classifier-free guidance scale / Tỷ lệ hướng dẫn classifier-free
            use_cfg_filter: Use classifier-free guidance filter / Sử dụng bộ lọc classifier-free
            cfg_filter_top_k: Top-k for CFG filter / Top-k cho bộ lọc CFG
            speed_factor: Speech speed factor (0.8-1.0, lower = slower) / Hệ số tốc độ giọng nói
            trim_silence: Whether to trim silence from beginning and end / Có cắt im lặng ở đầu và cuối không
            silence_threshold: Threshold for silence detection (0.0-1.0) / Ngưỡng phát hiện im lặng
            silence_margin: Margin in samples to keep around sound / Margin tính bằng mẫu để giữ lại xung quanh âm thanh
            normalize: Whether to normalize audio levels / Có chuẩn hóa mức audio không
            normalize_target_db: Target dB level for normalization / Mức dB mục tiêu cho chuẩn hóa
            max_peak: Maximum peak value to prevent clipping / Giá trị peak tối đa để ngăn clipping
            output_path: Optional output path / Đường dẫn đầu ra tùy chọn
            
        Returns:
            Audio array / Mảng audio
        """
        # Normalize text: add period at end if missing (helps EOS detection for short sentences)
        # Chuẩn hóa text: thêm dấu chấm ở cuối nếu thiếu (giúp phát hiện EOS cho câu ngắn)
        text = self._normalize_text_for_tts(text)
        
        # Calculate max_tokens based on text length if not provided
        # Tính max_tokens dựa trên độ dài text nếu không được cung cấp
        original_text_length = len(text)
        if max_tokens is None:
            # Estimate tokens needed based on text length
            # Ước tính số token cần thiết dựa trên độ dài text
            # Vietnamese speech: ~150-200 chars/second at normal speed
            # Tiếng Việt: ~150-200 ký tự/giây ở tốc độ bình thường
            # Dia model: ~10-15 tokens/second of audio (rough estimate)
            # Model Dia: ~10-15 tokens/giây audio (ước tính thô)
            # More conservative: ~20-25 tokens per character to ensure full generation
            # Bảo thủ hơn: ~20-25 tokens mỗi ký tự để đảm bảo tạo đầy đủ
            
            # Estimate tokens: text_length * tokens_per_char (accounts for pauses, punctuation, etc.)
            # Ước tính tokens: text_length * tokens_per_char (tính đến tạm dừng, dấu câu, v.v.)
            estimated_tokens = int(original_text_length * 20)  # ~20 tokens per char (conservative)
            
            # Minimum default: 3072 tokens (~30 seconds) - increased from config default 1536
            # Tối thiểu mặc định: 3072 tokens (~30 giây) - tăng từ mặc định config 1536
            # This ensures full dialog generation even for medium-length texts
            # Điều này đảm bảo tạo đầy đủ dialog ngay cả cho văn bản độ dài trung bình
            default_max_tokens = 3072  # ~30 seconds of audio
            max_tokens = max(default_max_tokens, estimated_tokens)
            
            # Cap at GPU-safe maximum to prevent OOM
            # Giới hạn ở mức tối đa an toàn cho GPU để tránh hết bộ nhớ
            if hasattr(self, 'max_safe_tokens') and self.max_safe_tokens:
                max_tokens = min(max_tokens, self.max_safe_tokens)
            else:
                # Fallback to conservative default if GPU memory info not available
                # Dự phòng về giá trị mặc định bảo thủ nếu không có thông tin bộ nhớ GPU
                max_tokens = min(max_tokens, 6144)
            
            print(f"[DiaTTS] Text length: {original_text_length} chars, estimated {estimated_tokens} tokens, using max_tokens: {max_tokens} (~{max_tokens/102:.1f}s)")
            print(f"[DiaTTS] Độ dài text: {original_text_length} ký tự, ước tính {estimated_tokens} tokens, dùng max_tokens: {max_tokens} (~{max_tokens/102:.1f}s)")
        else:
            # User provided max_tokens, but ensure it's at least the default minimum
            # Người dùng cung cấp max_tokens, nhưng đảm bảo ít nhất là tối thiểu mặc định
            if max_tokens < 1536:
                print(f"[DiaTTS] ⚠️ Provided max_tokens ({max_tokens}) is very low, using minimum 1536")
                print(f"[DiaTTS] ⚠️ max_tokens được cung cấp ({max_tokens}) rất thấp, dùng tối thiểu 1536")
                max_tokens = 1536
            print(f"[DiaTTS] Using provided max_tokens: {max_tokens} (~{max_tokens/102:.1f}s)")
            print(f"[DiaTTS] Sử dụng max_tokens được cung cấp: {max_tokens} (~{max_tokens/102:.1f}s)")
        
        # Generate speech / Tạo giọng nói
        # Use autocast for fp16 inference (safer than model.half() with torch.compile)
        # Dùng autocast cho inference fp16 (an toàn hơn model.half() với torch.compile)
        if hasattr(self, '_use_autocast_fp16') and self._use_autocast_fp16 and self.device_obj.type == "cuda":
            with torch.cuda.amp.autocast(dtype=torch.float16):
                wav = self.model.generate(
                    text=text,
                    max_tokens=max_tokens,
                    cfg_scale=cfg_scale,
                    temperature=temperature,
                    top_p=top_p,
                    use_cfg_filter=use_cfg_filter,
                    use_torch_compile=False,  # Don't use with autocast
                    cfg_filter_top_k=cfg_filter_top_k,
                    audio_prompt_path=audio_prompt_path
                )
        else:
            # Standard float32 inference (or autocast not enabled)
            # Inference float32 tiêu chuẩn (hoặc autocast không được bật)
            wav = self.model.generate(
                text=text,
                max_tokens=max_tokens,
                cfg_scale=cfg_scale,
                temperature=temperature,
                top_p=top_p,
                use_cfg_filter=use_cfg_filter,
                use_torch_compile=self.use_torch_compile if self.device_obj.type == "cuda" else False,
                cfg_filter_top_k=cfg_filter_top_k,
                audio_prompt_path=audio_prompt_path
            )
        
        # Ensure audio format is correct / Đảm bảo định dạng audio đúng
        wav = ensure_audio_format(wav)
        
        # Get function references from module namespace to avoid parameter shadowing
        # Lấy tham chiếu hàm từ module namespace để tránh tham số che khuất
        # Parameters with same names as functions shadow them, so access via module
        import sys
        module = sys.modules[__name__]
        _trim_silence_func = getattr(module, 'trim_silence')  # Get function from module
        _normalize_audio_func = getattr(module, 'normalize_audio')  # Get function from module
        
        # Trim silence from beginning and end / Cắt im lặng ở đầu và cuối
        # Parameter name 'trim_silence' (bool) shadows function 'trim_silence()'
        if trim_silence:  # Check boolean parameter
            original_length = len(wav)
            # Use function from module namespace (not shadowed by parameter)
            wav = _trim_silence_func(wav, threshold=silence_threshold, margin=silence_margin)
            trimmed_length = len(wav)
            if trimmed_length < original_length:
                trimmed_seconds = (original_length - trimmed_length) / self.sample_rate
                print(f"Trimmed silence: {original_length} -> {trimmed_length} samples ({trimmed_seconds:.2f}s removed)")
                print(f"Đã cắt im lặng: {original_length} -> {trimmed_length} mẫu ({trimmed_seconds:.2f}s đã loại bỏ)")
        
        # Normalize audio levels / Chuẩn hóa mức audio
        # Parameter name 'normalize' (bool) would shadow function, but we use different name
        if normalize:  # Check boolean parameter
            # Use function from module namespace
            wav = _normalize_audio_func(wav, target_db=normalize_target_db, max_peak=max_peak)
        
        # Apply speed factor for slower narration / Áp dụng hệ số tốc độ cho narration chậm hơn
        if speed_factor < 1.0 and speed_factor >= 0.8:
            # Clamp speed factor to safe range / Giới hạn hệ số tốc độ trong khoảng an toàn
            speed_factor = max(0.8, min(speed_factor, 1.0))
            
            # Resample audio to slow down speech / Lấy mẫu lại audio để làm chậm giọng nói
            original_len = len(wav)
            target_len = int(original_len / speed_factor)
            
            if target_len != original_len and target_len > 0:
                x_original = np.arange(original_len)
                x_resampled = np.linspace(0, original_len - 1, target_len)
                wav = np.interp(x_resampled, x_original, wav).astype(np.float32)
                print(f"Applied speed factor {speed_factor:.2f}x (slower): {original_len} -> {target_len} samples")
                print(f"Đã áp dụng hệ số tốc độ {speed_factor:.2f}x (chậm hơn): {original_len} -> {target_len} mẫu")
        
        # Save if output path provided / Lưu nếu có đường dẫn đầu ra
        if output_path:
            import soundfile as sf
            sf.write(output_path, wav, self.sample_rate)
        
        return wav
    
    def _normalize_text_for_tts(self, text: str) -> str:
        """
        Normalize text for TTS generation to improve EOS detection.
        Chuẩn hóa text cho sinh TTS để cải thiện phát hiện EOS.
        
        Adds punctuation at end if missing, which helps the model
        detect end of speech for short sentences.
        
        Thêm dấu chấm ở cuối nếu thiếu, giúp model phát hiện
        kết thúc giọng nói cho câu ngắn.
        
        Args:
            text: Input text / Văn bản đầu vào
            
        Returns:
            Normalized text / Văn bản đã chuẩn hóa
        """
        if not text or not text.strip():
            return text
        
        # Remove trailing whitespace
        # Loại bỏ khoảng trắng ở cuối
        text = text.rstrip()
        
        # Vietnamese sentence-ending punctuation
        # Dấu câu kết thúc câu tiếng Việt
        sentence_endings = ['.', '!', '?', '。', '！', '？']
        
        # Check if text ends with sentence-ending punctuation
        # Kiểm tra xem text có kết thúc bằng dấu câu kết thúc câu không
        ends_with_punctuation = any(text.endswith(punct) for punct in sentence_endings)
        
        # If missing punctuation, add period
        # Nếu thiếu dấu câu, thêm dấu chấm
        if not ends_with_punctuation:
            text = text + '.'
        
        return text
    
    def get_sample_rate(self) -> int:
        """Get sample rate / Lấy tần số lấy mẫu"""
        return self.sample_rate

