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
        chapters TEXT,
        total_chapters INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_novels_updated_at ON novels(updated_at);
    `);
    
    // Create progress table
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
        expires_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
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

