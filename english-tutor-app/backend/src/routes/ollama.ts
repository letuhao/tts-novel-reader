/**
 * Ollama API Routes
 * REST endpoints for Ollama service integration
 */
import express, { type Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getOllamaService } from '../services/ollama/ollamaService.js';
import type { OllamaMessage } from '../types/index.js';
import { createChildLogger } from '../utils/logger.js';
import { PerformanceTimer } from '../utils/timing.js';
import { conversationService } from '../services/conversation/conversationService.js';
import { conversationManager } from '../services/conversation/conversationManager.js';
import { eventBus } from '../services/conversation/eventBus.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router: Router = express.Router();
const logger = createChildLogger({ component: 'ollama-routes' });

// Validation schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  conversationHistory: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
  temperature: z.number().min(0).max(2).optional(),
  usePipeline: z.boolean().optional().default(true), // Use structured response pipeline
  voice: z.string().optional(), // Voice for TTS
  conversationId: z.string().optional(), // Conversation ID for WebSocket events
  useWebSocket: z.boolean().optional().default(false), // Use WebSocket for real-time updates
});

const GrammarAnalysisRequestSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(10000, 'Text too long'),
});

const ExerciseRequestSchema = z.object({
  topic: z.string().min(1, 'Topic cannot be empty'),
  level: z.string().min(1, 'Level cannot be empty'),
  exerciseType: z.enum(['multiple-choice', 'fill-blank', 'match', 'translation', 'speaking', 'listening', 'writing']).optional().default('multiple-choice'),
});

const FeedbackRequestSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  studentAnswer: z.string().min(1, 'Student answer cannot be empty'),
  correctAnswer: z.string().min(1, 'Correct answer cannot be empty'),
});

/**
 * Check Ollama service health
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const ollamaService = getOllamaService();
    const isAvailable = await ollamaService.isAvailable();
    const isModelAvailable = await ollamaService.isModelAvailable();

    res.json({
      success: true,
      data: {
        available: isAvailable,
        modelAvailable: isModelAvailable,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Health check failed');
    res.status(500).json({
      success: false,
      error: 'Failed to check Ollama service health',
    });
  }
});

/**
 * POST /api/ollama/chat
 * Chat with English tutor
 * Uses structured response pipeline for better performance
 * Integrates with ConversationService for persistence
 * Requires authentication
 */
