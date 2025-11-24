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
from .voice_selector import select_voice, get_available_voices
from .logging_utils import get_logger, PerformanceTracker

router = APIRouter()
logger = get_logger(__name__)

# Request models / Model yêu cầu
class TTSSynthesizeRequest(BaseModel):
    """TTS synthesis request / Yêu cầu tổng hợp TTS"""
    text: str
    model: Optional[Literal["vieneu-tts", "dia"]] = "vieneu-tts"
    # VieNeu-TTS voice selection options / Tùy chọn lựa chọn giọng VieNeu-TTS
    ref_audio_path: Optional[str] = None  # Custom reference audio / Audio tham chiếu tùy chỉnh
    ref_text: Optional[str] = None  # Custom reference text / Văn bản tham chiếu tùy chỉnh
    voice: Optional[str] = None  # Voice selection: "male", "female", or voice ID like "id_0002" / Lựa chọn giọng: "male", "female", hoặc ID giọng như "id_0002"
    auto_voice: Optional[bool] = False  # Auto-detect gender from text (like Dia) / Tự động phát hiện giới tính từ văn bản (giống Dia)
    # Dia-specific parameters / Tham số riêng Dia
    temperature: Optional[float] = 1.3
    top_p: Optional[float] = 0.95
    cfg_scale: Optional[float] = 3.0
    max_tokens: Optional[int] = None
    speed_factor: Optional[float] = 1.0  # Speech speed (0.8-1.0, 1.0 = normal/normal) / Tốc độ giọng nói
    trim_silence: Optional[bool] = True  # Trim silence from beginning and end (default: True) / Cắt im lặng ở đầu và cuối (mặc định: True)
    normalize: Optional[bool] = False  # Normalize audio volume (default: False) / Chuẩn hóa âm lượng audio (mặc định: False)
    # VieNeu-TTS long text parameters / Tham số văn bản dài VieNeu-TTS
    max_chars: Optional[int] = 256  # Max characters per chunk for long text (default: 256) / Ký tự tối đa mỗi chunk cho văn bản dài (mặc định: 256)
    auto_chunk: Optional[bool] = True  # Automatically chunk long text (default: True) / Tự động chia nhỏ văn bản dài (mặc định: True)
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

