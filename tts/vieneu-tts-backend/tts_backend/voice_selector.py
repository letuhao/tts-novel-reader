"""
Voice Selection for VieNeu-TTS
Lựa chọn giọng nói cho VieNeu-TTS

Supports:
- Manual voice selection (male/female/voice_id)
- Auto voice selection based on text content (like Dia model)
Hỗ trợ:
- Lựa chọn giọng thủ công (male/female/voice_id)
- Tự động lựa chọn giọng dựa trên nội dung văn bản (giống model Dia)
"""
from pathlib import Path
from typing import Optional, Literal
import re

# Available voice samples / Các mẫu giọng có sẵn
# Located in tts/VieNeu-TTS/sample/
# Nằm trong tts/VieNeu-TTS/sample/
VOICE_SAMPLES = {
    "id_0001": {
        "audio": "id_0001.wav",
        "text": "id_0001.txt",
        "gender": "male",
        "accent": "south",
        "description": "Male voice 1"
    },
    "id_0002": {
        "audio": "id_0002.wav",
        "text": "id_0002.txt",
        "gender": "female",
        "accent": "south",
        "description": "Female voice 1"
    },
    "id_0003": {
        "audio": "id_0003.wav",
        "text": "id_0003.txt",
        "gender": "male",
        "accent": "south",
        "description": "Male voice 2"
    },
    "id_0004": {
        "audio": "id_0004.wav",
        "text": "id_0004.txt",
        "gender": "female",
        "accent": "south",
        "description": "Female voice 2"
    },
    "id_0005": {
        "audio": "id_0005.wav",
        "text": "id_0005.txt",
        "gender": "male",
        "accent": "south",
        "description": "Male voice 3"
    },
    "id_0007": {
        "audio": "id_0007.wav",
        "text": "id_0007.txt",
        "gender": "male",
        "accent": "south",
        "description": "Male voice 4"
    }
}

# Default voices / Giọng mặc định
DEFAULT_MALE_VOICE = "id_0001"
DEFAULT_FEMALE_VOICE = "id_0002"
DEFAULT_VOICE = DEFAULT_MALE_VOICE  # Fallback / Dự phòng

# Base path to sample directory / Đường dẫn cơ sở đến thư mục sample
def get_sample_dir() -> Path:
    """Get path to VieNeu-TTS sample directory / Lấy đường dẫn đến thư mục sample của VieNeu-TTS"""
    # From tts/vieneu-tts-backend/tts_backend/voice_selector.py
    # Go up 5 levels to project root, then to tts/VieNeu-TTS/sample
    return Path(__file__).parent.parent.parent.parent / "tts" / "VieNeu-TTS" / "sample"


def detect_gender_from_text(text: str) -> Literal["male", "female"]:
    """
    Detect gender preference from text content (simple heuristic)
    Phát hiện sở thích giới tính từ nội dung văn bản (heuristic đơn giản)
    
    This is a simple heuristic - for more accurate detection, use ML models.
    Đây là heuristic đơn giản - để phát hiện chính xác hơn, sử dụng mô hình ML.
    
    Args:
        text: Input text / Văn bản đầu vào
        
    Returns:
        "male" or "female" / "male" hoặc "female"
    """
    text_lower = text.lower()
    
    # Vietnamese female indicators / Chỉ số nữ tính trong tiếng Việt
    female_indicators = [
        # Pronouns / Đại từ
        r'\b(cô|bà|chị|em gái|chị gái|cô gái|bạn gái|người phụ nữ|phụ nữ)\b',
        # Common female names (examples) / Tên nữ phổ biến (ví dụ)
        r'\b(linh|mai|lan|hương|ngọc|oanh|thảo|trang|phương|vy|my|anh thư)\b',
        # Female-specific words / Từ chỉ nữ
        r'\b(công chúa|hoàng hậu|nữ hoàng|thiếu nữ)\b',
    ]
    
    # Vietnamese male indicators / Chỉ số nam tính trong tiếng Việt
    male_indicators = [
        # Pronouns / Đại từ
        r'\b(ông|anh|em trai|anh trai|con trai|bạn trai|người đàn ông|đàn ông)\b',
        # Common male names (examples) / Tên nam phổ biến (ví dụ)
        r'\b(minh|hùng|dũng|nam|long|tuấn|khôi|phúc|đức|kiên|hoàng)\b',
        # Male-specific words / Từ chỉ nam
        r'\b(hoàng tử|vua|nam nhi|tráng sĩ)\b',
    ]
    
    # Count matches / Đếm số lần khớp
    female_score = sum(1 for pattern in female_indicators if re.search(pattern, text_lower))
    male_score = sum(1 for pattern in male_indicators if re.search(pattern, text_lower))
    
    # First-person pronouns / Đại từ ngôi thứ nhất
    if re.search(r'\b(tôi|tao|tớ|mình|ta)\b', text_lower):
        # Check context for gender markers / Kiểm tra ngữ cảnh cho dấu hiệu giới tính
        if re.search(r'\b(nữ|phụ nữ|gái)\b', text_lower):
            female_score += 2
        elif re.search(r'\b(nam|đàn ông|trai)\b', text_lower):
            male_score += 2
    
    # Determine gender based on scores / Xác định giới tính dựa trên điểm số
    if female_score > male_score:
        return "female"
    elif male_score > female_score:
        return "male"
    else:
        # Default to female for narration, male for dialogue (heuristic)
        # Mặc định nữ cho kể chuyện, nam cho đối thoại (heuristic)
        if re.search(r'[.!?]\s*["\']', text):  # Dialogue markers / Dấu hiệu đối thoại
            return "male"
        else:
            return "female"  # Default to female for general narration


