/**
 * Full LLM Parser Test with Real Novel File
 * Test LLM Parser Đầy đủ với File Novel Thật
 * 
 * This script tests the complete LLM parser pipeline:
 * 1. LLM structure detection (chapters, prologue, etc.)
 * 2. Paragraph parsing
 * 3. Long paragraph splitting
 * 
 * Script này test toàn bộ pipeline LLM parser:
 * 1. LLM structure detection (chapters, prologue, etc.)
 * 2. Parse paragraphs
 * 3. Chia các paragraph dài
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { NovelParser } from './src/services/novelParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFullLLMParser() {
  console.log('='.repeat(80));
  console.log('🧪 Full LLM Parser Test with Real Novel');
  console.log('🧪 Test LLM Parser Đầy đủ với Novel Thật');
  console.log('='.repeat(80));
  console.log('');

  // Read only a small portion of the novel file for testing
  // Chỉ đọc một phần nhỏ của file novel để test
  const novelPath = path.join(__dirname, '../../storage/Death March kara Hajimaru Isekai Kyousoukyoku - Volume 01.txt');
  const TEST_LINES = 500; // Only test first 500 lines (smaller for faster testing)
  const TEST_OUTPUT_PATH = path.join(__dirname, '../../storage/test_sample.txt');
  
  console.log(`📖 Reading novel file: ${novelPath}`);
  console.log(`📖 Đang đọc file novel: ${novelPath}`);
  console.log(`📝 Creating test sample: first ${TEST_LINES} lines`);
  console.log(`📝 Tạo mẫu test: ${TEST_LINES} dòng đầu`);
  
  let testNovelPath;
  
  try {
    const stats = await fs.stat(novelPath);
    console.log(`✅ File found: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`✅ Đã tìm thấy file: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Read only first N lines
    // Chỉ đọc N dòng đầu
    const fullContent = await fs.readFile(novelPath, 'utf-8');
    const lines = fullContent.split('\n');
    const sampleLines = lines.slice(0, TEST_LINES);
    const sampleContent = sampleLines.join('\n');
    
    // Write sample to temporary file
    // Ghi mẫu vào file tạm
    await fs.writeFile(TEST_OUTPUT_PATH, sampleContent, 'utf-8');
    console.log(`✅ Created test sample file: ${TEST_OUTPUT_PATH} (${sampleContent.length} characters, ${sampleLines.length} lines)`);
    console.log(`✅ Đã tạo file mẫu test: ${TEST_OUTPUT_PATH} (${sampleContent.length} ký tự, ${sampleLines.length} dòng)`);
    
    // Use the test sample file
    // Sử dụng file mẫu test
    testNovelPath = TEST_OUTPUT_PATH;
    
  } catch (error) {
    console.error(`❌ Failed to read file: ${error.message}`);
    console.error(`❌ Không thể đọc file: ${error.message}`);
    process.exit(1);
  }

  console.log('');
  console.log('🚀 Starting full LLM parser pipeline...');
  console.log('🚀 Bắt đầu pipeline LLM parser đầy đủ...');
  console.log('');

  const startTime = Date.now();

  try {
    // Parse novel with LLM structure detection and paragraph splitting
    // Parse novel với LLM structure detection và chia paragraph
    console.log(`🚀 Parsing test sample file: ${testNovelPath}`);
    console.log(`🚀 Đang parse file mẫu test: ${testNovelPath}`);
    
    const parsedNovel = await NovelParser.parseNovel(testNovelPath, {
      useLLMStructureDetection: true,
      language: 'en',
      splitLongParagraphs: true,
      maxParagraphLength: 500
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('');
    console.log('='.repeat(80));
    console.log('📊 Parsing Results');
    console.log('📊 Kết quả Parse');
    console.log('='.repeat(80));
    console.log('');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`⏱️  Thời gian: ${duration} giây`);
    console.log('');
    console.log(`📚 Novel Title: ${parsedNovel.title}`);
    console.log(`📚 Tiêu đề Novel: ${parsedNovel.title}`);
    console.log(`📖 Total Chapters: ${parsedNovel.totalChapters}`);
    console.log(`📖 Tổng số Chapters: ${parsedNovel.totalChapters}`);
    console.log('');

    // Analyze each chapter
    // Phân tích từng chapter
    let totalParagraphsBefore = 0;
    let totalParagraphsAfter = 0;
    let longParagraphsFound = 0;
    let splitParagraphsCount = 0;

    for (const chapter of parsedNovel.chapters) {
      console.log(`📑 Chapter ${chapter.chapterNumber}: "${chapter.title}"`);
      console.log(`📑 Chapter ${chapter.chapterNumber}: "${chapter.title}"`);
      console.log(`   Type: ${chapter.type || 'CHAPTER'}`);
      console.log(`   Total Paragraphs: ${chapter.totalParagraphs}`);
      console.log(`   Total Lines: ${chapter.totalLines || 'N/A'}`);
      
      // Analyze paragraphs
      // Phân tích paragraphs
      if (chapter.paragraphs && chapter.paragraphs.length > 0) {
        const paragraphLengths = chapter.paragraphs.map(p => (p.text || '').length);
        const avgLength = paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length;
        const maxLength = Math.max(...paragraphLengths);
        const minLength = Math.min(...paragraphLengths);
        const longParagraphs = paragraphLengths.filter(l => l > 500).length;
        
        console.log(`   Paragraph Stats:`);
        console.log(`     - Average length: ${avgLength.toFixed(0)} characters`);
        console.log(`     - Max length: ${maxLength} characters`);
        console.log(`     - Min length: ${minLength} characters`);
        console.log(`     - Long paragraphs (>500 chars): ${longParagraphs}`);
        
        if (longParagraphs > 0) {
          console.log(`     ⚠️  Warning: ${longParagraphs} paragraphs still exceed 500 characters`);
          console.log(`     ⚠️  Cảnh báo: ${longParagraphs} paragraphs vẫn vượt quá 500 ký tự`);
        }

        // Show examples of split paragraphs
        // Hiển thị ví dụ về các paragraph đã được chia
        const splitParagraphs = chapter.paragraphs.filter(p => p.isSplit);
        if (splitParagraphs.length > 0) {
          console.log(`   Split Paragraphs: ${splitParagraphs.length} paragraphs were split`);
          console.log(`   Paragraphs đã chia: ${splitParagraphs.length} paragraphs đã được chia`);
          
          // Show first 3 examples
          // Hiển thị 3 ví dụ đầu tiên
          console.log(`   Examples of split paragraphs:`);
          console.log(`   Ví dụ về các paragraph đã chia:`);
          splitParagraphs.slice(0, 3).forEach((para, idx) => {
            const preview = para.text.substring(0, 100);
            console.log(`     ${idx + 1}. Paragraph ${para.paragraphNumber} (${para.text.length} chars): "${preview}${para.text.length > 100 ? '...' : ''}"`);
          });
        }

        // Show examples of long paragraphs that weren't split
        // Hiển thị ví dụ về các paragraph dài chưa được chia
        const stillLong = chapter.paragraphs.filter(p => (p.text || '').length > 500 && !p.isSplit);
        if (stillLong.length > 0) {
          console.log(`   ⚠️  Long paragraphs not split: ${stillLong.length}`);
          console.log(`   ⚠️  Paragraphs dài chưa được chia: ${stillLong.length}`);
          stillLong.slice(0, 2).forEach((para, idx) => {
            const preview = para.text.substring(0, 150);
            console.log(`     ${idx + 1}. Paragraph ${para.paragraphNumber} (${para.text.length} chars): "${preview}..."`);
          });
        }

        totalParagraphsAfter += chapter.paragraphs.length;
        longParagraphsFound += longParagraphs;
        splitParagraphsCount += splitParagraphs.length;
      }
      
      console.log('');
    }

    console.log('='.repeat(80));
    console.log('📈 Summary Statistics');
    console.log('📈 Thống kê Tổng quan');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📚 Total Chapters: ${parsedNovel.totalChapters}`);
    console.log(`📝 Total Paragraphs: ${totalParagraphsAfter}`);
    console.log(`📏 Long Paragraphs (>500 chars): ${longParagraphsFound}`);
    console.log(`✂️  Split Paragraphs: ${splitParagraphsCount}`);
    console.log('');

    // Show sample paragraphs from first chapter
    // Hiển thị mẫu paragraphs từ chapter đầu tiên
    if (parsedNovel.chapters.length > 0) {
      const firstChapter = parsedNovel.chapters[0];
      console.log('='.repeat(80));
      console.log(`📖 Sample Paragraphs from "${firstChapter.title}"`);
      console.log(`📖 Mẫu Paragraphs từ "${firstChapter.title}"`);
      console.log('='.repeat(80));
      console.log('');
      
      if (firstChapter.paragraphs && firstChapter.paragraphs.length > 0) {
        // Show first 5 paragraphs
        // Hiển thị 5 paragraphs đầu tiên
        firstChapter.paragraphs.slice(0, 5).forEach((para, idx) => {
          console.log(`Paragraph ${para.paragraphNumber} (${para.text.length} chars):`);
          console.log(`  "${para.text.substring(0, 200)}${para.text.length > 200 ? '...' : ''}"`);
          if (para.isSplit) {
            console.log(`  [Split from original paragraph ${para.originalParagraphNumber}]`);
          }
          console.log('');
        });
      }
    }

    // Check for the specific problematic paragraph (lines 93-122)
    // Kiểm tra paragraph có vấn đề cụ thể (dòng 93-122)
    console.log('='.repeat(80));
    console.log('🔍 Checking for Long Paragraphs (like lines 93-122)');
    console.log('🔍 Kiểm tra các Paragraph Dài (như dòng 93-122)');
    console.log('='.repeat(80));
    console.log('');
    
    let foundProblematicParagraph = false;
    for (const chapter of parsedNovel.chapters) {
      if (chapter.paragraphs) {
        for (const para of chapter.paragraphs) {
          if (para.text && para.text.length > 400) {
            // Check if it contains dialogue markers
            // Kiểm tra xem có chứa dấu hiệu đối thoại không
            const hasDialogue = /["'"]/.test(para.text);
            const hasMultipleSentences = (para.text.match(/[.!?]+/g) || []).length > 3;
            
            if (hasDialogue && hasMultipleSentences && para.text.length > 400) {
              console.log(`⚠️  Found long paragraph with dialogue:`);
              console.log(`⚠️  Tìm thấy paragraph dài có đối thoại:`);
              console.log(`   Chapter: ${chapter.title}`);
              console.log(`   Paragraph: ${para.paragraphNumber}`);
              console.log(`   Length: ${para.text.length} characters`);
              console.log(`   Preview: "${para.text.substring(0, 150)}..."`);
              console.log(`   Was split: ${para.isSplit ? 'Yes' : 'No'}`);
              console.log('');
              foundProblematicParagraph = true;
              
              if (!para.isSplit && para.text.length > 500) {
                console.log(`   ❌ This paragraph should have been split but wasn't!`);
                console.log(`   ❌ Paragraph này nên được chia nhưng không được chia!`);
              }
            }
          }
        }
      }
    }
    
    if (!foundProblematicParagraph) {
      console.log(`✅ No problematic long paragraphs with dialogue found`);
      console.log(`✅ Không tìm thấy paragraph dài có vấn đề với đối thoại`);
    }

    console.log('');
    console.log('='.repeat(80));
    console.log('✅ Test Completed Successfully!');
    console.log('✅ Test Hoàn thành Thành công!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('');
    console.error('❌ Error during parsing:');
    console.error('❌ Lỗi trong quá trình parse:');
    console.error(error);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
// Chạy test
testFullLLMParser().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

