/**
 * Clean Database Script
 * Script Dọn dẹp Database
 * 
 * Removes all novels and related data from the database.
 * Xóa tất cả novels và dữ liệu liên quan khỏi database.
 */

import Database from '../src/database/db.js';

/**
 * Clean all novels from database
 * Xóa tất cả novels khỏi database
 */
function cleanDatabase() {
  console.log('='.repeat(60));
  console.log('Database Cleanup Script');
  console.log('Script Dọn dẹp Database');
  console.log('='.repeat(60));
  console.log();

  let db;
  try {
    db = Database.getInstance();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw error;
  }

  try {
    // Get counts before deletion
    console.log('📊 Current Database State:');
    console.log('📊 Trạng thái Database hiện tại:');
    console.log();

    const novelsCount = db.prepare('SELECT COUNT(*) as count FROM novels').get();
    const chaptersCount = db.prepare('SELECT COUNT(*) as count FROM chapters').get();
    const paragraphsCount = db.prepare('SELECT COUNT(*) as count FROM paragraphs').get();
    const progressCount = db.prepare('SELECT COUNT(*) as count FROM progress').get();
    const audioCacheCount = db.prepare('SELECT COUNT(*) as count FROM audio_cache').get();
    const generationProgressCount = db.prepare('SELECT COUNT(*) as count FROM generation_progress').get();

    console.log(`   Novels: ${novelsCount.count}`);
    console.log(`   Chapters: ${chaptersCount.count}`);
    console.log(`   Paragraphs: ${paragraphsCount.count}`);
    console.log(`   Progress: ${progressCount.count}`);
    console.log(`   Audio Cache: ${audioCacheCount.count}`);
    console.log(`   Generation Progress: ${generationProgressCount.count}`);
    console.log();

    if (novelsCount.count === 0) {
      console.log('✅ Database is already empty!');
      console.log('✅ Database đã trống!');
      return;
    }

    // List novels that will be deleted
    const novels = db.prepare('SELECT id, title FROM novels ORDER BY created_at DESC').all();
    console.log('📚 Novels to be deleted:');
    console.log('📚 Novels sẽ bị xóa:');
    novels.forEach((novel, index) => {
      console.log(`   ${index + 1}. ${novel.title} (${novel.id})`);
    });
    console.log();

    // Delete all novels (CASCADE will handle related records)
    console.log('🗑️  Deleting all novels and related data...');
    console.log('🗑️  Đang xóa tất cả novels và dữ liệu liên quan...');
    
    const deleteNovels = db.prepare('DELETE FROM novels');
    const result = deleteNovels.run();

    console.log(`   ✅ Deleted ${result.changes} novel(s)`);
    console.log(`   ✅ Đã xóa ${result.changes} novel(s)`);
    console.log();

    // Verify deletion (CASCADE should have cleaned everything)
    const novelsCountAfter = db.prepare('SELECT COUNT(*) as count FROM novels').get();
    const chaptersCountAfter = db.prepare('SELECT COUNT(*) as count FROM chapters').get();
    const paragraphsCountAfter = db.prepare('SELECT COUNT(*) as count FROM paragraphs').get();
    const progressCountAfter = db.prepare('SELECT COUNT(*) as count FROM progress').get();
    const audioCacheCountAfter = db.prepare('SELECT COUNT(*) as count FROM audio_cache').get();
    const generationProgressCountAfter = db.prepare('SELECT COUNT(*) as count FROM generation_progress').get();

    console.log('📊 Database After Cleanup:');
    console.log('📊 Database Sau Khi Dọn Dẹp:');
    console.log(`   Novels: ${novelsCountAfter.count}`);
    console.log(`   Chapters: ${chaptersCountAfter.count}`);
    console.log(`   Paragraphs: ${paragraphsCountAfter.count}`);
    console.log(`   Progress: ${progressCountAfter.count}`);
    console.log(`   Audio Cache: ${audioCacheCountAfter.count}`);
    console.log(`   Generation Progress: ${generationProgressCountAfter.count}`);
    console.log();

    if (novelsCountAfter.count === 0) {
      console.log('✅ Database cleanup completed successfully!');
      console.log('✅ Dọn dẹp database hoàn tất thành công!');
      console.log();
      console.log('💡 Note: Audio files in storage/audio/ are not deleted.');
      console.log('💡 Lưu ý: Các file audio trong storage/audio/ không bị xóa.');
      console.log('   You may want to manually clean the storage folder.');
      console.log('   Bạn có thể muốn dọn dẹp thư mục storage thủ công.');
    } else {
      console.log('⚠️  Warning: Some records still exist.');
      console.log('⚠️  Cảnh báo: Vẫn còn một số bản ghi tồn tại.');
    }

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    console.error('❌ Lỗi khi dọn dẹp database:', error);
    throw error;
  }
}

// Run cleanup
try {
  cleanDatabase();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}

