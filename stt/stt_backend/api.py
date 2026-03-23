"""
STT API Endpoints
FastAPI routes for Speech-to-Text service
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel
from typing import Optional, Literal
import tempfile
import os
import logging

from .service import get_service

router = APIRouter()
logger = logging.getLogger(__name__)


# Request models
class STTTranscribeRequest(BaseModel):
    """STT transcription request"""
    language: Optional[str] = "en"  # Language code or "auto" for auto-detection
    task: Literal["transcribe", "translate"] = "transcribe"  # "transcribe" or "translate" (to English)
    beam_size: Optional[int] = 5
    vad_filter: Optional[bool] = True  # Voice Activity Detection
    return_timestamps: Optional[bool] = True
    word_timestamps: Optional[bool] = False  # Word-level timestamps (slower)


# Health check
@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        service = get_service()
        available = service.is_available()
        return {
            "status": "healthy" if available else "unhealthy",
            "service": "STT Backend",
            "available": available,
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return {
            "status": "unhealthy",
            "service": "STT Backend",
            "available": False,
            "error": str(e),
        }


# Transcribe audio file
@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Query("en", description="Language code (e.g., 'en', 'auto')"),
    task: Literal["transcribe", "translate"] = Query("transcribe", description="Task: transcribe or translate to English"),
    beam_size: int = Query(5, ge=1, le=20, description="Beam size for beam search"),
    vad_filter: bool = Query(True, description="Enable Voice Activity Detection"),
    return_timestamps: bool = Query(True, description="Return segment timestamps"),
    word_timestamps: bool = Query(False, description="Return word-level timestamps (slower)"),
):
    """
    Transcribe audio file to text
    
    Args:
        audio: Audio file (WAV, MP3, M4A, FLAC, etc.)
        language: Language code (e.g., "en", "es", "auto" for auto-detection)
        task: "transcribe" (same language) or "translate" (to English)
        beam_size: Beam size for beam search (1-20)
        vad_filter: Enable Voice Activity Detection (filters out silence)
        return_timestamps: Return segment-level timestamps
        word_timestamps: Return word-level timestamps (slower but more detailed)
        
    Returns:
        Transcription result with text, segments, and metadata
    """
    # Validate audio file
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Audio file is required")
    
    # Get service
    service = get_service()
    
    # Save uploaded file temporarily
    temp_file = None
    temp_file_path = None
    try:
        logger.info(f"Receiving audio file: {audio.filename}")
        
        # Create temporary file
        suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file_path = temp_file.name
            
            # Write uploaded content in chunks to avoid memory issues
            content = await audio.read()
            temp_file.write(content)
            temp_file.flush()
        
        logger.info(f"Received audio file: {audio.filename}, size: {len(content)} bytes")
        logger.info(f"Saved to temporary file: {temp_file_path}")
        
        # Transcribe
        result = service.transcribe(
            audio_path=temp_file_path,
            language=language if language != "auto" else None,
            task=task,
            beam_size=beam_size,
            vad_filter=vad_filter,
            return_timestamps=return_timestamps,
            word_timestamps=word_timestamps,
        )
        
        logger.info(f"Transcription completed: {len(result['text'])} characters")
        
        return {
            "success": True,
            "data": result,
        }
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temp file {temp_file_path}: {e}")


# Transcribe with JSON request body (alternative endpoint)
@router.post("/transcribe/json")
async def transcribe_audio_json(
    request: STTTranscribeRequest,
    audio: UploadFile = File(..., description="Audio file to transcribe"),
):
    """
    Transcribe audio file with JSON request body
    
    This is an alternative endpoint that accepts parameters in JSON body
    instead of query parameters.
    """
    # Get service
    service = get_service()
    
    # Save uploaded file temporarily
    temp_file = None
    try:
        # Create temporary file
        suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file_path = temp_file.name
            
            # Write uploaded content
            content = await audio.read()
            temp_file.write(content)
            temp_file.flush()
        
        logger.info(f"Received audio file: {audio.filename}, size: {len(content)} bytes")
        
        # Transcribe
        result = service.transcribe(
            audio_path=temp_file_path,
            language=request.language if request.language != "auto" else None,
            task=request.task,
            beam_size=request.beam_size or 5,
            vad_filter=request.vad_filter if request.vad_filter is not None else True,
            return_timestamps=request.return_timestamps if request.return_timestamps is not None else True,
            word_timestamps=request.word_timestamps if request.word_timestamps is not None else False,
        )
        
        logger.info(f"Transcription completed: {len(result['text'])} characters")
        
        return {
            "success": True,
            "data": result,
        }
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    finally:
        # Clean up temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
                logger.debug(f"Cleaned up temporary file: {temp_file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete temp file {temp_file_path}: {e}")

