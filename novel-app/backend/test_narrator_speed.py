"""
Test Narrator Speed with Slower Speech
Kiểm tra Tốc độ Narrator với Giọng nói Chậm hơn
"""
import requests
import json
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:11111"
NOVEL_ID = "522e13ed-db50-4d2a-a0d9-92a3956d527d"
CHAPTER_1 = 1

def test_narrator_speed(speed_factor=0.85):
    """Test narrator speed with specified speed factor / Kiểm tra tốc độ narrator với hệ số tốc độ"""
    print("="*60)
    print(f"Testing Narrator Speed (speed_factor: {speed_factor})")
    print(f"Kiểm tra Tốc độ Narrator (hệ số tốc độ: {speed_factor})")
    print("="*60)
    
    # Test text (shorter for testing)
    test_text = "[05] Đây là một câu chuyện về một nhân vật trong thế giới giả tưởng. Cô ấy đang đứng trước gương, nhìn ngắm bản thân mình."
    
    print(f"\n📝 Test Text: {test_text[:50]}...")
    print(f"⚙️  Speed Factor: {speed_factor} ({'normal' if speed_factor == 1.0 else f'{int((1-speed_factor)*100)}% slower'})")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/tts/synthesize",
            json={
                "text": test_text,
                "model": "dia",
                "speakerId": "05",
                "speed_factor": speed_factor,
                "store": False,
                "return_audio": True
            },
            stream=True,
            timeout=120
        )
        
        if response.status_code == 200:
            # Save audio
            output_path = Path(__file__).parent / f"test_narrator_speed_{speed_factor}.wav"
            with open(output_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            file_size = output_path.stat().st_size
            print(f"\n✅ Audio generated successfully!")
            print(f"✅ Audio đã được tạo thành công!")
            print(f"📁 File: {output_path}")
            print(f"📊 Size: {file_size / (1024*1024):.2f} MB")
            print(f"\n🎧 Play the file to compare speeds!")
            print(f"🎧 Phát file để so sánh tốc độ!")
            
            return output_path
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None

def test_compare_speeds():
    """Compare different speed factors / So sánh các hệ số tốc độ khác nhau"""
    print("\n" + "="*60)
    print("Comparing Different Speed Factors")
    print("So sánh Các Hệ số Tốc độ Khác nhau")
    print("="*60)
    
    speeds = [
        (1.0, "Normal speed / Tốc độ bình thường"),
        (0.90, "10% slower / Chậm hơn 10%"),
        (0.85, "15% slower (Recommended) / Chậm hơn 15% (Khuyến nghị)"),
        (0.80, "20% slower / Chậm hơn 20%")
    ]
    
    print("\nGenerating audio samples...")
    print("Đang tạo mẫu audio...")
    
    results = []
    for speed, description in speeds:
        print(f"\n--- Testing {speed}x: {description} ---")
        result = test_narrator_speed(speed)
        if result:
            results.append((speed, result, description))
    
    print("\n" + "="*60)
    print("✅ Speed comparison complete!")
    print("✅ So sánh tốc độ hoàn tất!")
    print("\nGenerated files:")
    print("Các file đã tạo:")
    for speed, path, desc in results:
        print(f"  - {path.name} ({desc})")
    print("\n💡 Listen to all files to find your preferred speed!")
    print("💡 Nghe tất cả các file để tìm tốc độ bạn thích!")

if __name__ == "__main__":
    print("\n🚀 Testing Narrator Speed Configuration")
    print("🚀 Kiểm tra Cấu hình Tốc độ Narrator")
    print()
    
    # Test recommended speed
    print("Testing recommended speed (0.85)...")
    print("Kiểm tra tốc độ được khuyến nghị (0.85)...")
    test_narrator_speed(0.85)
    
    # Option to compare all speeds
    print("\n" + "="*60)
    response = input("\nCompare all speeds? (y/n): ").lower()
    if response == 'y':
        test_compare_speeds()
    
    print("\n" + "="*60)
    print("✅ Test complete!")
    print("✅ Kiểm tra hoàn tất!")

