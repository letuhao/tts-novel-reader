"""
Test Chapter 1 with Preset Speed (No speed factor - Normal speed)
Kiểm tra Chapter 1 với Tốc độ Preset (Không có hệ số tốc độ - Tốc độ bình thường)
"""
import requests
import json
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:3000"
NOVEL_ID = "522e13ed-db50-4d2a-a0d9-92a3956d527d"
CHAPTER_1 = 1

def test_preset_speed():
    """Test regenerating chapter 1 with preset speed (no speed factor) / Kiểm tra tạo lại chapter 1 với tốc độ preset"""
    print("="*60)
    print("Testing Chapter 1 with Preset Speed (Normal Speed - No speed_factor)")
    print("Kiểm tra Chapter 1 với Tốc độ Preset (Tốc độ Bình thường - Không có speed_factor)")
    print("="*60)
    
    print(f"\nNovel ID: {NOVEL_ID}")
    print(f"Chapter: {CHAPTER_1}")
    print(f"Speed Factor: 1.0 (Normal speed - same as preset)")
    print("\nStarting audio generation...")
    print("Bắt đầu tạo audio...")
    print("(This may take 60-90 seconds)")
    print("(Có thể mất 60-90 giây)")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/worker/generate/chapter",
            json={
                "novelId": NOVEL_ID,
                "chapterNumber": CHAPTER_1,
                "speakerId": "05",
                "expiryHours": 365 * 24,
                "speedFactor": 1.0,  # Normal speed (same as preset - no resampling)
                "forceRegenerate": True
            },
            timeout=180
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            result = data.get("result", {})
            
            print(f"\n✅ Audio generation completed in {elapsed:.1f}s")
            print(f"✅ Tạo audio hoàn tất trong {elapsed:.1f}s")
            
            print(f"\n📚 Chapter: {result.get('chapterNumber')}")
            print(f"🆔 File ID: {result.get('fileId')}")
            print(f"🔗 Audio URL: {result.get('audioURL')}")
            print(f"⚙️  Speed Factor: 1.0 (Normal speed - same as preset)")
            print(f"⏰ Expires At: {result.get('expiresAt')}")
            
            print(f"\n💡 This audio uses NORMAL speed (same as preset dia_female_05.wav)!")
            print(f"💡 Audio này sử dụng tốc độ BÌNH THƯỜNG (giống preset dia_female_05.wav)!")
            print(f"\n🎧 You can listen to it at:")
            print(f"🎧 Bạn có thể nghe tại:")
            print(f"   {result.get('audioURL')}")
            
            return result
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"\n❌ Request timed out after {elapsed:.1f}s")
        return None
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None

if __name__ == "__main__":
    print("\n🚀 Testing Chapter 1 with Preset Speed (Normal Speed)")
    print("🚀 Kiểm tra Chapter 1 với Tốc độ Preset (Tốc độ Bình thường)")
    print()
    
    result = test_preset_speed()
    
    print("\n" + "="*60)
    if result and result.get("success"):
        print("✅ Test completed successfully!")
        print("✅ Kiểm tra hoàn tất thành công!")
        print(f"\n📁 File ID: {result.get('fileId')}")
        print(f"🔗 URL: {result.get('audioURL')}")
        print(f"\n💡 Compare this with preset dia_female_05.wav and the 0.85x speed version!")
        print(f"💡 So sánh với preset dia_female_05.wav và phiên bản tốc độ 0.85x!")
        print(f"\n📊 Speed Comparison:")
        print(f"   - Preset (dia_female_05.wav): 1.0x (normal)")
        print(f"   - This version: 1.0x (normal - should match preset)")
        print(f"   - Previous version: 0.85x (15% slower)")
    else:
        print("⚠️  Test completed with issues")
    print("="*60)

