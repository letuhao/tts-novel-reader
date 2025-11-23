/**
 * Test script to verify Ollama connection
 * Script test để xác minh kết nối Ollama
 */
import { getOllamaProvider } from './src/services/ollamaProvider.js';
import { getRoleDetectionService } from './src/services/roleDetectionService.js';

async function testOllamaConnection() {
  console.log('🧪 Testing Ollama Connection...\n');
  
  // Test 1: Check Ollama availability
  console.log('1️⃣ Checking Ollama availability...');
  const ollama = getOllamaProvider();
  
  try {
    const available = await ollama.isAvailable();
    if (available) {
      console.log('✅ Ollama is running!\n');
    } else {
      console.log('❌ Ollama is NOT running!\n');
      return;
    }
  } catch (error) {
    console.log(`❌ Error checking Ollama: ${error.message}\n`);
    return;
  }
  
  // Test 2: Check model availability
  console.log('2️⃣ Checking qwen3:8b model...');
  try {
    const modelAvailable = await ollama.isModelAvailable('qwen3:8b');
    if (modelAvailable) {
      console.log('✅ qwen3:8b model is available!\n');
    } else {
      console.log('❌ qwen3:8b model is NOT available!');
      console.log('   Please run: ollama pull qwen3:8b\n');
      return;
    }
  } catch (error) {
    console.log(`❌ Error checking model: ${error.message}\n`);
    return;
  }
  
  // Test 3: Test simple generation
  console.log('3️⃣ Testing simple generation...');
  try {
    const response = await ollama.generate('Say "Hello, I am working!" in Vietnamese. Reply only the Vietnamese text, no explanation.', {
      model: 'qwen3:8b',
      temperature: 0.1,
      maxTokens: 50
    });
    console.log('✅ Generation successful!');
    console.log(`   Response: ${response.trim()}\n`);
  } catch (error) {
    console.log(`❌ Generation failed: ${error.message}\n`);
    return;
  }
  
  // Test 4: Test JSON generation
  console.log('4️⃣ Testing JSON generation...');
  try {
    const response = await ollama.generateJSON('Classify this text: "Anh ấy nói: Xin chào." Reply with JSON: {"1": "male"}', {
      model: 'qwen3:8b',
      temperature: 0.1,
      maxTokens: 100
    });
    console.log('✅ JSON generation successful!');
    console.log(`   Response:`, response, '\n');
  } catch (error) {
    console.log(`❌ JSON generation failed: ${error.message}\n`);
    return;
  }
  
  // Test 5: Test role detection service
  console.log('5️⃣ Testing role detection service...');
  const roleService = getRoleDetectionService();
  try {
    const result = await roleService.detectRoles(
      [
        'Đây là đoạn dẫn chuyện.',
        'Anh ấy nói: "Xin chào."'
      ],
      { returnVoiceIds: true }
    );
    console.log('✅ Role detection successful!');
    console.log('   Role map:', result.role_map);
    console.log('   Voice map:', result.voice_map, '\n');
  } catch (error) {
    console.log(`❌ Role detection failed: ${error.message}\n`);
    console.log('   Full error:', error);
    return;
  }
  
  console.log('✅ All tests passed! Ollama is working correctly.\n');
}

// Run tests
testOllamaConnection().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

