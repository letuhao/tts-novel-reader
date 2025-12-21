/**
 * Conversation Pipeline Service
 * Handles structured response processing and TTS generation queue
 * Event-driven architecture for real-time updates
 */

import { getTTSService } from '../tts/ttsService.js';
import { parseResponseWithFallback, type ParsedResponse, type ParsedChunk } from './structuredResponseParser.js';
import { createChildLogger } from '../../utils/logger.js';
import { eventBus } from './eventBus.js';
import { conversationService } from './conversationService.js';

const logger = createChildLogger({ service: 'conversation-pipeline' });

export interface PipelineConfig {
  tts: {
    maxConcurrent: number; // Max parallel TTS requests
    priorityOrder: 'fifo' | 'priority'; // First chunk = priority
    retryAttempts: number;
    timeout: number; // milliseconds
  };
}

const DEFAULT_CONFIG: PipelineConfig = {
  tts: {
    maxConcurrent: 1, // Sequential processing for single GPU (RTX 4090)
    // Note: Parallel processing on single GPU causes resource contention
    // and doesn't improve speed. Sequential ensures optimal GPU utilization
    // and faster first chunk completion for better realtime UX.
    priorityOrder: 'priority', // First chunk gets priority
    retryAttempts: 2,
    timeout: 30000, // 30 seconds per chunk
  },
};

export interface ProcessedChunk extends ParsedChunk {
  audioFileId?: string;
  audioUrl?: string;
  duration?: number;
  ttsStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ttsError?: string;
}

export interface PipelineResult {
  chunks: ProcessedChunk[];
  metadata: ParsedResponse['metadata'];
  source: 'structured' | 'fallback';
  firstChunkReady: boolean; // First chunk with audio ready
}

export type PipelineEventCallback = (event: {
  type: 'chunk-update' | 'chunk-complete' | 'chunk-failed' | 'all-complete';
  chunkIndex: number;
  chunk: ProcessedChunk;
  conversationId: string | undefined;
}) => void;

/**
 * Conversation Pipeline Service
 * Event-driven architecture for real-time chunk updates
 */
export class ConversationPipelineService {
  private config: PipelineConfig;
  private eventCallbacks: Map<string, PipelineEventCallback> = new Map();

