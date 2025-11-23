/**
 * Migration Script: Add role and voice_id columns to paragraphs table
 * Script Di chuyển: Thêm cột role và voice_id vào bảng paragraphs
 * 
 * Run this script to manually add the columns if automatic migration fails.
 * Chạy script này để thủ công thêm cột nếu migration tự động thất bại.
 */
import DatabaseLib from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'database/novels.db');

console.log('🔧 Running database migration...');
console.log('🔧 Đang chạy database migration...');
console.log('📁 Database path:', DB_PATH);
console.log('');

if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database file not found:', DB_PATH);
  process.exit(1);
}

const db = new DatabaseLib(DB_PATH);

try {
  // Check current columns
  const tableInfo = db.prepare(`PRAGMA table_info(paragraphs)`).all();
  const columnNames = tableInfo.map(col => col.name);
  
  console.log('📊 Current columns:', columnNames.join(', '));
  console.log('');
  
  let changed = false;
  
  // Add role column if missing
  if (!columnNames.includes('role')) {
    console.log('➕ Adding "role" column...');
    db.exec(`ALTER TABLE paragraphs ADD COLUMN role TEXT;`);
    console.log('✅ Added "role" column');
    changed = true;
  } else {
    console.log('✅ "role" column already exists');
  }
  
  // Add voice_id column if missing
  if (!columnNames.includes('voice_id')) {
    console.log('➕ Adding "voice_id" column...');
    db.exec(`ALTER TABLE paragraphs ADD COLUMN voice_id TEXT;`);
    console.log('✅ Added "voice_id" column');
    changed = true;
  } else {
    console.log('✅ "voice_id" column already exists');
  }
  
  // Refresh table info after migration
  const updatedTableInfo = db.prepare(`PRAGMA table_info(paragraphs)`).all();
  const updatedColumnNames = updatedTableInfo.map(col => col.name);
  
  console.log('');
  console.log('📊 Updated columns:', updatedColumnNames.join(', '));
  console.log('');
  
  // Create indexes for role and voice_id
  console.log('📑 Creating indexes...');
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_paragraphs_role ON paragraphs(role);`);
    console.log('✅ Created index on "role" column');
    changed = true;
  } catch (error) {
    if (error.message.includes('no such column')) {
      console.error('❌ Cannot create index on "role" - column does not exist');
    } else {
      console.warn('⚠️  Index on "role" might already exist:', error.message);
    }
  }
  
  try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_paragraphs_voice ON paragraphs(voice_id);`);
    console.log('✅ Created index on "voice_id" column');
    changed = true;
  } catch (error) {
    if (error.message.includes('no such column')) {
      console.error('❌ Cannot create index on "voice_id" - column does not exist');
    } else {
      console.warn('⚠️  Index on "voice_id" might already exist:', error.message);
    }
  }
  
  console.log('');
  if (changed) {
    console.log('✅ Migration completed successfully!');
    console.log('✅ Migration hoàn thành thành công!');
  } else {
    console.log('✅ Database is already up to date!');
    console.log('✅ Database đã được cập nhật!');
  }
  
} catch (error) {
  console.error('');
  console.error('❌ Migration failed:', error.message);
  console.error('❌ Migration thất bại:', error.message);
  console.error('');
  console.error('Stack:', error.stack);
  process.exit(1);
} finally {
  db.close();
  console.log('');
  console.log('🔒 Database connection closed');
}

