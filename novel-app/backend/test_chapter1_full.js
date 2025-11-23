/**
 * Full test with ALL 162 paragraphs from Chapter 1
 * Test đầy đủ với TẤT CẢ 162 paragraphs từ Chapter 1
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { NovelParser } from './src/services/novelParser.js';
import { getRoleDetectionService } from './src/services/roleDetectionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFullChapter1() {
  console.log('🧪 Full Role Detection Test - ALL 162 Paragraphs');
  console.log('='.repeat(70));
  console.log('');
  
  // Read file
  const filePath = path.join(__dirname, 'storage', 'sample.txt');
  console.log(`📖 Reading file: ${filePath}`);
  
  try {
    // Parse novel using NovelParser
    const parsedNovel = await NovelParser.parseNovel(filePath);
    const chapter1 = parsedNovel.chapters[0];
    
    console.log(`✅ Chapter parsed successfully!`);
    console.log(`   Total paragraphs: ${chapter1.paragraphs.length}`);
    console.log('');
    
    // Get ALL paragraphs
    const paragraphs = chapter1.paragraphs.map(p => p.text);
    const totalParagraphs = paragraphs.length;
    
    console.log(`📝 Testing with ALL ${totalParagraphs} paragraphs`);
    console.log('');
    
    // Show preview of different types of paragraphs
    console.log('📄 Sample Paragraphs (showing variety):');
    console.log('-'.repeat(70));
    
    // Find examples of different types
    let systemCount = 0, dialogueCount = 0, narrationCount = 0;
    
    for (let i = 0; i < Math.min(10, paragraphs.length); i++) {
      const para = paragraphs[i];
      const preview = para.replace(/\n/g, ' ').substring(0, 70) + (para.length > 70 ? '...' : '');
      
      if (para.includes('[ hệ thống') || para.includes('[ sự kiện')) {
        console.log(`   ${String(i + 1).padStart(3)}. [SYSTEM] ${preview}`);
        systemCount++;
      } else if (para.includes('"') || para.includes("'")) {
        console.log(`   ${String(i + 1).padStart(3)}. [DIALOGUE] ${preview}`);
        dialogueCount++;
      } else {
        console.log(`   ${String(i + 1).padStart(3)}. [NARRATION] ${preview}`);
        narrationCount++;
      }
    }
    
    console.log('');
    console.log(`   Found: ${systemCount} system messages, ${dialogueCount} dialogues, ${narrationCount} narration`);
    console.log('');
    
    // Initialize service
    console.log('🔄 Initializing role detection service...');
    const service = getRoleDetectionService();
    
    // Check availability
    console.log('🔍 Checking Ollama availability...');
    const available = await service.isAvailable();
    if (!available) {
      console.error('❌ Service not available! Make sure Ollama is running with qwen3:8b model.');
      return;
    }
    console.log('✅ Service available!');
    console.log('');
    
    // Full chapter context
    const chapterContext = paragraphs.join('\n\n');
    
    // Estimate time
    const estimatedSeconds = Math.ceil(totalParagraphs * 1.5);
    const estimatedMinutes = Math.floor(estimatedSeconds / 60);
    const estimatedSecs = estimatedSeconds % 60;
    
    console.log('🚀 Starting role detection...');
    console.log(`   Paragraphs: ${totalParagraphs}`);
    console.log(`   Estimated time: ~${estimatedMinutes}m ${estimatedSecs}s (${estimatedSeconds} seconds)`);
    console.log('   ⚠️  This will take several minutes, please wait...');
    console.log('');
    
    const startTime = Date.now();
    let progressUpdateTime = startTime;
    
    // Detect roles with progress updates
    console.log('⏳ Processing... (this may take 5-10 minutes)');
    
    // Use a Promise wrapper to allow progress updates
    const detectionPromise = service.detectRoles(paragraphs, {
      chapterContext: chapterContext.substring(0, 3000), // Limit context for prompt size
      returnVoiceIds: true
    });
    
    // Progress indicator (update every 30 seconds)
    const progressInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const elapsedMin = Math.floor(elapsed / 60);
      const elapsedSec = elapsed % 60;
      process.stdout.write(`\r   ⏱️  Elapsed: ${elapsedMin}m ${elapsedSec}s...`);
    }, 5000);
    
    let result;
    try {
      result = await detectionPromise;
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const durationMin = Math.floor(duration / 60);
    const durationSec = (duration % 60).toFixed(0);
    
    console.log('\r' + ' '.repeat(50) + '\r'); // Clear progress line
    console.log(`✅ Detection completed in ${durationMin}m ${durationSec}s (${duration} seconds)!`);
    console.log('');
    
    // Analyze results
    console.log('📊 RESULTS ANALYSIS');
    console.log('='.repeat(70));
    console.log('');
    
    // Count roles
    const roleCounts = {};
    for (const role of Object.values(result.role_map)) {
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    
    console.log('📈 Role Distribution:');
    console.log('-'.repeat(70));
    for (const [role, count] of Object.entries(roleCounts).sort((a, b) => b[1] - a[1])) {
      const percentage = ((count / totalParagraphs) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / totalParagraphs * 40));
      console.log(`   ${role.padEnd(10)}: ${String(count).padStart(4)} paragraphs (${percentage.padStart(5)}%) ${bar}`);
    }
    console.log('');
    
    // Count voices
    const voiceCounts = {};
    for (const voice of Object.values(result.voice_map)) {
      voiceCounts[voice] = (voiceCounts[voice] || 0) + 1;
    }
    
    console.log('🎤 Voice Distribution:');
    console.log('-'.repeat(70));
    for (const [voice, count] of Object.entries(voiceCounts).sort((a, b) => b[1] - a[1])) {
      const percentage = ((count / totalParagraphs) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / totalParagraphs * 40));
      console.log(`   ${voice.padEnd(20)}: ${String(count).padStart(4)} paragraphs (${percentage.padStart(5)}%) ${bar}`);
    }
    console.log('');
    
    // Show detailed results for key paragraphs
    console.log('📋 Detailed Results (Key Paragraphs):');
    console.log('-'.repeat(70));
    
    // Find dialogue paragraphs (should be male/female)
    const dialogueIndices = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      if ((para.includes('"') || para.includes("'")) && !para.startsWith('[')) {
        dialogueIndices.push(i);
      }
    }
    
    // Show first 5 dialogue paragraphs
    console.log('\n💬 Dialogue Paragraphs (should be male/female):');
    for (let idx = 0; idx < Math.min(5, dialogueIndices.length); idx++) {
      const i = dialogueIndices[idx];
      const role = result.role_map[i] || 'unknown';
      const voice = result.voice_map[i] || 'unknown';
      const preview = paragraphs[i].replace(/\n/g, ' ').substring(0, 60);
      console.log(`   ${String(i + 1).padStart(3)}. [${role.padEnd(8)}] → ${voice.padEnd(15)} | ${preview}...`);
    }
    
    // Show system messages (should be narrator)
    console.log('\n🔧 System Messages (should be narrator):');
    let systemShown = 0;
    for (let i = 0; i < paragraphs.length && systemShown < 5; i++) {
      const para = paragraphs[i];
      if (para.includes('[ hệ thống') || para.includes('[ sự kiện')) {
        const role = result.role_map[i] || 'unknown';
        const voice = result.voice_map[i] || 'unknown';
        const preview = para.replace(/\n/g, ' ').substring(0, 60);
        console.log(`   ${String(i + 1).padStart(3)}. [${role.padEnd(8)}] → ${voice.padEnd(15)} | ${preview}...`);
        systemShown++;
      }
    }
    
    // Show narration (should be narrator)
    console.log('\n📖 Narration Paragraphs (should be narrator):');
    let narrationShown = 0;
    for (let i = 0; i < paragraphs.length && narrationShown < 5; i++) {
      const para = paragraphs[i];
      if (!para.includes('[') && !para.includes('"') && !para.includes("'")) {
        const role = result.role_map[i] || 'unknown';
        const voice = result.voice_map[i] || 'unknown';
        const preview = para.replace(/\n/g, ' ').substring(0, 60);
        console.log(`   ${String(i + 1).padStart(3)}. [${role.padEnd(8)}] → ${voice.padEnd(15)} | ${preview}...`);
        narrationShown++;
      }
    }
    
    console.log('');
    console.log('='.repeat(70));
    console.log('✅ TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`   Total paragraphs processed: ${totalParagraphs}`);
    console.log(`   Processing time: ${durationMin}m ${durationSec}s`);
    console.log(`   Average speed: ${(parseFloat(duration) / totalParagraphs).toFixed(2)} seconds per paragraph`);
    console.log(`   Roles detected: ${Object.keys(roleCounts).join(', ')}`);
    console.log(`   Voices assigned: ${Object.keys(voiceCounts).join(', ')}`);
    console.log('');
    
    // Save results to file
    const resultsFile = path.join(__dirname, 'chapter1_role_detection_results.json');
    await fs.writeFile(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalParagraphs: totalParagraphs,
      processingTime: duration,
      roleMap: result.role_map,
      voiceMap: result.voice_map,
      roleCounts: roleCounts,
      voiceCounts: voiceCounts
    }, null, 2), 'utf-8');
    
    console.log(`💾 Results saved to: ${resultsFile}`);
    console.log('');
    console.log('✅ Full test completed successfully!');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run test
console.log('');
testFullChapter1().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});

