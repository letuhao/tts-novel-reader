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
import time
from datetime import datetime
import traceback  # For detailed error logging / Để log lỗi chi tiết

from .service import get_service
from .storage import get_storage

router = APIRouter()

# Request models / Model yêu cầu
class TTSSynthesizeRequest(BaseModel):
    """TTS synthesis request / Yêu cầu tổng hợp TTS"""
    text: str
    model: Optional[Literal["viet-tts"]] = "viet-tts"
    voice: Optional[str] = None  # Voice name from built-in voices / Tên giọng từ giọng có sẵn
    voice_file: Optional[str] = None  # Path to custom voice file / Đường dẫn file giọng tùy chỉnh
    speed: Optional[float] = 1.0  # Speech speed (0.5-2.0, default: 1.0) / Tốc độ giọng nói
    batch_chunks: Optional[int] = None  # Process N chunks at a time to keep GPU busy (default: None = auto)
                                        # Xử lý N chunks cùng lúc để giữ GPU bận (mặc định: None = tự động)
    # Storage options / Tùy chọn lưu trữ
    store: Optional[bool] = True  # Store audio file / Lưu file audio
    expiry_hours: Optional[int] = None  # Expiration hours (None = use default)
    return_audio: Optional[bool] = True  # Return audio in response / Trả về audio trong response

class ModelInfoRequest(BaseModel):
    """Model info request / Yêu cầu thông tin model"""
    model: Literal["viet-tts"]

# Health check / Kiểm tra sức khỏe
@router.get("/health")
async def health_check():
    """Health check endpoint / Endpoint kiểm tra sức khỏe"""
    return {"status": "healthy", "service": "VietTTS Backend"}

