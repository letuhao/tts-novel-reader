"""
Reprocess Novel - Migrate to Normalized Tables
Tái xử lý Novel - Di chuyển sang Bảng Đã Chuẩn hóa

Reprocesses an existing novel to populate the normalized database tables.
Tái xử lý một novel hiện có để điền vào các bảng database đã chuẩn hóa.
"""
import json
import urllib.request
import urllib.error
import sys
import time

def check_backend():
    """Check if backend is running / Kiểm tra xem backend có đang chạy không"""
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/health", timeout=3) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                print(f"✅ Backend is running: {data.get('status', 'unknown')}")
                return True
    except:
        pass
    print("❌ Backend is not running!")
    return False

def get_novel_id():
    """Get first novel ID / Lấy ID novel đầu tiên"""
    print()
    print("=== Getting Novel ID ===")
    print("=== Đang lấy Novel ID ===")
    
    try:
        with urllib.request.urlopen("http://127.0.0.1:3000/api/novels", timeout=5) as response:
            data = json.loads(response.read().decode())
            
            novels = data.get('novels', [])
            if not novels and isinstance(data, list):
                novels = data
            
            if novels and len(novels) > 0:
                novel = novels[0]
                novel_id = novel.get('id')
                title = novel.get('title', 'Unknown')
                print(f"✅ Found Novel:")
                print(f"   ID: {novel_id}")
                print(f"   Title: {title}")
                return novel_id
            
            print("❌ No novels found!")
            return None
    except Exception as e:
        print(f"❌ Error getting novels: {e}")
        return None

def reprocess_novel(novel_id):
    """Reprocess novel to populate normalized tables / Tái xử lý novel để điền vào bảng đã chuẩn hóa"""
    print()
    print("=" * 60)
    print("=== Reprocessing Novel ===")
    print("=== Tái xử lý Novel ===")
    print("=" * 60)
    print()
    
    # Get novel file path from API
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:3000/api/novels/{novel_id}", timeout=5) as response:
            data = json.loads(response.read().decode())
            novel = data.get('novel', {})
            file_path = novel.get('file_path')
            
            if not file_path:
                print("❌ Novel file path not found!")
                return False
            
            print(f"Novel File Path: {file_path}")
            print(f"Đường dẫn file Novel: {file_path}")
            print()
            
            # Process the file
            print("Sending reprocess request...")
            print("Đang gửi yêu cầu tái xử lý...")
            
            request_data = json.dumps({
                'filePath': file_path
            }).encode('utf-8')
            
            req = urllib.request.Request(
                "http://127.0.0.1:3000/api/novels/process",
                data=request_data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=300) as response:
                result = json.loads(response.read().decode())
                
                if result.get('success'):
                    print()
                    print("✅ Novel reprocessed successfully!")
                    print("✅ Novel đã được tái xử lý thành công!")
                    print()
                    print(f"Novel ID: {result.get('novel', {}).get('id')}")
                    print(f"Title: {result.get('novel', {}).get('title')}")
                    print(f"Total Chapters: {result.get('novel', {}).get('totalChapters', 0)}")
                    return True
                else:
                    print(f"❌ Reprocessing failed: {result.get('error')}")
                    return False
                    
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else "Unknown error"
        print(f"❌ HTTP ERROR: {e.code} {e.reason}")
        print(f"Error Response: {error_body}")
        return False
    except Exception as e:
        print(f"❌ Error reprocessing novel: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function / Hàm chính"""
    print("=" * 60)
    print("Novel Reprocessing Script")
    print("Script Tái xử lý Novel")
    print("=" * 60)
    print()
    
    # Check backend
    if not check_backend():
        sys.exit(1)
    
    # Get novel ID
    novel_id = get_novel_id()
    if not novel_id:
        sys.exit(1)
    
    # Reprocess novel
    success = reprocess_novel(novel_id)
    
    print()
    print("=" * 60)
    if success:
        print("✅ Reprocessing completed!")
        print("✅ Tái xử lý hoàn tất!")
    else:
        print("❌ Reprocessing failed!")
        print("❌ Tái xử lý thất bại!")
    print("=" * 60)

if __name__ == "__main__":
    main()