# Get available voices (for VieNeu-TTS) / Lấy danh sách giọng có sẵn (cho VieNeu-TTS)
@router.get("/voices")
async def get_voices():
    """
    Get list of available voices for VieNeu-TTS / Lấy danh sách giọng có sẵn cho VieNeu-TTS
    
    Returns:
        List of available voices with gender and description / Danh sách giọng có sẵn với giới tính và mô tả
    """
    voices = get_available_voices()
    return {
        "success": True,
        "voices": voices,
        "default_male": "id_0001",
        "default_female": "id_0002"
    }

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
    # Validate text input / Xác thực input văn bản
    text = request.text.strip() if request.text else ""
    
    # Check if text exists
    # Kiểm tra text có tồn tại không
    if not text or len(text) == 0:
        raise HTTPException(
            status_code=400,
            detail="Text is empty. Cannot generate audio from empty text."
        )
    
    # Check for meaningful content (ignore meaningless paragraphs like separator lines)
    # Kiểm tra nội dung có nghĩa (bỏ qua các đoạn văn vô nghĩa như dòng phân cách)
    meaningful_text = ''.join(c for c in text if c.isalnum() or c.isspace()).strip()
    
    # Detect meaningless paragraphs (only punctuation, separators, etc.)
    # Phát hiện các đoạn văn vô nghĩa (chỉ dấu câu, dấu phân cách, v.v.)
    if len(meaningful_text) < 5:
        # Check if it's a separator line (all dashes, equals, underscores, etc.)
        # Kiểm tra nếu là dòng phân cách (toàn dấu gạch ngang, dấu bằng, gạch dưới, v.v.)
        stripped_text = text.strip()
        if stripped_text:
            # Remove whitespace to check core characters
            # Loại bỏ khoảng trắng để kiểm tra ký tự cốt lõi
            core_text = ''.join(c for c in stripped_text if not c.isspace())
            if core_text:
                # Check if text contains only separator/decorator characters
                # Kiểm tra nếu text chỉ chứa ký tự phân cách/trang trí
                separator_chars = set('-=_~*#@$%^&+|\\/<>{}[]()')
                punctuation_chars = set('.,:;!?')
                if all(c in separator_chars or c in punctuation_chars for c in core_text):
                    # Return early with a skipped response (silent skip)
                    # Trả về sớm với phản hồi đã bỏ qua (bỏ qua im lặng)
                    from fastapi.responses import JSONResponse
                    request_id = str(uuid.uuid4())
                    return JSONResponse(
                        content={
                            "success": True,
                            "skipped": True,
                            "request_id": request_id,
                            "model": request.model,
                            "reason": "Meaningless paragraph (separator/decorator line) - skipped silently",
                            "sample_rate": 24000,
                            "duration_seconds": 0.0,
                            "file_metadata": None
                        },
                        headers={"X-Request-ID": request_id, "X-Skipped": "true"}
                    )
    
    # Original validation for very short text (but allow if it has meaningful content)
    # Xác thực gốc cho text quá ngắn (nhưng cho phép nếu có nội dung có nghĩa)
    if len(text) < 10 and len(meaningful_text) < 5:
        # Still skip silently if no meaningful content
        # Vẫn bỏ qua im lặng nếu không có nội dung có nghĩa
        from fastapi.responses import JSONResponse
        request_id = str(uuid.uuid4())
        return JSONResponse(
            content={
                "success": True,
                "skipped": True,
                "request_id": request_id,
                "model": request.model,
                "reason": "Text too short or contains only punctuation - skipped silently",
                "sample_rate": 24000,
                "duration_seconds": 0.0,
                "file_metadata": None
            },
            headers={"X-Request-ID": request_id, "X-Skipped": "true"}
        )
    
    service = get_service()
    storage = get_storage()
    request_id = str(uuid.uuid4())
    perf = PerformanceTracker(logger, request_id)
    perf.log("Received synthesize request", model=request.model, text_chars=len(text))

    try:
        with perf.stage("request_total", model=request.model):
            speaker_id = "default"
            if request.model == "dia" and text.startswith("["):
                end_idx = text.find("]")
                if end_idx > 0:
                    speaker_id = text[1:end_idx]
            
            params = {
                "text": text,  # Use validated text / Sử dụng text đã xác thực
                "model": request.model,
                "request_id": request_id,
            }
            
            if request.model == "vieneu-tts":
                params["max_chars"] = request.max_chars or 256
                params["auto_chunk"] = request.auto_chunk if request.auto_chunk is not None else True
                voice_strategy = "default"
                
                if request.voice or request.auto_voice:
                    voice_strategy = "selector"
                    with perf.stage("voice_selection", strategy="selector", voice=request.voice, auto=request.auto_voice):
                        ref_audio_path, ref_text_path = select_voice(
                            voice=request.voice,
                            auto_voice=request.auto_voice or False,
                            text=text
                        )
                        with open(ref_text_path, "r", encoding="utf-8") as f:
                            ref_text = f.read()
                        params["ref_audio_path"] = str(ref_audio_path)
                        params["ref_text"] = ref_text
                elif request.ref_audio_path and request.ref_text:
                    voice_strategy = "custom_reference"
                    params["ref_audio_path"] = request.ref_audio_path
                    params["ref_text"] = request.ref_text
                else:
                    with perf.stage("voice_selection", strategy="default"):
                        ref_audio_path, ref_text_path = select_voice(
                            voice=None,
                            auto_voice=False,
                            text=text
                        )
                        with open(ref_text_path, "r", encoding="utf-8") as f:
                            ref_text = f.read()
                        params["ref_audio_path"] = str(ref_audio_path)
                        params["ref_text"] = ref_text
                perf.log("Voice prepared", strategy=voice_strategy)
            elif request.model == "dia":
                params.update({
                    "temperature": request.temperature,
                    "top_p": request.top_p,
                    "cfg_scale": request.cfg_scale,
                    "max_tokens": request.max_tokens,
                    "speed_factor": request.speed_factor or 1.0,
                    "trim_silence": request.trim_silence if request.trim_silence is not None else True,
                    "normalize": request.normalize if request.normalize is not None else False
                })
            
            with perf.stage("synthesize_call", model=request.model):
                audio = service.synthesize(**params)
            
            model_info = service.get_model_info(request.model)
            sample_rate = model_info["sample_rate"]
            
            with perf.stage("serialize_audio"):
                audio_buffer = io.BytesIO()
                sf.write(audio_buffer, audio, sample_rate, format="WAV")
                audio_data = audio_buffer.getvalue()
            
            file_metadata = None
            if request.store:
                with perf.stage("storage_save"):
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
            
            duration_seconds = len(audio) / sample_rate
            perf.log(
                "Audio ready",
                duration_seconds=f"{duration_seconds:.2f}",
                sample_rate=sample_rate
            )
            
            response_data = {
                "success": True,
                "request_id": request_id,
                "model": request.model,
                "sample_rate": sample_rate,
                "duration_seconds": duration_seconds,
                "file_metadata": file_metadata
            }
            
            if request.return_audio:
                from fastapi.responses import StreamingResponse
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
                from fastapi.responses import JSONResponse
                headers = {}
                if file_metadata:
                    headers["X-Request-ID"] = request_id
                    headers["X-File-ID"] = file_metadata.get("file_id", "")
                    headers["X-Expires-At"] = file_metadata.get("expires_at", "")
                return JSONResponse(content=response_data, headers=headers)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Unhandled error during synthesis request %s", request_id)
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

