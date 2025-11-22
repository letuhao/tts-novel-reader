"""
VieNeu-TTS Model Wrapper
Wrapper cho Model VieNeu-TTS
"""
import sys
from pathlib import Path
from typing import Optional
import torch
import soundfile as sf
import numpy as np

# Add VieNeu-TTS repo to path
VIENEU_REPO_PATH = Path(__file__).parent.parent.parent.parent / "tts" / "VieNeu-TTS"
sys.path.insert(0, str(VIENEU_REPO_PATH))

from vieneu_tts import VieNeuTTS as VieNeuTTSModel
from config import ModelConfig


class VieNeuTTSWrapper:
    """Wrapper for VieNeu-TTS model / Wrapper cho model VieNeu-TTS"""
    
    def __init__(self, model_path: Optional[str] = None, device: Optional[str] = None):
        """
        Initialize VieNeu-TTS model / Khởi tạo model VieNeu-TTS
        
        Args:
            model_path: Path to local model directory / Đường dẫn đến thư mục model local
            device: Device to use (cuda/cpu/auto) / Thiết bị sử dụng
        """
        self.model_path = model_path or ModelConfig.VIENEU_TTS["model_path"]
        self.device = device or (ModelConfig.VIENEU_TTS["device"] if torch.cuda.is_available() else "cpu")
        self.sample_rate = ModelConfig.VIENEU_TTS["sample_rate"]
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load VieNeu-TTS model / Tải model VieNeu-TTS"""
        print(f"Loading VieNeu-TTS from: {self.model_path}")
        print(f"Đang tải VieNeu-TTS từ: {self.model_path}")
        
        self.model = VieNeuTTSModel(
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
        output_path: Optional[str] = None
    ) -> np.ndarray:
        """
        Synthesize speech / Tổng hợp giọng nói
        
        Args:
            text: Input text / Văn bản đầu vào
            ref_audio_path: Path to reference audio / Đường dẫn audio tham chiếu
            ref_text: Reference text / Văn bản tham chiếu
            output_path: Optional output path / Đường dẫn đầu ra tùy chọn
            
        Returns:
            Audio array / Mảng audio
        """
        # Encode reference audio / Mã hóa audio tham chiếu
        ref_codes = self.model.encode_reference(ref_audio_path)
        
        # Generate speech / Tạo giọng nói
        wav = self.model.infer(text, ref_codes, ref_text)
        
        # Save if output path provided / Lưu nếu có đường dẫn đầu ra
        if output_path:
            sf.write(output_path, wav, self.sample_rate)
        
        return wav
    
    def get_sample_rate(self) -> int:
        """Get sample rate / Lấy tần số lấy mẫu"""
        return self.sample_rate

