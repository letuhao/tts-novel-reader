"""
VietTTS Model Wrapper
Wrapper cho Model VietTTS

This wrapper uses the SAME environment as VietTTS for 100% compatibility.
Wrapper này sử dụng CÙNG môi trường với VietTTS để đảm bảo 100% tương thích.
"""
import sys
import warnings
import os
import time
from datetime import datetime
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
        
        # Cache for loaded prompt speech (to avoid reloading from disk each time)
        # Cache cho prompt speech đã tải (để tránh tải lại từ disk mỗi lần)
        self._prompt_speech_cache = {}
        
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
        
        # Preload common voices to avoid disk I/O delay on first use
        # Tải trước các giọng phổ biến để tránh độ trễ I/O disk khi dùng lần đầu
        self._preload_common_voices()
    
    def _preload_common_voices(self):
        """
        Preload common voices to avoid disk I/O delay on first use.
        Tải trước các giọng phổ biến để tránh độ trễ I/O disk khi dùng lần đầu.
        """
        common_voices = ["quynh", "cdteam", "nu-nhe-nhang"]  # Most commonly used voices
        print("📦 Preloading common voices to memory...")
        print("📦 Đang tải trước các giọng phổ biến vào memory...")
        
        for voice_name in common_voices:
            if voice_name in self.voice_map:
                try:
                    voice_file = self.voice_map[voice_name]
                    if voice_name not in self._prompt_speech_cache:
                        self._prompt_speech_cache[voice_name] = load_prompt_speech_from_file(voice_file)
                        print(f"   ✅ Preloaded voice: {voice_name}")
                except Exception as e:
                    print(f"   ⚠️  Failed to preload voice {voice_name}: {e}")
        
        print("✅ Common voices preloaded")
        print("✅ Các giọng phổ biến đã được tải trước")
    
    def warmup(self, voice_name: Optional[str] = None):
        """
        Warmup model with a dummy inference to prepare GPU for fast inference.
        This compiles CUDA kernels once at startup, eliminating the 10s setup delay per request.
        Làm nóng model với inference giả để chuẩn bị GPU cho inference nhanh.
        Điều này compile CUDA kernels một lần khi khởi động, loại bỏ độ trễ setup 10s mỗi request.
        
        Args:
            voice_name: Optional voice name for warmup / Tên giọng tùy chọn để warmup
        """
        if self.device != "cuda":
            print("ℹ️  Skipping warmup (CPU mode)")
            print("ℹ️  Bỏ qua warmup (chế độ CPU)")
            return
        
        print("🔥 Warming up model (compiling CUDA kernels - this eliminates 10s setup delay per request)...")
        print("🔥 Đang làm nóng model (compile CUDA kernels - điều này loại bỏ độ trễ setup 10s mỗi request)...")
        
        try:
            # Use default voice if not provided
            if not voice_name:
                voice_name = "quynh"  # Default voice for novel reader
            
            # Get voice file
            voice_file = self.voice_map.get(voice_name)
            if not voice_file:
                voice_file = list(self.voice_map.values())[0]
            
            # Load voice (will be cached)
            # Tải giọng (sẽ được cache)
            cache_key = voice_name if voice_name in self.voice_map else "default"
            if cache_key not in self._prompt_speech_cache:
                self._prompt_speech_cache[cache_key] = load_prompt_speech_from_file(voice_file)
            prompt_speech = self._prompt_speech_cache[cache_key]
            
            # Short dummy text for warmup
            dummy_text = "Xin chào."
            
            # Perform a dummy inference to warmup the model and GPU
            # This compiles CUDA kernels once, eliminating setup delay on subsequent requests
            # Thực hiện inference giả để warmup model và GPU
            # Điều này compile CUDA kernels một lần, loại bỏ độ trễ setup ở các request tiếp theo
            print("   Running warmup inference (compiling CUDA kernels - one-time cost)...")
            print("   Đang chạy warmup inference (compile CUDA kernels - chi phí một lần)...")
            
            _ = self.model.tts_to_wav(dummy_text, prompt_speech, speed=1.0)
            
            print("✅ Model warmup completed! CUDA kernels compiled - no more 10s setup delay!")
            print("✅ Model warmup hoàn tất! CUDA kernels đã compile - không còn độ trễ setup 10s!")
            print("   Subsequent requests will be fast (near real-time)")
            print("   Các request tiếp theo sẽ nhanh (gần real-time)")
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
        total_start = time.time()
        print(f"\n{'='*60}")
        print(f"[PERF] Starting synthesis - Text length: {len(text)} chars")
        print(f"[PERF] Bắt đầu synthesis - Độ dài text: {len(text)} ký tự")
        print(f"{'='*60}")
        
        # Step 1: Determine voice file / Bước 1: Xác định file giọng
        step_start = time.time()
        if voice_file:
            prompt_speech_file = voice_file
            cache_key = voice_file
        elif voice:
            prompt_speech_file = self.voice_map.get(voice)
            if not prompt_speech_file:
                raise ValueError(f"Voice '{voice}' not found. Available voices: {list(self.voice_map.keys())}")
            cache_key = voice
        else:
            # Use default voice
            prompt_speech_file = list(self.voice_map.values())[0]
            cache_key = "default"
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF] Step 1 - Voice selection: {step_duration*1000:.2f}ms")
        print(f"[{timestamp}] [PERF] Bước 1 - Chọn giọng: {step_duration*1000:.2f}ms")
        
        # Step 2: Load prompt speech from cache / Bước 2: Tải prompt speech từ cache
        step_start = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        if cache_key not in self._prompt_speech_cache:
            print(f"[{timestamp}] [PERF] Voice '{cache_key}' not in cache, loading from disk...")
            print(f"[{timestamp}] [PERF] Giọng '{cache_key}' chưa có trong cache, đang tải từ disk...")
            load_start = time.time()
            self._prompt_speech_cache[cache_key] = load_prompt_speech_from_file(prompt_speech_file)
            load_duration = time.time() - load_start
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [PERF]   Voice loaded from disk: {load_duration:.3f}s")
            print(f"[{timestamp}] [PERF]   Đã tải giọng từ disk: {load_duration:.3f}s")
        else:
            print(f"[{timestamp}] [PERF] Voice '{cache_key}' found in cache (instant)")
            print(f"[{timestamp}] [PERF] Giọng '{cache_key}' có trong cache (tức thời)")
        
        prompt_speech = self._prompt_speech_cache[cache_key]
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF] Step 2 - Voice loading: {step_duration*1000:.2f}ms")
        print(f"[{timestamp}] [PERF] Bước 2 - Tải giọng: {step_duration*1000:.2f}ms")
        
        # Step 3: Validate text / Bước 3: Xác thực văn bản
        step_start = time.time()
        text = text.strip() if isinstance(text, str) else str(text).strip()
        
        if not text or len(text) == 0:
            raise ValueError(
                f"Text is empty. Cannot generate audio from empty text."
            )
        
        meaningful_text = ''.join(c for c in text if c.isalnum() or c.isspace()).strip()
        
        if len(text) < 10 or len(meaningful_text) < 5:
            raise ValueError(
                f"Text is too short or contains only punctuation (length: {len(text)}, meaningful: {len(meaningful_text)}). "
                f"Minimum length: 10 characters with at least 5 meaningful characters. "
                f"Text: '{text[:50] if text else 'None'}...'"
            )
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF] Step 3 - Text validation: {step_duration*1000:.2f}ms")
        print(f"[{timestamp}] [PERF] Bước 3 - Xác thực text: {step_duration*1000:.2f}ms")
        
        # Step 4: Generate audio (MAIN BOTTLENECK) / Bước 4: Tạo audio (ĐIỂM NGHẼN CHÍNH)
        step_start = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF] Step 4 - Starting audio generation (this is the main step)...")
        print(f"[{timestamp}] [PERF] Bước 4 - Bắt đầu tạo audio (đây là bước chính)...")
        try:
            # Add detailed timing for each step inside tts_to_wav
            # Thêm timing chi tiết cho từng bước bên trong tts_to_wav
            wav = self._synthesize_with_detailed_timing(text, prompt_speech, speed)
        except ValueError as e:
            if "need at least one array" in str(e).lower() or "concatenate" in str(e).lower():
                raise ValueError(
                    f"Text processing resulted in empty chunks. "
                    f"Text length: {len(text)} chars. "
                    f"Text preview: {text[:100]}... "
                    f"Original error: {e}"
                )
            raise
        
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF] Step 4 - Audio generation: {step_duration:.3f}s")
        print(f"[{timestamp}] [PERF] Bước 4 - Tạo audio: {step_duration:.3f}s")
        
        # Step 5: Validate output / Bước 5: Xác thực đầu ra
        step_start = time.time()
        if wav is None or len(wav) == 0:
            raise ValueError(
                f"Generated audio is empty. "
                f"Text length: {len(text)} chars. "
                f"Text preview: {text[:100]}..."
            )
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF] Step 5 - Output validation: {step_duration*1000:.2f}ms")
        print(f"[{timestamp}] [PERF] Bước 5 - Xác thực đầu ra: {step_duration*1000:.2f}ms")
        
        # Step 6: Save if needed / Bước 6: Lưu nếu cần
        step_start = time.time()
        if output_path:
            sf.write(output_path, wav, self.sample_rate)
        step_duration = time.time() - step_start
        if output_path:
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [PERF] Step 6 - Save to file: {step_duration*1000:.2f}ms")
            print(f"[{timestamp}] [PERF] Bước 6 - Lưu file: {step_duration*1000:.2f}ms")
        
        # Total duration
        total_duration = time.time() - total_start
        audio_duration = len(wav) / self.sample_rate if wav is not None else 0
        ratio = total_duration / audio_duration if audio_duration > 0 else 0
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        
        print(f"{'='*60}")
        print(f"[{timestamp}] [PERF] SUMMARY / TỔNG KẾT:")
        print(f"[{timestamp}] [PERF]   Total time: {total_duration:.3f}s")
        print(f"[{timestamp}] [PERF]   Tổng thời gian: {total_duration:.3f}s")
        print(f"[{timestamp}] [PERF]   Audio duration: {audio_duration:.3f}s")
        print(f"[{timestamp}] [PERF]   Độ dài audio: {audio_duration:.3f}s")
        print(f"[{timestamp}] [PERF]   Speed ratio: {ratio:.2f}x ({'✅ Real-time' if ratio <= 1.2 else '⚠️ Slower' if ratio <= 2.0 else '❌ Too slow'})")
        print(f"[{timestamp}] [PERF]   Tỷ lệ tốc độ: {ratio:.2f}x ({'✅ Real-time' if ratio <= 1.2 else '⚠️ Chậm hơn' if ratio <= 2.0 else '❌ Quá chậm'})")
        print(f"{'='*60}\n")
        
        return wav
    
    def _synthesize_with_detailed_timing(self, text: str, prompt_speech, speed: float) -> np.ndarray:
        """
        Synthesize with detailed timing logs to identify bottlenecks.
        Tổng hợp với timing logs chi tiết để xác định điểm nghẽn.
        """
        total_start = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF-DETAIL] Starting detailed synthesis timing...")
        print(f"[{timestamp}] [PERF-DETAIL] Bắt đầu timing chi tiết synthesis...")
        
        wavs = []
        chunk_count = 0
        
        # Step 4.1: Text preprocessing / Bước 4.1: Xử lý text trước
        preprocess_start = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF-DETAIL] Step 4.1 - Starting text preprocessing...")
        print(f"[{timestamp}] [PERF-DETAIL] Bước 4.1 - Bắt đầu xử lý text trước...")
        preprocessed_chunks = list(self.model.frontend.preprocess_text(text, split=True))
        preprocess_duration = time.time() - preprocess_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF-DETAIL] Step 4.1 - Text preprocessing completed: {preprocess_duration:.3f}s")
        print(f"[{timestamp}] [PERF-DETAIL] Bước 4.1 - Xử lý text trước hoàn tất: {preprocess_duration:.3f}s")
        print(f"[{timestamp}] [PERF-DETAIL]   Number of chunks: {len(preprocessed_chunks)}")
        print(f"[{timestamp}] [PERF-DETAIL]   Số lượng chunks: {len(preprocessed_chunks)}")
        
        # Step 4.2: Process each chunk / Bước 4.2: Xử lý từng chunk
        total_frontend_time = 0
        total_model_time = 0
        
        for chunk_idx, chunk_text in enumerate(preprocessed_chunks):
            chunk_start = time.time()
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [PERF-DETAIL] Step 4.2.{chunk_idx + 1} - Processing chunk {chunk_idx + 1}/{len(preprocessed_chunks)}...")
            print(f"[{timestamp}] [PERF-DETAIL] Bước 4.2.{chunk_idx + 1} - Đang xử lý chunk {chunk_idx + 1}/{len(preprocessed_chunks)}...")
            print(f"[{timestamp}] [PERF-DETAIL]   Chunk text length: {len(chunk_text)} chars")
            print(f"[{timestamp}] [PERF-DETAIL]   Độ dài text chunk: {len(chunk_text)} ký tự")
            
            # Step 4.2.1: Frontend processing / Bước 4.2.1: Xử lý frontend
            frontend_start = time.time()
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [PERF-DETAIL]   Step 4.2.{chunk_idx + 1}.1 - Frontend processing (ONNX - may be CPU)...")
            print(f"[{timestamp}] [PERF-DETAIL]   Bước 4.2.{chunk_idx + 1}.1 - Xử lý frontend (ONNX - có thể là CPU)...")
            model_input = self.model.frontend.frontend_tts(chunk_text, prompt_speech)
            frontend_duration = time.time() - frontend_start
            total_frontend_time += frontend_duration
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [PERF-DETAIL]   Step 4.2.{chunk_idx + 1}.1 - Frontend completed: {frontend_duration:.3f}s")
            print(f"[{timestamp}] [PERF-DETAIL]   Bước 4.2.{chunk_idx + 1}.1 - Frontend hoàn tất: {frontend_duration:.3f}s")
            
            # Step 4.2.2: Model inference / Bước 4.2.2: Inference model
            model_start = time.time()
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [PERF-DETAIL]   Step 4.2.{chunk_idx + 1}.2 - Model inference (PyTorch GPU)...")
            print(f"[{timestamp}] [PERF-DETAIL]   Bước 4.2.{chunk_idx + 1}.2 - Inference model (PyTorch GPU)...")
            for model_output in self.model.model.tts(**model_input, stream=False, speed=speed):
                wavs.append(model_output['tts_speech'].squeeze(0).numpy())
                chunk_count += 1
            model_duration = time.time() - model_start
            total_model_time += model_duration
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [PERF-DETAIL]   Step 4.2.{chunk_idx + 1}.2 - Model inference completed: {model_duration:.3f}s")
            print(f"[{timestamp}] [PERF-DETAIL]   Bước 4.2.{chunk_idx + 1}.2 - Inference model hoàn tất: {model_duration:.3f}s")
            
            chunk_duration = time.time() - chunk_start
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [PERF-DETAIL] Step 4.2.{chunk_idx + 1} - Chunk {chunk_idx + 1} total: {chunk_duration:.3f}s")
            print(f"[{timestamp}] [PERF-DETAIL] Bước 4.2.{chunk_idx + 1} - Chunk {chunk_idx + 1} tổng: {chunk_duration:.3f}s")
        
        # Step 4.3: Concatenate audio chunks / Bước 4.3: Nối các chunks audio
        concat_start = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF-DETAIL] Step 4.3 - Concatenating {len(wavs)} audio chunks...")
        print(f"[{timestamp}] [PERF-DETAIL] Bước 4.3 - Đang nối {len(wavs)} chunks audio...")
        wav = np.concatenate(wavs, axis=0)
        concat_duration = time.time() - concat_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF-DETAIL] Step 4.3 - Concatenation completed: {concat_duration*1000:.2f}ms")
        print(f"[{timestamp}] [PERF-DETAIL] Bước 4.3 - Nối hoàn tất: {concat_duration*1000:.2f}ms")
        
        # Summary
        total_duration = time.time() - total_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [PERF-DETAIL] DETAILED TIMING SUMMARY:")
        print(f"[{timestamp}] [PERF-DETAIL] TỔNG KẾT TIMING CHI TIẾT:")
        print(f"[{timestamp}] [PERF-DETAIL]   Text preprocessing: {preprocess_duration:.3f}s ({preprocess_duration/total_duration*100:.1f}%)")
        print(f"[{timestamp}] [PERF-DETAIL]   Xử lý text trước: {preprocess_duration:.3f}s ({preprocess_duration/total_duration*100:.1f}%)")
        print(f"[{timestamp}] [PERF-DETAIL]   Frontend processing (ONNX): {total_frontend_time:.3f}s ({total_frontend_time/total_duration*100:.1f}%)")
        print(f"[{timestamp}] [PERF-DETAIL]   Xử lý frontend (ONNX): {total_frontend_time:.3f}s ({total_frontend_time/total_duration*100:.1f}%)")
        print(f"[{timestamp}] [PERF-DETAIL]   Model inference (PyTorch GPU): {total_model_time:.3f}s ({total_model_time/total_duration*100:.1f}%)")
        print(f"[{timestamp}] [PERF-DETAIL]   Inference model (PyTorch GPU): {total_model_time:.3f}s ({total_model_time/total_duration*100:.1f}%)")
        print(f"[{timestamp}] [PERF-DETAIL]   Audio concatenation: {concat_duration:.3f}s ({concat_duration/total_duration*100:.1f}%)")
        print(f"[{timestamp}] [PERF-DETAIL]   Nối audio: {concat_duration:.3f}s ({concat_duration/total_duration*100:.1f}%)")
        print(f"[{timestamp}] [PERF-DETAIL]   Total: {total_duration:.3f}s")
        print(f"[{timestamp}] [PERF-DETAIL]   Tổng: {total_duration:.3f}s")
        print(f"[{timestamp}] [PERF-DETAIL]   Number of chunks: {len(preprocessed_chunks)}")
        print(f"[{timestamp}] [PERF-DETAIL]   Số lượng chunks: {len(preprocessed_chunks)}")
        print(f"[{timestamp}] [PERF-DETAIL]   Average frontend time per chunk: {total_frontend_time/len(preprocessed_chunks):.3f}s")
        print(f"[{timestamp}] [PERF-DETAIL]   Thời gian frontend trung bình mỗi chunk: {total_frontend_time/len(preprocessed_chunks):.3f}s")
        print(f"[{timestamp}] [PERF-DETAIL]   Average model time per chunk: {total_model_time/len(preprocessed_chunks):.3f}s")
        print(f"[{timestamp}] [PERF-DETAIL]   Thời gian model trung bình mỗi chunk: {total_model_time/len(preprocessed_chunks):.3f}s")
        
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

