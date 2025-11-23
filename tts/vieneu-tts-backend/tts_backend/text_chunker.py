"""
Text Chunking Utility for Long Text Generation
Tiện ích Chia nhỏ Văn bản cho Tạo Văn bản Dài

Based on VieNeu-TTS infer_long_text.py strategy
Dựa trên chiến lược VieNeu-TTS infer_long_text.py
"""
import re
from typing import List


def split_text_into_chunks(text: str, max_chars: int = 256) -> List[str]:
    """
    Split raw text into chunks no longer than max_chars.
    Preference is given to sentence boundaries; otherwise falls back to word-based splitting.
    
    Chia văn bản thô thành các chunk không dài hơn max_chars.
    Ưu tiên chia tại ranh giới câu; nếu không thì chia theo từ.
    
    Args:
        text: Input text / Văn bản đầu vào
        max_chars: Maximum characters per chunk (default: 256) / Ký tự tối đa mỗi chunk (mặc định: 256)
        
    Returns:
        List of text chunks / Danh sách các chunk văn bản
    """
    sentences = re.split(r"(?<=[\.\!\?\…。．！？])\s+", text.strip())
    chunks: List[str] = []
    buffer = ""

    def flush_buffer():
        nonlocal buffer
        if buffer:
            chunks.append(buffer.strip())
            buffer = ""

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        # If single sentence already fits, try to append to current buffer
        # Nếu câu đơn lẻ đã vừa, thử thêm vào buffer hiện tại
        if len(sentence) <= max_chars:
            candidate = f"{buffer} {sentence}".strip() if buffer else sentence
            if len(candidate) <= max_chars:
                buffer = candidate
            else:
                flush_buffer()
                buffer = sentence
            continue

        # Fallback: sentence too long, break by words
        # Dự phòng: câu quá dài, chia theo từ
        flush_buffer()
        words = sentence.split()
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip() if current else word
            if len(candidate) > max_chars and current:
                chunks.append(current.strip())
                current = word
            else:
                current = candidate
        if current:
            chunks.append(current.strip())

    flush_buffer()
    return [chunk for chunk in chunks if chunk]


def should_chunk_text(text: str, max_chars: int = 256) -> bool:
    """
    Check if text should be chunked / Kiểm tra xem văn bản có cần chia nhỏ không
    
    Args:
        text: Input text / Văn bản đầu vào
        max_chars: Maximum characters before chunking (default: 256) / Ký tự tối đa trước khi chia (mặc định: 256)
        
    Returns:
        True if text needs chunking / True nếu văn bản cần chia nhỏ
    """
    return len(text) > max_chars

