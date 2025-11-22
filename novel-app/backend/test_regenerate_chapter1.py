"""
Test Regenerate Chapter 1 with Slower Processing
Kiểm tra Tạo lại Chapter 1 với Xử lý Chậm hơn
"""
import requests
import json
import time

BASE_URL = "http://127.0.0.1:3000"

# Novel ID from previous test
NOVEL_ID = "522e13ed-db50-4d2a-a0d9-92a3956d527d"
CHAPTER_1 = 1

def test_regenerate_chapter_1():
    """Test regenerating audio for chapter 1 / Kiểm tra tạo lại audio cho chapter 1"""
    print("="*60)
    print("Testing Regenerate Chapter 1 with Slower Processing")
    print("Kiểm tra Tạo lại Chapter 1 với Xử lý Chậm hơn")
    print("="*60)
    
    print(f"\nNovel ID: {NOVEL_ID}")
    print(f"Chapter: {CHAPTER_1}")
    print("\n⚠️  Worker configured for 50% slower processing")
    print("⚠️  Worker được cấu hình chạy chậm hơn 50%")
    print("\nStarting audio regeneration...")
    print("Bắt đầu tạo lại audio...")
    print("(This may take 60-120 seconds due to slower processing)")
    print("(Có thể mất 60-120 giây do xử lý chậm hơn)")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/worker/generate/chapter",
            json={
                "novelId": NOVEL_ID,
                "chapterNumber": CHAPTER_1,
                "speakerId": "05",
                "expiryHours": 365 * 24,
                "forceRegenerate": True  # Force regenerate to test
            },
            timeout=180  # 3 minutes timeout for slower processing
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            result = data.get("result", {})
            
            print(f"\n✅ Audio regeneration completed in {elapsed:.1f}s")
            print(f"✅ Tạo lại audio hoàn tất trong {elapsed:.1f}s")
            
            print(f"\n📚 Chapter: {result.get('chapterNumber')}")
            print(f"🆔 File ID: {result.get('fileId')}")
            print(f"🔗 Audio URL: {result.get('audioURL')}")
            
            if result.get("localPath"):
                print(f"💾 Local Path: {result.get('localPath')}")
                print(f"📁 Storage Dir: {result.get('storageDir')}")
            
            print(f"⏰ Expires At: {result.get('expiresAt')}")
            
            return result
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"\n❌ Request timed out after {elapsed:.1f}s")
        print("❌ Yêu cầu hết thời gian chờ")
        print("💡 Audio generation might still be processing...")
        print("💡 Tạo audio có thể vẫn đang xử lý...")
        return None
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return None

def test_storage_structure():
    """Test storage structure / Kiểm tra cấu trúc lưu trữ"""
    print("\n" + "="*60)
    print("Testing Storage Structure")
    print("Kiểm tra Cấu trúc Lưu trữ")
    print("="*60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/worker/storage/{NOVEL_ID}"
        )
        
        if response.status_code == 200:
            data = response.json()
            structure = data.get("structure", {})
            
            print(f"\n📁 Novel ID: {structure.get('novelId')}")
            print(f"📂 Base Dir: {structure.get('baseDir')}")
            
            chapters = structure.get("chapters", [])
            print(f"\n📑 Chapters with audio: {len(chapters)}")
            
            if chapters:
                print("\nChapter breakdown:")
                print("Phân tích chapters:")
                for ch in chapters:
                    print(f"  Chapter {ch['chapterNumber']}: {ch['audioCount']} audio file(s), {ch['metadataCount']} metadata file(s)")
            else:
                print("\n  No chapters found yet")
            
            return structure
        else:
            print(f"❌ Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_status():
    """Test getting status / Kiểm tra lấy trạng thái"""
    print("\n" + "="*60)
    print("Testing Status Check")
    print("Kiểm tra Kiểm tra Trạng thái")
    print("="*60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/worker/status/{NOVEL_ID}/{CHAPTER_1}"
        )
        
        if response.status_code == 200:
            data = response.json()
            status = data.get("status", {})
            
            print(f"\n📚 Chapter: {status.get('chapterNumber')}")
            print(f"🎵 Has Audio: {status.get('hasAudio')}")
            print(f"✅ Valid: {status.get('isValid')}")
            
            if status.get('hasAudio'):
                print(f"\n🆔 File ID: {status.get('fileId')}")
                print(f"🔗 Audio URL: {status.get('audioURL')}")
                print(f"⏰ Expires At: {status.get('expiresAt')}")
                print(f"🎤 Speaker ID: {status.get('speakerId')}")
            
            return status
        else:
            print(f"❌ Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    print("\n🚀 Testing Regenerate Chapter 1 with Organized Storage")
    print("🚀 Kiểm tra Tạo lại Chapter 1 với Lưu trữ Có Tổ chức")
    print()
    
    # Test status before
    print("Status before regeneration:")
    print("Trạng thái trước khi tạo lại:")
    test_status()
    
    # Test regeneration
    result = test_regenerate_chapter_1()
    
    # Test status after
    print("\nStatus after regeneration:")
    print("Trạng thái sau khi tạo lại:")
    test_status()
    
    # Test storage structure
    test_storage_structure()
    
    print("\n" + "="*60)
    if result and result.get("success"):
        print("✅ Test completed successfully!")
        print("✅ Kiểm tra hoàn tất thành công!")
        print("\n📁 Audio files are now organized in:")
        print(f"   storage/audio/{NOVEL_ID}/chapter_001/")
    else:
        print("⚠️  Test completed with issues")
        print("⚠️  Kiểm tra hoàn tất với một số vấn đề")
    print("="*60)

