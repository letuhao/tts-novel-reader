"""
Voice Labels and Mapping for Role Detection
Nhãn và Ánh xạ Giọng cho Phát hiện Vai diễn

This module defines voice labels and provides mapping from roles (male/female/narrator)
to appropriate voice IDs for Vietnamese TTS.
Module này định nghĩa voice labels và cung cấp mapping từ roles (male/female/narrator)
đến voice IDs phù hợp cho Vietnamese TTS.
"""

from typing import Dict, List, Optional, Literal
from enum import Enum

# Voice Role Type / Loại Vai diễn
RoleType = Literal["male", "female", "narrator"]

class VoiceGender(Enum):
    """Voice gender / Giới tính giọng"""
    MALE = "male"
    FEMALE = "female"
    
class VoiceTone(Enum):
    """Voice tone / Âm điệu giọng"""
    DEEP = "trầm"  # Deep, low
    HIGH = "cao"  # High, sharp
    SOFT = "nhẹ nhàng"  # Soft, gentle
    STANDARD = "tiêu chuẩn"  # Standard
    VERY_HIGH = "rất cao"  # Very high
    VERY_DEEP = "rất trầm"  # Very deep
    SMALL = "nhỏ"  # Small, quiet
    HARD_TO_HEAR = "hơi khó nghe"  # Hard to hear

class VoiceLanguage(Enum):
    """Voice language / Ngôn ngữ giọng"""
    VIETNAMESE = "tiếng Việt"
    ENGLISH = "tiếng Anh"
    JAPANESE = "tiếng Nhật"
    KOREAN = "tiếng Hàn"
    CHINESE = "tiếng Trung Quốc"

