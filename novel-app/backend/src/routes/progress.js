/**
 * Progress Routes
 * Routes cho Progress
 */
import express from 'express';
import { ProgressModel } from '../models/Progress.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Get progress for novel
 * Lấy progress cho novel
 */
router.get('/:novelId', async (req, res, next) => {
  try {
    const progress = await ProgressModel.getByNovel(req.params.novelId);
    
    res.json({
      success: true,
      progress: progress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Save progress
 * Lưu progress
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      novelId,
      chapterId,
      chapterNumber,
      paragraphId,
      paragraphNumber,
      position = 0,
      completed = false,
      readingTimeSeconds = 0
    } = req.body;
    
    if (!novelId) {
      return res.status(400).json({
        success: false,
        error: 'novelId is required'
      });
    }
    
    // Get existing progress or create new
    let progress = await ProgressModel.getByNovel(novelId);
    
    if (progress) {
      // Update existing
      progress = await ProgressModel.update(progress.id, {
        chapterId,
        chapterNumber,
        paragraphId,
        paragraphNumber,
        position,
        completed,
        readingTimeSeconds: (progress.reading_time_seconds || 0) + readingTimeSeconds
      });
    } else {
      // Create new
      progress = await ProgressModel.create({
        id: uuidv4(),
        novelId,
        chapterId,
        chapterNumber,
        paragraphId,
        paragraphNumber,
        position,
        completed,
        readingTimeSeconds
      });
    }
    
    res.json({
      success: true,
      progress: progress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update progress
 * Cập nhật progress
 */
router.put('/:id', async (req, res, next) => {
  try {
    const progress = await ProgressModel.update(req.params.id, req.body);
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Progress not found'
      });
    }
    
    res.json({
      success: true,
      progress: progress
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get reading statistics
 * Lấy thống kê đọc
 */
router.get('/:novelId/stats', async (req, res, next) => {
  try {
    const stats = await ProgressModel.getStats(req.params.novelId);
    
    res.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    next(error);
  }
});

export default router;