router.post('/chat', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validationResult = ChatRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
      return;
    }

    const { message, conversationHistory = [], usePipeline = true, voice, conversationId: requestConversationId, useWebSocket = false } = validationResult.data as {
      message: string;
      conversationHistory?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
      usePipeline?: boolean;
      voice?: string;
      conversationId?: string;
      useWebSocket?: boolean;
    };

    // Get user ID from request (set by auth middleware)
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const ollamaService = getOllamaService();

    // Use conversation ID from request or create new conversation
    let conversationId = requestConversationId;
    if (!conversationId) {
      // Create new conversation
      const conversation = await conversationService.createConversation(userId, {
        title: message.substring(0, 50), // Use first 50 chars as title
        level: 'A1', // Default, can be updated later
      });
      conversationId = conversation.id;

      // Register active conversation
      await conversationManager.getOrCreateActiveConversation(conversationId, userId);

      logger.info({ conversationId, userId }, 'Created new conversation');
    } else {
      // Verify conversation exists and belongs to user
      const conversation = await conversationService.getConversation(conversationId, false);
      if (!conversation) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
        return;
      }

      if (conversation.userId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Unauthorized: Conversation does not belong to user',
        });
        return;
      }

      // Register active conversation
      await conversationManager.getOrCreateActiveConversation(conversationId, userId);
    }

    // Save user message
    const { message: userMessage } = await conversationService.sendMessage({
      conversationId,
      userId,
      content: message,
    });

    // Emit message sent event
    await eventBus.emitEvent(
      'message:sent',
      conversationId,
      {
        messageId: userMessage.id,
        content: message,
      },
      { userId }
    );

    // Get conversation history from memory or provided history
    let history: OllamaMessage[];
    if (conversationHistory.length > 0) {
      // Use provided history
      history = conversationHistory.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));
      logger.debug({ 
        conversationId, 
        historySource: 'provided',
        historyLength: history.length,
        history: history.map(h => ({ role: h.role, content: h.content.substring(0, 50) }))
      }, '📚 [MEMORY] Using provided conversation history');
    } else {
      // Get history from memory service
      const memoryHistory = await conversationService.getConversationHistory(conversationId);
      history = memoryHistory.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }));
      logger.debug({ 
        conversationId, 
        historySource: 'memory',
        historyLength: history.length,
        history: history.map(h => ({ role: h.role, content: h.content.substring(0, 50) }))
      }, '📚 [MEMORY] Loaded conversation history from memory');
    }

    // Add current user message
    history.push({
      role: 'user',
      content: message,
    });
    
    logger.debug({ 
      conversationId,
      finalHistoryLength: history.length,
      finalHistory: history.map(h => ({ 
        role: h.role, 
        content: h.content.substring(0, 100),
        contentLength: h.content.length
      }))
    }, '📚 [MEMORY] Final history sent to Ollama');

    // Performance timer for entire request
    const requestTimer = new PerformanceTimer('Request Start');
    
    // Get tutor response (with structured output)
    requestTimer.checkpoint('Before Ollama');
    logger.info({ messageLength: message.length, hasHistory: history.length > 0 }, '🤖 [OLLAMA] Starting Ollama request');
    
    const fullResponse = await ollamaService.tutorConversation(message, history, usePipeline);
    requestTimer.checkpoint('After Ollama');
    
    const ollamaTime = requestTimer.getResults().find(r => r.label === 'After Ollama')?.timeMs ?? 0;
    
    logger.info(
      {
        responseLength: fullResponse.length,
        timeMs: ollamaTime,
        charsPerSecond: (fullResponse.length / (ollamaTime / 1000)).toFixed(0)
      },
      '✅ [OLLAMA] Ollama response received'
    );
    logger.debug({ fullResponse }, '📥 [OLLAMA] Full Ollama response');
    logger.debug({ responsePreview: fullResponse.substring(0, 500) }, '📥 [OLLAMA] Response preview (first 500 chars)');

    if (usePipeline) {
      // Use pipeline service to process response
      const { getPipelineService } = await import('../services/conversation/pipelineService.js');
      const pipeline = getPipelineService();

      // Process all chunks (don't wait for all TTS, return immediately with status)
      requestTimer.checkpoint('Before Pipeline');
      logger.info('🚀 [CHAT] Processing response through pipeline');
      
      // Use conversation ID from request, or generate new one
      const conversationId = requestConversationId ?? `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      logger.debug({ conversationId, provided: !!requestConversationId }, '📡 [CHAT] Using conversation ID for WebSocket events');
      
      // Process response - this will start TTS generation but not wait for all
      // Events will be emitted via EventBus (which broadcasts via WebSocket) as chunks complete
      // Pipeline will save assistant message and chunks to database
      const pipelineResult = await pipeline.processResponse(fullResponse, voice, conversationId, userId);
      requestTimer.checkpoint('After Pipeline');

      requestTimer.checkpoint('Response Ready');
      requestTimer.logResults(logger);
      
      const timings = requestTimer.getResults();
      const totalTime = timings[timings.length - 1]?.timeMs ?? 0;
      const pipelineTime = timings.find(r => r.label === 'After Pipeline')?.timeMs ?? 0;
      
      logger.info(
        {
          totalTimeMs: totalTime,
          ollamaTimeMs: ollamaTime,
          pipelineTimeMs: pipelineTime,
          totalChunks: pipelineResult.chunks.length,
          completedChunks: pipelineResult.chunks.filter(c => c.ttsStatus === 'completed').length,
          processingChunks: pipelineResult.chunks.filter(c => c.ttsStatus === 'processing').length,
          pendingChunks: pipelineResult.chunks.filter(c => c.ttsStatus === 'pending').length,
          breakdown: {
            ollama: `${ollamaTime}ms (${((ollamaTime / totalTime) * 100).toFixed(1)}%)`,
            pipeline: `${pipelineTime}ms (${((pipelineTime / totalTime) * 100).toFixed(1)}%)`,
            total: `${totalTime}ms`
          }
        },
        '✅ [CHAT] Pipeline processed, returning all chunks to client'
      );
      
      // Emit message received event
      await eventBus.emitEvent(
        'message:received',
        conversationId,
        {
          chunksCount: pipelineResult.chunks.length,
          source: pipelineResult.source,
        },
        { userId }
      );

      // If using WebSocket, return minimal response (chunks sent via EventBus/WebSocket)
      if (useWebSocket) {
        res.json({
          success: true,
          data: {
            conversationId,
            message: 'Conversation started. Listen to WebSocket for real-time updates.',
            chunksCount: pipelineResult.chunks.length,
          },
        });
        logger.debug({ conversationId, chunksCount: pipelineResult.chunks.length }, '📡 [CHAT] WebSocket mode: returning minimal response');
        return;
      }
      
      // Return all chunks immediately with their TTS status (HTTP mode)
      res.json({
        success: true,
        data: {
          chunks: pipelineResult.chunks.map((chunk) => ({
            id: chunk.id,
            text: chunk.text,
            emotion: chunk.emotion,
            icon: chunk.icon,
            pause: chunk.pause,
            emphasis: chunk.emphasis,
            audioFileId: chunk.audioFileId,
            duration: chunk.duration,
            ttsStatus: chunk.ttsStatus, // 'pending' | 'processing' | 'completed' | 'failed'
            ttsError: chunk.ttsError,
          })),
          metadata: pipelineResult.metadata,
          source: pipelineResult.source,
          _debug: {
            timings: requestTimer.getResults().map(r => ({
              label: r.label,
              timeMs: r.timeMs,
              percentage: r.percentage?.toFixed(1) + '%'
            })),
            ollamaResponse: fullResponse.substring(0, 1000) // First 1000 chars for debugging
          }
        },
      });
    } else {
      // Legacy mode: return full response
      requestTimer.checkpoint('Response Ready');
    requestTimer.logResults(logger);
    
    const timings = requestTimer.getResults();
    const totalTime = timings[timings.length - 1]?.timeMs ?? 0;
    const ollamaTime = timings.find(r => r.label === 'After Ollama')?.timeMs ?? 0;
    
    logger.info(
      { 
        messageLength: message.length, 
        hasHistory: history.length > 0,
        ollamaTimeMs: ollamaTime,
        totalTimeMs: totalTime
      },
      '✅ [CHAT] Chat request completed (legacy mode)'
    );

      res.json({
        success: true,
        data: {
          response: fullResponse,
          message,
        },
      });
    }
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Chat request failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process chat request',
    });
  }
});

/**
 * POST /api/ollama/grammar
 * Analyze grammar in text
 */
router.post('/grammar', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validationResult = GrammarAnalysisRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
      return;
    }

    const { text } = validationResult.data;

    const ollamaService = getOllamaService();

    // Analyze grammar
    const result = await ollamaService.analyzeGrammar(text);

    logger.info({ textLength: text.length, errorCount: result.errors.length }, 'Grammar analysis completed');

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Grammar analysis failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze grammar',
    });
  }
});

/**
 * POST /api/ollama/exercise
 * Generate exercise
 */
router.post('/exercise', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validationResult = ExerciseRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
      return;
    }

    const { topic, level, exerciseType } = validationResult.data;

    const ollamaService = getOllamaService();

    // Generate exercise
    const exercise = await ollamaService.generateExercise(topic, level, exerciseType);

    logger.info({ topic, level, exerciseType }, 'Exercise generated');

    res.json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Exercise generation failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate exercise',
    });
  }
});

/**
 * POST /api/ollama/feedback
 * Provide feedback on student answer
 */
router.post('/feedback', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validationResult = FeedbackRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
      return;
    }

    const { question, studentAnswer, correctAnswer } = validationResult.data;

    const ollamaService = getOllamaService();

    // Get feedback
    const feedback = await ollamaService.provideFeedback(question, studentAnswer, correctAnswer);

    logger.info({ questionLength: question.length }, 'Feedback provided');

    res.json({
      success: true,
      data: {
        feedback,
        question,
        studentAnswer,
        correctAnswer,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Feedback generation failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to provide feedback',
    });
  }
});

export default router;