def select_voice(
    voice: Optional[str] = None,
    auto_voice: bool = False,
    text: Optional[str] = None,
    sample_dir: Optional[Path] = None
) -> tuple[Path, Path]:
    """
    Select voice reference audio and text paths / Lựa chọn đường dẫn audio và text tham chiếu giọng nói
    
    Args:
        voice: Voice selection / Lựa chọn giọng
              - "male" or "female" / "male" hoặc "female"
              - Voice ID: "id_0001", "id_0002", etc. / ID giọng: "id_0001", "id_0002", v.v.
              - None: Use default / None: Sử dụng mặc định
        auto_voice: Auto-detect gender from text / Tự động phát hiện giới tính từ văn bản
        text: Input text for auto-detection / Văn bản đầu vào để tự động phát hiện
        sample_dir: Custom sample directory path / Đường dẫn thư mục sample tùy chỉnh
        
    Returns:
        Tuple of (ref_audio_path, ref_text_path) / Tuple của (ref_audio_path, ref_text_path)
    """
    if sample_dir is None:
        sample_dir = get_sample_dir()
    
    # Auto-detect gender if requested / Tự động phát hiện giới tính nếu được yêu cầu
    if auto_voice and text:
        detected_gender = detect_gender_from_text(text)
        voice = detected_gender
        print(f"🔍 Auto-detected gender: {detected_gender} / Tự động phát hiện giới tính: {detected_gender}")
    
    # Determine voice ID / Xác định ID giọng
    voice_id = None
    
    if voice:
        voice_lower = voice.lower()
        if voice_lower in ["male", "nam"]:
            voice_id = DEFAULT_MALE_VOICE
        elif voice_lower in ["female", "nữ"]:
            voice_id = DEFAULT_FEMALE_VOICE
        elif voice_lower.startswith("id_"):
            # Direct voice ID / ID giọng trực tiếp
            voice_id = voice_lower if voice_lower in VOICE_SAMPLES else DEFAULT_VOICE
        else:
            # Try to find by partial match / Thử tìm theo khớp một phần
            for vid, info in VOICE_SAMPLES.items():
                if voice_lower in info["description"].lower() or voice_lower == info["gender"]:
                    voice_id = vid
                    break
    
    # Use default if not found / Sử dụng mặc định nếu không tìm thấy
    if voice_id is None or voice_id not in VOICE_SAMPLES:
        voice_id = DEFAULT_VOICE
    
    # Get voice info / Lấy thông tin giọng
    voice_info = VOICE_SAMPLES[voice_id]
    
    # Build paths / Xây dựng đường dẫn
    ref_audio_path = sample_dir / voice_info["audio"]
    ref_text_path = sample_dir / voice_info["text"]
    
    # Verify files exist / Xác minh file tồn tại
    if not ref_audio_path.exists():
        raise FileNotFoundError(f"Reference audio not found: {ref_audio_path}")
    if not ref_text_path.exists():
        raise FileNotFoundError(f"Reference text not found: {ref_text_path}")
    
    return ref_audio_path, ref_text_path


def get_available_voices() -> dict:
    """Get list of available voices / Lấy danh sách giọng có sẵn"""
    return {
        voice_id: {
            "gender": info["gender"],
            "accent": info["accent"],
            "description": info["description"]
        }
        for voice_id, info in VOICE_SAMPLES.items()
    }

