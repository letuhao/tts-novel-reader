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
      // Worker options for parallel processing
      parallelParagraphs = 1, // Process N paragraphs concurrently (default: 1)
      parallelChapters = 1, // Process N chapters concurrently (default: 1)
      // Total: 1 paragraph × 1 chapter = 1 concurrent job (sequential processing)
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
      parallelParagraphs,
      parallelChapters,
      delayBetweenBatches,
      delayBetweenItems
    });
    const maxParagraphs = req.body.maxParagraphs || null;  // Limit paragraphs for testing
    
    // Create progress entry for tracking
    const { GenerationProgressModel } = await import('../models/GenerationProgress.js');
    const { ChapterModel } = await import('../models/Chapter.js');
    
    // Get chapter to create progress entry
    const chapter = await ChapterModel.getByNovelAndNumber(novelId, parseInt(chapterNumber));
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: `Chapter ${chapterNumber} not found`
      });
    }
    
    const progress = await GenerationProgressModel.createOrUpdate({
      novelId: novelId,
      chapterId: chapter.id,
      chapterNumber: parseInt(chapterNumber),
      status: 'pending',
      speakerId: speakerId,
      model: 'viettts',
      progressPercent: 0,
      startedAt: new Date().toISOString()
    });
    
    // Start generation in background (fire-and-forget)
    // Bắt đầu generation ở background (fire-and-forget)
    worker.generateChapterAudio(
      novelId,
      parseInt(chapterNumber),
      { speakerId, expiryHours, speedFactor, forceRegenerate, maxParagraphs }
    ).then(result => {
      // Update progress on completion
      // Cập nhật progress khi hoàn thành
      console.log(`[Worker Route] Chapter ${chapterNumber} generation completed`);
      GenerationProgressModel.update(progress.id, {
        status: result.success ? 'completed' : 'failed',
        progressPercent: 100,
        completedAt: new Date().toISOString(),
        errorMessage: result.error || null
      }).catch(err => {
        console.error(`[Worker Route] Failed to update progress: ${err.message}`);
      });
    }).catch(error => {
      // Update progress on error
      // Cập nhật progress khi có lỗi
      console.error(`[Worker Route] Chapter ${chapterNumber} generation failed: ${error.message}`);
      GenerationProgressModel.update(progress.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date().toISOString()
      }).catch(err => {
        console.error(`[Worker Route] Failed to update progress: ${err.message}`);
      });
    });
    
    // Return immediately with progressId
    // Trả về ngay lập tức với progressId
    res.json({
      success: true,
      message: 'Audio generation started in background',
      progressId: progress.id,
      data: {
        novelId: novelId,
        chapterNumber: parseInt(chapterNumber),
        status: 'pending'
      }
    });
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
      parallelParagraphs = 1, // Process N paragraphs concurrently (default: 1)
      parallelChapters = 1, // Process N chapters concurrently (default: 1)
      // Total: 1 paragraph × 1 chapter = 1 concurrent job (sequential processing)
      delayBetweenBatches = 11110,
      delayBetweenItems = 2000
    } = req.body;

    const worker = getWorker({ 
      speakerId, 
      expiryHours,
      parallelParagraphs,
      parallelChapters,
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
            parallelChapters, // Pass parallelChapters for parallel processing
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
      // Regular JSON response - fire-and-forget
      // Phản hồi JSON thông thường - fire-and-forget
      const { GenerationProgressModel } = await import('../models/GenerationProgress.js');
      
      const progress = await GenerationProgressModel.createOrUpdate({
        novelId: novelId,
        status: 'pending',
        model: 'viettts-batch',
        progressPercent: 0,
        startedAt: new Date().toISOString()
      });
      
      // Start generation in background (fire-and-forget)
      // Bắt đầu generation ở background (fire-and-forget)
      worker.generateBatchAudio(
        novelId,
        chapterNumbers,
        { speakerId, expiryHours, forceRegenerate, parallelChapters }
      ).then(result => {
        // Update progress on completion
        // Cập nhật progress khi hoàn thành
        console.log(`[Worker Route] Batch generation completed for novel ${novelId}`);
        GenerationProgressModel.update(progress.id, {
          status: 'completed',
          progressPercent: 100,
          completedAt: new Date().toISOString()
        }).catch(err => {
          console.error(`[Worker Route] Failed to update progress: ${err.message}`);
        });
      }).catch(error => {
        // Update progress on error
        // Cập nhật progress khi có lỗi
        console.error(`[Worker Route] Batch generation failed: ${error.message}`);
        GenerationProgressModel.update(progress.id, {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date().toISOString()
        }).catch(err => {
          console.error(`[Worker Route] Failed to update progress: ${err.message}`);
        });
      });
      
      // Return immediately with progressId
      // Trả về ngay lập tức với progressId
      res.json({
        success: true,
        message: 'Batch audio generation started in background',
        progressId: progress.id,
        data: {
          novelId: novelId,
          chapterCount: chapterNumbers.length,
          chapters: chapterNumbers,
          status: 'pending'
        }
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
      parallelParagraphs = 1, // Process N paragraphs concurrently (default: 1)
      parallelChapters = 1, // Process N chapters concurrently (default: 1)
      // Total: 1 paragraph × 1 chapter = 1 concurrent job (sequential processing)
      delayBetweenBatches = 11110,
      delayBetweenItems = 2000
    } = req.body;

    const worker = getWorker({ 
      speakerId, 
      expiryHours,
      parallelParagraphs,
      parallelChapters,
      delayBetweenBatches,
      delayBetweenItems
    });
    
    // Create overall progress entry
    // Tạo progress entry tổng thể
    const { GenerationProgressModel } = await import('../models/GenerationProgress.js');
    const { NovelModel } = await import('../models/Novel.js');
    
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }
    
    const progress = await GenerationProgressModel.createOrUpdate({
      novelId: novelId,
      status: 'pending',
      model: 'viettts-all-chapters',
      progressPercent: 0,
      startedAt: new Date().toISOString()
    });
    
    // Start generation in background (fire-and-forget)
    // Bắt đầu generation ở background (fire-and-forget)
    worker.generateAllChapters(novelId, {
      speakerId,
      expiryHours,
      forceRegenerate,
      parallelChapters
    }).then(result => {
      // Update progress on completion
      // Cập nhật progress khi hoàn thành
      console.log(`[Worker Route] All chapters generation completed for novel ${novelId}`);
      GenerationProgressModel.update(progress.id, {
        status: result.success ? 'completed' : 'failed',
        progressPercent: 100,
        completedAt: new Date().toISOString()
      }).catch(err => {
        console.error(`[Worker Route] Failed to update progress: ${err.message}`);
      });
    }).catch(error => {
      // Update progress on error
      // Cập nhật progress khi có lỗi
      console.error(`[Worker Route] All chapters generation failed: ${error.message}`);
      GenerationProgressModel.update(progress.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date().toISOString()
      }).catch(err => {
        console.error(`[Worker Route] Failed to update progress: ${err.message}`);
      });
    });
    
    // Return immediately with progressId
    // Trả về ngay lập tức với progressId
    res.json({
      success: true,
      message: 'Audio generation for all chapters started in background',
      progressId: progress.id,
      data: {
        novelId: novelId,
        novelTitle: novel.title,
        status: 'pending'
      }
    });
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

