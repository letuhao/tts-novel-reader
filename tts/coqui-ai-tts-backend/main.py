"""
TTS Backend Service
Dịch vụ TTS Backend

This backend uses Coqui TTS (XTTS-v2) for English text-to-speech.
Backend này sử dụng Coqui TTS (XTTS-v2) cho text-to-speech tiếng Anh.
"""
import sys
import os
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

# Import TTS backend
from tts_backend.service import get_service
from tts_backend.api import router

# Lifespan event handler / Xử lý sự kiện vòng đời
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler / Xử lý sự kiện vòng đời"""
    # Startup / Khởi động
    print("Starting Coqui TTS (XTTS-v2) Backend...")
    print("Đang khởi động Coqui TTS (XTTS-v2) Backend...")
    service = get_service()
    print(f"✅ TTS Backend ready with default model: {service.default_model}")
    print(f"✅ TTS Backend sẵn sàng với model mặc định: {service.default_model}")
    
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
    title="Coqui TTS (XTTS-v2) English Backend",
    description="TTS backend supporting Coqui XTTS-v2 for English text-to-speech",
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
        "service": "Coqui TTS (XTTS-v2) English Backend",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint / Endpoint gốc"""
    return {
        "service": "Coqui TTS (XTTS-v2) English Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    # Run server
    import logging
    
    # Configure logging level based on environment
    log_level = os.getenv("TTS_LOG_LEVEL", "warning").lower()
    
    # Set uvicorn log level
    uvicorn_log_level = os.getenv("TTS_LOG_LEVEL", "warning")
    
    from tts_backend.config import API_HOST, API_PORT
    
    uvicorn.run(
        "main:app",
        host=API_HOST,
        port=API_PORT,
        reload=False,  # Disable reload for background running
        log_level=uvicorn_log_level,
        access_log=False  # Disable access logs for silent mode
    )

