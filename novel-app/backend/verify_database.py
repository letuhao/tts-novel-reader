"""
Verify Database Storage
Kiểm tra Lưu trữ Database

Verifies that data is correctly stored in normalized database tables.
Xác minh rằng dữ liệu được lưu trữ đúng trong các bảng database đã chuẩn hóa.
"""
import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent / "database" / "novels.db"

def verify_database():
    """Verify database storage / Kiểm tra lưu trữ database"""
    print("=" * 60)
    print("Database Storage Verification")
    print("Kiểm tra Lưu trữ Database")
    print("=" * 60)
    print()
    
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        print(f"❌ Không tìm thấy database: {DB_PATH}")
        return False
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check chapters table
        print("📊 Chapters Table:")
        print("📊 Bảng Chapters:")
        cursor.execute('SELECT COUNT(*) FROM chapters')
        total_chapters = cursor.fetchone()[0]
        print(f"   Total chapters: {total_chapters}")
        print(f"   Tổng số chapters: {total_chapters}")
        
        if total_chapters > 0:
            cursor.execute('SELECT novel_id, chapter_number, title, total_paragraphs FROM chapters ORDER BY novel_id, chapter_number LIMIT 5')
            chapters = cursor.fetchall()
            for ch in chapters:
                novel_id_short = ch[0][:8] + "..." if len(ch[0]) > 8 else ch[0]
                title = ch[2][:50] + "..." if ch[2] and len(ch[2]) > 50 else (ch[2] or "No title")
                print(f"   - Novel: {novel_id_short}, Chapter {ch[1]}: {title} ({ch[3]} paragraphs)")
        print()
        
        # Check paragraphs table
        print("📊 Paragraphs Table:")
        print("📊 Bảng Paragraphs:")
        cursor.execute('SELECT COUNT(*) FROM paragraphs')
        total_paragraphs = cursor.fetchone()[0]
        print(f"   Total paragraphs: {total_paragraphs}")
        print(f"   Tổng số paragraphs: {total_paragraphs}")
        
        if total_paragraphs > 0:
            cursor.execute('''
                SELECT novel_id, chapter_number, paragraph_number, 
                       LENGTH(text) as text_len 
                FROM paragraphs 
                ORDER BY novel_id, chapter_number, paragraph_number 
                LIMIT 5
            ''')
            paragraphs = cursor.fetchall()
            for p in paragraphs:
                novel_id_short = p[0][:8] + "..." if len(p[0]) > 8 else p[0]
                print(f"   - Novel: {novel_id_short}, Ch {p[1]}, Para {p[2]}: {p[3]} chars")
        print()
        
        # Check generation_progress table
        print("📊 Generation Progress Table:")
        print("📊 Bảng Generation Progress:")
        cursor.execute('SELECT COUNT(*) FROM generation_progress')
        total_progress = cursor.fetchone()[0]
        print(f"   Total progress entries: {total_progress}")
        print(f"   Tổng số progress entries: {total_progress}")
        
        if total_progress > 0:
            cursor.execute('SELECT status, COUNT(*) FROM generation_progress GROUP BY status')
            stats = cursor.fetchall()
            print("   Status breakdown:")
            print("   Phân tích trạng thái:")
            for s in stats:
                print(f"      - {s[0]}: {s[1]}")
            
            cursor.execute('''
                SELECT novel_id, chapter_number, paragraph_number, status, 
                       progress_percent, error_message 
                FROM generation_progress 
                ORDER BY created_at DESC 
                LIMIT 5
            ''')
            progress = cursor.fetchall()
            print()
            print("   Latest 5 entries:")
            print("   5 entries mới nhất:")
            for p in progress:
                novel_id_short = p[0][:8] + "..." if len(p[0]) > 8 else p[0]
                error_preview = (p[5][:30] + "...") if p[5] else None
                print(f"      - Novel: {novel_id_short}, Ch {p[1]}, Para {p[2]}: {p[3]} ({p[4]}%)")
                if error_preview:
                    print(f"        Error: {error_preview}")
        print()
        
        # Check audio_cache table
        print("📊 Audio Cache Table:")
        print("📊 Bảng Audio Cache:")
        cursor.execute('SELECT COUNT(*) FROM audio_cache')
        total_cache = cursor.fetchone()[0]
        print(f"   Total cache entries: {total_cache}")
        print(f"   Tổng số cache entries: {total_cache}")
        
        if total_cache > 0:
            cursor.execute('''
                SELECT novel_id, chapter_number, paragraph_number, 
                       tts_file_id, local_audio_path, audio_file_size 
                FROM audio_cache 
                ORDER BY created_at DESC 
                LIMIT 5
            ''')
            cache = cursor.fetchall()
            print("   Latest 5 entries:")
            print("   5 entries mới nhất:")
            for c in cache:
                novel_id_short = c[0][:8] + "..." if len(c[0]) > 8 else c[0]
                file_id_short = c[3][:16] + "..." if len(c[3]) > 16 else c[3]
                path_short = (c[4][-50:] if c[4] else "NULL")
                size_mb = (c[5] / (1024 * 1024)) if c[5] else 0
                print(f"      - Novel: {novel_id_short}, Ch {c[1]}, Para {c[2]}")
                print(f"        File ID: {file_id_short}")
                print(f"        Local Path: {path_short}")
                if size_mb > 0:
                    print(f"        Size: {size_mb:.2f} MB")
        print()
        
        # Summary
        print("=" * 60)
        print("✅ Database Verification Complete!")
        print("✅ Kiểm tra Database hoàn tất!")
        print()
        print(f"Summary:")
        print(f"Tóm tắt:")
        print(f"   - Novels: Check novels table manually")
        print(f"   - Chapters: {total_chapters}")
        print(f"   - Paragraphs: {total_paragraphs}")
        print(f"   - Generation Progress: {total_progress}")
        print(f"   - Audio Cache: {total_cache}")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying database: {e}")
        print(f"❌ Lỗi khi kiểm tra database: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    verify_database()

