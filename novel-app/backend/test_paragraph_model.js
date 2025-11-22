/**
 * Test Paragraph Model - Check if paragraphNumber is correctly returned
 * Kiểm tra Paragraph Model - Xem paragraphNumber có được trả về đúng không
 */

import { ParagraphModel } from './src/models/Paragraph.js';
import { ChapterModel } from './src/models/Chapter.js';
import { NovelModel } from './src/models/Novel.js';

async function testParagraphModel() {
  console.log('='.repeat(60));
  console.log('Testing Paragraph Model');
  console.log('Kiểm tra Paragraph Model');
  console.log('='.repeat(60));
  console.log();

  try {
    // Get first novel
    const novels = await NovelModel.getAll();
    if (!novels || novels.length === 0) {
      console.log('❌ No novels found in database');
      console.log('❌ Không tìm thấy novel nào trong database');
      return;
    }

    const novel = novels[0];
    console.log(`✅ Found novel: ${novel.title} (${novel.id})`);
    console.log();

    // Get first chapter
    const chapters = await ChapterModel.getByNovel(novel.id);
    if (!chapters || chapters.length === 0) {
      console.log('❌ No chapters found');
      console.log('❌ Không tìm thấy chapter nào');
      return;
    }

    const chapter = chapters[0];
    console.log(`✅ Found chapter: ${chapter.chapterNumber} - ${chapter.title || 'No title'}`);
    console.log();

    // Get paragraphs
    const paragraphs = await ParagraphModel.getByChapter(chapter.id);
    if (!paragraphs || paragraphs.length === 0) {
      console.log('❌ No paragraphs found');
      console.log('❌ Không tìm thấy paragraph nào');
      return;
    }

    console.log(`✅ Found ${paragraphs.length} paragraphs`);
    console.log();

    // Check first 5 paragraphs
    console.log('Checking first 5 paragraphs:');
    console.log('Kiểm tra 5 paragraphs đầu tiên:');
    console.log();

    paragraphs.slice(0, 5).forEach((para, index) => {
      console.log(`Paragraph ${index + 1}:`);
      console.log(`  - ID: ${para.id}`);
      console.log(`  - paragraphNumber: ${para.paragraphNumber} (type: ${typeof para.paragraphNumber})`);
      console.log(`  - paragraph_number (raw): ${para.paragraph_number || 'NOT FOUND ❌'}`);
      console.log(`  - chapterNumber: ${para.chapterNumber}`);
      console.log(`  - Text preview: ${(para.text || '').substring(0, 50)}...`);
      
      if (para.paragraphNumber === undefined || para.paragraphNumber === null) {
        console.log(`  ❌ PROBLEM: paragraphNumber is ${para.paragraphNumber}`);
      } else {
        console.log(`  ✅ OK: paragraphNumber is ${para.paragraphNumber}`);
      }
      console.log();
    });

    // Check if paragraphNumber exists
    const hasParagraphNumber = paragraphs.every(p => 
      p.paragraphNumber !== undefined && p.paragraphNumber !== null
    );

    if (hasParagraphNumber) {
      console.log('✅ All paragraphs have paragraphNumber property');
      console.log('✅ Tất cả paragraphs đều có thuộc tính paragraphNumber');
    } else {
      console.log('❌ Some paragraphs are missing paragraphNumber property');
      console.log('❌ Một số paragraphs thiếu thuộc tính paragraphNumber');
      const missing = paragraphs.filter(p => 
        p.paragraphNumber === undefined || p.paragraphNumber === null
      );
      console.log(`   Missing in ${missing.length} out of ${paragraphs.length} paragraphs`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testParagraphModel();

