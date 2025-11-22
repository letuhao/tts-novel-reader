/**
 * Clean All Script - Simple Version
 * Script Dọn dẹp Tất cả - Phiên bản Đơn giản
 */

import DatabaseLib from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path (same as db.js)
const DB_PATH = path.join(__dirname, '../database/novels.db');

try {
  console.log('='.repeat(60));
  console.log('Database Cleanup - Fresh Start');
  console.log('Dọn dẹp Database - Bắt đầu Mới');
  console.log('='.repeat(60));
  console.log();

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.log('✅ Database does not exist yet.');
    console.log('✅ Database chưa tồn tại.');
    console.log('   Database will be created on first novel upload.');
    console.log('   Database sẽ được tạo khi upload novel đầu tiên.');
    process.exit(0);
  }

  // Connect to database
  const db = new DatabaseLib(DB_PATH);
  db.pragma('foreign_keys = ON');

  // Get current counts
  const novelsCount = db.prepare('SELECT COUNT(*) as count FROM novels').get().count;
  const chaptersCount = db.prepare('SELECT COUNT(*) as count FROM chapters').get().count;
  const paragraphsCount = db.prepare('SELECT COUNT(*) as count FROM paragraphs').get().count;
  const progressCount = db.prepare('SELECT COUNT(*) as count FROM progress').get().count;
  const audioCacheCount = db.prepare('SELECT COUNT(*) as count FROM audio_cache').get().count;
  const generationProgressCount = db.prepare('SELECT COUNT(*) as count FROM generation_progress').get().count;

  console.log('📊 Current Database State:');
  console.log(`   Novels: ${novelsCount}`);
  console.log(`   Chapters: ${chaptersCount}`);
  console.log(`   Paragraphs: ${paragraphsCount}`);
  console.log(`   Progress: ${progressCount}`);
  console.log(`   Audio Cache: ${audioCacheCount}`);
  console.log(`   Generation Progress: ${generationProgressCount}`);
  console.log();

  if (novelsCount === 0) {
    console.log('✅ Database is already empty!');
    db.close();
    process.exit(0);
  }

  // List novels
  const novels = db.prepare('SELECT id, title FROM novels ORDER BY created_at DESC').all();
  console.log('📚 Novels to be deleted:');
  novels.forEach((novel, index) => {
    console.log(`   ${index + 1}. ${novel.title}`);
  });
  console.log();

  // Delete all novels (CASCADE will delete related data)
  console.log('🗑️  Deleting all novels and related data...');
  const deleteNovels = db.prepare('DELETE FROM novels');
  const result = deleteNovels.run();

  console.log(`   ✅ Deleted ${result.changes} novel(s)`);
  console.log();

  // Verify
  const novelsCountAfter = db.prepare('SELECT COUNT(*) as count FROM novels').get().count;
  const chaptersCountAfter = db.prepare('SELECT COUNT(*) as count FROM chapters').get().count;
  const paragraphsCountAfter = db.prepare('SELECT COUNT(*) as count FROM paragraphs').get().count;
  const progressCountAfter = db.prepare('SELECT COUNT(*) as count FROM progress').get().count;
  const audioCacheCountAfter = db.prepare('SELECT COUNT(*) as count FROM audio_cache').get().count;
  const generationProgressCountAfter = db.prepare('SELECT COUNT(*) as count FROM generation_progress').get().count;

  console.log('📊 Database After Cleanup:');
  console.log(`   Novels: ${novelsCountAfter}`);
  console.log(`   Chapters: ${chaptersCountAfter}`);
  console.log(`   Paragraphs: ${paragraphsCountAfter}`);
  console.log(`   Progress: ${progressCountAfter}`);
  console.log(`   Audio Cache: ${audioCacheCountAfter}`);
  console.log(`   Generation Progress: ${generationProgressCountAfter}`);
  console.log();

  db.close();

  if (novelsCountAfter === 0) {
    console.log('✅ Database cleanup completed successfully!');
    console.log('✅ Database is now empty and ready for fresh start!');
    console.log();
    console.log('💡 Note: Storage files are not deleted.');
    console.log('   Run "npm run clean:storage" to clean storage folders.');
    process.exit(0);
  } else {
    console.log('⚠️  Warning: Some records still exist.');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
