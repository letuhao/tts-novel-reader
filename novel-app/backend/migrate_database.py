"""
Database Migration Script
Script Di chuyển Database

Migrates the database schema to support normalized tables.
Di chuyển schema database để hỗ trợ các bảng đã chuẩn hóa.
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "database" / "novels.db"

def migrate_database():
    """Migrate database schema / Di chuyển schema database"""
    print("=" * 60)
    print("Database Migration Script")
    print("Script Di chuyển Database")
    print("=" * 60)
    print()
    
    if not DB_PATH.exists():
        print(f"✅ Database file doesn't exist - backend will create it with new schema")
        print(f"✅ File database không tồn tại - backend sẽ tạo nó với schema mới")
        return True
    
    print(f"Database: {DB_PATH}")
    print()
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    try:
        # Check current schema
        print("📊 Checking current schema...")
        print("📊 Đang kiểm tra schema hiện tại...")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"   Existing tables: {', '.join(tables)}")
        print()
        
        # 1. Add total_paragraphs column to novels table if missing
        print("1. Updating novels table...")
        try:
            cursor.execute("ALTER TABLE novels ADD COLUMN total_paragraphs INTEGER DEFAULT 0")
            print("   ✅ Added total_paragraphs column")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("   ℹ️  total_paragraphs column already exists")
            else:
                raise
        
        # 2. Remove chapters JSON column if it exists (we'll use normalized tables)
        # Note: SQLite doesn't support DROP COLUMN directly, so we'll skip this
        
        # 3. Create chapters table if it doesn't exist
        print()
        print("2. Creating chapters table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS chapters (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                chapter_number INTEGER NOT NULL,
                title TEXT,
                content TEXT,
                total_paragraphs INTEGER DEFAULT 0,
                total_lines INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
                UNIQUE(novel_id, chapter_number)
            )
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_chapters_number ON chapters(novel_id, chapter_number)
        """)
        print("   ✅ Chapters table ready")
        
        # 4. Create paragraphs table if it doesn't exist
        print()
        print("3. Creating paragraphs table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS paragraphs (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                chapter_id TEXT NOT NULL,
                chapter_number INTEGER NOT NULL,
                paragraph_number INTEGER NOT NULL,
                text TEXT NOT NULL,
                lines TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
                FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
                UNIQUE(novel_id, chapter_id, paragraph_number)
            )
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_paragraphs_novel ON paragraphs(novel_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter ON paragraphs(chapter_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_paragraphs_number ON paragraphs(novel_id, chapter_number, paragraph_number)
        """)
        print("   ✅ Paragraphs table ready")
        
        # 5. Create generation_progress table if it doesn't exist
        print()
        print("4. Creating generation_progress table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS generation_progress (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                chapter_id TEXT,
                chapter_number INTEGER,
                paragraph_id TEXT,
                paragraph_number INTEGER,
                status TEXT NOT NULL DEFAULT 'pending',
                speaker_id TEXT,
                model TEXT,
                progress_percent REAL DEFAULT 0,
                started_at TEXT,
                completed_at TEXT,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
                FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
                FOREIGN KEY (paragraph_id) REFERENCES paragraphs(id) ON DELETE CASCADE
            )
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_gen_progress_novel ON generation_progress(novel_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_gen_progress_chapter ON generation_progress(chapter_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_gen_progress_paragraph ON generation_progress(paragraph_id)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_gen_progress_status ON generation_progress(status)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_gen_progress_chapter_status ON generation_progress(novel_id, chapter_number, status)
        """)
        print("   ✅ Generation progress table ready")
        
        # 6. Update audio_cache table - add missing columns
        print()
        print("5. Updating audio_cache table...")
        try:
            cursor.execute("ALTER TABLE audio_cache ADD COLUMN local_audio_path TEXT")
            print("   ✅ Added local_audio_path column")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("   ℹ️  local_audio_path column already exists")
            else:
                raise
        
        try:
            cursor.execute("ALTER TABLE audio_cache ADD COLUMN audio_duration REAL")
            print("   ✅ Added audio_duration column")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("   ℹ️  audio_duration column already exists")
        
        try:
            cursor.execute("ALTER TABLE audio_cache ADD COLUMN audio_file_size INTEGER")
            print("   ✅ Added audio_file_size column")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print("   ℹ️  audio_file_size column already exists")
        
        # Commit changes
        conn.commit()
        
        print()
        print("=" * 60)
        print("✅ Database migration completed!")
        print("✅ Di chuyển database hoàn tất!")
        print()
        print("The database schema has been updated to support normalized tables.")
        print("Schema database đã được cập nhật để hỗ trợ các bảng đã chuẩn hóa.")
        print()
        print("⚠️  Note: Existing novel data needs to be reprocessed")
        print("⚠️  Lưu ý: Dữ liệu novel hiện có cần được tái xử lý")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print(f"❌ Di chuyển thất bại: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()

