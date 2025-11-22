#!/usr/bin/env python3
"""
Check Paragraphs - Verify paragraph data before TTS generation
Kiểm tra Paragraphs - Xác minh dữ liệu paragraph trước khi tạo TTS
"""

import requests
import json
import sys

BASE_URL = "http://127.0.0.1:3000"
NOVEL_ID = "522e13ed-db50-4d2a-a0d9-92a3956d527d"
CHAPTER_NUMBER = 1

def check_paragraphs():
    """Check all paragraphs and verify they are correct"""
    print("=" * 60)
    print("Checking Paragraphs / Kiểm tra Paragraphs")
    print("=" * 60)
    print()
    
    # Fetch chapter data
    url = f"{BASE_URL}/api/novels/{NOVEL_ID}/chapters/{CHAPTER_NUMBER}"
    print(f"Fetching chapter data from: {url}")
    print(f"Đang lấy dữ liệu chapter từ: {url}")
    print()
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if not data.get('success'):
            print(f"❌ Error: {data.get('error', 'Unknown error')}")
            sys.exit(1)
        
        chapter = data['chapter']
        paragraphs = chapter['paragraphs']
        
        print(f"Chapter: {chapter['title']}")
        print(f"Total Paragraphs: {len(paragraphs)}")
        print()
        
        # Check for unique texts
        text_map = {}
        duplicates = []
        empty_paragraphs = []
        
        print("Checking paragraph uniqueness...")
        print("Đang kiểm tra tính duy nhất của paragraphs...")
        print()
        
        for i, para in enumerate(paragraphs):
            para_num = para['paragraphNumber']
            text = para.get('text', '').strip()
            
            # Check for empty paragraphs
            if not text:
                empty_paragraphs.append(para_num)
                print(f"⚠️  Paragraph {para_num}: EMPTY")
                continue
            
            # Check for duplicates
            if text in text_map:
                dup_para = text_map[text]
                duplicates.append((para_num, dup_para, text[:80]))
                print(f"❌ Paragraph {para_num}: DUPLICATE of Paragraph {dup_para}")
                print(f"   Text: {text[:100]}...")
            else:
                text_map[text] = para_num
            
            # Show first 20 paragraphs
            if i < 20:
                preview = text[:80] + "..." if len(text) > 80 else text
                print(f"[Para {para_num}] ({len(text)} chars): {preview}")
        
        print()
        print("=" * 60)
        print("Summary / Tóm tắt")
        print("=" * 60)
        print(f"Total Paragraphs: {len(paragraphs)}")
        print(f"Unique Texts: {len(text_map)}")
        print(f"Empty Paragraphs: {len(empty_paragraphs)}")
        print(f"Duplicates: {len(duplicates)}")
        print()
        
        if empty_paragraphs:
            print(f"⚠️  Empty Paragraphs: {empty_paragraphs}")
            print()
        
        if duplicates:
            print("❌ DUPLICATE PARAGRAPHS FOUND!")
            print("❌ TÌM THẤY PARAGRAPHS TRÙNG LẶP!")
            for dup_para, orig_para, text in duplicates:
                print(f"   Paragraph {dup_para} = Paragraph {orig_para}")
                print(f"   Text: {text[:100]}...")
            print()
            return False
        else:
            print("✅ ALL PARAGRAPHS HAVE UNIQUE TEXT!")
            print("✅ TẤT CẢ PARAGRAPHS CÓ TEXT DUY NHẤT!")
            print()
            return True
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching chapter data: {e}")
        print(f"❌ Lỗi lấy dữ liệu chapter: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"❌ Lỗi không mong đợi: {e}")
        sys.exit(1)

if __name__ == "__main__":
    is_correct = check_paragraphs()
    sys.exit(0 if is_correct else 1)

