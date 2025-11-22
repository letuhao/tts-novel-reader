"""
TTS Backend Service
Dịch vụ TTS Backend
"""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import TTS backend
from tts_backend.service import TTSService
from tts_backend.api import router

# Create FastAPI app
app = FastAPI(
    title="Vietnamese TTS Backend",
    description="Unified TTS backend supporting VieNeu-TTS and Dia-Finetuning-Vietnamese",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include TTS API routes
app.include_router(router, prefix="/api/tts", tags=["TTS"])

# Health check endpoint (at root level)
@app.get("/health")
async def health_check():
    """Health check endpoint / Endpoint kiểm tra sức khỏe"""
    return {
        "status": "healthy",
        "service": "Vietnamese TTS Backend",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint / Endpoint gốc"""
    return {
        "service": "Vietnamese TTS Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    # Run server
    import logging
    import atexit
    
    # Register cleanup on exit / Đăng ký dọn dẹp khi thoát
    def cleanup_on_exit():
        from tts_backend.storage import get_storage
        try:
            storage = get_storage()
            storage.shutdown()
        except Exception:
            pass
    
    atexit.register(cleanup_on_exit)
    
    # Configure logging level based on environment
    log_level = os.getenv("TTS_LOG_LEVEL", "warning").lower()
    log_level_map = {
        "debug": logging.DEBUG,
        "info": logging.INFO,
        "warning": logging.WARNING,
        "error": logging.ERROR,
        "critical": logging.CRITICAL
    }
    
    # Set uvicorn log level
    uvicorn_log_level = os.getenv("TTS_LOG_LEVEL", "warning")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Disable reload for background running
        log_level=uvicorn_log_level,
        access_log=False  # Disable access logs for silent mode
    )

