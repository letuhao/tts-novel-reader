/**
 * Migration Script: Add role and voice_id columns to paragraphs table
 * Script Di chuyển: Thêm cột role và voice_id vào bảng paragraphs
 */
import DatabaseLib from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../database/novels.db');

console.log('Running migration: Add role and voice_id columns...');
console.log('Đang chạy migration: Thêm cột role và voice_id...');

if (!fs.existsSync(DB_PATH)) {
  console.error('Database file not found:', DB_PATH);
  process.exit(1);
}

const db = new DatabaseLib(DB_PATH);

try {
  // Check current columns
  const tableInfo = db.prepare(`PRAGMA table_info(paragraphs)`).all();
  const columnNames = tableInfo.map(col => col.name);
  
  console.log('Current columns:', columnNames.join(', '));
  
  // Add role column if missing
  if (!columnNames.includes('role')) {
    console.log('Adding "role" column...');
    db.exec(`ALTER TABLE paragraphs ADD COLUMN role TEXT;`);
    console.log('✅ Added "role" column');
  } else {
    console.log('✅ "role" column already exists');
  }
  
  // Add voice_id column if missing
  if (!columnNames.includes('voice_id')) {
    console.log('Adding "voice_id" column...');
    db.exec(`ALTER TABLE paragraphs ADD COLUMN voice_id TEXT;`);
    console.log('✅ Added "voice_id" column');
  } else {
    console.log('✅ "voice_id" column already exists');
  }
  
  // Create indexes
  console.log('Creating indexes...');
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_paragraphs_role ON paragraphs(role);`);
    console.log('✅ Created index on role');
  } catch (error) {
    console.warn('⚠️  Index on role might already exist:', error.message);
  }
  
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_paragraphs_voice ON paragraphs(voice_id);`);
    console.log('✅ Created index on voice_id');
  } catch (error) {
    console.warn('⚠️  Index on voice_id might already exist:', error.message);
  }
  
  console.log('\n✅ Migration completed successfully!');
  console.log('✅ Migration hoàn thành thành công!');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}

