"""
Test Novel Backend Worker
Kiểm tra Worker Novel Backend

Tests the worker service to generate audio for chapter 1 and verify the download pipeline works.
Kiểm tra dịch vụ worker để tạo audio cho chapter 1 và xác minh pipeline tải xuống hoạt động.
"""
import json
import urllib.request
import urllib.error
import sys
import time
from pathlib import Path

def check_backend():
    """Check if backend is running / Kiểm tra xem backend có đang chạy không"""
    try:
        with urllib.request.urlopen("http://127.0.0.1:11110/health", timeout=3) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print(f"✅ Backend is running: {data.get('status', 'unknown')}")
                print(f"✅ Backend đang chạy: {data.get('status', 'unknown')}")
                return True
    except:
        pass
    print("❌ Backend is not running!")
    print("❌ Backend không đang chạy!")
    print("   Start it with: python restart_backend.py")
    print("   Khởi động bằng: python restart_backend.py")
    return False

def get_novel_id():
    """Get first novel ID / Lấy ID novel đầu tiên"""
    print()
    print("=== Getting Novel ID ===")
    print("=== Đang lấy Novel ID ===")
    print()
    
    try:
        with urllib.request.urlopen("http://127.0.0.1:11110/api/novels", timeout=5) as response:
            data = json.loads(response.read().decode())
            
            novels = data.get('novels', [])
            if not novels and isinstance(data, list):
                novels = data
            
            if novels and len(novels) > 0:
                novel = novels[0]
                novel_id = novel.get('id')
                title = novel.get('title', 'Unknown')
                chapters = novel.get('totalChapters', 'Unknown')
                
                print(f"✅ Found Novel:")
                print(f"✅ Đã tìm thấy Novel:")
                print(f"   ID: {novel_id}")
                print(f"   Title: {title}")
                print(f"   Chapters: {chapters}")
                print()
                
                return novel_id
            else:
                print("❌ No novels found")
                print("❌ Không tìm thấy novel nào")
                return None
                
    except Exception as e:
        print(f"❌ Error getting novels: {e}")
        print(f"❌ Lỗi khi lấy novels: {e}")
        return None