  constructor(config?: Partial<PipelineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register event callback for a conversation
   */
  onEvent(conversationId: string, callback: PipelineEventCallback): void {
    this.eventCallbacks.set(conversationId, callback);
  }

  /**
   * Unregister event callback
   */
  offEvent(conversationId: string): void {
    this.eventCallbacks.delete(conversationId);
  }

  /**
   * Emit event via EventBus and callbacks
   */
  private async emitEvent(
    type: 'chunk-update' | 'chunk-complete' | 'chunk-failed' | 'all-complete',
    chunkIndex: number,
    chunk: ProcessedChunk,
    conversationId?: string,
    userId?: string,
    audioDataBase64?: string
  ): Promise<void> {
    const event = { type, chunkIndex, chunk, conversationId };

    // Call registered callbacks
    if (conversationId) {
      const callback = this.eventCallbacks.get(conversationId);
      if (callback) {
        callback(event);
      }
    }

    // Emit via EventBus (which handles WebSocket broadcasting)
    if (conversationId) {
      const eventType = type === 'chunk-update' ? 'chunk:created' :
                       type === 'chunk-complete' ? 'chunk:tts-completed' :
                       type === 'chunk-failed' ? 'chunk:tts-failed' :
                       'chunk:created';

      const chunkData = {
        id: chunk.id,
        text: chunk.text,
        emotion: chunk.emotion,
        icon: chunk.icon,
        pause: chunk.pause,
        emphasis: chunk.emphasis,
        audioFileId: chunk.audioFileId,
        duration: chunk.duration,
        ttsStatus: chunk.ttsStatus,
        ttsError: chunk.ttsError,
        // Include audio data as base64 if available
        ...(audioDataBase64 && { audioData: audioDataBase64 }),
      };
      
      logger.info({ 
        eventType,
        chunkIndex,
        hasAudioData: !!audioDataBase64,
        audioDataLength: audioDataBase64?.length,
        audioFileId: chunk.audioFileId,
        chunkDataKeys: Object.keys(chunkData)
      }, '📤 [EVENT] Emitting event with chunk data');
      
      await eventBus.emitEvent(
        eventType,
        conversationId,
        {
          chunkIndex,
          chunk: chunkData,
        },
        userId ? { userId } : undefined
      );
    }
  }

  /**
   * Process Ollama response through pipeline
   * Returns immediately after parsing, TTS continues in background
   * Emits events as chunks complete via EventBus
   * Saves messages and chunks to database
   */
  async processResponse(
    ollamaResponse: string,
    voice?: string,
    conversationId?: string,
    userId?: string
  ): Promise<PipelineResult> {
    const pipelineStartTime = Date.now();
    logger.info({ responseLength: ollamaResponse.length }, '🚀 [PIPELINE] Starting pipeline processing');

    // Step 1: Parse structured response (with fallback)
    const parseStartTime = Date.now();
    logger.debug('📝 [PIPELINE] Step 1: Parsing structured response...');
    logger.debug({ rawResponse: ollamaResponse.substring(0, 500) }, '📥 [PIPELINE] Raw Ollama response (first 500 chars)');
    
    const parsed = parseResponseWithFallback(ollamaResponse);
    const parseTime = Date.now() - parseStartTime;
    
    logger.info(
      { 
        chunkCount: parsed.chunks.length, 
        source: parsed.source,
        parseTimeMs: parseTime
      },
      '✅ [PIPELINE] Step 1 complete: Response parsed'
    );
    
    logger.debug({ chunks: parsed.chunks.map(c => ({ text: c.text.substring(0, 50), emotion: c.emotion, icon: c.icon })) }, '📦 [PIPELINE] Parsed chunks summary');

    // Step 2: Initialize chunks with pending status
    const processedChunks: ProcessedChunk[] = parsed.chunks.map((chunk) => ({
      ...chunk,
      ttsStatus: 'pending' as const,
    }));

    // Step 3: Save assistant message and chunks to database
    if (conversationId) {
      try {
        // Get full content (all chunks combined)
        const fullContent = parsed.chunks.map(c => c.text).join(' ');

        // Save assistant response with chunks
        const { message, chunks: savedChunks } = await conversationService.saveAssistantResponse(
          conversationId,
          fullContent,
          parsed.chunks.map(chunk => ({
            text: chunk.text,
            emotion: chunk.emotion,
            icon: chunk.icon,
            pauseAfter: chunk.pause,
            emphasis: chunk.emphasis,
          })),
          {
            source: parsed.source,
            metadata: parsed.metadata,
          }
        );

        // Map saved chunks to processed chunks (for audio file IDs)
        for (let i = 0; i < processedChunks.length && i < savedChunks.length; i++) {
          const savedChunk = savedChunks[i];
          if (savedChunk) {
            processedChunks[i]!.id = savedChunk.id;
          }
        }

        // Emit conversation started event
        await eventBus.emitEvent(
          'conversation:started',
          conversationId,
          {
            messageId: message.id,
            chunksCount: savedChunks.length,
            metadata: parsed.metadata,
            source: parsed.source,
          },
          userId ? { userId } : undefined
        );

        logger.debug(
          { conversationId, messageId: message.id, chunkCount: processedChunks.length },
          '📡 [PIPELINE] Saved assistant response and emitted conversation-start event'
        );
      } catch (error) {
        logger.error({ err: error, conversationId }, '❌ [PIPELINE] Failed to save assistant response');
        // Continue processing even if save fails
      }
    }

    // Step 4: Start TTS processing in background (don't wait)
    logger.debug('🎵 [PIPELINE] Step 2: Starting TTS processing in background...');
    logger.debug({ totalChunks: processedChunks.length, maxConcurrent: this.config.tts.maxConcurrent }, '🎵 [PIPELINE] TTS queue configuration');
    
    // Start TTS processing but don't await - let it run in background
    this.processTTSQueue(parsed.chunks, voice, processedChunks, conversationId, userId).catch((error) => {
      logger.error({ err: error }, '❌ [PIPELINE] Background TTS processing error');
    });

    const totalTime = Date.now() - pipelineStartTime;
    
    logger.info(
      {
        totalChunks: processedChunks.length,
        pendingChunks: processedChunks.filter(c => c.ttsStatus === 'pending').length,
        parseTimeMs: parseTime,
        totalTimeMs: totalTime
      },
      '✅ [PIPELINE] Returning chunks immediately, TTS processing in background'
    );

    return {
      chunks: processedChunks,
      metadata: parsed.metadata,
      source: parsed.source,
      firstChunkReady: false, // Will be updated in background
    };
  }

  /**
   * Process chunks through TTS queue with controlled concurrency
   * Updates processedChunks in place as TTS completes
   * Saves audio file IDs to database chunks
   */
  private async processTTSQueue(
    chunks: ParsedChunk[],
    voice: string | undefined,
    processedChunks: ProcessedChunk[],
    conversationId?: string,
    userId?: string
  ): Promise<void> {
    const queueStartTime = Date.now();
    logger.debug({ totalChunks: chunks.length, maxConcurrent: this.config.tts.maxConcurrent }, '🎵 [TTS-QUEUE] Starting TTS queue processing');
    
    const maxConcurrent = this.config.tts.maxConcurrent;
    const activePromises: Array<{ promise: Promise<void>; index: number; startTime: number }> = [];
    let nextChunkIndex = 0;

    // Helper to process next chunk when slot available
    const processNextChunk = async (): Promise<void> => {
      if (nextChunkIndex >= chunks.length) {
        return; // All chunks processed
      }

      const i = nextChunkIndex++;
      const chunk = processedChunks[i];
      if (!chunk) {
        void processNextChunk(); // Skip and process next
        return;
      }

      // Create promise for this chunk
      const chunkStartTime = Date.now();
      logger.debug({ chunkIndex: i, text: chunk.text.substring(0, 50), activeCount: activePromises.length }, '🎵 [TTS-QUEUE] Starting TTS for chunk');
      
        const chunkPromise = this.processChunkTTS(chunk, voice, i, conversationId, userId)
          .then(() => {
            const chunkTime = Date.now() - chunkStartTime;
            logger.debug({ chunkIndex: i, timeMs: chunkTime, status: chunk.ttsStatus }, '✅ [TTS-QUEUE] Chunk TTS completed');
            
            // Remove from active promises when done
            const index = activePromises.findIndex((p) => p.index === i);
            if (index !== -1) {
              activePromises.splice(index, 1);
            }
            // Process next chunk when slot freed
            void processNextChunk();
          })
          .catch((error) => {
            logger.error({ err: error, chunkIndex: i }, '❌ [TTS-QUEUE] Chunk TTS failed');
            
            // Emit chunk failed event (already handled in processChunkTTS, but ensure it's emitted)
            void this.emitEvent('chunk-failed', i, chunk, conversationId, userId);
            
            // Remove from active promises on error too
            const index = activePromises.findIndex((p) => p.index === i);
            if (index !== -1) {
              activePromises.splice(index, 1);
            }
            // Process next chunk even on error
            void processNextChunk();
          });

      activePromises.push({ promise: chunkPromise, index: i, startTime: chunkStartTime });
    };

    // Start processing chunks (up to maxConcurrent initially) - non-blocking
    for (let i = 0; i < Math.min(maxConcurrent, chunks.length); i++) {
      void processNextChunk();
    }

    // Don't wait for all chunks - let them process in background
    // Log completion in background
    Promise.all(activePromises.map((p) => p.promise)).then(() => {
      const queueTime = Date.now() - queueStartTime;
      logger.info(
        {
          totalChunks: processedChunks.length,
          completed: processedChunks.filter(c => c.ttsStatus === 'completed').length,
          failed: processedChunks.filter(c => c.ttsStatus === 'failed').length,
          totalTimeMs: queueTime,
          avgTimePerChunk: (queueTime / processedChunks.length).toFixed(0)
        },
        '🏁 [TTS-QUEUE] TTS queue processing complete (background)'
      );
    }).catch((error) => {
      logger.error({ err: error }, '❌ [TTS-QUEUE] Background TTS processing error');
    });
    
    logger.debug({ startedChunks: activePromises.length }, '✅ [TTS-QUEUE] TTS processing started in background');
  }

  /**
   * Process single chunk through TTS
   * Emits events as status changes
   * Updates chunk in database with audio file ID
   */
  private async processChunkTTS(
    chunk: ProcessedChunk,
    voice: string | undefined,
    index: number,
    conversationId?: string,
    userId?: string
  ): Promise<void> {
    const ttsStartTime = Date.now();
    chunk.ttsStatus = 'processing';
    
    // Emit processing started event
    await this.emitEvent('chunk-update', index, chunk, conversationId, userId);
    
    // Emit TTS started event
    if (conversationId) {
      await eventBus.emitEvent(
        'chunk:tts-started',
        conversationId,
        {
          chunkIndex: index,
          chunkId: chunk.id,
          text: chunk.text,
        },
        userId ? { userId } : undefined
      );
    }

    try {
      logger.debug(
        { 
          chunkIndex: index, 
          textLength: chunk.text.length,
          text: chunk.text.substring(0, 100),
          voice: voice || 'default'
        }, 
        '🎤 [TTS] Starting TTS generation for chunk'
      );

      const ttsService = getTTSService();
      
      // Generate TTS with timeout
      const ttsRequestStartTime = Date.now();
      const ttsPromise = ttsService.synthesize({
        text: chunk.text,
        voice: voice,
        store: true,
      });

      // Create timeout that can be cleared
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          logger.warn({ chunkIndex: index, timeout: this.config.tts.timeout }, '⏱️ [TTS] TTS request timeout');
          reject(new Error('TTS timeout'));
        }, this.config.tts.timeout);
      });

      let ttsResponse;
      try {
        ttsResponse = await Promise.race([ttsPromise, timeoutPromise]);
        
        // Clear timeout if TTS completed successfully
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } catch (error) {
        // Clear timeout on error too
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        throw error; // Re-throw to be caught by outer catch
      }

      const ttsRequestTime = Date.now() - ttsRequestStartTime;

      logger.debug(
        { 
          chunkIndex: index, 
          requestTimeMs: ttsRequestTime,
          success: ttsResponse.success,
          hasFileId: !!ttsResponse.fileId,
          fileId: ttsResponse.fileId
        }, 
        '📥 [TTS] TTS response received'
      );

      if (ttsResponse.success && ttsResponse.fileId) {
        logger.debug({ chunkIndex: index, fileId: ttsResponse.fileId }, '🔄 [TTS] TTS successful, processing audio data');
        
        chunk.audioFileId = ttsResponse.fileId;
        if (ttsResponse.duration !== undefined) {
          chunk.duration = ttsResponse.duration;
        }
        chunk.ttsStatus = 'completed';
        
        // Fetch audio data to send via WebSocket
        let audioDataBase64: string | undefined;
        try {
          logger.info({ chunkIndex: index, fileId: ttsResponse.fileId }, '🔄 [AUDIO] Fetching audio data for WebSocket');
          const ttsService = getTTSService();
          logger.debug({ chunkIndex: index, fileId: ttsResponse.fileId }, '🔄 [AUDIO] Calling ttsService.getAudio()');
          const audioBuffer = await ttsService.getAudio(ttsResponse.fileId);
          logger.debug({ chunkIndex: index, hasBuffer: !!audioBuffer, bufferLength: audioBuffer?.length }, '🔄 [AUDIO] getAudio() returned');
          
          if (audioBuffer) {
            logger.debug({ chunkIndex: index, bufferLength: audioBuffer.length }, '🔄 [AUDIO] Converting buffer to base64');
            audioDataBase64 = audioBuffer.toString('base64');
            logger.info({ 
              chunkIndex: index, 
              audioSize: audioBuffer.length,
              base64Length: audioDataBase64.length 
            }, '✅ [AUDIO] Audio data fetched and converted to base64 for WebSocket');
          } else {
            logger.warn({ chunkIndex: index, fileId: ttsResponse.fileId }, '⚠️ [AUDIO] Audio buffer is null');
          }
        } catch (error) {
          logger.error({ 
            err: error instanceof Error ? error : new Error(String(error)), 
            chunkIndex: index,
            fileId: ttsResponse.fileId,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined
          }, '❌ [AUDIO] Failed to fetch audio data, will send fileId only');
        }
        
        logger.debug({ 
          chunkIndex: index, 
          hasAudioData: !!audioDataBase64,
          audioDataLength: audioDataBase64?.length 
        }, '🔄 [AUDIO] Audio data processing complete, about to emit event');
        
        // Update chunk in database with audio file ID
        if (chunk.id && conversationId && chunk.audioFileId) {
          try {
            await conversationService.updateChunk(chunk.id, {
              audioFileId: chunk.audioFileId,
              ...(chunk.duration !== undefined && { audioDuration: chunk.duration }),
              ttsStatus: 'completed',
            });
          } catch (error) {
            logger.error({ err: error, chunkId: chunk.id }, 'Failed to update chunk in database');
          }
        }
        
        // Emit chunk update event with audio data (status changed to completed)
        await this.emitEvent('chunk-complete', index, chunk, conversationId, userId, audioDataBase64);
        
        const totalTime = Date.now() - ttsStartTime;
        logger.info(
          { 
            chunkIndex: index, 
            fileId: chunk.audioFileId,
            duration: chunk.duration,
            requestTimeMs: ttsRequestTime,
            totalTimeMs: totalTime,
            textLength: chunk.text.length,
            charsPerSecond: (chunk.text.length / (totalTime / 1000)).toFixed(0)
          }, 
          '✅ [TTS] TTS generated successfully'
        );
      } else {
        logger.warn({ 
          chunkIndex: index, 
          success: ttsResponse.success, 
          hasFileId: !!ttsResponse.fileId,
          fileId: ttsResponse.fileId,
          error: ttsResponse.error 
        }, '⚠️ [TTS] TTS response not successful or missing fileId - skipping audio fetch');
        
        chunk.ttsStatus = 'failed';
        chunk.ttsError = ttsResponse.error ?? 'TTS generation failed';
        
        // Update chunk in database with failed status
        if (chunk.id && conversationId) {
          try {
            await conversationService.updateChunk(chunk.id, {
              ttsStatus: 'failed',
            });
          } catch (error) {
            logger.error({ err: error, chunkId: chunk.id }, 'Failed to update chunk status in database');
          }
        }
        
        // Emit failed event
        await this.emitEvent('chunk-failed', index, chunk, conversationId, userId);
        
        logger.warn(
          { 
            chunkIndex: index, 
            error: chunk.ttsError,
            requestTimeMs: ttsRequestTime
          }, 
          '❌ [TTS] TTS generation failed'
        );
      }
    } catch (error) {
      const totalTime = Date.now() - ttsStartTime;
      chunk.ttsStatus = 'failed';
      chunk.ttsError = error instanceof Error ? error.message : 'Unknown error';
      
      // Update chunk in database with failed status
      if (chunk.id && conversationId) {
        try {
          await conversationService.updateChunk(chunk.id, {
            ttsStatus: 'failed',
          });
        } catch (updateError) {
          logger.error({ err: updateError, chunkId: chunk.id }, 'Failed to update chunk status in database');
        }
      }
      
      // Emit failed event
      await this.emitEvent('chunk-failed', index, chunk, conversationId, userId);
      
      logger.error(
        { 
          err: error, 
          chunkIndex: index,
          timeMs: totalTime
        }, 
        '❌ [TTS] TTS generation error'
      );
    }
  }

  /**
   * Get first chunk with audio ready (for immediate return)
   */
  async getFirstChunkWithAudio(
    ollamaResponse: string,
    voice?: string
  ): Promise<{ chunk: ProcessedChunk; metadata: ParsedResponse['metadata']; source: 'structured' | 'fallback' } | null> {
    const firstChunkStartTime = Date.now();
    logger.info('🚀 [FIRST-CHUNK] Starting first chunk processing');
    logger.debug({ responseLength: ollamaResponse.length, responsePreview: ollamaResponse.substring(0, 200) }, '📥 [FIRST-CHUNK] Raw Ollama response preview');
    
    const parseStartTime = Date.now();
    const parsed = parseResponseWithFallback(ollamaResponse);
    const parseTime = Date.now() - parseStartTime;
    
    logger.info(
      { 
        chunkCount: parsed.chunks.length, 
        source: parsed.source,
        parseTimeMs: parseTime
      },
      '✅ [FIRST-CHUNK] Response parsed'
    );
    
    if (parsed.chunks.length === 0) {
      logger.warn('❌ [FIRST-CHUNK] No chunks found in parsed response');
      return null;
    }

    const firstChunk = parsed.chunks[0];
    if (!firstChunk) {
      logger.warn('❌ [FIRST-CHUNK] First chunk is undefined');
      return null;
    }

    logger.debug(
      { 
        text: firstChunk.text,
        textLength: firstChunk.text.length,
        emotion: firstChunk.emotion,
        icon: firstChunk.icon,
        pause: firstChunk.pause
      },
      '📦 [FIRST-CHUNK] First chunk details'
    );

    const processed: ProcessedChunk = {
      ...firstChunk,
      ttsStatus: 'processing',
    };

    try {
      const ttsStartTime = Date.now();
      logger.debug({ text: firstChunk.text, voice: voice || 'default' }, '🎤 [FIRST-CHUNK] Starting TTS generation');
      
      const ttsService = getTTSService();
      const ttsResponse = await ttsService.synthesize({
        text: firstChunk.text,
        voice: voice,
        store: true,
      });

      const ttsTime = Date.now() - ttsStartTime;

      if (ttsResponse.success && ttsResponse.fileId) {
        processed.audioFileId = ttsResponse.fileId;
        if (ttsResponse.duration !== undefined) {
          processed.duration = ttsResponse.duration;
        }
        processed.ttsStatus = 'completed';
        
        const totalTime = Date.now() - firstChunkStartTime;
        logger.info(
          {
            fileId: processed.audioFileId,
            duration: processed.duration,
            ttsTimeMs: ttsTime,
            totalTimeMs: totalTime,
            textLength: firstChunk.text.length,
            charsPerSecond: (firstChunk.text.length / (ttsTime / 1000)).toFixed(0)
          },
          '✅ [FIRST-CHUNK] First chunk ready with audio'
        );
      } else {
        processed.ttsStatus = 'failed';
        processed.ttsError = ttsResponse.error ?? 'TTS generation failed';
        logger.warn(
          { 
            error: processed.ttsError,
            ttsTimeMs: ttsTime
          },
          '❌ [FIRST-CHUNK] TTS generation failed'
        );
      }
    } catch (error) {
      const ttsTime = Date.now() - firstChunkStartTime;
      processed.ttsStatus = 'failed';
      processed.ttsError = error instanceof Error ? error.message : 'Unknown error';
      logger.error(
        { 
          err: error,
          ttsTimeMs: ttsTime
        },
        '❌ [FIRST-CHUNK] TTS generation error'
      );
    }

    const totalTime = Date.now() - firstChunkStartTime;
    logger.info(
      {
        totalTimeMs: totalTime,
        parseTimeMs: parseTime,
        ttsTimeMs: totalTime - parseTime,
        status: processed.ttsStatus
      },
      '🏁 [FIRST-CHUNK] First chunk processing complete'
    );

    return {
      chunk: processed,
      metadata: parsed.metadata,
      source: parsed.source,
    };
  }
}

// Singleton instance
let pipelineServiceInstance: ConversationPipelineService | null = null;

/**
 * Get pipeline service singleton
 */
export function getPipelineService(): ConversationPipelineService {
  if (pipelineServiceInstance === null) {
    pipelineServiceInstance = new ConversationPipelineService();
  }
  return pipelineServiceInstance;
}