# Voice Database / Cơ sở Dữ liệu Giọng
VOICE_DATABASE: Dict[str, Dict] = {
    # Vietnamese Male Voices / Giọng Nam Tiếng Việt
    "cdteam": {
        "id": "cdteam",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.DEEP.value,
        "language": VoiceLanguage.VIETNAMESE.value,
        "description": "giọng nam trầm",
        "suitable_for": ["male", "narrator_male"],
        "quality": "high"
    },
    "nguyen-ngoc-ngan": {
        "id": "nguyen-ngoc-ngan",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.DEEP.value,
        "language": VoiceLanguage.VIETNAMESE.value,
        "description": "giọng nam trầm",
        "suitable_for": ["male", "narrator_male"],
        "quality": "high"
    },
    "son-tung-mtp": {
        "id": "son-tung-mtp",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.SMALL.value,
        "language": VoiceLanguage.VIETNAMESE.value,
        "description": "giọng nam nhỏ, hơi khó nghe",
        "suitable_for": ["male"],
        "quality": "medium",
        "notes": "Có thể khó nghe, không khuyến nghị cho narrator"
    },
    "doremon": {
        "id": "doremon",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.VERY_HIGH.value,
        "language": VoiceLanguage.VIETNAMESE.value,
        "description": "giọng nam rất cao tiếng Việt",
        "suitable_for": ["male"],
        "quality": "medium",
        "notes": "Giọng rất cao, phù hợp nhân vật đặc biệt"
    },
    "nsnd-le-chuc": {
        "id": "nsnd-le-chuc",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.SOFT.value,
        "language": VoiceLanguage.VIETNAMESE.value,
        "description": "giọng nam nhẹ nhàng tiếng Việt",
        "suitable_for": ["male", "narrator_male"],
        "quality": "high"
    },
    
    # Vietnamese Female Voices / Giọng Nữ Tiếng Việt
    "diep-chi": {
        "id": "diep-chi",
        "gender": VoiceGender.FEMALE.value,
        "tone": VoiceTone.HIGH.value,
        "language": VoiceLanguage.VIETNAMESE.value,
        "description": "giọng nữ cao",
        "suitable_for": ["female"],
        "quality": "high"
    },
    "nu-nhe-nhang": {
        "id": "nu-nhe-nhang",
        "gender": VoiceGender.FEMALE.value,
        "tone": VoiceTone.SOFT.value,
        "language": VoiceLanguage.VIETNAMESE.value,
        "description": "giọng nữ nhẹ nhàng",
        "suitable_for": ["female"],
        "quality": "high"
    },
    "quynh": {
        "id": "quynh",
        "gender": VoiceGender.FEMALE.value,
        "tone": VoiceTone.SOFT.value,
        "language": VoiceLanguage.VIETNAMESE.value,
        "description": "giọng nữ nhẹ nhàng, dùng làm Narrator",
        "suitable_for": ["female", "narrator"],  # Primary narrator voice
        "quality": "high",
        "preferred_for_narrator": True
    },
    
    # Cross-lingual / Đa ngôn ngữ
    "cross_lingual_prompt": {
        "id": "cross_lingual_prompt",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.STANDARD.value,
        "language": VoiceLanguage.CHINESE.value,
        "description": "giọng nam Trung Quốc",
        "suitable_for": ["male"],
        "quality": "medium",
        "notes": "Tiếng Trung, không khuyến nghị cho tiếng Việt"
    },
    "zero_shot_prompt": {
        "id": "zero_shot_prompt",
        "gender": VoiceGender.FEMALE.value,
        "tone": VoiceTone.SOFT.value,
        "language": VoiceLanguage.CHINESE.value,
        "description": "giọng nữ nhẹ nhàng tiếng Trung Quốc",
        "suitable_for": ["female"],
        "quality": "medium",
        "notes": "Tiếng Trung, không khuyến nghị cho tiếng Việt"
    },
    
    # Speechify English Voices / Giọng Speechify Tiếng Anh
    "speechify_1": {
        "id": "speechify_1",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.STANDARD.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nam tiêu chuẩn tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    },
    "speechify_2": {
        "id": "speechify_2",
        "gender": VoiceGender.FEMALE.value,
        "tone": VoiceTone.HIGH.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nữ cao tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    },
    "speechify_3": {
        "id": "speechify_3",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.DEEP.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nam trầm tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    },
    "speechify_4": {
        "id": "speechify_4",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.DEEP.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nam trầm tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    },
    "speechify_5": {
        "id": "speechify_5",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.STANDARD.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nam tiêu chuẩn tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    },
    "speechify_6": {
        "id": "speechify_6",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.HIGH.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nam cao tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    },
    "speechify_7": {
        "id": "speechify_7",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.STANDARD.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nam tiêu chuẩn tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    },
    "speechify_8": {
        "id": "speechify_8",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.VERY_DEEP.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nam rất trầm tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    },
    "speechify_9": {
        "id": "speechify_9",
        "gender": VoiceGender.FEMALE.value,
        "tone": VoiceTone.SOFT.value,
        "language": VoiceLanguage.JAPANESE.value,
        "description": "giọng nữ nhẹ nhàng tiếng Nhật",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Nhật, không phù hợp cho tiếng Việt"
    },
    "speechify_10": {
        "id": "speechify_10",
        "gender": VoiceGender.FEMALE.value,
        "tone": VoiceTone.HIGH.value,
        "language": VoiceLanguage.JAPANESE.value,
        "description": "giọng nữ cao tiếng Nhật",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Nhật, không phù hợp cho tiếng Việt"
    },
    "speechify_11": {
        "id": "speechify_11",
        "gender": VoiceGender.FEMALE.value,
        "tone": VoiceTone.HIGH.value,
        "language": VoiceLanguage.KOREAN.value,
        "description": "giọng nữ cao tiếng Hàn",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Hàn, không phù hợp cho tiếng Việt"
    },
    "speechify_12": {
        "id": "speechify_12",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.HIGH.value,
        "language": VoiceLanguage.KOREAN.value,
        "description": "giọng nam cao tiếng Hàn",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Hàn, không phù hợp cho tiếng Việt"
    },
    "jack-sparrow": {
        "id": "jack-sparrow",
        "gender": VoiceGender.MALE.value,
        "tone": VoiceTone.STANDARD.value,
        "language": VoiceLanguage.ENGLISH.value,
        "description": "giọng nam tiêu chuẩn tiếng Anh",
        "suitable_for": [],
        "quality": "low",
        "notes": "Tiếng Anh, không phù hợp cho tiếng Việt"
    }
}

# Voice Mapping by Role / Ánh xạ Giọng theo Vai diễn
DEFAULT_VOICE_MAPPING = {
    "male": "cdteam",  # Default male voice
    "female": "nu-nhe-nhang",  # Default female voice
    "narrator": "quynh"  # Default narrator (recommended)
}

