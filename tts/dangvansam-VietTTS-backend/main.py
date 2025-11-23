"""
TTS Backend Service
Dịch vụ TTS Backend

This backend uses VietTTS's working environment setup for 100% compatibility.
Backend này sử dụng setup môi trường của VietTTS để đảm bảo 100% tương thích.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import TTS backend
from tts_backend.service import get_service
from tts_backend.api import router

# Preload TTS service at startup to avoid loading delay on first request
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler / Xử lý sự kiện vòng đời"""
    # Startup / Khởi động
    print("=" * 50)
    print("Starting TTS Backend (using VietTTS environment)...")
    print("Đang khởi động TTS Backend (sử dụng môi trường VietTTS)...")
    print("=" * 50)
    
    # Initialize service and preload default model
    service = get_service()
    print("✅ TTS Backend ready!")
    print("✅ TTS Backend sẵn sàng!")
    print("=" * 50)
    
    yield
    
    # Shutdown / Tắt
    from tts_backend.storage import get_storage
    try:
        storage = get_storage()
        storage.shutdown()
    except Exception:
        pass

# Create FastAPI app
app = FastAPI(
    title="Vietnamese TTS Backend (DangVanSam VietTTS)",
    description="Unified TTS backend supporting DangVanSam VietTTS (using VietTTS environment)",
    version="1.0.0",
    lifespan=lifespan
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
        "service": "Vietnamese TTS Backend (DangVanSam VietTTS)",
        "version": "1.0.0",
        "environment": "VietTTS compatible"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint / Endpoint gốc"""
    return {
        "service": "Vietnamese TTS Backend (DangVanSam VietTTS)",
        "version": "1.0.0",
        "environment": "VietTTS compatible",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    # Run server
    import logging
    
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
        port=11111,
        reload=False,  # Disable reload for background running
        log_level=uvicorn_log_level,
        access_log=False  # Disable access logs for silent mode
    )

