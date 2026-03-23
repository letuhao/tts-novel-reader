"""
STT Service Client
Client for interacting with the STT (Speech-to-Text) backend service
"""

import logging
import httpx
from typing import Optional, Dict, Any
from src.config import get_settings

logger = logging.getLogger(__name__)


class STTService:
    """Client for STT backend API"""
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize STT service client
        
        Args:
            base_url: STT backend base URL (defaults to settings)
        """
        settings = get_settings()
        self.base_url = base_url or settings.stt_backend_url
        # Remove trailing slash if present
        self.base_url = self.base_url.rstrip('/')
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Check STT backend health
        
        Returns:
            Health check response
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.base_url}/health")
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as e:
            logger.error(f"STT health check failed: {e}")
            return {
                "status": "unhealthy",
                "available": False,
                "error": str(e),
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"STT health check HTTP error: {e.response.status_code}")
            return {
                "status": "unhealthy",
                "available": False,
                "error": f"HTTP {e.response.status_code}",
            }
    
    async def transcribe(
        self,
        audio_file_path: str,
        language: str = "en",
        task: str = "transcribe",
        return_timestamps: bool = True,
        word_timestamps: bool = False,
    ) -> Dict[str, Any]:
        """
        Transcribe audio file to text
        
        Args:
            audio_file_path: Path to audio file
            language: Language code (e.g., "en", "auto")
            task: "transcribe" or "translate"
            return_timestamps: Return segment-level timestamps
            word_timestamps: Return word-level timestamps (slower)
            
        Returns:
            Transcription result with text and metadata
        """
        try:
            # Read audio file
            with open(audio_file_path, "rb") as audio_file:
                files = {"audio": (audio_file.name, audio_file, "audio/wav")}
                
                params = {
                    "language": language,
                    "task": task,
                    "return_timestamps": return_timestamps,
                    "word_timestamps": word_timestamps,
                }
                
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"{self.base_url}/transcribe",
                        files=files,
                        params=params,
                    )
                    response.raise_for_status()
                    result = response.json()
                    
                    if result.get("success"):
                        return result.get("data", {})
                    else:
                        raise ValueError(f"STT transcription failed: {result}")
                        
        except FileNotFoundError:
            logger.error(f"Audio file not found: {audio_file_path}")
            raise
        except httpx.RequestError as e:
            logger.error(f"STT transcription request failed: {e}")
            raise
        except httpx.HTTPStatusError as e:
            logger.error(f"STT transcription HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"STT transcription error: {e}", exc_info=True)
            raise


# Global instance
_stt_service: Optional[STTService] = None


def get_stt_service() -> STTService:
    """Get global STT service instance"""
    global _stt_service
    if _stt_service is None:
        _stt_service = STTService()
    return _stt_service