# Recommended voices for Vietnamese / Giọng được Khuyến nghị cho Tiếng Việt
RECOMMENDED_VIETNAMESE_VOICES = {
    "male": ["cdteam", "nguyen-ngoc-ngan", "nsnd-le-chuc"],
    "female": ["quynh", "nu-nhe-nhang", "diep-chi"],
    "narrator": ["quynh"]  # quynh is preferred for narrator
}

# Get Vietnamese voices only / Lấy chỉ giọng tiếng Việt
def get_vietnamese_voices() -> Dict[str, Dict]:
    """Get only Vietnamese voices / Lấy chỉ giọng tiếng Việt"""
    return {
        voice_id: voice_info 
        for voice_id, voice_info in VOICE_DATABASE.items()
        if voice_info.get("language") == VoiceLanguage.VIETNAMESE.value
    }

# Get voices by gender / Lấy giọng theo giới tính
def get_voices_by_gender(gender: VoiceGender) -> List[Dict]:
    """Get voices filtered by gender / Lấy giọng lọc theo giới tính"""
    vietnamese_voices = get_vietnamese_voices()
    return [
        voice_info
        for voice_info in vietnamese_voices.values()
        if voice_info.get("gender") == gender.value
    ]

# Get recommended voice for role / Lấy giọng được khuyến nghị cho vai diễn
def get_recommended_voice(role: RoleType, preference: Optional[str] = None) -> str:
    """
    Get recommended voice ID for a role.
    Lấy voice ID được khuyến nghị cho một vai diễn.
    
    Args:
        role: Role type (male/female/narrator)
        preference: Optional preference (e.g., "trầm", "cao", "nhẹ nhàng")
        
    Returns:
        Voice ID
    """
    if role == "narrator":
        return DEFAULT_VOICE_MAPPING["narrator"]  # Always use quynh for narrator
    
    if preference:
        # Try to find voice matching preference
        # Thử tìm giọng khớp với preference
        voices = get_vietnamese_voices()
        for voice_info in voices.values():
            if voice_info.get("gender") == role and preference.lower() in voice_info.get("tone", "").lower():
                if voice_info.get("quality") == "high":
                    return voice_info["id"]
    
    # Return default for role
    # Trả về mặc định cho vai diễn
    return DEFAULT_VOICE_MAPPING.get(role, DEFAULT_VOICE_MAPPING["narrator"])

# Get all voice labels for LLM / Lấy tất cả voice labels cho LLM
def get_voice_labels_for_llm() -> str:
    """
    Generate voice labels text for LLM prompt.
    Tạo text voice labels cho LLM prompt.
    
    Returns:
        Formatted string describing available voices
    """
    vietnamese_voices = get_vietnamese_voices()
    
    lines = []
    lines.append("Danh sách giọng có sẵn cho TTS:")
    lines.append("")
    
    # Group by gender
    # Nhóm theo giới tính
    for gender in [VoiceGender.MALE, VoiceGender.FEMALE]:
        gender_voices = [
            v for v in vietnamese_voices.values()
            if v.get("gender") == gender.value
        ]
        
        if gender_voices:
            lines.append(f"{'Nam' if gender == VoiceGender.MALE else 'Nữ'}:")
            for voice in gender_voices:
                voice_id = voice["id"]
                description = voice["description"]
                tone = voice.get("tone", "")
                quality = voice.get("quality", "medium")
                suitable = ", ".join(voice.get("suitable_for", []))
                
                lines.append(f"  - {voice_id}: {description} (tone: {tone}, suitable: {suitable})")
    
    # Narrator recommendation
    # Khuyến nghị Narrator
    lines.append("")
    lines.append("Narrator (Dẫn chuyện):")
    narrator_voice = VOICE_DATABASE[DEFAULT_VOICE_MAPPING["narrator"]]
    lines.append(f"  - {narrator_voice['id']}: {narrator_voice['description']} (Khuyến nghị)")
    
    return "\n".join(lines)

# Validate voice ID / Xác thực voice ID
def is_valid_voice_id(voice_id: str) -> bool:
    """Check if voice ID exists / Kiểm tra voice ID có tồn tại không"""
    return voice_id in VOICE_DATABASE

# Get voice info / Lấy thông tin giọng
def get_voice_info(voice_id: str) -> Optional[Dict]:
    """Get voice information / Lấy thông tin giọng"""
    return VOICE_DATABASE.get(voice_id)

