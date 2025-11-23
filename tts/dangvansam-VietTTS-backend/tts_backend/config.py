"""
TTS Backend Configuration
Cấu hình TTS Backend
"""
from pathlib import Path
from typing import Optional
import os

# Base paths / Đường dẫn cơ sở
# This backend is in tts/dangvansam-VietTTS-backend/tts_backend/config.py
# Go up 4 levels to project root: config -> tts_backend -> dangvansam-VietTTS-backend -> tts -> novel-reader
# Backend này ở trong tts/dangvansam-VietTTS-backend/tts_backend/config.py
# Đi lên 4 cấp để đến root dự án: config -> tts_backend -> dangvansam-VietTTS-backend -> tts -> novel-reader
BASE_DIR = Path(__file__).parent.parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
TTS_DIR = BASE_DIR / "tts"

# Model paths / Đường dẫn model
VIETTTS_MODEL_PATH = MODELS_DIR / "dangvansam-viet-tts"

# Repository paths / Đường dẫn repository
VIETTTS_REPO_PATH = TTS_DIR / "viet-tts"

# Device configuration / Cấu hình thiết bị
DEVICE = os.getenv("TTS_DEVICE", "cuda")  # cuda, cpu, auto

# Model configurations / Cấu hình model
class ModelConfig:
    """Model configuration / Cấu hình model"""
    
    # VietTTS config / Cấu hình VietTTS
    VIETTTS = {
        "model_path": str(VIETTTS_MODEL_PATH),
        "repo_path": str(VIETTTS_REPO_PATH),
        "sample_rate": 22050,
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

