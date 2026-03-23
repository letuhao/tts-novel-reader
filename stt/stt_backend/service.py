"""
STT Service - faster-whisper wrapper
Speech-to-Text service using faster-whisper with Whisper Large V3
"""
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging
import os
import sys

# Configure cuDNN PATH before importing faster-whisper
# CTranslate2 (used by faster-whisper) loads cuDNN DLLs at import time
# Cấu hình PATH cuDNN trước khi import faster-whisper
# CTranslate2 (được sử dụng bởi faster-whisper) tải DLL cuDNN khi import

def _setup_cudnn_path():
    """Setup cuDNN and CUDA DLL paths for CTranslate2"""
    # Check for CUDA version in PATH to determine which cuDNN subdirectory to use
    cuda_versions = ["13.0", "12.9", "12.8", "12.1", "11.8"]
    detected_cuda = None
    
    current_path = os.environ.get("PATH", "")
    for cuda_ver in cuda_versions:
        if f"CUDA\\v{cuda_ver}" in current_path or f"CUDA/v{cuda_ver}" in current_path:
            detected_cuda = cuda_ver
            break
    
    # Add CUDA bin directories to PATH (CTranslate2 needs CUDA runtime DLLs)
    # Try CUDA 12.x first (what faster-whisper expects), then fallback to others
    cuda_bin_paths = [
        Path(r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.9\bin"),  # Has cublas64_12.dll
        Path(r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.8\bin"),
        Path(r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.1\bin"),
        Path(r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin"),  # Fallback (has cublas64_11.dll)
        Path(r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.0\bin"),  # Last resort
    ]
    
    for cuda_bin in cuda_bin_paths:
        if cuda_bin.exists():
            # Prefer CUDA 12.x DLLs (cublas64_12.dll) for faster-whisper compatibility
            cublas12_dll = cuda_bin / "cublas64_12.dll"
            if cublas12_dll.exists():
                cuda_str = str(cuda_bin)
                if cuda_str not in current_path:
                    os.environ["PATH"] = f"{cuda_str};{current_path}"
                    current_path = os.environ.get("PATH", "")  # Update for next checks
                    if sys.platform == "win32":
                        os.add_dll_directory(cuda_str)
                break
            # Fallback: check for any cublas DLL (11.x might work in some cases)
            cublas_dlls = list(cuda_bin.glob("cublas*.dll"))
            if cublas_dlls and cuda_bin == Path(r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin"):
                # Only use CUDA 11.8 as last resort if no 12.x found
                cuda_str = str(cuda_bin)
                if cuda_str not in current_path:
                    os.environ["PATH"] = f"{cuda_str};{current_path}"
                    current_path = os.environ.get("PATH", "")  # Update for next checks
                    if sys.platform == "win32":
                        os.add_dll_directory(cuda_str)
                break
    
    # Try cuDNN v9.16 first (has subdirectories for different CUDA versions)
    cudnn_v9_base = Path(r"C:\Program Files\NVIDIA\CUDNN\v9.16\bin")
    if cudnn_v9_base.exists():
        # Check for CUDA version subdirectories
        if detected_cuda:
            # Try exact match first (e.g., 13.0, 12.9)
            cudnn_subdir = cudnn_v9_base / detected_cuda
            if cudnn_subdir.exists() and (cudnn_subdir / "cudnn_ops64_9.dll").exists():
                cudnn_str = str(cudnn_subdir)
                if cudnn_str not in current_path:
                    os.environ["PATH"] = f"{cudnn_str};{current_path}"
                    if sys.platform == "win32":
                        os.add_dll_directory(cudnn_str)
                return
        
        # Fallback: try common subdirectories
        for subdir in ["13.0", "12.9", "12.8", "12.1"]:
            cudnn_subdir = cudnn_v9_base / subdir
            if cudnn_subdir.exists() and (cudnn_subdir / "cudnn_ops64_9.dll").exists():
                cudnn_str = str(cudnn_subdir)
                if cudnn_str not in current_path:
                    os.environ["PATH"] = f"{cudnn_str};{current_path}"
                    if sys.platform == "win32":
                        os.add_dll_directory(cudnn_str)
                return
    
    # Fallback to cuDNN v8.9.7.29 (DLLs directly in bin)
    cudnn_v8_bin = Path(r"C:\Program Files\NVIDIA\CUDNN\v8.9.7.29\bin")
    if cudnn_v8_bin.exists() and (cudnn_v8_bin / "cudnn64_8.dll").exists():
        cudnn_str = str(cudnn_v8_bin)
        if cudnn_str not in current_path:
            os.environ["PATH"] = f"{cudnn_str};{current_path}"
            if sys.platform == "win32":
                os.add_dll_directory(cudnn_str)

_setup_cudnn_path()

try:
    from faster_whisper import WhisperModel
except ImportError:
    raise ImportError(
        "faster-whisper is not installed. Install it with: pip install faster-whisper"
    )

from .config import ModelConfig

logger = logging.getLogger(__name__)


class STTService:
    """Speech-to-Text service using faster-whisper"""
    
    def __init__(self):
        """Initialize STT service with faster-whisper model"""
        self.model: Optional[WhisperModel] = None
        self.config = ModelConfig.FASTER_WHISPER
        self._model_loaded = False
        
    def _load_model(self):
        """Lazy load the model (only load when needed)"""
        if self._model_loaded and self.model is not None:
            return
            
        logger.info("Loading faster-whisper model...")
        logger.info(f"Model path: {self.config['model_path']}")
        logger.info(f"Device: {self.config['device']}")
        logger.info(f"Compute type: {self.config['compute_type']}")
        
        device = self.config["device"]
        compute_type = self.config["compute_type"]
        
        # Try to load with specified device
        try:
            self.model = WhisperModel(
                self.config["model_path"],
                device=device,
                compute_type=compute_type,
                num_workers=self.config["num_workers"],
            )
            self._model_loaded = True
            logger.info(f"✅ faster-whisper model loaded successfully on {device}")
        except Exception as e:
            # If CUDA fails and device is cuda, try CPU fallback
            if device == "cuda":
                logger.warning(f"Failed to load model on CUDA: {e}")
                logger.info("Attempting CPU fallback...")
                try:
                    # Use int8 for CPU (more efficient)
                    cpu_compute_type = "int8" if compute_type in ["float16", "int8_float16"] else "int8"
                    self.model = WhisperModel(
                        self.config["model_path"],
                        device="cpu",
                        compute_type=cpu_compute_type,
                        num_workers=self.config["num_workers"],
                    )
                    self._model_loaded = True
                    logger.info("✅ faster-whisper model loaded successfully on CPU (CUDA fallback)")
                except Exception as cpu_error:
                    logger.error(f"Failed to load model on CPU: {cpu_error}", exc_info=True)
                    raise
            else:
                logger.error(f"Failed to load faster-whisper model: {e}", exc_info=True)
                raise
    
    def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        task: str = "transcribe",  # "transcribe" or "translate"
        beam_size: int = 5,
        vad_filter: bool = True,
        return_timestamps: bool = True,
        word_timestamps: bool = False,
    ) -> Dict[str, Any]:
        """
        Transcribe audio file to text
        
        Args:
            audio_path: Path to audio file
            language: Language code (e.g., "en"). If None, auto-detect
            task: "transcribe" or "translate" (to English)
            beam_size: Beam size for beam search
            vad_filter: Enable Voice Activity Detection
            return_timestamps: Return segment timestamps
            word_timestamps: Return word-level timestamps (slower)
            
        Returns:
            Dictionary with transcription results
        """
        # Load model if not already loaded
        self._load_model()
        
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        # Use default language if not specified
        transcribe_language = language or self.config["language"]
        
        # Handle "auto" language detection
        transcribe_language_param = None if (transcribe_language == "auto" or transcribe_language is None) else transcribe_language
        
        logger.info(f"Transcribing audio: {audio_path}")
        logger.debug(f"Language: {transcribe_language} (param: {transcribe_language_param}), Task: {task}, VAD: {vad_filter}")
        
        try:
            # Transcribe audio
            segments, info = self.model.transcribe(
                audio_path,
                language=transcribe_language_param,
                task=task,
                beam_size=beam_size,
                vad_filter=vad_filter,
                word_timestamps=word_timestamps,
            )
            
            # Collect segments
            segment_list: List[Dict[str, Any]] = []
            full_text_parts: List[str] = []
            
            for segment in segments:
                segment_data: Dict[str, Any] = {
                    "text": segment.text.strip(),
                    "start": float(segment.start),
                    "end": float(segment.end),
                }
                
                if word_timestamps and hasattr(segment, "words"):
                    segment_data["words"] = [
                        {
                            "word": word.word,
                            "start": float(word.start),
                            "end": float(word.end),
                            "probability": float(word.probability),
                        }
                        for word in segment.words
                    ]
                
                segment_list.append(segment_data)
                full_text_parts.append(segment_data["text"])
            
            # Combine all text
            full_text = " ".join(full_text_parts)
            
            result: Dict[str, Any] = {
                "text": full_text,
                "language": info.language,
                "language_probability": float(info.language_probability) if hasattr(info, "language_probability") else None,
                "segments": segment_list,
            }
            
            logger.info(f"Transcription completed: {len(full_text)} characters, {len(segment_list)} segments")
            
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}", exc_info=True)
            raise
    
    def is_available(self) -> bool:
        """Check if STT service is available"""
        try:
            self._load_model()
            return self.model is not None
        except Exception:
            return False


# Singleton instance
_stt_service_instance: Optional[STTService] = None


def get_service() -> STTService:
    """Get STT service singleton"""
    global _stt_service_instance
    if _stt_service_instance is None:
        _stt_service_instance = STTService()
    return _stt_service_instance

