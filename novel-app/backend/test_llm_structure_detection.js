/**
 * Test LLM Structure Detection with Real Novel File
 * Test LLM Structure Detection với File Novel Thật
 * 
 * This script tests the LLM structure detection service with the actual
 * "Death March" novel file to see what the LLM actually returns.
 * 
 * Script này test dịch vụ LLM structure detection với file novel thật
 * "Death March" để xem LLM thực sự trả về gì.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNovelStructureDetectionService } from './src/services/novelStructureDetectionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testLLMStructureDetection() {
  console.log('='.repeat(80));
  console.log('🧪 Testing LLM Structure Detection with Real Novel File');
  console.log('🧪 Test LLM Structure Detection với File Novel Thật');
  console.log('='.repeat(80));
  console.log('');

  // Read the novel file
  // Đọc file novel
  const novelPath = path.join(__dirname, '../../storage/Death March kara Hajimaru Isekai Kyousoukyoku - Volume 01.txt');
  
  console.log(`📖 Reading novel file: ${novelPath}`);
  console.log(`📖 Đang đọc file novel: ${novelPath}`);
  
  let content;
  try {
    content = await fs.readFile(novelPath, 'utf-8');
    console.log(`✅ File read successfully: ${content.length} characters, ${content.split('\n').length} lines`);
    console.log(`✅ Đọc file thành công: ${content.length} ký tự, ${content.split('\n').length} dòng`);
  } catch (error) {
    console.error(`❌ Failed to read file: ${error.message}`);
    console.error(`❌ Không thể đọc file: ${error.message}`);
    process.exit(1);
  }

  console.log('');
  console.log('📋 First 20 lines of the novel:');
  console.log('📋 20 dòng đầu của novel:');
  console.log('-'.repeat(80));
  const lines = content.split('\n');
  lines.slice(0, 20).forEach((line, idx) => {
    const lineNum = String(idx + 1).padStart(4, ' ');
    const preview = line.substring(0, 70).replace(/[\x00-\x1F]/g, '?');
    console.log(`${lineNum}: ${preview}${line.length > 70 ? '...' : ''}`);
  });
  console.log('-'.repeat(80));
  console.log('');

  // Check if LLM service is available
  // Kiểm tra xem dịch vụ LLM có sẵn không
  console.log('🔍 Checking LLM service availability...');
  console.log('🔍 Đang kiểm tra tính khả dụng của dịch vụ LLM...');
  
  const structureService = getNovelStructureDetectionService();
  const isAvailable = await structureService.isAvailable();
  
  if (!isAvailable) {
    console.error('❌ LLM structure detection service is not available!');
    console.error('❌ Dịch vụ LLM structure detection không khả dụng!');
    console.error('💡 Make sure Ollama is running: ollama serve');
    console.error('💡 Đảm bảo Ollama đang chạy: ollama serve');
    console.error('💡 Make sure model is available: ollama pull qwen3:8b');
    console.error('💡 Đảm bảo model có sẵn: ollama pull qwen3:8b');
    process.exit(1);
  }
  
  console.log('✅ LLM structure detection service is available');
  console.log('✅ Dịch vụ LLM structure detection có sẵn');
  console.log('');

  // Test structure detection
  // Test phát hiện cấu trúc
  console.log('🚀 Starting LLM structure detection...');
  console.log('🚀 Bắt đầu LLM structure detection...');
  console.log('');

  try {
    const startTime = Date.now();
    const structureIndex = await structureService.detectStructure(content, {
      language: 'en',
      sampleSize: 10000
    });
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('='.repeat(80));
    console.log('📊 LLM Structure Detection Results');
    console.log('📊 Kết quả LLM Structure Detection');
    console.log('='.repeat(80));
    console.log('');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`⏱️  Thời gian: ${duration} giây`);
    console.log('');
    console.log(`📈 Structure Type: ${structureIndex.structure}`);
    console.log(`📈 Loại Cấu trúc: ${structureIndex.structure}`);
    console.log(`📊 Confidence: ${structureIndex.confidence}`);
    console.log(`📊 Độ tin cậy: ${structureIndex.confidence}`);
    console.log(`📝 Total Lines: ${structureIndex.totalLines}`);
    console.log(`📝 Tổng số dòng: ${structureIndex.totalLines}`);
    console.log(`🔢 Markers Found: ${structureIndex.markers.length}`);
    console.log(`🔢 Số Markers tìm thấy: ${structureIndex.markers.length}`);
    console.log('');

    if (structureIndex.markers.length === 0) {
      console.error('❌ WARNING: No markers detected!');
      console.error('❌ CẢNH BÁO: Không phát hiện markers!');
      console.error('');
      console.error('This is the issue we need to fix.');
      console.error('Đây là vấn đề chúng ta cần sửa.');
    } else {
      console.log('✅ Markers detected:');
      console.log('✅ Đã phát hiện markers:');
      console.log('');
      
      structureIndex.markers.slice(0, 10).forEach((marker, idx) => {
        const lineContent = lines[marker.lineIndex]?.trim() || '(empty line)';
        const preview = lineContent.substring(0, 60);
        console.log(`  ${idx + 1}. Line ${marker.lineIndex + 1} (0-based: ${marker.lineIndex})`);
        console.log(`     Type: ${marker.type}`);
        console.log(`     Title: "${marker.title}"`);
        console.log(`     Raw Line: "${marker.rawLine}"`);
        console.log(`     Actual Line: "${preview}${lineContent.length > 60 ? '...' : ''}"`);
        console.log('');
      });
      
      if (structureIndex.markers.length > 10) {
        console.log(`  ... and ${structureIndex.markers.length - 10} more markers`);
        console.log(`  ... và ${structureIndex.markers.length - 10} markers nữa`);
      }
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('📋 Full Structure Index (JSON):');
    console.log('📋 Toàn bộ Structure Index (JSON):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(structureIndex, null, 2));
    console.log('='.repeat(80));

  } catch (error) {
    console.error('');
    console.error('❌ Error during structure detection:');
    console.error('❌ Lỗi trong quá trình phát hiện cấu trúc:');
    console.error(error);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
// Chạy test
testLLMStructureDetection().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

