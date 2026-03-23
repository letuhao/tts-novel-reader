"""
STT Backend Configuration
Configuration for Speech-to-Text service
"""
from pathlib import Path
import os

# Base paths
BASE_DIR = Path(__file__).parent.parent.parent
MODELS_DIR = BASE_DIR / "models"

# Model path - Use existing faster-whisper-large-v3 model
FASTER_WHISPER_MODEL_PATH = MODELS_DIR / "faster-whisper-large-v3"

# Device configuration
DEVICE = os.getenv("STT_DEVICE", "cuda")  # cuda, cpu, auto

# Compute type (float16 for FP16, int8_float16 for INT8)
COMPUTE_TYPE = os.getenv("STT_COMPUTE_TYPE", "float16")  # float16, int8_float16, int8

# Default language
DEFAULT_LANGUAGE = os.getenv("STT_LANGUAGE", "en")

# API configuration
API_HOST = os.getenv("STT_API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("STT_API_PORT", "11210"))

# Logging
LOG_LEVEL = os.getenv("STT_LOG_LEVEL", "info")

# Model configuration
class ModelConfig:
    """Model configuration"""
    
    FASTER_WHISPER = {
        "model_path": str(FASTER_WHISPER_MODEL_PATH),
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
        "language": DEFAULT_LANGUAGE,
        "num_workers": int(os.getenv("STT_NUM_WORKERS", "4")),  # CPU workers for preprocessing
    }