def generate_chapter_audio(novel_id, chapter_number=1):
    """Generate audio for a chapter / Tạo audio cho một chapter"""
    print()
    print("=" * 60)
    print(f"=== Generating Audio for Chapter {chapter_number} ===")
    print(f"=== Đang tạo Audio cho Chapter {chapter_number} ===")
    print("=" * 60)
    print()
    
    # Prepare request
    request_body = {
        "novelId": novel_id,
        "chapterNumber": chapter_number,
        "speakerId": "05",
        "forceRegenerate": True,
        "speedFactor": 1.0,
        "maxParagraphs": 3  # Limit to 3 paragraphs for faster testing
    }
    
    print("Request:")
    print("Yêu cầu:")
    print(f"  Novel ID: {novel_id}")
    print(f"  Chapter: {chapter_number}")
    print(f"  Speaker ID: 05")
    print(f"  Force Regenerate: True")
    print(f"  Speed Factor: 1.0")
    print()
    
    url = "http://127.0.0.1:11110/api/worker/generate/chapter"
    data = json.dumps(request_body).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    print("Sending generation request...")
    print("Đang gửi yêu cầu tạo audio...")
    print()
    
    try:
        # Send request (with long timeout for generation)
        with urllib.request.urlopen(req, timeout=600) as response:  # 10 minutes timeout
            print("✅ Request sent successfully!")
            print("✅ Yêu cầu đã được gửi thành công!")
            print()
            
            # Get response
            response_data = json.loads(response.read().decode())
            result = response_data.get('result', response_data)
            
            print("📊 Generation Result:")
            print("📊 Kết quả tạo audio:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            print()
            
            # Extract key info
            success = result.get('success', False)
            chapter_number = result.get('chapterNumber', chapter_number)
            total_paragraphs = result.get('totalParagraphs', 0)
            success_count = result.get('successCount', 0)
            failed_count = result.get('failedCount', 0)
            cached_count = result.get('cachedCount', 0)
            generated_count = result.get('generatedCount', 0)
            
            print("📈 Summary:")
            print("📈 Tóm tắt:")
            print(f"   Success: {success}")
            print(f"   Chapter: {chapter_number}")
            print(f"   Total Paragraphs: {total_paragraphs}")
            print(f"   ✅ Generated: {generated_count}")
            print(f"   ✅ Cached: {cached_count}")
            print(f"   ❌ Failed: {failed_count}")
            print()
            
            if success and success_count > 0:
                print("✅ Generation completed successfully!")
                print("✅ Tạo audio hoàn tất thành công!")
                return True
            elif failed_count > 0:
                print("⚠️  Generation completed with errors")
                print("⚠️  Tạo audio hoàn tất với lỗi")
                if 'errors' in result:
                    print()
                    print("Errors:")
                    print("Lỗi:")
                    for error in result['errors'][:5]:  # Show first 5 errors
                        print(f"   - Paragraph {error.get('paragraphNumber')}: {error.get('error')}")
                return False
            else:
                print("❌ Generation failed!")
                print("❌ Tạo audio thất bại!")
                return False
                
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP ERROR: {e.code} {e.reason}")
        print(f"❌ LỖI HTTP: {e.code} {e.reason}")
        try:
            error_body = e.read().decode('utf-8')
            print("Error Response:")
            print("Phản hồi lỗi:")
            print(error_body)
        except:
            pass
        return False
        
    except urllib.error.URLError as e:
        print(f"❌ URL ERROR: {e.reason}")
        print(f"❌ LỖI URL: {e.reason}")
        return False
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        print(f"❌ LỖI: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_storage(novel_id):
    """Check storage for generated files / Kiểm tra storage cho các file đã tạo"""
    print()
    print("=" * 60)
    print("=== Checking Storage ===")
    print("=== Đang kiểm tra Storage ===")
    print("=" * 60)
    print()
    
    storage_base = Path(__file__).parent.parent.parent / "storage" / "audio"
    
    if not storage_base.exists():
        print("❌ Storage directory does not exist")
        print("❌ Thư mục storage không tồn tại")
        print(f"   Expected: {storage_base}")
        return False
    
    print(f"Storage base: {storage_base}")
    print(f"Storage cơ sở: {storage_base}")
    print()
    
    # Find novel directory
    novel_dirs = list(storage_base.glob(f"{novel_id}*"))
    
    if not novel_dirs:
        print("⚠️  No novel storage directory found")
        print("⚠️  Không tìm thấy thư mục storage novel")
        print(f"   Expected pattern: {novel_id}*")
        return False
    
    print(f"✅ Found {len(novel_dirs)} novel directory(ies):")
    print(f"✅ Đã tìm thấy {len(novel_dirs)} thư mục novel:")
    for novel_dir in novel_dirs:
        print(f"   {novel_dir.name}")
    print()
    
    # Check chapter 1
    chapter_dir = novel_dirs[0] / "chapter_001*"
    chapter_dirs = list(novel_dirs[0].glob("chapter_001*"))
    
    if not chapter_dirs:
        print("⚠️  No chapter 1 directory found")
        print("⚠️  Không tìm thấy thư mục chapter 1")
        return False
    
    chapter_dir = chapter_dirs[0]
    print(f"✅ Found chapter 1 directory: {chapter_dir.name}")
    print(f"✅ Đã tìm thấy thư mục chapter 1: {chapter_dir.name}")
    print()
    
    # Count paragraph directories
    para_dirs = list(chapter_dir.glob("paragraph_*"))
    print(f"📁 Paragraph directories: {len(para_dirs)}")
    print(f"📁 Thư mục paragraph: {len(para_dirs)}")
    print()
    
    # Check files in first 5 paragraphs
    print("Checking first 5 paragraph directories:")
    print("Đang kiểm tra 5 thư mục paragraph đầu tiên:")
    print()
    
    audio_files = 0
    metadata_files = 0
    
    for para_dir in sorted(para_dirs)[:5]:
        wav_files = list(para_dir.glob("*.wav"))
        json_files = list(para_dir.glob("*metadata.json"))
        
        audio_count = len(wav_files)
        metadata_count = len(json_files)
        
        audio_files += audio_count
        metadata_files += metadata_count
        
        status = "✅ BOTH" if audio_count > 0 and metadata_count > 0 else \
                 "⚠️  Audio only" if audio_count > 0 else \
                 "⚠️  Metadata only" if metadata_count > 0 else \
                 "❌ Empty"
        
        print(f"   {para_dir.name}: {status}")
        if audio_count > 0:
            print(f"      Audio: {wav_files[0].name} ({wav_files[0].stat().st_size / 1024:.1f} KB)")
        if metadata_count > 0:
            print(f"      Metadata: {json_files[0].name}")
    
    print()
    print("📊 Storage Summary:")
    print("📊 Tóm tắt Storage:")
    print(f"   Paragraph directories: {len(para_dirs)}")
    print(f"   Audio files found: {audio_files}")
    print(f"   Metadata files found: {metadata_files}")
    print()
    
    if audio_files > 0 and metadata_files > 0:
        print("✅ Storage looks good!")
        print("✅ Storage trông ổn!")
        return True
    else:
        print("⚠️  Some files are missing")
        print("⚠️  Một số file bị thiếu")
        return False

def main():
    """Main function / Hàm chính"""
    print("=" * 60)
    print("Novel Backend Worker Test")
    print("Kiểm tra Worker Novel Backend")
    print("=" * 60)
    print()
    
    # Check backend
    if not check_backend():
        sys.exit(1)
    
    # Get novel ID
    novel_id = get_novel_id()
    if not novel_id:
        sys.exit(1)
    
    # Generate chapter 1 audio
    success = generate_chapter_audio(novel_id, chapter_number=1)
    
    if success:
        # Wait a bit for files to be saved
        print()
        print("Waiting for files to be saved...")
        print("Đang chờ các file được lưu...")
        time.sleep(5)
        
        # Check storage
        check_storage(novel_id)
    
    print()
    print("=" * 60)
    if success:
        print("✅ Worker test completed!")
        print("✅ Kiểm tra worker hoàn tất!")
    else:
        print("❌ Worker test failed!")
        print("❌ Kiểm tra worker thất bại!")
    print("=" * 60)
    print()
    print("Check logs for detailed information:")
    print("Kiểm tra logs để xem thông tin chi tiết:")
    print("  - Backend logs: novel-app/backend/logs/backend_output.log")
    print("  - Backend errors: novel-app/backend/logs/backend_error.log")
    print()

if __name__ == "__main__":
    main()
