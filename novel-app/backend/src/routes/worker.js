/**
 * Worker Routes
 * Routes cho Worker
 */
import express from 'express';
import { getWorker } from '../services/worker.js';

const router = express.Router();

/**
 * Generate audio for a single chapter
 * Tạo audio cho một chapter
 */
router.post('/generate/chapter', async (req, res, next) => {
  try {
    const {
      novelId,
      chapterNumber,
      speakerId = '05',
      expiryHours = 365 * 24,
      forceRegenerate = false,
      speedFactor = 1.0,  // Normal speed (matches preset)
      // VieNeu-TTS options / Tùy chọn VieNeu-TTS
      voice = 'id_0004',  // Default female voice / Mặc định giọng nữ
      autoVoice = false,  // Auto-detect gender from text / Tự động phát hiện giới tính từ văn bản
      autoChunk = true,  // Auto-chunk long text / Tự động chia nhỏ văn bản dài
      maxChars = 256,  // Max chars per chunk / Ký tự tối đa mỗi chunk
      // Worker options for slower processing
      delayBetweenBatches = 11110, // 3 seconds between batches (50% slower)
      delayBetweenItems = 2000 // 2 seconds between items
    } = req.body;

    if (!novelId || chapterNumber === undefined) {
      return res.status(400).json({
        success: false,
        error: 'novelId and chapterNumber are required'
      });
    }

    const worker = getWorker({ 
      speakerId, 
      expiryHours,
      speedFactor,  // Pass speed factor
      // VieNeu-TTS options / Tùy chọn VieNeu-TTS
      voice: voice,
      autoVoice: autoVoice,
      autoChunk: autoChunk,
      maxChars: maxChars,
      delayBetweenBatches,
      delayBetweenItems
    });
    const maxParagraphs = req.body.maxParagraphs || null;  // Limit paragraphs for testing
    
    const result = await worker.generateChapterAudio(
      novelId,
      parseInt(chapterNumber),
      { speakerId, expiryHours, speedFactor, forceRegenerate, maxParagraphs }
    );

    if (result.success) {
      res.json({
        success: true,
        result: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Generation failed',
        result: result
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Generate audio for multiple chapters (batch)
 * Tạo audio cho nhiều chapters (batch)
 */
router.post('/generate/batch', async (req, res, next) => {
  try {
    const {
      novelId,
      chapterNumbers,
      speakerId = '05',
      expiryHours = 365 * 24,
      forceRegenerate = false
    } = req.body;

    if (!novelId || !Array.isArray(chapterNumbers)) {
      return res.status(400).json({
        success: false,
        error: 'novelId and chapterNumbers array are required'
      });
    }

    const {
      delayBetweenBatches = 11110,
      delayBetweenItems = 2000
    } = req.body;

    const worker = getWorker({ 
      speakerId, 
      expiryHours,
      delayBetweenBatches,
      delayBetweenItems
    });
    
    // Stream progress updates via Server-Sent Events if requested
    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        await worker.generateBatchAudio(
          novelId,
          chapterNumbers,
          {
            speakerId,
            expiryHours,
            forceRegenerate,
            onProgress: (progress) => {
              res.write(`data: ${JSON.stringify({ type: 'progress', data: progress })}\n\n`);
            }
          }
        );

        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      }
    } else {
      // Regular JSON response
      const result = await worker.generateBatchAudio(
        novelId,
        chapterNumbers,
        { speakerId, expiryHours, forceRegenerate }
      );

      res.json({
        success: true,
        result: result
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Generate audio for all chapters in a novel
 * Tạo audio cho tất cả chapters trong novel
 */
router.post('/generate/all', async (req, res, next) => {
  try {
    const {
      novelId,
      speakerId = '05',
      expiryHours = 365 * 24,
      forceRegenerate = false
    } = req.body;

    if (!novelId) {
      return res.status(400).json({
        success: false,
        error: 'novelId is required'
      });
    }

    const {
      delayBetweenBatches = 11110,
      delayBetweenItems = 2000
    } = req.body;

    const worker = getWorker({ 
      speakerId, 
      expiryHours,
      delayBetweenBatches,
      delayBetweenItems
    });
    
    // Stream progress if SSE requested
    if (req.headers.accept === 'text/event-stream') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        await worker.generateAllChapters(novelId, {
          speakerId,
          expiryHours,
          forceRegenerate,
          onProgress: (progress) => {
            res.write(`data: ${JSON.stringify({ type: 'progress', data: progress })}\n\n`);
          }
        });

        res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        res.end();
      }
    } else {
      const result = await worker.generateAllChapters(novelId, {
        speakerId,
        expiryHours,
        forceRegenerate
      });

      res.json({
        success: true,
        result: result
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Get generation status for a chapter
 * Lấy trạng thái tạo audio cho chapter
 */
router.get('/status/:novelId/:chapterNumber', async (req, res, next) => {
  try {
    const { novelId, chapterNumber } = req.params;
    
    const worker = getWorker();
    const status = await worker.getChapterStatus(novelId, parseInt(chapterNumber));

    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get storage structure for a novel
 * Lấy cấu trúc lưu trữ cho một novel
 */
router.get('/storage/:novelId', async (req, res, next) => {
  try {
    const { novelId } = req.params;
    
    const { getAudioStorage } = await import('../services/audioStorage.js');
    const audioStorage = getAudioStorage();
    const structure = await audioStorage.getStorageStructure(novelId);

    res.json({
      success: true,
      structure: structure
    });
  } catch (error) {
    next(error);
  }
});

export default router;

