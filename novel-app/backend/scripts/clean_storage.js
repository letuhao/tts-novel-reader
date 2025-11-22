/**
 * Clean Storage Script
 * Script Dọn dẹp Storage
 * 
 * Removes all novel and audio files from storage folders.
 * Xóa tất cả file novel và audio khỏi thư mục storage.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_NOVELS = path.join(__dirname, '../storage/novels');
const STORAGE_AUDIO = path.join(__dirname, '../storage/audio');

/**
 * Remove directory and all contents
 * Xóa thư mục và tất cả nội dung
 */
function removeDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { deleted: false, count: 0 };
  }

  let count = 0;
  
  function countFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        count += countFiles(filePath);
        count++; // Count directory
      } else {
        count++;
      }
    }
    return count;
  }

  const totalFiles = countFiles(dirPath);
  
  fs.rmSync(dirPath, { recursive: true, force: true });
  
  return { deleted: true, count: totalFiles };
}

/**
 * Clean storage folders
 * Dọn dẹp thư mục storage
 */
function cleanStorage() {
  console.log('='.repeat(60));
  console.log('Storage Cleanup Script');
  console.log('Script Dọn dẹp Storage');
  console.log('='.repeat(60));
  console.log();

  // Clean novels storage
  console.log('📚 Cleaning novels storage...');
  console.log('📚 Đang dọn dẹp storage novels...');
  const novelsResult = removeDirectory(STORAGE_NOVELS);
  if (novelsResult.deleted) {
    console.log(`   ✅ Deleted ${novelsResult.count} file(s)/folder(s) from storage/novels/`);
    console.log(`   ✅ Đã xóa ${novelsResult.count} file(s)/folder(s) từ storage/novels/`);
  } else {
    console.log('   ℹ️  storage/novels/ does not exist or is empty');
    console.log('   ℹ️  storage/novels/ không tồn tại hoặc trống');
  }
  console.log();

  // Clean audio storage
  console.log('🎵 Cleaning audio storage...');
  console.log('🎵 Đang dọn dẹp storage audio...');
  const audioResult = removeDirectory(STORAGE_AUDIO);
  if (audioResult.deleted) {
    console.log(`   ✅ Deleted ${audioResult.count} file(s)/folder(s) from storage/audio/`);
    console.log(`   ✅ Đã xóa ${audioResult.count} file(s)/folder(s) từ storage/audio/`);
  } else {
    console.log('   ℹ️  storage/audio/ does not exist or is empty');
    console.log('   ℹ️  storage/audio/ không tồn tại hoặc trống');
  }
  console.log();

  // Recreate .gitkeep files
  if (!fs.existsSync(STORAGE_NOVELS)) {
    fs.mkdirSync(STORAGE_NOVELS, { recursive: true });
    fs.writeFileSync(path.join(STORAGE_NOVELS, '.gitkeep'), '');
  }
  
  if (!fs.existsSync(STORAGE_AUDIO)) {
    fs.mkdirSync(STORAGE_AUDIO, { recursive: true });
    fs.writeFileSync(path.join(STORAGE_AUDIO, '.gitkeep'), '');
  }

  console.log('✅ Storage cleanup completed!');
  console.log('✅ Dọn dẹp storage hoàn tất!');
}

// Run cleanup
try {
  cleanStorage();
  process.exit(0);
} catch (error) {
  console.error('❌ Error during storage cleanup:', error);
  console.error('❌ Lỗi khi dọn dẹp storage:', error);
  process.exit(1);
}

