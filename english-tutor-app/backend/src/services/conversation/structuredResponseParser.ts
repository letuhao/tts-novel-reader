/**
 * Structured Response Parser
 * Parses and validates structured JSON responses from Ollama
 */

import { z } from 'zod';
import { createChildLogger } from '../../utils/logger.js';
import { splitIntoSentences } from '../../utils/textSplitter.js';

const logger = createChildLogger({ service: 'structured-response-parser' });

// Schema definitions
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

export type StructuredChunk = z.infer<typeof ChunkSchema>;
export type StructuredResponse = z.infer<typeof StructuredResponseSchema>;

export interface ParsedChunk {
  id: string;
  text: string;
  emotion: 'happy' | 'encouraging' | 'neutral' | 'excited' | 'calm';
  icon: string;
  pause: number;
  emphasis: boolean;
  index: number;
}

export interface ParsedResponse {
  chunks: ParsedChunk[];
  metadata: {
    totalChunks: number;
    estimatedDuration?: number;
    tone?: string;
    language?: string;
  };
  isValid: boolean;
  source: 'structured' | 'fallback';
}

/**
 * Extract JSON from response text (handles markdown code blocks)
 */
function extractJSON(text: string): string | null {
  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return null;
}

/**
 * Fix common JSON issues
 */
function fixJSON(jsonText: string): string {
  let fixed = jsonText;
  
  // Remove trailing commas
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix single quotes to double quotes (basic)
  // Note: This is a simple fix, may not handle all cases
  
  return fixed;
}

/**
 * Parse structured response from Ollama
 */
export function parseStructuredResponse(responseText: string): ParsedResponse | null {
  try {
    logger.debug({ responseLength: responseText.length }, '🔍 [PARSER] Starting structured response parsing');
    logger.debug({ responsePreview: responseText.substring(0, 300) }, '📥 [PARSER] Response preview (first 300 chars)');
    
    // Extract JSON from response
    let jsonText = extractJSON(responseText);
    
    if (!jsonText) {
      logger.warn('❌ [PARSER] No JSON found in response');
      return null;
    }

    logger.debug({ jsonLength: jsonText.length, jsonPreview: jsonText.substring(0, 200) }, '📦 [PARSER] Extracted JSON preview');

    // Try to parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
      logger.debug('✅ [PARSER] JSON parsed successfully');
    } catch (parseError) {
      logger.warn({ error: parseError }, '⚠️ [PARSER] JSON parse failed, attempting to fix');
      // Try to fix common issues
      const fixedJson = fixJSON(jsonText);
      try {
        parsed = JSON.parse(fixedJson);
        logger.info('✅ [PARSER] JSON fixed and parsed successfully');
      } catch (fixError) {
        logger.error({ error: fixError }, '❌ [PARSER] JSON fix failed');
        return null;
      }
    }

    // Validate structure
    logger.debug('🔍 [PARSER] Validating structure with Zod schema...');
    const validated = StructuredResponseSchema.parse(parsed);
    logger.debug('✅ [PARSER] Structure validation passed');
    
    // Convert to ParsedResponse format
    const chunks: ParsedChunk[] = validated.chunks.map((chunk, index) => ({
      id: `chunk-${index}`,
      text: chunk.text,
      emotion: chunk.emotion ?? 'neutral',
      icon: chunk.icon ?? '',
      pause: chunk.pause ?? 0.5,
      emphasis: chunk.emphasis ?? false,
      index,
    }));

    logger.debug(
      { 
        chunks: chunks.map(c => ({
          text: c.text.substring(0, 50),
          emotion: c.emotion,
          icon: c.icon,
          pause: c.pause
        }))
      },
      '📦 [PARSER] Converted chunks'
    );

    // Validate metadata consistency
    if (validated.metadata.totalChunks !== chunks.length) {
      logger.warn(
        { 
          metadataTotal: validated.metadata.totalChunks, 
          actualTotal: chunks.length 
        },
        '⚠️ [PARSER] Metadata totalChunks mismatch, using actual count'
      );
    }

    logger.info(
      { 
        chunkCount: chunks.length,
        totalChunks: validated.metadata.totalChunks,
        estimatedDuration: validated.metadata.estimatedDuration,
        tone: validated.metadata.tone
      },
      '✅ [PARSER] Structured response parsed successfully'
    );

    return {
      chunks,
      metadata: {
        totalChunks: chunks.length,
        ...(validated.metadata.estimatedDuration !== undefined && { estimatedDuration: validated.metadata.estimatedDuration }),
        ...(validated.metadata.tone !== undefined && { tone: validated.metadata.tone }),
        language: validated.metadata.language ?? 'en',
      },
      isValid: true,
      source: 'structured',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(
        { 
          errors: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        },
        '❌ [PARSER] Structure validation failed'
      );
    } else {
      logger.error({ err: error }, '❌ [PARSER] Error parsing structured response');
    }
    return null;
  }
}

/**
 * Create fallback response from plain text
 */
export function createFallbackResponse(text: string): ParsedResponse {
  logger.info('🔄 [PARSER] Creating fallback response from plain text');
  logger.debug({ textLength: text.length, textPreview: text.substring(0, 200) }, '📝 [PARSER] Fallback text preview');
  
  const sentences = splitIntoSentences(text);
  logger.debug({ sentenceCount: sentences.length }, '📝 [PARSER] Split into sentences');
  
  const chunks: ParsedChunk[] = sentences.map((sentence, index) => ({
    id: `chunk-fallback-${index}`,
    text: sentence.trim(),
    emotion: 'neutral' as const,
    icon: '',
    pause: 0.5,
    emphasis: false,
    index,
  }));

  logger.info(
    { 
      chunkCount: chunks.length,
      chunks: chunks.map(c => c.text.substring(0, 50))
    },
    '✅ [PARSER] Fallback response created'
  );

  return {
    chunks,
    metadata: {
      totalChunks: chunks.length,
      language: 'en',
    },
    isValid: true,
    source: 'fallback',
  };
}

/**
 * Parse response with fallback
 */
export function parseResponseWithFallback(responseText: string): ParsedResponse {
  logger.debug('🔄 [PARSER] Attempting structured parsing with fallback');
  
  // Try structured parsing first
  const structured = parseStructuredResponse(responseText);
  
  if (structured) {
    logger.info('✅ [PARSER] Using structured response');
    return structured;
  }

  // Fallback to text splitting
  logger.warn('⚠️ [PARSER] Structured parsing failed, using fallback text splitting');
  return createFallbackResponse(responseText);
}

