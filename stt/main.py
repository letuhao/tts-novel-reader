"""
STT Backend Service
Speech-to-Text backend using faster-whisper
"""
import sys
import os
from pathlib import Path

# Configure cuDNN PATH before any imports
# CTranslate2 (used by faster-whisper) loads cuDNN DLLs at import time
# Cấu hình PATH cuDNN trước mọi import
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
                        try:
                            os.add_dll_directory(cuda_str)
                        except AttributeError:
                            pass  # Python < 3.8
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
                        try:
                            os.add_dll_directory(cuda_str)
                        except AttributeError:
                            pass
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
                        try:
                            os.add_dll_directory(cudnn_str)
                        except AttributeError:
                            pass  # Python < 3.8
                return
        
        # Fallback: try common subdirectories
        for subdir in ["13.0", "12.9", "12.8", "12.1"]:
            cudnn_subdir = cudnn_v9_base / subdir
            if cudnn_subdir.exists() and (cudnn_subdir / "cudnn_ops64_9.dll").exists():
                cudnn_str = str(cudnn_subdir)
                if cudnn_str not in current_path:
                    os.environ["PATH"] = f"{cudnn_str};{current_path}"
                    if sys.platform == "win32":
                        try:
                            os.add_dll_directory(cudnn_str)
                        except AttributeError:
                            pass
                return
    
    # Fallback to cuDNN v8.9.7.29 (DLLs directly in bin)
    cudnn_v8_bin = Path(r"C:\Program Files\NVIDIA\CUDNN\v8.9.7.29\bin")
    if cudnn_v8_bin.exists() and (cudnn_v8_bin / "cudnn64_8.dll").exists():
        cudnn_str = str(cudnn_v8_bin)
        if cudnn_str not in current_path:
            os.environ["PATH"] = f"{cudnn_str};{current_path}"
            if sys.platform == "win32":
                try:
                    os.add_dll_directory(cudnn_str)
                except AttributeError:
                    pass

_setup_cudnn_path()

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging

# Import STT backend
from stt_backend.service import get_service
from stt_backend.api import router
from stt_backend.config import API_HOST, API_PORT, LOG_LEVEL

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="STT Backend",
    description="Speech-to-Text backend using faster-whisper with Whisper Large V3",
    version="1.0.0",
)

# Preload STT service at startup to avoid loading delay on first request
@app.on_event("startup")
async def startup_event():
    """Initialize STT service at startup"""
    logger.info("Starting STT Backend...")
    try:
        service = get_service()
        # Preload model
        service._load_model()
        logger.info("✅ STT Backend ready with faster-whisper-large-v3")
    except Exception as e:
        logger.error(f"Failed to initialize STT service: {e}", exc_info=True)
        logger.warning("Service will attempt to load model on first request")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include STT API routes
app.include_router(router, prefix="/api/stt", tags=["STT"])

# Health check endpoint (at root level)
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "STT Backend",
        "version": "1.0.0",
        "model": "faster-whisper-large-v3",
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "STT Backend",
        "version": "1.0.0",
        "model": "faster-whisper-large-v3",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "health": "/health",
            "api": "/api/stt",
            "transcribe": "POST /api/stt/transcribe",
            "transcribe_json": "POST /api/stt/transcribe/json",
        },
    }

if __name__ == "__main__":
    # Configure uvicorn logging
    uvicorn_log_level = LOG_LEVEL.lower()
    
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=False,  # Disable reload for background running
        log_level=uvicorn_log_level,
        access_log=True,
    )

