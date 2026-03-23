/**
 * Database Setup - SQLite
 * Thiết lập Database - SQLite
 */
import DatabaseLib from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../database/novels.db');
const DB_DIR = path.dirname(DB_PATH);

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Database singleton
let dbInstance = null;

export default class Database {
  static getInstance() {
    if (!dbInstance) {
      dbInstance = new Database(DB_PATH);
      dbInstance.initialize();
    }
    return dbInstance;
  }
  
  constructor(dbPath) {
    this.sqlite = new DatabaseLib(dbPath);
    this.sqlite.pragma('journal_mode = WAL'); // Better performance
    this.sqlite.pragma('foreign_keys = ON'); // Enable foreign keys
    this.db = this.sqlite;
  }
  
  initialize() {
    // Create novels table
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS novels (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        metadata TEXT,
        total_chapters INTEGER DEFAULT 0,
        total_paragraphs INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_novels_updated_at ON novels(updated_at);
      CREATE INDEX IF NOT EXISTS idx_novels_title ON novels(title);
    `);
    
    // Create chapters table (normalized, not JSON)
    this.sqlite.exec(`
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
      );
      
      CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id);
      CREATE INDEX IF NOT EXISTS idx_chapters_number ON chapters(novel_id, chapter_number);
    `);
    
    // Create paragraphs table (normalized, not JSON)
    // Don't include role and voice_id in CREATE TABLE - add via migration instead
    this.sqlite.exec(`
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
      );
      
      CREATE INDEX IF NOT EXISTS idx_paragraphs_novel ON paragraphs(novel_id);
      CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter ON paragraphs(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_paragraphs_number ON paragraphs(novel_id, chapter_number, paragraph_number);
    `);
    
    // Create novel voice mappings table (for per-novel voice configuration)
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS novel_voice_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        novel_id TEXT NOT NULL,
        model TEXT NOT NULL,
        role TEXT NOT NULL,
        voice_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
        UNIQUE(novel_id, model, role)
      );
      
      CREATE INDEX IF NOT EXISTS idx_novel_voice_mappings_novel ON novel_voice_mappings(novel_id);
      CREATE INDEX IF NOT EXISTS idx_novel_voice_mappings_model ON novel_voice_mappings(novel_id, model);
    `);
    
    // Create novel voice configs table (for assignment strategy)
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS novel_voice_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        novel_id TEXT NOT NULL UNIQUE,
        assignment_strategy TEXT NOT NULL DEFAULT 'round-robin',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_novel_voice_configs_novel ON novel_voice_configs(novel_id);
    `);
    
    // Migration: Add role and voice_id columns if they don't exist (for existing databases)
    // Check if columns exist first, then add if missing
    try {
      const tableInfo = this.sqlite.prepare(`PRAGMA table_info(paragraphs)`).all();
      const columnNames = tableInfo.map(col => col.name);
      
      if (!columnNames.includes('role')) {
        try {
          this.sqlite.exec(`ALTER TABLE paragraphs ADD COLUMN role TEXT;`);
          console.log('[Database] ✅ Added "role" column to paragraphs table');
        } catch (error) {
          if (!error.message.includes('duplicate column')) {
            console.error('[Database] ❌ Failed to add "role" column:', error.message);
          }
        }
      }
      
      if (!columnNames.includes('voice_id')) {
        try {
          this.sqlite.exec(`ALTER TABLE paragraphs ADD COLUMN voice_id TEXT;`);
          console.log('[Database] ✅ Added "voice_id" column to paragraphs table');
        } catch (error) {
          if (!error.message.includes('duplicate column')) {
            console.error('[Database] ❌ Failed to add "voice_id" column:', error.message);
          }
        }
      }
      
      // Refresh table info after migration
      const updatedTableInfo = this.sqlite.prepare(`PRAGMA table_info(paragraphs)`).all();
      const updatedColumnNames = updatedTableInfo.map(col => col.name);
      
      // Create indexes for role and voice_id ONLY after columns exist
      if (updatedColumnNames.includes('role')) {
        try {
          this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_paragraphs_role ON paragraphs(role);`);
        } catch (error) {
          // Index might already exist, ignore
        }
      }
      
      if (updatedColumnNames.includes('voice_id')) {
        try {
          this.sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_paragraphs_voice ON paragraphs(voice_id);`);
        } catch (error) {
          // Index might already exist, ignore
        }
      }
    } catch (error) {
      console.error('[Database] Migration error:', error.message);
    }
    
    // Create generation_progress table (track audio generation status)
    this.sqlite.exec(`
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
      );
      
      CREATE INDEX IF NOT EXISTS idx_gen_progress_novel ON generation_progress(novel_id);
      CREATE INDEX IF NOT EXISTS idx_gen_progress_chapter ON generation_progress(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_gen_progress_paragraph ON generation_progress(paragraph_id);
      CREATE INDEX IF NOT EXISTS idx_gen_progress_status ON generation_progress(status);
      CREATE INDEX IF NOT EXISTS idx_gen_progress_chapter_status ON generation_progress(novel_id, chapter_number, status);
    `);
    
    // Create progress table (user reading progress)
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        chapter_id TEXT,
        chapter_number INTEGER,
        paragraph_id TEXT,
        paragraph_number INTEGER,
        position REAL DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        last_read_at TEXT NOT NULL,
        reading_time_seconds INTEGER DEFAULT 0,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_progress_novel ON progress(novel_id);
      CREATE INDEX IF NOT EXISTS idx_progress_last_read ON progress(last_read_at);
    `);
    
    // Create audio_cache table (track generated audio)
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS audio_cache (
        id TEXT PRIMARY KEY,
        novel_id TEXT NOT NULL,
        chapter_id TEXT,
        chapter_number INTEGER,
        paragraph_id TEXT,
        paragraph_number INTEGER,
        tts_file_id TEXT NOT NULL,
        speaker_id TEXT,
        model TEXT,
        local_audio_path TEXT,
        audio_duration REAL,
        audio_file_size INTEGER,
        expires_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
        FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
        FOREIGN KEY (paragraph_id) REFERENCES paragraphs(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_audio_novel ON audio_cache(novel_id);
      CREATE INDEX IF NOT EXISTS idx_audio_chapter ON audio_cache(chapter_id);
      CREATE INDEX IF NOT EXISTS idx_audio_paragraph ON audio_cache(paragraph_id);
      CREATE INDEX IF NOT EXISTS idx_audio_para_num ON audio_cache(chapter_number, paragraph_number);
      CREATE INDEX IF NOT EXISTS idx_audio_expires ON audio_cache(expires_at);
    `);
  }
  
  // Delegate methods to better-sqlite3
  prepare(sql) {
    return this.sqlite.prepare(sql);
  }
  
  exec(sql) {
    return this.sqlite.exec(sql);
  }
}

