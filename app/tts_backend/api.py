"""
TTS API Endpoints
Điểm cuối API TTS
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
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
    model: Optional[Literal["vieneu-tts", "dia"]] = "vieneu-tts"
    ref_audio_path: Optional[str] = None
    ref_text: Optional[str] = None
    # Dia-specific parameters / Tham số riêng Dia
    temperature: Optional[float] = 1.3
    top_p: Optional[float] = 0.95
    cfg_scale: Optional[float] = 3.0
    max_tokens: Optional[int] = None
    speed_factor: Optional[float] = 1.0  # Speech speed (0.8-1.0, 1.0 = normal/normal) / Tốc độ giọng nói
    trim_silence: Optional[bool] = True  # Trim silence from beginning and end (default: True) / Cắt im lặng ở đầu và cuối (mặc định: True)
    normalize: Optional[bool] = False  # Normalize audio volume (default: False) / Chuẩn hóa âm lượng audio (mặc định: False)
    # Storage options / Tùy chọn lưu trữ
    store: Optional[bool] = True  # Store audio file / Lưu file audio
    expiry_hours: Optional[int] = None  # Expiration hours (None = use default)
    return_audio: Optional[bool] = True  # Return audio in response / Trả về audio trong response

class ModelInfoRequest(BaseModel):
    """Model info request / Yêu cầu thông tin model"""
    model: Literal["vieneu-tts", "dia"]

# Health check / Kiểm tra sức khỏe
@router.get("/health")
async def health_check():
    """Health check endpoint / Endpoint kiểm tra sức khỏe"""
    return {"status": "healthy", "service": "TTS Backend"}

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
    
    Optimized for microservice usage:
    - Returns file ID and metadata for storage management
    - Supports expiration time management
    - Optional audio streaming
    
    Tối ưu cho sử dụng microservice:
    - Trả về ID file và metadata để quản lý lưu trữ
    - Hỗ trợ quản lý thời gian hết hạn
    - Tùy chọn streaming audio
    
    Args:
        request: TTS synthesis request / Yêu cầu tổng hợp TTS
        
    Returns:
        Response with file info and optional audio / Phản hồi với thông tin file và audio tùy chọn
    """
    try:
        service = get_service()
        storage = get_storage()
        
        # Generate request ID for tracking / Tạo request ID để theo dõi
        request_id = str(uuid.uuid4())
        
        # Extract speaker ID from text if Dia model / Trích xuất speaker ID từ text nếu model Dia
        speaker_id = "default"
        if request.model == "dia" and request.text.startswith("["):
            # Extract speaker ID from [SpeakerID] format / Trích xuất speaker ID từ định dạng [SpeakerID]
            end_idx = request.text.find("]")
            if end_idx > 0:
                speaker_id = request.text[1:end_idx]
        
        # Prepare parameters / Chuẩn bị tham số
        params = {
            "text": request.text,
            "model": request.model
        }
        
        if request.model == "vieneu-tts":
            if not request.ref_audio_path or not request.ref_text:
                raise HTTPException(
                    status_code=400,
                    detail="VieNeu-TTS requires ref_audio_path and ref_text"
                )
            params["ref_audio_path"] = request.ref_audio_path
            params["ref_text"] = request.ref_text
        elif request.model == "dia":
            params.update({
                "temperature": request.temperature,
                "top_p": request.top_p,
                "cfg_scale": request.cfg_scale,
                "max_tokens": request.max_tokens,
                "speed_factor": request.speed_factor or 1.0,  # Default normal speed (matches preset)
                "trim_silence": request.trim_silence if request.trim_silence is not None else True,  # Default to True for API, but worker will pass False
                "normalize": request.normalize if request.normalize is not None else False  # Default to False
            })
        
        # Generate audio / Tạo audio
        audio = service.synthesize(**params)
        
        # Get sample rate / Lấy tần số lấy mẫu
        model_info = service.get_model_info(request.model)
        sample_rate = model_info["sample_rate"]
        
        # Convert to bytes / Chuyển đổi sang bytes
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, audio, sample_rate, format="WAV")
        audio_data = audio_buffer.getvalue()
        
        # Store audio if requested / Lưu audio nếu được yêu cầu
        file_metadata = None
        if request.store:
            file_metadata = storage.save_audio(
                audio_data=audio_data,
                text=request.text,
                speaker_id=speaker_id,
                model=request.model,
                expiry_hours=request.expiry_hours,
                metadata={
                    "request_id": request_id,
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "cfg_scale": request.cfg_scale,
                    "sample_rate": sample_rate
                }
            )
        
        # Prepare response / Chuẩn bị phản hồi
        response_data = {
            "success": True,
            "request_id": request_id,
            "model": request.model,
            "sample_rate": sample_rate,
            "duration_seconds": len(audio) / sample_rate,
            "file_metadata": file_metadata
        }
        
        # Return audio in response if requested / Trả về audio trong phản hồi nếu được yêu cầu
        if request.return_audio:
            from fastapi.responses import JSONResponse
            from fastapi.responses import StreamingResponse
            
            # Return as JSON with base64 audio or as streaming response
            # For now, stream the audio directly
            audio_buffer = io.BytesIO(audio_data)
            audio_buffer.seek(0)
            
            return StreamingResponse(
                audio_buffer,
                media_type="audio/wav",
                headers={
                    "Content-Disposition": f'attachment; filename="{file_metadata["file_name"] if file_metadata else "output.wav"}"',
                    "X-Request-ID": request_id,
                    "X-File-ID": file_metadata["file_id"] if file_metadata else "",
                    "X-Expires-At": file_metadata["expires_at"] if file_metadata else "",
                }
            )
        else:
            # Return metadata only / Chỉ trả về metadata
            from fastapi.responses import JSONResponse
            # Add headers for consistency with StreamingResponse / Thêm headers để nhất quán với StreamingResponse
            headers = {}
            if file_metadata:
                headers["X-Request-ID"] = request_id
                headers["X-File-ID"] = file_metadata.get("file_id", "")
                headers["X-Expires-At"] = file_metadata.get("expires_at", "")
            return JSONResponse(content=response_data, headers=headers)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
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

