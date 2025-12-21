/**
 * Ollama API Routes
 * REST endpoints for Ollama service integration
 */
import express, { type Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getOllamaService } from '../services/ollama/ollamaService.js';
import type { OllamaMessage } from '../types/index.js';
import { createChildLogger } from '../utils/logger.js';

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
 */
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
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

    const { message, conversationHistory = [] } = validationResult.data;

    const ollamaService = getOllamaService();

    // Convert conversation history to OllamaMessage format
    const history: OllamaMessage[] = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get tutor response
    const response = await ollamaService.tutorConversation(message, history);

    logger.info({ messageLength: message.length, hasHistory: history.length > 0 }, 'Chat request completed');

    res.json({
      success: true,
      data: {
        response,
        message,
      },
    });
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

