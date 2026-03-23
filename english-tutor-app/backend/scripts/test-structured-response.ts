/**
 * Test Script: Structured Response Format from Ollama
 * 
 * This script tests if Ollama can return responses in the structured JSON format
 * we designed for the conversation pipeline.
 * 
 * Usage:
 *   npm run test:structured-response
 *   or
 *   tsx scripts/test-structured-response.ts
 */

import axios from 'axios';
import { z } from 'zod';

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const MODEL = process.env.OLLAMA_DEFAULT_MODEL ?? 'gemma3:12b';

// Structured Response Schema
const ChunkSchema = z.object({
  text: z.string().min(1).max(200),
  emotion: z.enum(['happy', 'encouraging', 'neutral', 'excited', 'calm']).optional(),
  icon: z.string().optional(),
  pause: z.number().min(0).max(2.0).optional(),
  emphasis: z.boolean().optional(),
});

const StructuredResponseSchema = z.object({
  chunks: z.array(ChunkSchema).min(1),
  metadata: z.object({
    totalChunks: z.number().int().positive(),
    estimatedDuration: z.number().positive().optional(),
    tone: z.string().optional(),
    language: z.string().optional(),
  }),
  fallback: z.string().optional(),
});

type StructuredResponse = z.infer<typeof StructuredResponseSchema>;

// System prompt for structured output
const STRUCTURED_SYSTEM_PROMPT = `You are a friendly English tutor. 
When responding, ALWAYS format your response as JSON with this EXACT structure:

{
  "chunks": [
    {
      "text": "Your sentence or phrase here",
      "emotion": "happy|encouraging|neutral|excited|calm",
      "icon": "😊",
      "pause": 0.5,
      "emphasis": false
    }
  ],
  "metadata": {
    "totalChunks": 1,
    "estimatedDuration": 3.0,
    "tone": "friendly",
    "language": "en"
  }
}

Rules:
1. Split your response into natural chunks (1-3 sentences each, max 200 chars)
2. Add appropriate emotions and icons to each chunk
3. Set pause duration between chunks (0.3-1.0 seconds)
4. Mark important chunks with emphasis: true
5. Return ONLY valid JSON, no other text before or after
6. Ensure all chunks are complete sentences or meaningful phrases
7. Keep chunks conversational and natural

Return your response as JSON only.`;

/**
 * Test Ollama structured response
 */
