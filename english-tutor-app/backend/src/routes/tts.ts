/**
 * TTS API Routes
 * REST endpoints for Text-to-Speech service
 */
import express, { type Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { getTTSService } from '../services/tts/ttsService.js';
import { createChildLogger } from '../utils/logger.js';

const router: Router = express.Router();
const logger = createChildLogger({ component: 'tts-routes' });

// Validation schemas
const SynthesizeRequestSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(10000, 'Text too long'),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
  model: z.string().optional(),
  store: z.boolean().optional(),
  expiryHours: z.number().int().positive().optional(),
});

/**
 * GET /api/tts/health
 * Check TTS service health
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const ttsService = getTTSService();
    const isAvailable = await ttsService.isAvailable();

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
      error: 'Failed to check TTS service health',
    });
  }
});

/**
 * POST /api/tts/synthesize
 * Synthesize speech from text
 */
router.post('/synthesize', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request
    const validationResult = SynthesizeRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
      return;
    }

    const request = validationResult.data;

    const ttsService = getTTSService();
    const ttsRequest = {
      text: request.text,
      voice: request.voice,
      speed: request.speed,
      model: request.model,
      store: request.store,
      expiryHours: request.expiryHours,
    };
    const result = await ttsService.synthesize(ttsRequest);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: result.error ?? 'Failed to synthesize speech',
      });
      return;
    }

    logger.info({ textLength: request.text.length, voice: request.voice, fileId: result.fileId }, 'TTS synthesis completed');

    res.json({
      success: true,
      data: {
        fileId: result.fileId,
        audioUrl: result.audioUrl,
        duration: result.duration,
        metadata: result.metadata,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'TTS synthesis request failed');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process TTS request',
    });
  }
});

/**
 * GET /api/tts/voices
 * Get available voices
 */
router.get('/voices', async (_req: Request, res: Response): Promise<void> => {
  try {
    const ttsService = getTTSService();
    const voices = await ttsService.getVoices();

    res.json({
      success: true,
      data: {
        voices,
      },
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to get voices');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get voices',
    });
  }
});

/**
 * GET /api/tts/audio/:fileId
 * Get stored audio file
 */
router.get('/audio/:fileId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params;

    if (!fileId || fileId.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'File ID is required',
      });
      return;
    }

    const ttsService = getTTSService();
    const audioData = await ttsService.getAudio(fileId);

    if (audioData === null) {
      res.status(404).json({
        success: false,
        error: 'Audio file not found',
      });
      return;
    }

    // Set appropriate headers for audio
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioData.length.toString());
    res.send(audioData);
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Failed to get audio');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get audio file',
    });
  }
});

export default router;

