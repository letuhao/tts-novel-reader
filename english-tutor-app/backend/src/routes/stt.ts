/**
 * STT API Routes
 * REST endpoints for Speech-to-Text service
 */
import express, { type Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getSTTService } from '../services/stt/sttService.js';
import { createChildLogger } from '../utils/logger.js';

const router: Router = express.Router();
const logger = createChildLogger({ component: 'stt-routes' });

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

// Validation schemas
const TranscribeRequestSchema = z.object({
  language: z.string().optional(),
  task: z.enum(['transcribe', 'translate']).optional(),
  beamSize: z.number().int().min(1).max(20).optional(),
  vadFilter: z.boolean().optional(),
  returnTimestamps: z.boolean().optional(),
  wordTimestamps: z.boolean().optional(),
});

/**
 * GET /api/stt/health
 * Check STT service health
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const sttService = getSTTService();
    const isAvailable = await sttService.isAvailable();

    res.json({
      success: true,
      data: {
        available: isAvailable,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Health check failed');
    res.status(500).json({
      success: false,
      error: 'Failed to check STT service health',
    });
  }
});

/**
 * POST /api/stt/transcribe
 * Transcribe audio file to text
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if audio file was uploaded
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'Audio file is required',
      });
      return;
    }

    // Validate query parameters
    const validationResult = TranscribeRequestSchema.safeParse(req.query);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: validationResult.error.errors,
      });
      return;
    }

    const params = validationResult.data;

    const sttService = getSTTService();
    const result = await sttService.transcribe({
      audio: req.file.buffer,
      language: params.language,
      task: params.task,
      beamSize: params.beamSize,
      vadFilter: params.vadFilter,
      returnTimestamps: params.returnTimestamps,
      wordTimestamps: params.wordTimestamps,
    });

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error ?? 'Failed to transcribe audio',
      });
      return;
    }

    logger.info({ 
      textLength: result.data?.text.length,
      language: result.data?.language,
      segments: result.data?.segments.length 
    }, 'STT transcription completed');

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'STT transcription request failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process STT request',
    });
  }
});

export default router;

