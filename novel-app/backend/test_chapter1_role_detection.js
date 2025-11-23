/**
 * Test role detection with full Chapter 1 data from sample.txt
 * Test role detection với full data Chapter 1 từ sample.txt
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { NovelParser } from './src/services/novelParser.js';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testChapter1RoleDetection() {
  console.log('🧪 Testing Role Detection with Chapter 1 Full Data...\n');
  
  // Read sample.txt file
  const filePath = path.join(__dirname, 'storage', 'sample.txt');
  console.log(`📖 Reading file: ${filePath}\n`);
  
  try {
    // Parse novel using NovelParser
    const parsedNovel = await NovelParser.parseNovel(filePath);
    
    console.log(`✅ Novel parsed successfully!`);
    console.log(`   Title: ${parsedNovel.title}`);
    console.log(`   Total chapters: ${parsedNovel.chapters.length}\n`);
    
    // Get Chapter 1 (could be at index 0 or number 1)
    const chapter1 = parsedNovel.chapters.find(ch => ch.number === 1) || parsedNovel.chapters[0];
    if (!chapter1) {
      console.error('❌ Chapter 1 not found!');
      console.error('Available chapters:', parsedNovel.chapters.map(ch => ({ number: ch.number, title: ch.title })));
      return;
    }
    
    console.log(`📚 Chapter Info:`);
    console.log(`   Number: ${chapter1.number}`);
    console.log(`   Title: ${chapter1.title}`);
    console.log(`   Paragraphs: ${chapter1.paragraphs.length}\n`);
    
    // Extract paragraph texts
    const paragraphs = chapter1.paragraphs.map(p => p.text);
    console.log(`📝 Extracted ${paragraphs.length} paragraphs\n`);
    
    // Show first few paragraphs as preview
    console.log('📄 Preview (first 3 paragraphs):');
    paragraphs.slice(0, 3).forEach((para, idx) => {
      const preview = para.length > 100 ? para.substring(0, 100) + '...' : para;
      console.log(`   ${idx + 1}. ${preview.replace(/\n/g, ' ')}`);
    });
    console.log();
    
    // Prepare request
    const requestBody = {
      paragraphs: paragraphs,
      chapterContext: chapter1.paragraphs.map(p => p.text).join('\n\n'),
      returnVoiceIds: true
    };
    
    console.log('🚀 Calling role detection API...');
    console.log(`   URL: http://localhost:11110/api/role-detection/detect`);
    console.log(`   Paragraphs: ${paragraphs.length}`);
    console.log(`   Estimated time: ~${Math.ceil(paragraphs.length * 1.5)} seconds\n`);
    
    const startTime = Date.now();
    
    // Call API
    const response = await axios.post(
      'http://localhost:11110/api/role-detection/detect',
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 minutes timeout
      }
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ API call completed in ${duration} seconds!\n`);
    
    // Show results
    const result = response.data;
    
    if (result.success) {
      console.log('📊 Role Detection Results:');
      console.log('='.repeat(60));
      
      // Count roles
      const roleCounts = {};
      for (const role of Object.values(result.data.role_map)) {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      }
      
      console.log('\n📈 Role Distribution:');
      for (const [role, count] of Object.entries(roleCounts)) {
        const percentage = ((count / paragraphs.length) * 100).toFixed(1);
        console.log(`   ${role.padEnd(10)}: ${String(count).padStart(4)} paragraphs (${percentage}%)`);
      }
      
      // Count voices
      const voiceCounts = {};
      for (const voice of Object.values(result.data.voice_map)) {
        voiceCounts[voice] = (voiceCounts[voice] || 0) + 1;
      }
      
      console.log('\n🎤 Voice Distribution:');
      for (const [voice, count] of Object.entries(voiceCounts)) {
        const percentage = ((count / paragraphs.length) * 100).toFixed(1);
        console.log(`   ${voice.padEnd(20)}: ${String(count).padStart(4)} paragraphs (${percentage}%)`);
      }
      
      // Show sample results (first 10)
      console.log('\n📋 Sample Results (first 10 paragraphs):');
      console.log('-'.repeat(60));
      for (let i = 0; i < Math.min(10, paragraphs.length); i++) {
        const role = result.data.role_map[i] || 'unknown';
        const voice = result.data.voice_map[i] || 'unknown';
        const preview = paragraphs[i].replace(/\n/g, ' ').substring(0, 60);
        console.log(`   ${String(i + 1).padStart(3)}. [${role.padEnd(8)}] → ${voice.padEnd(15)} | ${preview}...`);
      }
      
      if (paragraphs.length > 10) {
        console.log(`   ... and ${paragraphs.length - 10} more paragraphs`);
      }
      
      console.log('\n' + '='.repeat(60));
      console.log(`✅ Total paragraphs processed: ${paragraphs.length}`);
      console.log(`⏱️  Processing time: ${duration} seconds`);
      console.log(`📊 Average: ${(parseFloat(duration) / paragraphs.length).toFixed(2)} seconds per paragraph\n`);
      
    } else {
      console.error('❌ API returned error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run test
testChapter1RoleDetection().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

