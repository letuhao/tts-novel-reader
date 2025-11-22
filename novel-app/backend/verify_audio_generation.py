#!/usr/bin/env python3
"""
Verify Audio Generation - Check if audio files were generated correctly
Kiểm tra Tạo Audio - Kiểm tra xem file audio đã được tạo đúng chưa
"""

import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent / "storage" / "audio"
NOVEL_ID = "522e13ed-db50-4d2a-a0d9-92a3956d527d"
CHAPTER_NUMBER = 1

def verify_audio_generation():
    """Verify audio files were generated correctly"""
    print("=" * 60)
    print("Verifying Audio Generation / Kiểm tra Tạo Audio")
    print("=" * 60)
    print()
    
    chapter_dir = BASE_DIR / NOVEL_ID / f"chapter_{CHAPTER_NUMBER:03d}"
    
    if not chapter_dir.exists():
        print(f"❌ Chapter directory not found: {chapter_dir}")
        return False
    
    paragraph_dirs = sorted([d for d in chapter_dir.iterdir() if d.is_dir() and d.name.startswith("paragraph_")])
    
    if not paragraph_dirs:
        print(f"❌ No paragraph directories found in {chapter_dir}")
        return False
    
    print(f"Chapter Directory: {chapter_dir}")
    print(f"Total Paragraph Directories: {len(paragraph_dirs)}")
    print()
    
    # Check each paragraph folder
    results = {
        "total": len(paragraph_dirs),
        "with_audio": 0,
        "with_metadata": 0,
        "with_both": 0,
        "missing_audio": [],
        "missing_metadata": [],
        "missing_both": []
    }
    
    print("Checking paragraph folders...")
    print("Đang kiểm tra thư mục paragraph...")
    print()
    
    for para_dir in paragraph_dirs[:20]:  # Check first 20
        para_num = para_dir.name
        wav_files = list(para_dir.glob("*.wav"))
        json_files = list(para_dir.glob("*.json"))
        
        has_audio = len(wav_files) > 0
        has_metadata = len(json_files) > 0
        
        if has_audio:
            results["with_audio"] += 1
        if has_metadata:
            results["with_metadata"] += 1
        if has_audio and has_metadata:
            results["with_both"] += 1
        
        if not has_audio:
            results["missing_audio"].append(para_num)
        if not has_metadata:
            results["missing_metadata"].append(para_num)
        if not has_audio and not has_metadata:
            results["missing_both"].append(para_num)
        
        # Show status for first 10
        if paragraph_dirs.index(para_dir) < 10:
            status = "✅" if (has_audio and has_metadata) else ("⚠️" if (has_audio or has_metadata) else "❌")
            audio_info = f"Audio: {wav_files[0].stat().st_size / 1024:.2f} KB" if wav_files else "No audio"
            print(f"{status} {para_num}: {audio_info}, Metadata: {'Yes' if has_metadata else 'No'}")
    
    # Check all folders
    for para_dir in paragraph_dirs:
        wav_files = list(para_dir.glob("*.wav"))
        json_files = list(para_dir.glob("*.json"))
        
        has_audio = len(wav_files) > 0
        has_metadata = len(json_files) > 0
        
        if has_audio:
            results["with_audio"] += 1
        if has_metadata:
            results["with_metadata"] += 1
        if has_audio and has_metadata:
            results["with_both"] += 1
    
    print()
    print("=" * 60)
    print("Summary / Tóm tắt")
    print("=" * 60)
    print(f"Total Paragraph Directories: {results['total']}")
    print(f"With Audio Files: {results['with_audio']}/{results['total']}")
    print(f"With Metadata Files: {results['with_metadata']}/{results['total']}")
    print(f"With Both (Audio + Metadata): {results['with_both']}/{results['total']}")
    print()
    
    if results['with_both'] == results['total']:
        print("✅ ALL PARAGRAPHS HAVE AUDIO FILES AND METADATA!")
        print("✅ TẤT CẢ PARAGRAPHS CÓ FILE AUDIO VÀ METADATA!")
        return True
    else:
        print(f"⚠️  INCOMPLETE: {results['total'] - results['with_both']} paragraphs missing files")
        print(f"⚠️  CHƯA HOÀN TẤT: {results['total'] - results['with_both']} paragraphs thiếu file")
        if results['missing_audio']:
            print(f"   Missing audio: {len(results['missing_audio'])} paragraphs")
        if results['missing_metadata']:
            print(f"   Missing metadata: {len(results['missing_metadata'])} paragraphs")
        return False

if __name__ == "__main__":
    success = verify_audio_generation()
    exit(0 if success else 1)