# Get available voices / Lấy danh sách giọng có sẵn
@router.get("/voices")
async def get_voices():
    """
    Get list of available voices / Lấy danh sách giọng có sẵn
    
    Returns:
        List of available voices / Danh sách giọng có sẵn
    """
    try:
        service = get_service()
        viet_tts = service.get_viet_tts()
        voices = viet_tts.list_voices()
        return {
            "success": True,
            "voices": list(voices.keys()),
            "voice_map": voices
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
# Direct call - FastAPI will handle sync-to-async conversion efficiently
# Gọi trực tiếp - FastAPI sẽ xử lý chuyển đổi sync-to-async một cách hiệu quả
@router.post("/synthesize")
async def synthesize_speech(request: TTSSynthesizeRequest):
    """
    Synthesize speech / Tổng hợp giọng nói
    
    Optimized for microservice usage:
    - Returns file ID and metadata for storage management
    - Supports expiration time management
    - Optional audio streaming
    - Non-blocking async processing for better GPU utilization
    
    Tối ưu cho sử dụng microservice:
    - Trả về ID file và metadata để quản lý lưu trữ
    - Hỗ trợ quản lý thời gian hết hạn
    - Tùy chọn streaming audio
    - Xử lý async không chặn để sử dụng GPU tốt hơn
    
    Args:
        request: TTS synthesis request / Yêu cầu tổng hợp TTS
        
    Returns:
        Response with file info and optional audio / Phản hồi với thông tin file và audio tùy chọn
    """
    try:
        # Validate text input / Xác thực input văn bản
        text = request.text.strip() if request.text else ""
        
        # Check if text exists and is meaningful
        # Kiểm tra text có tồn tại và có nghĩa không
        if not text or len(text) == 0:
            raise ValueError(
                f"Text is empty. Cannot generate audio from empty text."
            )
        
        # Check for meaningful content (at least 10 characters, not just punctuation)
        # Kiểm tra nội dung có nghĩa (ít nhất 10 ký tự, không chỉ dấu câu)
        meaningful_text = ''.join(c for c in text if c.isalnum() or c.isspace()).strip()
        
        if len(text) < 10 or len(meaningful_text) < 5:
            raise ValueError(
                f"Text is too short or contains only punctuation (length: {len(text)}, meaningful: {len(meaningful_text)}). "
                f"Minimum length: 10 characters with at least 5 meaningful characters. "
                f"Text preview: '{text[:50]}...'"
            )
        
        import time
        api_start = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"\n{'='*80}")
        print(f"[{timestamp}] [API] Starting TTS request - Text length: {len(text)} chars")
        print(f"[{timestamp}] [API] Bắt đầu TTS request - Độ dài text: {len(text)} ký tự")
        print(f"{'='*80}")
        
        # Step 1: Get service and storage
        step_start = time.time()
        service = get_service()
        storage = get_storage()
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [API] Step 1 - Service/Storage init: {step_duration*1000:.2f}ms")
        print(f"[{timestamp}] [API] Bước 1 - Khởi tạo Service/Storage: {step_duration*1000:.2f}ms")
        
        # Step 2: Generate request ID
        step_start = time.time()
        request_id = str(uuid.uuid4())
        voice_name = request.voice or request.voice_file or "default"
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [API] Step 2 - Request ID generation: {step_duration*1000:.2f}ms")
        print(f"[{timestamp}] [API] Bước 2 - Tạo Request ID: {step_duration*1000:.2f}ms")
        
        # Step 3: Generate audio (MAIN STEP) / Bước 3: Tạo audio (BƯỚC CHÍNH)
        step_start = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [API] Step 3 - Starting audio synthesis...")
        print(f"[{timestamp}] [API] Bước 3 - Bắt đầu tổng hợp audio...")
        audio = service.synthesize(
            text=request.text,
            model=request.model,
            voice=request.voice,
            voice_file=request.voice_file,
            speed=request.speed or 1.0,
            batch_chunks=request.batch_chunks
        )
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [API] Step 3 - Audio synthesis completed: {step_duration:.3f}s")
        print(f"[{timestamp}] [API] Bước 3 - Tổng hợp audio hoàn tất: {step_duration:.3f}s")
        
        # Step 4: Get sample rate
        step_start = time.time()
        model_info = service.get_model_info(request.model)
        sample_rate = model_info["sample_rate"]
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [API] Step 4 - Get model info: {step_duration*1000:.2f}ms")
        print(f"[{timestamp}] [API] Bước 4 - Lấy thông tin model: {step_duration*1000:.2f}ms")
        
        # Step 5: Convert to bytes
        step_start = time.time()
        audio_buffer = io.BytesIO()
        sf.write(audio_buffer, audio, sample_rate, format="WAV")
        audio_data = audio_buffer.getvalue()
        step_duration = time.time() - step_start
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"[{timestamp}] [API] Step 5 - Convert to bytes: {step_duration*1000:.2f}ms")
        print(f"[{timestamp}] [API] Bước 5 - Chuyển đổi sang bytes: {step_duration*1000:.2f}ms")
        
        # Step 6: Store audio if requested
        step_start = time.time()
        file_metadata = None
        if request.store:
            file_metadata = storage.save_audio(
                audio_data=audio_data,
                text=request.text,
                voice=voice_name,
                model=request.model,
                expiry_hours=request.expiry_hours,
                metadata={
                    "request_id": request_id,
                    "speed": request.speed or 1.0,
                    "sample_rate": sample_rate
                }
            )
        step_duration = time.time() - step_start
        if request.store:
            timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
            print(f"[{timestamp}] [API] Step 6 - Save to storage: {step_duration*1000:.2f}ms")
            print(f"[{timestamp}] [API] Bước 6 - Lưu vào storage: {step_duration*1000:.2f}ms")
        
        # API Total duration
        api_total = time.time() - api_start
        audio_duration = len(audio) / sample_rate if audio is not None else 0
        ratio = api_total / audio_duration if audio_duration > 0 else 0
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        
        print(f"{'='*80}")
        print(f"[{timestamp}] [API] API TOTAL TIME: {api_total:.3f}s")
        print(f"[{timestamp}] [API] TỔNG THỜI GIAN API: {api_total:.3f}s")
        print(f"[{timestamp}] [API] Audio duration: {audio_duration:.3f}s")
        print(f"[{timestamp}] [API] Độ dài audio: {audio_duration:.3f}s")
        print(f"[{timestamp}] [API] Speed ratio: {ratio:.2f}x")
        print(f"[{timestamp}] [API] Tỷ lệ tốc độ: {ratio:.2f}x")
        print(f"{'='*80}\n")
        
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
            from fastapi.responses import StreamingResponse
            
            # Stream the audio directly
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
            headers = {}
            if file_metadata:
                headers["X-Request-ID"] = request_id
                headers["X-File-ID"] = file_metadata.get("file_id", "")
                headers["X-Expires-At"] = file_metadata.get("expires_at", "")
            return JSONResponse(content=response_data, headers=headers)
        
    except ValueError as e:
        # Log validation errors / Log lỗi validation
        print("❌ ValueError in /synthesize:", repr(e))
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Log full traceback to identify exact source of WinError 193
        # Log đầy đủ traceback để xác định chính xác vị trí WinError 193
        print("❌ Exception in /synthesize:", repr(e))
        traceback.print_exc()
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
            "X-Expires-At": metadata.get("expires_at", ""),
        }
    )

# Get storage stats / Lấy thống kê lưu trữ
@router.get("/storage/stats")
async def get_storage_stats():
    """
    Get storage statistics / Lấy thống kê lưu trữ
    
    Returns:
        Storage statistics / Thống kê lưu trữ
    """
    storage = get_storage()
    stats = storage.cleanup_expired()  # Cleanup and get stats
    return {
        "success": True,
        "stats": stats
    }

