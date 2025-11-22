"""
Test Paragraph-Level Audio Generation
Kiểm tra Tạo Audio theo Paragraph
"""
import requests
import json
import time
from pathlib import Path

BASE_URL = "http://127.0.0.1:3000"
NOVEL_ID = "522e13ed-db50-4d2a-a0d9-92a3956d527d"
CHAPTER_1 = 1

def test_paragraph_generation():
    """Test generating chapter 1 with paragraph-level audio / Kiểm tra tạo chapter 1 với audio theo paragraph"""
    print("="*60)
    print("Testing Paragraph-Level Audio Generation")
    print("Kiểm tra Tạo Audio theo Paragraph")
    print("="*60)
    
    print(f"\nNovel ID: {NOVEL_ID}")
    print(f"Chapter: {CHAPTER_1}")
    print(f"Speed Factor: 1.0 (Normal speed - matches preset)")
    print("\nStarting paragraph-level audio generation...")
    print("Bắt đầu tạo audio theo paragraph...")
    print("(This will generate separate audio files for each paragraph)")
    print("(Sẽ tạo các file audio riêng cho từng paragraph)")
    print("(This may take longer as each paragraph is generated separately)")
    print("(Có thể mất nhiều thời gian hơn vì mỗi paragraph được tạo riêng)")
    
    start_time = time.time()
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/worker/generate/chapter",
            json={
                "novelId": NOVEL_ID,
                "chapterNumber": CHAPTER_1,
                "speakerId": "05",
                "expiryHours": 365 * 24,
                "speedFactor": 1.0,  # Normal speed (matches preset)
                "forceRegenerate": True  # Force regenerate to test new logic
            },
            timeout=600  # 10 minutes timeout (longer for multiple paragraphs)
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            result = data.get("result", {})
            
            print(f"\n✅ Audio generation completed in {elapsed:.1f}s")
            print(f"✅ Tạo audio hoàn tất trong {elapsed:.1f}s")
            
            print(f"\n📚 Chapter: {result.get('chapterNumber')}")
            print(f"📊 Total Paragraphs: {result.get('totalParagraphs')}")
            print(f"✅ Success Count: {result.get('successCount')}")
            print(f"💾 Cached Count: {result.get('cachedCount')}")
            print(f"🆕 Generated Count: {result.get('generatedCount')}")
            print(f"❌ Failed Count: {result.get('failedCount')}")
            
            paragraphResults = result.get('paragraphResults', [])
            if paragraphResults:
                print(f"\n📄 Paragraph Audio Files:")
                for i, para in enumerate(paragraphResults[:5], 1):  # Show first 5
                    status = "💾 Cached" if para.get('cached') else "🆕 Generated"
                    print(f"   {i}. Paragraph {para.get('paragraphNumber')}: {status}")
                    print(f"      File ID: {para.get('fileId')}")
                    print(f"      Text: {para.get('text', '')}")
                
                if len(paragraphResults) > 5:
                    print(f"   ... and {len(paragraphResults) - 5} more paragraphs")
            
            errors = result.get('errors', [])
            if errors:
                print(f"\n⚠️  Errors ({len(errors)}):")
                for error in errors[:3]:
                    print(f"   Paragraph {error.get('paragraphNumber')}: {error.get('error')}")
            
            print(f"\n💡 Chapter audio is now split into {len(paragraphResults)} separate files!")
            print(f"💡 Audio chapter giờ được chia thành {len(paragraphResults)} file riêng!")
            print(f"\n🎧 Frontend can play these seamlessly for continuous playback!")
            print(f"🎧 Frontend có thể phát các file này liền mạch để phát liên tục!")
            
            return result
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"\n❌ Request timed out after {elapsed:.1f}s")
        print("❌ Yêu cầu hết thời gian chờ")
        return None
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_get_chapter_audio():
    """Test getting all paragraph audio files for chapter / Kiểm tra lấy tất cả file audio paragraph cho chapter"""
    print("\n" + "="*60)
    print("Testing Get Chapter Audio (Paragraph-Level)")
    print("Kiểm tra Lấy Audio Chapter (Theo Paragraph)")
    print("="*60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/audio/{NOVEL_ID}/{CHAPTER_1}",
            params={"speakerId": "05"}
        )
        
        if response.status_code == 200:
            data = response.json()
            audioFiles = data.get("audioFiles", [])
            
            print(f"\n✅ Found {len(audioFiles)} audio file(s)")
            print(f"✅ Tìm thấy {len(audioFiles)} file audio")
            print(f"\n📚 Chapter: {data.get('chapterNumber')}")
            print(f"📊 Total Paragraphs: {data.get('totalParagraphs')}")
            print(f"🎵 Audio Files: {data.get('audioFileCount')}")
            
            if audioFiles:
                print(f"\n📄 Paragraph Audio Files (first 5):")
                for para in audioFiles[:5]:
                    print(f"   Paragraph {para.get('paragraphNumber')}:")
                    print(f"      File ID: {para.get('fileId')}")
                    print(f"      URL: {para.get('audioURL')}")
            
            return data
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

if __name__ == "__main__":
    print("\n🚀 Testing Paragraph-Level Audio Generation")
    print("🚀 Kiểm tra Tạo Audio theo Paragraph")
    print()
    
    # Test generation
    result = test_paragraph_generation()
    
    # Wait a bit
    print("\nWaiting 3 seconds before checking...")
    time.sleep(3)
    
    # Test getting audio files
    test_get_chapter_audio()
    
    print("\n" + "="*60)
    if result and result.get("success"):
        print("✅ Test completed successfully!")
        print("✅ Kiểm tra hoàn tất thành công!")
        print(f"\n📊 Summary:")
        print(f"   - Total Paragraphs: {result.get('totalParagraphs')}")
        print(f"   - Success: {result.get('successCount')}")
        print(f"   - Failed: {result.get('failedCount')}")
        print(f"\n💡 Audio files are now organized by paragraph!")
        print(f"💡 File audio giờ được tổ chức theo paragraph!")
    else:
        print("⚠️  Test completed with issues")
        print("⚠️  Kiểm tra hoàn tất với một số vấn đề")
    print("="*60)

