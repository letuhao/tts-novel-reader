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

