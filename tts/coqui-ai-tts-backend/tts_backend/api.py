"""
TTS API Endpoints
Điểm cuối API TTS
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal
import soundfile as sf
import io
import numpy as np
import uuid

from .service import get_service
from .storage import get_storage

router = APIRouter()

# Request models / Model yêu cầu
class TTSSynthesizeRequest(BaseModel):
    """TTS synthesis request / Yêu cầu tổng hợp TTS"""
    text: str
    model: Optional[Literal["xtts-english"]] = "xtts-english"
    # XTTS English parameters / Tham số XTTS tiếng Anh
    speaker_wav: Optional[str] = None  # Reference audio for voice cloning / Audio tham chiếu cho nhân bản giọng nói
    speaker: Optional[str] = None  # Built-in speaker name (e.g., "Ana Florence") / Tên giọng có sẵn (ví dụ: "Ana Florence")
    language: Optional[str] = "en"  # Language code (default: "en") / Mã ngôn ngữ (mặc định: "en")
    # Storage options / Tùy chọn lưu trữ
    store: Optional[bool] = True  # Store audio file / Lưu file audio
    expiry_hours: Optional[int] = None  # Expiration hours (None = use default)
    return_audio: Optional[bool] = True  # Return audio in response / Trả về audio trong response

class ModelInfoRequest(BaseModel):
    """Model info request / Yêu cầu thông tin model"""
    model: Literal["xtts-english"]

# Health check / Kiểm tra sức khỏe
@router.get("/health")
async def health_check():
    """Health check endpoint / Endpoint kiểm tra sức khỏe"""
    return {"status": "healthy", "service": "XTTS-v2 English TTS Backend"}

# Get speakers list / Lấy danh sách giọng nói
@router.get("/speakers")
async def get_speakers():
    """
    Get list of all available speakers / Lấy danh sách tất cả giọng nói có sẵn
    
    Returns:
        List of speaker names / Danh sách tên giọng nói
    """
    service = get_service()
    
    try:
        # Get XTTS model to access speakers
        xtts = service.get_xtts_english()
        
        # Access speakers from the TTS model
        if hasattr(xtts.tts, 'speakers') and xtts.tts.speakers:
            speakers = list(xtts.tts.speakers)
            return {
                "success": True,
                "total": len(speakers),
                "speakers": speakers
            }
        else:
            return {
                "success": False,
                "error": "Speakers not available"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get model info / Lấy thông tin model
@router.post("/model/info")
async def get_model_info(request: ModelInfoRequest):
    """
    Get model information / Lấy thông tin model
    
    Args:
        request: Model info request / Yêu cầu thông tin model
        
    Returns:
        Model information / Thông tin model
    """
    try:
        service = get_service()
        info = service.get_model_info(request.model)
        return {"success": True, "info": info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Synthesize speech / Tổng hợp giọng nói
@router.post("/synthesize")
async def synthesize_speech(request: TTSSynthesizeRequest):
    """
    Synthesize speech / Tổng hợp giọng nói
    
    Args:
        request: TTS synthesis request / Yêu cầu tổng hợp TTS
        
    Returns:
        Response with file info and optional audio / Phản hồi với thông tin file và audio tùy chọn
    """
    # Validate text input / Xác thực input văn bản
    text = request.text.strip() if request.text else ""
    
    if not text or len(text) == 0:
        raise HTTPException(
            status_code=400,
            detail="Text is empty. Cannot generate audio from empty text."
        )
    
    service = get_service()
    storage = get_storage()
    request_id = str(uuid.uuid4())
    
    try:
        # Synthesize audio
        # Tổng hợp audio
        audio = service.synthesize(
            text=text,
            model=request.model,
            speaker_wav=request.speaker_wav,
            speaker=request.speaker,
            language=request.language or "en"
        )
        
        model_info = service.get_model_info(request.model)
        sample_rate = model_info["sample_rate"]
        
        # Serialize audio
        # Tuần tự hóa audio
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, audio, sample_rate, format="WAV")
        audio_data = audio_buffer.getvalue()
        
        file_metadata = None
        if request.store:
            file_metadata = storage.save_audio(
                audio_data=audio_data,
                text=request.text,
                speaker_id=request.speaker_wav or "default",
                model=request.model,
                expiry_hours=request.expiry_hours,
                metadata={
                    "request_id": request_id,
                    "language": request.language or "en",
                    "sample_rate": sample_rate
                }
            )
        
        duration_seconds = len(audio) / sample_rate
        
        response_data = {
            "success": True,
            "request_id": request_id,
            "model": request.model,
            "sample_rate": sample_rate,
            "duration_seconds": duration_seconds,
            "file_metadata": file_metadata
        }
        
        # Return audio if requested
        # Trả về audio nếu được yêu cầu
        if request.return_audio:
            from fastapi.responses import Response
            return Response(
                content=audio_data,
                media_type="audio/wav",
                headers={
                    "X-Request-ID": request_id,
                    "X-Sample-Rate": str(sample_rate),
                    "X-Duration": str(duration_seconds)
                }
            )
        else:
            return response_data
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get audio file by ID / Lấy file audio theo ID
@router.get("/audio/{file_id}")
async def get_audio_file(file_id: str):
    """
    Get stored audio file by ID / Lấy file audio đã lưu theo ID
    
    Args:
        file_id: File ID / ID file
        
    Returns:
        Audio file or 404 if not found/expired / File audio hoặc 404 nếu không tìm thấy/hết hạn
    """
    storage = get_storage()
    
    audio_data = storage.get_audio(file_id)
    if not audio_data:
        raise HTTPException(status_code=404, detail="Audio file not found or expired")
    
    metadata = storage.get_metadata(file_id)
    
    from fastapi.responses import StreamingResponse
    audio_buffer = io.BytesIO(audio_data)
    audio_buffer.seek(0)
    
    return StreamingResponse(
        audio_buffer,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'attachment; filename="{metadata["file_name"]}"',
            "X-File-ID": file_id,
            "X-Expires-At": metadata["expires_at"]
        }
    )

# Get file metadata / Lấy metadata file
@router.get("/audio/{file_id}/metadata")
async def get_audio_metadata(file_id: str):
    """
    Get audio file metadata / Lấy metadata file audio
    
    Args:
        file_id: File ID / ID file
        
    Returns:
        File metadata / Metadata file
    """
    storage = get_storage()
    
    metadata = storage.get_metadata(file_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Audio file not found or expired")
    
    return {"success": True, "metadata": metadata}

# Delete audio file / Xóa file audio
@router.delete("/audio/{file_id}")
async def delete_audio_file(file_id: str):
    """
    Delete audio file / Xóa file audio
    
    Args:
        file_id: File ID / ID file
        
    Returns:
        Success status / Trạng thái thành công
    """
    storage = get_storage()
    
    success = storage.delete_audio(file_id)
    if not success:
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return {"success": True, "message": "Audio file deleted", "file_id": file_id}

# Get storage statistics / Lấy thống kê lưu trữ
@router.get("/storage/stats")
async def get_storage_stats():
    """
    Get storage statistics / Lấy thống kê lưu trữ
    
    Returns:
        Storage statistics / Thống kê lưu trữ
    """
    storage = get_storage()
    stats = storage.get_storage_stats()
    return {"success": True, "stats": stats}

# Manual cleanup / Dọn dẹp thủ công
@router.post("/storage/cleanup")
async def manual_cleanup():
    """
    Manually trigger cleanup of expired files / Kích hoạt dọn dẹp file hết hạn thủ công
    
    Returns:
        Cleanup statistics / Thống kê dọn dẹp
    """
    storage = get_storage()
    result = storage.cleanup_expired()
    return {"success": True, "cleanup": result}

