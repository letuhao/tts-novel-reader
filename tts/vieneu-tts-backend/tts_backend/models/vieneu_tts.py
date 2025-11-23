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
        
        print("✅ VieNeu-TTS loaded successfully")
        print("✅ VieNeu-TTS đã được tải thành công")
    
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
                wav = self.model.infer(chunk, ref_codes, ref_text)
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
            wav = self.model.infer(text, ref_codes, ref_text)
            
            # Save if output path provided / Lưu nếu có đường dẫn đầu ra
            if output_path:
                sf.write(output_path, wav, self.sample_rate)
            
            return wav
    
    def get_sample_rate(self) -> int:
        """Get sample rate / Lấy tần số lấy mẫu"""
        return self.sample_rate

