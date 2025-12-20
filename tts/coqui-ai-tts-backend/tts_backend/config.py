"""
TTS Backend Configuration
Cấu hình TTS Backend
"""
from pathlib import Path
from typing import Optional
import os

# Base paths / Đường dẫn cơ sở
# This backend is in tts/coqui-ai-tts-backend/tts_backend/config.py
# Go up 4 levels to project root: config -> tts_backend -> coqui-ai-tts-backend -> tts -> novel-reader
# Backend này ở trong tts/coqui-ai-tts-backend/tts_backend/config.py
# Đi lên 4 cấp để đến root dự án: config -> tts_backend -> coqui-ai-tts-backend -> tts -> novel-reader
BASE_DIR = Path(__file__).parent.parent.parent.parent
MODELS_DIR = BASE_DIR / "models"
TTS_DIR = BASE_DIR / "tts"

# Model paths / Đường dẫn model
XTTS_ENGLISH_MODEL_PATH = MODELS_DIR / "coqui-XTTS-v2"

# Repository paths / Đường dẫn repository
COQUI_TTS_REPO_PATH = TTS_DIR / "coqui-ai-TTS"

# Device configuration / Cấu hình thiết bị
DEVICE = os.getenv("TTS_DEVICE", "cuda")  # cuda, cpu, auto

# Model configurations / Cấu hình model
class ModelConfig:
    """Model configuration / Cấu hình model"""
    
    # XTTS-v2 English config / Cấu hình XTTS-v2 tiếng Anh
    XTTS_ENGLISH = {
        "model_path": str(XTTS_ENGLISH_MODEL_PATH),
        "repo_path": str(COQUI_TTS_REPO_PATH),
        "sample_rate": 24000,
        "device": DEVICE,
    }

# API configuration / Cấu hình API
API_HOST = os.getenv("API_HOST", "0.0.0.0")
# Default port 11111 (same as other TTS backends - only one TTS backend runs at a time)
# Cổng mặc định 11111 (giống các TTS backend khác - chỉ một TTS backend chạy tại một thời điểm)
API_PORT = int(os.getenv("API_PORT", "11111"))
API_RELOAD = os.getenv("API_RELOAD", "true").lower() == "true"

# Storage configuration / Cấu hình Lưu trữ
STORAGE_DIR = os.getenv("TTS_STORAGE_DIR", str(BASE_DIR / "storage" / "audio"))
# Short-term cache: 2 hours for temporary storage before client downloads
# Cache ngắn hạn: 2 giờ để lưu trữ tạm thời trước khi client tải xuống
DEFAULT_EXPIRY_HOURS = int(os.getenv("TTS_DEFAULT_EXPIRY_HOURS", "2"))  # Changed from 24 to 2 hours
CLEANUP_INTERVAL_MINUTES = int(os.getenv("TTS_CLEANUP_INTERVAL_MINUTES", "30"))  # More frequent cleanup

