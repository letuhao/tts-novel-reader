"""
TTS Service Client
Client for TTS Backend API
"""

import logging
import os
import httpx
from typing import Dict, Any, Optional
from src.config import get_settings

logger = logging.getLogger(__name__)


async def synthesize_speech(
    text: str,
    model: str = "xtts-english",
    speaker: str = "default",
    language: str = "en",
    return_audio: bool = False,
    store: bool = True,
    expiry_hours: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Synthesize speech using Coqui TTS (XTTS-v2) backend
    
    Args:
        text: Text to synthesize
        model: TTS model ("xtts-english", "coqui-xtts-v2", "coqui-tts", or "xtts-v2")
        speaker: Speaker name (for voice selection)
        language: Language code (default: "en" for English)
        return_audio: Whether to return audio in response (False = metadata only)
        store: Whether to store audio file
        expiry_hours: Audio file expiration hours
        
    Returns:
        Dictionary with file_metadata and audio info
    """
    settings = get_settings()
    tts_url = settings.tts_backend_url
    
    # Prepare request for Coqui XTTS backend
    request_data = {
        "text": text,
        "model": model,  # "xtts-english", "coqui-xtts-v2", etc.
        "language": language,  # Default to English
        "store": store,
        "return_audio": return_audio,  # False to get metadata only
    }
    
    # Add speaker if provided (speaker name or speaker_wav for voice cloning)
    if speaker:
        # Check if it's a file path (voice cloning) or speaker name
        if speaker.startswith('/') or '\\' in speaker or '.' in speaker:
            # It's a file path - use speaker_wav for voice cloning
            request_data["speaker_wav"] = speaker
        else:
            # It's a speaker name - use speaker parameter
            request_data["speaker"] = speaker
    
    if expiry_hours is not None:
        request_data["expiry_hours"] = expiry_hours
    
    # Note: XTTS doesn't support speed_factor directly
    
    endpoint = f"{tts_url}/api/tts/synthesize"
    
    try:
        logger.info(f"Calling TTS API: {endpoint} (model={model}, text_length={len(text)})")
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(endpoint, json=request_data)
            response.raise_for_status()
            
            # Parse response
            if return_audio:
                # Response is audio stream, extract metadata from headers
                file_id = response.headers.get("X-File-ID", "")
                expires_at = response.headers.get("X-Expires-At", "")
                request_id = response.headers.get("X-Request-ID", "")
                
                # Read audio data (if needed)
                audio_data = await response.aread()
                
                result = {
                    "success": True,
                    "request_id": request_id,
                    "file_id": file_id,
                    "expires_at": expires_at,
                    "audio_data": audio_data,
                    "file_metadata": {
                        "file_id": file_id,
                        "expires_at": expires_at,
                    } if file_id else None,
                }
            else:
                # Response is JSON with metadata (when return_audio=False)
                result = response.json()
                # Backend returns: { success, request_id, model, sample_rate, duration_seconds, file_metadata }
                # file_metadata contains: { file_id, expires_at, ... }
                # Extract file_id and other fields for compatibility
                if "file_metadata" in result and result["file_metadata"]:
                    # Ensure file_id is at top level for easier access
                    result["file_id"] = result["file_metadata"].get("file_id")
                    result["expires_at"] = result["file_metadata"].get("expires_at")
                    result["duration_seconds"] = result.get("duration_seconds", 0)
                    result["sample_rate"] = result.get("sample_rate", 24000)
            
            logger.info(f"TTS API response: file_id={result.get('file_id', result.get('file_metadata', {}).get('file_id', 'N/A'))}")
            return result
            
    except httpx.HTTPStatusError as e:
        logger.error(f"TTS API HTTP error: {e.response.status_code} - {e.response.text}")
        raise Exception(f"TTS API error: {e.response.status_code}")
    except httpx.TimeoutException:
        logger.error("TTS API timeout")
        raise Exception("TTS API timeout")
    except Exception as e:
        logger.error(f"TTS API error: {e}", exc_info=True)
        raise


async def get_audio_url(file_id: str) -> str:
    """
    Get audio file URL
    
    Args:
        file_id: Audio file ID
        
    Returns:
        Audio file URL
    """
    settings = get_settings()
    tts_url = settings.tts_backend_url
    return f"{tts_url}/api/tts/audio/{file_id}"


async def check_tts_health() -> bool:
    """
    Check if TTS backend is healthy
    
    Returns:
        True if healthy, False otherwise
    """
    settings = get_settings()
    tts_url = settings.tts_backend_url
    # Health check endpoint is /health, not /api/tts/health (matches TypeScript code)
    endpoint = f"{tts_url}/health"
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(endpoint)
            response.raise_for_status()
            return True
    except Exception as e:
        logger.warning(f"TTS health check failed: {e}")
        return False

