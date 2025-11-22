"""
Test novel file upload/processing
Kiểm tra upload/xử lý file novel
"""
import requests
import json
from pathlib import Path

BASE_URL = "http://127.0.0.1:11110"
NOVEL_FILE = Path(__file__).parent.parent / "novels" / "Bắt đầu biến thân nữ điều tra quan (1-54 chương) (cao H, biến thân).txt"

def test_process_existing_file():
    """Test processing existing file / Kiểm tra xử lý file có sẵn"""
    print("Testing process existing file...")
    print("Đang kiểm tra xử lý file có sẵn...")
    print(f"File: {NOVEL_FILE}")
    print(f"Exists: {NOVEL_FILE.exists()}")
    
    if not NOVEL_FILE.exists():
        print(f"❌ File not found: {NOVEL_FILE}")
        return
    
    # Process file using absolute path
    response = requests.post(
        f"{BASE_URL}/api/novels/process",
        json={
            "filePath": str(NOVEL_FILE)
        },
        headers={"Content-Type": "application/json"},
        timeout=60  # Large file, may take time
    )
    
    if response.status_code == 200:
        data = response.json()
        novel = data.get("novel", {})
        print(f"\n✅ Novel processed successfully!")
        print(f"✅ Novel đã được xử lý thành công!")
        print(f"\n📚 Novel ID: {novel.get('id')}")
        print(f"📖 Title: {novel.get('title')}")
        print(f"📑 Total Chapters: {novel.get('totalChapters')}")
        print(f"\nChapters preview:")
        chapters = novel.get('chapters', [])
        for i, ch in enumerate(chapters[:5]):  # Show first 5 chapters
            print(f"  {ch.get('chapterNumber')}: {ch.get('title')} ({ch.get('totalParagraphs')} paragraphs)")
        if len(chapters) > 5:
            print(f"  ... and {len(chapters) - 5} more chapters")
        
        return novel
    else:
        print(f"\n❌ Error: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def test_get_novels():
    """Test getting all novels / Kiểm tra lấy tất cả novels"""
    print("\n" + "="*60)
    print("Getting all novels...")
    print("Đang lấy tất cả novels...")
    
    response = requests.get(f"{BASE_URL}/api/novels")
    
    if response.status_code == 200:
        data = response.json()
        novels = data.get("novels", [])
        print(f"\n✅ Found {len(novels)} novel(s)")
        for novel in novels:
            print(f"  - {novel.get('title')} (ID: {novel.get('id')}) - {novel.get('totalChapters')} chapters")
    else:
        print(f"❌ Error: {response.status_code}")

if __name__ == "__main__":
    print("="*60)
    print("Testing Novel Reader Backend File Processing")
    print("Kiểm tra Xử lý File Novel Reader Backend")
    print("="*60)
    
    # Test process file
    novel = test_process_existing_file()
    
    # Test get novels
    test_get_novels()
    
    print("\n" + "="*60)
    print("✅ Test complete!")
    print("✅ Kiểm tra hoàn tất!")

