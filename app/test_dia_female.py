#!/usr/bin/env python
"""
Test Dia TTS API with Female Narrator Voice
Kiểm tra API Dia TTS với Giọng Người Dẫn Chuyện Nữ
"""
import urllib.request
import urllib.error
import json
import sys
from pathlib import Path

def test_dia_female_voice():
    """Test Dia TTS with different speaker IDs to find female voice"""
    base_url = "http://127.0.0.1:8000"
    
    print("=" * 60)
    print("Testing Dia TTS with Female Narrator Voice...")
    print("Đang kiểm tra Dia TTS với Giọng Người Dẫn Chuyện Nữ...")
    print("=" * 60)
    print()
    
    # Common speaker IDs to try (you may need to adjust based on your model)
    # Common speaker IDs thử (bạn có thể cần điều chỉnh dựa trên model của bạn)
    female_speakers = [
        ("02", "Female Voice 1 / Giọng Nữ 1"),
        ("03", "Female Voice 2 / Giọng Nữ 2"),
        ("04", "Female Voice 3 / Giọng Nữ 3"),
        ("05", "Female Voice 4 / Giọng Nữ 4"),
    ]
    
    # Text for testing
    test_texts = {
        "02": "[02] Xin chào, tôi là người dẫn chuyện nữ. Hôm nay tôi sẽ kể cho các bạn nghe một câu chuyện thú vị.",
        "03": "[03] Đây là giọng nói nữ thứ hai. Tôi hy vọng bạn sẽ thích giọng nói này hơn.",
        "04": "[04] Đây là giọng nữ thứ ba. Chất lượng giọng nói rất tự nhiên và rõ ràng.",
        "05": "[05] Đây là giọng nữ thứ tư. Phù hợp cho việc đọc truyện và kể chuyện.",
    }
    
    print("Trying different speaker IDs to find female voice...")
    print("Đang thử các speaker ID khác nhau để tìm giọng nữ...")
    print()
    
    generated_files = []
    
    for speaker_id, description in female_speakers:
        print(f"Testing Speaker ID: [{speaker_id}] - {description}")
        
        if speaker_id not in test_texts:
            test_text = f"[{speaker_id}] Xin chào, đây là một ví dụ về giọng nói nữ với speaker ID {speaker_id}."
        else:
            test_text = test_texts[speaker_id]
        
        output_path = Path(__file__).parent / f"dia_female_{speaker_id}.wav"
        
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
                print(f"   ✅ Generated: {output_path} ({file_size_mb:.2f} MB)")
                generated_files.append((speaker_id, output_path, description))
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode()
            print(f"   ❌ Error {e.code}: {error_body[:100]}")
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()
    
    print("=" * 60)
    if generated_files:
        print("✅ Generated audio files:")
        print("✅ Các file audio đã tạo:")
        print()
        for speaker_id, file_path, description in generated_files:
            print(f"   [{speaker_id}] {description}")
            print(f"      File: {file_path}")
        print()
        print("Play each file to find your preferred female voice!")
        print("Phát từng file để tìm giọng nữ bạn thích nhất!")
    else:
        print("❌ No files generated. Check errors above.")
        print("❌ Không có file nào được tạo. Kiểm tra lỗi ở trên.")
    print("=" * 60)
    
    return len(generated_files) > 0

if __name__ == "__main__":
    success = test_dia_female_voice()
    sys.exit(0 if success else 1)