async function testStructuredResponse(testMessage: string, testName: string): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Test: ${testName}`);
  console.log(`Message: ${testMessage}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Prepare request
    const request = {
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: STRUCTURED_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: testMessage,
        },
      ],
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for more consistent JSON
        top_p: 0.9,
        top_k: 40,
      },
    };

    console.log('Sending request to Ollama...');
    const startTime = Date.now();

    // Send request to Ollama
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/chat`, request, {
      timeout: 60000,
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ Response received in ${responseTime}ms\n`);

    // Get response text
    const responseText = response.data.message?.content ?? '';
    console.log('Raw Response:');
    console.log('─'.repeat(60));
    console.log(responseText);
    console.log('─'.repeat(60));
    console.log();

    // Try to parse as JSON
    let parsed: unknown;
    let jsonStart = -1;
    let jsonEnd = -1;

    // Find JSON in response (might have extra text)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStart = jsonMatch.index ?? -1;
      jsonEnd = (jsonMatch.index ?? 0) + jsonMatch[0].length;
      const jsonText = jsonMatch[0];
      
      try {
        parsed = JSON.parse(jsonText);
        console.log('✅ JSON parsing successful\n');
      } catch (parseError) {
        console.log('❌ JSON parsing failed:');
        console.error(parseError);
        console.log('\nAttempting to fix JSON...');
        
        // Try to fix common JSON issues
        let fixedJson = jsonText;
        // Remove trailing commas
        fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
        
        try {
          parsed = JSON.parse(fixedJson);
          console.log('✅ JSON fixed and parsed\n');
        } catch (fixError) {
          console.log('❌ JSON fix failed\n');
          throw fixError;
        }
      }
    } else {
      console.log('❌ No JSON found in response\n');
      parsed = null;
    }

    // Validate structure
    if (parsed) {
      try {
        const validated = StructuredResponseSchema.parse(parsed);
        console.log('✅ Structure validation passed\n');
        
        // Display structured response
        console.log('Structured Response:');
        console.log('─'.repeat(60));
        console.log(JSON.stringify(validated, null, 2));
        console.log('─'.repeat(60));
        console.log();

        // Display chunks summary
        console.log(`Chunks: ${validated.chunks.length}`);
        validated.chunks.forEach((chunk, index) => {
          console.log(`  [${index + 1}] ${chunk.text.substring(0, 50)}${chunk.text.length > 50 ? '...' : ''}`);
          console.log(`      Emotion: ${chunk.emotion ?? 'none'}, Icon: ${chunk.icon ?? 'none'}, Pause: ${chunk.pause ?? 'default'}, Emphasis: ${chunk.emphasis ?? false}`);
        });
        console.log();

        // Check for issues
        const issues: string[] = [];
        if (validated.chunks.length === 0) {
          issues.push('No chunks in response');
        }
        validated.chunks.forEach((chunk, index) => {
          if (chunk.text.length > 200) {
            issues.push(`Chunk ${index + 1} exceeds 200 characters (${chunk.text.length})`);
          }
          if (chunk.text.length < 10) {
            issues.push(`Chunk ${index + 1} is too short (${chunk.text.length} chars)`);
          }
        });
        if (validated.metadata.totalChunks !== validated.chunks.length) {
          issues.push(`Metadata totalChunks (${validated.metadata.totalChunks}) doesn't match actual chunks (${validated.chunks.length})`);
        }

        if (issues.length > 0) {
          console.log('⚠️  Issues found:');
          issues.forEach((issue) => console.log(`  - ${issue}`));
          console.log();
        } else {
          console.log('✅ No issues found\n');
        }

        return;
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          console.log('❌ Structure validation failed:');
          validationError.errors.forEach((error) => {
            console.log(`  - ${error.path.join('.')}: ${error.message}`);
          });
          console.log();
        } else {
          console.log('❌ Validation error:', validationError);
          console.log();
        }
      }
    }

    // If we get here, structured response failed
    console.log('⚠️  Structured response format not achieved');
    console.log('   This would trigger fallback to text splitting\n');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log('❌ Request failed:');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.log('   No response received');
        console.log('   Check if Ollama is running at:', OLLAMA_BASE_URL);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    } else {
      console.log('❌ Error:', error);
    }
    console.log();
  }
}

/**
 * Main test function
 */
async function main(): Promise<void> {
  console.log('\n🧪 Testing Ollama Structured Response Format');
  console.log('='.repeat(60));
  console.log(`Model: ${MODEL}`);
  console.log(`Ollama URL: ${OLLAMA_BASE_URL}`);
  console.log('='.repeat(60));

  // Test cases
  const testCases = [
    {
      name: 'Simple Greeting',
      message: 'Hello!',
    },
    {
      name: 'Question',
      message: 'How are you?',
    },
    {
      name: 'Long Response',
      message: 'Tell me about learning English. What should I focus on?',
    },
    {
      name: 'Complex Question',
      message: 'I want to improve my English conversation skills. Can you help me practice? What topics should we discuss?',
    },
  ];

  let successCount = 0;
  let totalCount = testCases.length;

  for (const testCase of testCases) {
    try {
      await testStructuredResponse(testCase.message, testCase.name);
      successCount++;
    } catch (error) {
      console.error(`Test "${testCase.name}" failed:`, error);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Total tests: ${totalCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${totalCount - successCount}`);
  console.log(`Success rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  console.log();

  if (successCount === totalCount) {
    console.log('✅ All tests passed! Ollama can return structured responses.');
    console.log('   Ready to implement the pipeline.\n');
    process.exit(0);
  } else if (successCount > 0) {
    console.log('⚠️  Some tests passed. Ollama can return structured responses,');
    console.log('   but may need prompt tuning for consistency.\n');
    process.exit(0);
  } else {
    console.log('❌ All tests failed. Ollama may not support structured output,');
    console.log('   or the prompt needs significant adjustment.');
    console.log('   Consider using fallback text splitting approach.\n');
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

