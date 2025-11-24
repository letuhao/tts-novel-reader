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
from ..logging_utils import get_logger

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
module_logger = get_logger("tts_backend.vieneu.setup")

if not VIENEU_REPO_PATH.exists():
    raise ImportError(
        f"VieNeu-TTS repository not found at: {VIENEU_REPO_PATH}\n"
        f"Repository VieNeu-TTS không tìm thấy tại: {VIENEU_REPO_PATH}\n"
        f"Expected location: tts/VieNeu-TTS relative to project root: {PROJECT_ROOT}"
    )

if str(VIENEU_REPO_PATH) not in sys.path:
    sys.path.insert(0, str(VIENEU_REPO_PATH))
    module_logger.info("VieNeu-TTS repo added to path: %s", VIENEU_REPO_PATH)

# Import EXACTLY like working main.py does
# Import CHÍNH XÁC như main.py hoạt động làm
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

# Import chunking utilities at module level (not on every synthesize call)
# Import tiện ích chunking ở cấp module (không phải mỗi lần gọi synthesize)
from ..text_chunker import split_text_into_chunks, should_chunk_text


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
        # Get model path EXACTLY like main.py does (working version)
        # Lấy đường dẫn model CHÍNH XÁC như main.py làm (phiên bản hoạt động)
        if model_path:
            self.model_path = model_path
        elif USE_LOCAL_CONFIG:
            # Use config_local.get_backbone_repo() like the working test
            # Sử dụng config_local.get_backbone_repo() như test hoạt động
            self.model_path = get_backbone_repo()
        else:
            # Default to Hugging Face repo (matches main.py default: "pnnbao-ump/VieNeu-TTS")
            # Mặc định repo Hugging Face (khớp mặc định main.py: "pnnbao-ump/VieNeu-TTS")
            self.model_path = "pnnbao-ump/VieNeu-TTS"
        
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
        self.logger = get_logger("tts_backend.vieneu")
        self.logger.info("Using device: %s", self.device)
        self.logger.info("Loading VieNeu model from: %s", self.model_path)
        
        # Initialize EXACTLY like working main.py: VieNeuTTS(...)
        # Khởi tạo CHÍNH XÁC như main.py hoạt động: VieNeuTTS(...)
        self.model = VieNeuTTS(
            backbone_repo=self.model_path,
            backbone_device=self.device,
            codec_repo="neuphonic/neucodec",
            codec_device=self.device
        )
        
        self.logger.info("VieNeu-TTS loaded successfully")
        
        # Cache for reference audio encodings (key: ref_audio_path, value: ref_codes)
        # Cache cho mã hóa audio tham chiếu (key: ref_audio_path, value: ref_codes)
        self._ref_codes_cache = {}
    
    def synthesize(
        self,
        text: str,
        ref_audio_path: str,
        ref_text: str,
        output_path: Optional[str] = None,
        max_chars: int = 256,
        auto_chunk: bool = True,
        request_id: Optional[str] = None
    ) -> np.ndarray:
        """
        Synthesize speech - EXACTLY matches working main.py pattern.
        Tổng hợp giọng nói - KHỚP CHÍNH XÁC pattern main.py hoạt động.
        
        Simple and direct - no extra optimizations that might interfere.
        Đơn giản và trực tiếp - không có tối ưu hóa thêm có thể gây nhiễu.
        """
        # Cache reference encoding (encode once, reuse many times)
        # Cache mã hóa tham chiếu (mã hóa một lần, tái sử dụng nhiều lần)
        if ref_audio_path not in self._ref_codes_cache:
            self._ref_codes_cache[ref_audio_path] = self.model.encode_reference(ref_audio_path)
        ref_codes = self._ref_codes_cache[ref_audio_path]
        
        # Handle long text with chunking if needed
        # Xử lý văn bản dài với chunking nếu cần
        if auto_chunk and len(text) > max_chars:
            chunks = split_text_into_chunks(text, max_chars=max_chars)
            generated_segments = []
            for chunk in chunks:
                wav = self.model.infer(chunk, ref_codes, ref_text)
                generated_segments.append(wav)
            audio = np.concatenate(generated_segments)
        else:
            # Direct call - EXACTLY like working main.py: tts.infer(text, ref_codes, ref_text)
            # Gọi trực tiếp - CHÍNH XÁC như main.py hoạt động: tts.infer(text, ref_codes, ref_text)
            audio = self.model.infer(text, ref_codes, ref_text)
        
        if output_path:
            sf.write(output_path, audio, self.sample_rate)
        
        return audio
    
    def get_sample_rate(self) -> int:
        """Get sample rate / Lấy tần số lấy mẫu"""
        return self.sample_rate

