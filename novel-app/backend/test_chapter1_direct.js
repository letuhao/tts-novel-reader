/**
 * Direct test without API - test Ollama connection directly
 * Test trực tiếp không qua API - test kết nối Ollama trực tiếp
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { NovelParser } from './src/services/novelParser.js';
import { getRoleDetectionService } from './src/services/roleDetectionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDirect() {
  console.log('🧪 Direct Role Detection Test (No API)...\n');
  
  // Read file
  const filePath = path.join(__dirname, 'storage', 'sample.txt');
  console.log(`📖 Reading file: ${filePath}\n`);
  
  // Parse novel
  const parsedNovel = await NovelParser.parseNovel(filePath);
  const chapter1 = parsedNovel.chapters[0];
  
  console.log(`✅ Chapter parsed: ${chapter1.paragraphs.length} paragraphs\n`);
  
  // Get paragraphs (limit to first 10 for quick test)
  const paragraphs = chapter1.paragraphs.slice(0, 10).map(p => p.text);
  console.log(`📝 Testing with ${paragraphs.length} paragraphs (first 10 for quick test)\n`);
  
  // Initialize service
  console.log('🔄 Initializing role detection service...');
  const service = getRoleDetectionService();
  
  // Check availability
  console.log('🔍 Checking Ollama availability...');
  const available = await service.isAvailable();
  if (!available) {
    console.error('❌ Service not available! Make sure Ollama is running.');
    return;
  }
  console.log('✅ Service available!\n');
  
  // Detect roles
  console.log('🚀 Detecting roles...');
  console.log('   This may take 10-30 seconds...\n');
  
  const startTime = Date.now();
  
  try {
    const result = await service.detectRoles(paragraphs, {
      chapterContext: chapter1.paragraphs.map(p => p.text).join('\n\n').substring(0, 3000),
      returnVoiceIds: true
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Detection completed in ${duration} seconds!\n`);
    console.log('📊 Results:');
    console.log('='.repeat(60));
    
    // Show results
    for (let i = 0; i < paragraphs.length; i++) {
      const role = result.role_map[i] || 'unknown';
      const voice = result.voice_map[i] || 'unknown';
      const preview = paragraphs[i].replace(/\n/g, ' ').substring(0, 70);
      console.log(`${String(i + 1).padStart(3)}. [${role.padEnd(8)}] → ${voice.padEnd(15)} | ${preview}...`);
    }
    
    // Count roles
    const roleCounts = {};
    for (const role of Object.values(result.role_map)) {
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    
    console.log('\n📈 Role Distribution:');
    for (const [role, count] of Object.entries(roleCounts)) {
      console.log(`   ${role}: ${count} paragraphs`);
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDirect().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

