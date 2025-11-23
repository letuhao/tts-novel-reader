"""
Test script for voice selection with role detection
Script test cho voice selection với role detection
"""
import sys
from pathlib import Path

# Add paths
sys.path.insert(0, str(Path(__file__).parent.parent / "tts" / "dangvansam-VietTTS-backend" / "tts_backend"))
sys.path.insert(0, str(Path(__file__).parent))

from voice_labels import (
    get_voice_labels_for_llm,
    get_recommended_voice,
    get_vietnamese_voices,
    DEFAULT_VOICE_MAPPING,
    VOICE_DATABASE
)
from role_detection_service import RoleDetectionService


def test_voice_labels():
    """Test voice labels system / Test hệ thống voice labels"""
    print("=" * 60)
    print("Testing Voice Labels System / Test Hệ thống Voice Labels")
    print("=" * 60)
    print()
    
    # Test 1: List all Vietnamese voices
    print("📋 Test 1: Vietnamese Voices / Giọng Tiếng Việt")
    print("-" * 60)
    vietnamese_voices = get_vietnamese_voices()
    print(f"Total Vietnamese voices: {len(vietnamese_voices)}")
    for voice_id, voice_info in vietnamese_voices.items():
        print(f"  - {voice_id}: {voice_info['description']} ({voice_info['gender']})")
    print()
    
    # Test 2: Voice labels for LLM
    print("📋 Test 2: Voice Labels for LLM")
    print("-" * 60)
    labels = get_voice_labels_for_llm()
    print(labels)
    print()
    
    # Test 3: Recommended voices
    print("📋 Test 3: Recommended Voices by Role")
    print("-" * 60)
    for role in ["male", "female", "narrator"]:
        voice_id = get_recommended_voice(role)
        print(f"  {role}: {voice_id} ({VOICE_DATABASE[voice_id]['description']})")
    print()
    
    # Test 4: Default mapping
    print("📋 Test 4: Default Voice Mapping")
    print("-" * 60)
    for role, voice_id in DEFAULT_VOICE_MAPPING.items():
        print(f"  {role} -> {voice_id}")
    print()


def test_role_detection():
    """Test role detection service / Test dịch vụ phát hiện vai diễn"""
    print("=" * 60)
    print("Testing Role Detection Service / Test Dịch vụ Phát hiện Vai diễn")
    print("=" * 60)
    print()
    
    try:
        service = RoleDetectionService(model_name="qwen3:8b")
        
        # Test paragraphs
        test_paragraphs = [
            "Đây là đoạn dẫn chuyện của tác giả, mô tả khung cảnh và tình huống.",
            'Anh ấy nhìn cô ấy và nói: "Xin chào, tôi rất vui được gặp bạn."',
            "Cô ấy đáp lại một cách nhẹ nhàng: 'Tôi cũng vậy.'",
            "Bầu trời xanh trong, không một gợn mây.",
            'Nam nhân vật suy nghĩ: "Làm sao để giải quyết vấn đề này đây?"',
            "Nữ nhân vật cảm thấy rất vui khi nghe tin tốt."
        ]
        
        print("📝 Test Paragraphs:")
        print("-" * 60)
        for i, para in enumerate(test_paragraphs, 1):
            print(f"{i}. {para[:80]}...")
        print()
        
        print("🔄 Detecting roles...")
        print("-" * 60)
        
        result = service.detect_roles(
            paragraphs=test_paragraphs,
            chapter_context="",  # Can add context if needed
            return_voice_ids=True
        )
        
        print("✅ Results:")
        print("-" * 60)
        for idx, (role, voice_id) in enumerate(zip(
            result["role_map"].values(),
            result["voice_map"].values()
        )):
            para_text = test_paragraphs[idx][:50] + "..."
            print(f"  Para {idx+1}: {role:10s} -> {voice_id:20s} | {para_text}")
        
        print()
        print("📊 Summary:")
        print("-" * 60)
        role_counts = {}
        for role in result["role_map"].values():
            role_counts[role] = role_counts.get(role, 0) + 1
        for role, count in role_counts.items():
            print(f"  {role}: {count} paragraph(s)")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure Ollama is running with qwen3:8b model")
        print("Đảm bảo Ollama đang chạy với model qwen3:8b")


if __name__ == "__main__":
    print()
    print("🧪 Voice Selection Test Suite")
    print("=" * 60)
    print()
    
    # Test voice labels
    test_voice_labels()
    
    # Test role detection (requires Ollama)
    print("\n" + "=" * 60)
    print("Note: Role detection test requires Ollama running with qwen3:8b")
    print("Ghi chú: Test role detection cần Ollama chạy với qwen3:8b")
    print("=" * 60)
    print()
    
    response = input("Do you want to test role detection? (y/n): ").strip().lower()
    if response == 'y':
        test_role_detection()
    else:
        print("Skipping role detection test / Bỏ qua test role detection")
    
    print()
    print("=" * 60)
    print("✅ Tests completed!")
    print("=" * 60)

