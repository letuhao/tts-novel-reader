"""
TTS Backend Configuration
Cấu hình TTS Backend
"""
from pathlib import Path
from typing import Optional
import os

# Base paths / Đường dẫn cơ sở
BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
TTS_DIR = BASE_DIR / "tts"

# Model paths / Đường dẫn model
VIENEU_TTS_MODEL_PATH = MODELS_DIR / "vieneu-tts"
DIA_MODEL_PATH = MODELS_DIR / "dia-finetuning-vnese"

# Repository paths / Đường dẫn repository
VIENEU_TTS_REPO_PATH = TTS_DIR / "VieNeu-TTS"
DIA_REPO_PATH = TTS_DIR / "Dia-Finetuning-Vietnamese"

# Configuration paths / Đường dẫn cấu hình
DIA_CONFIG_PATH = DIA_MODEL_PATH / "config_inference.json"
DIA_CHECKPOINT_PATH = DIA_MODEL_PATH / "model.safetensors"

# Device configuration / Cấu hình thiết bị
DEVICE = os.getenv("TTS_DEVICE", "cuda")  # cuda, cpu, auto

# Model configurations / Cấu hình model
class ModelConfig:
    """Model configuration / Cấu hình model"""
    
    # VieNeu-TTS config / Cấu hình VieNeu-TTS
    VIENEU_TTS = {
        "model_path": str(VIENEU_TTS_MODEL_PATH),
        "repo_path": str(VIENEU_TTS_REPO_PATH),
        "sample_rate": 24000,
        "device": DEVICE,
    }
    
    # Dia TTS config / Cấu hình Dia TTS
    DIA = {
        "model_path": str(DIA_MODEL_PATH),
        "repo_path": str(DIA_REPO_PATH),
        "config_path": str(DIA_CONFIG_PATH),
        "checkpoint_path": str(DIA_CHECKPOINT_PATH),
        "sample_rate": 44100,
        "device": DEVICE,
    }

# API configuration / Cấu hình API
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "11111"))
API_RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"

# Storage configuration / Cấu hình Lưu trữ
STORAGE_DIR = os.getenv("TTS_STORAGE_DIR", str(BASE_DIR / "storage" / "audio"))
# Short-term cache: 2 hours for temporary storage before client downloads
# Cache ngắn hạn: 2 giờ để lưu trữ tạm thời trước khi client tải xuống
DEFAULT_EXPIRY_HOURS = int(os.getenv("TTS_DEFAULT_EXPIRY_HOURS", "2"))  # Changed from 24 to 2 hours
CLEANUP_INTERVAL_MINUTES = int(os.getenv("TTS_CLEANUP_INTERVAL_MINUTES", "30"))  # More frequent cleanup

