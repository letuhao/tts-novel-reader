#!/usr/bin/env python
"""
Test Dia TTS API with Recommended Female Narrator Voices
Kiểm tra API Dia TTS với Giọng Người Dẫn Chuyện Nữ Được Khuyến nghị
"""
import urllib.request
import urllib.error
import json
import sys
from pathlib import Path

def test_dia_female_narrators():
    """Test Dia TTS with recommended female narrator voices"""
    base_url = "http://127.0.0.1:8000"
    
    print("=" * 70)
    print("Testing Dia TTS with Recommended Female Narrator Voices...")
    print("Đang kiểm tra Dia TTS với Giọng Người Dẫn Chuyện Nữ Được Khuyến nghị...")
    print("=" * 70)
    print()
    
    # Recommended female narrator voices from the model
    # Based on app_local.py - Good Voice Speakers (North Female, South Female, Center Female)
    female_narrators = [
        # North Female voices (Giọng nữ miền Bắc)
        ("kenhCoVan", "North Female - Kênh Cổ Văn (Recommended)"),
        ("ThePresentWriter", "North Female - The Present Writer (Recommended)"),
        ("5PhutCrypto", "North Female - 5 Phút Crypto (Recommended)"),
        ("BIBITV8888", "North Female - BIBI TV (Recommended)"),
        
        # South Female voices (Giọng nữ miền Nam)
        ("CoBaBinhDuong", "South Female - Cô Ba Bình Dương (Recommended)"),
        ("SUCKHOETAMSINH", "South Female - Sức Khỏe Tâm Sinh (Recommended)"),
        ("TIN3PHUT", "South Female - Tin 3 Phút (Recommended)"),
        
        # Center Female voice (Giọng nữ miền Trung)
        ("PTTH-TRT", "Center Female - PTTH-TRT (Recommended)"),
    ]
    
    # Text for testing - Vietnamese narrator text
    test_text_template = "{speaker} Xin chào, tôi là người dẫn chuyện nữ. Hôm nay tôi sẽ kể cho các bạn nghe một câu chuyện thú vị về cuộc sống và những trải nghiệm của con người. Giọng nói của tôi được tạo ra bởi công nghệ trí tuệ nhân tạo, nhưng tôi hy vọng bạn sẽ cảm nhận được sự tự nhiên và ấm áp trong từng câu nói."
    
    print("Generating samples with recommended female narrator voices...")
    print("Đang tạo mẫu với các giọng người dẫn chuyện nữ được khuyến nghị...")
    print()
    
    generated_files = []
    
    for speaker_id, description in female_narrators:
        print(f"Testing: [{speaker_id}]")
        print(f"         {description}")
        
        test_text = test_text_template.format(speaker=f"[{speaker_id}]")
        
        # Create filename from speaker ID
        filename = speaker_id.replace("[", "").replace("]", "").replace("-", "_")
        output_path = Path(__file__).parent / f"dia_female_{filename}.wav"
        
        request_data = json.dumps({
            "text": test_text,
            "model": "dia",
            "temperature": 1.3,
            "top_p": 0.95,
            "cfg_scale": 3.0
        }).encode()
        
        try:
            req = urllib.request.Request(
                f"{base_url}/api/tts/synthesize",
                data=request_data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=60) as response:
                audio_data = response.read()
                with open(output_path, "wb") as f:
                    f.write(audio_data)
                
                file_size_mb = len(audio_data) / (1024 * 1024)
                print(f"   ✅ Generated: {output_path.name} ({file_size_mb:.2f} MB)")
                generated_files.append((speaker_id, output_path, description))
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode()
            print(f"   ❌ Error {e.code}: {error_body[:100]}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()
    
    print("=" * 70)
    if generated_files:
        print("✅ Successfully generated audio files:")
        print("✅ Đã tạo thành công các file audio:")
        print()
        for speaker_id, file_path, description in generated_files:
            print(f"   [{speaker_id}] {description}")
            print(f"      📁 File: {file_path.name}")
        print()
        print("💡 Tip: Play each file to find your preferred female narrator voice!")
        print("💡 Mẹo: Phát từng file để tìm giọng người dẫn chuyện nữ bạn thích nhất!")
        print()
        print("📝 Best for narration / Tốt nhất cho dẫn chuyện:")
        print("   - kenhCoVan (North Female - Clear and professional)")
        print("   - CoBaBinhDuong (South Female - Warm and friendly)")
        print("   - ThePresentWriter (North Female - Natural and expressive)")
        print()
    else:
        print("❌ No files generated. Check errors above.")
        print("❌ Không có file nào được tạo. Kiểm tra lỗi ở trên.")
    print("=" * 70)
    
    return len(generated_files) > 0

if __name__ == "__main__":
    success = test_dia_female_narrators()
    sys.exit(0 if success else 1)

