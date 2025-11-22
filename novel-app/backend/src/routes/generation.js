/**
 * Generation Progress Routes
 * Routes Tiến độ Tạo Audio
 */
import express from 'express';
import { GenerationProgressModel } from '../models/GenerationProgress.js';

const router = express.Router();

/**
 * Get generation progress for a novel
 * Lấy tiến độ tạo cho một novel
 */
router.get('/novel/:novelId', async (req, res, next) => {
  try {
    const { novelId } = req.params;
    const progress = await GenerationProgressModel.getByNovel(novelId);
    
    res.json({
      success: true,
      progress: progress,
      total: progress.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get generation progress for a chapter
 * Lấy tiến độ tạo cho một chapter
 */
router.get('/novel/:novelId/chapter/:chapterNumber', async (req, res, next) => {
  try {
    const { novelId, chapterNumber } = req.params;
    const progress = await GenerationProgressModel.getByChapter(novelId, parseInt(chapterNumber));
    const stats = await GenerationProgressModel.getChapterStats(novelId, parseInt(chapterNumber));
    
    res.json({
      success: true,
      chapterNumber: parseInt(chapterNumber),
      progress: progress,
      stats: stats,
      total: progress.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get generation progress for a paragraph
 * Lấy tiến độ tạo cho một paragraph
 */
router.get('/novel/:novelId/chapter/:chapterNumber/paragraph/:paragraphNumber', async (req, res, next) => {
  try {
    const { novelId, chapterNumber, paragraphNumber } = req.params;
    const progress = await GenerationProgressModel.getByParagraph(
      novelId, 
      parseInt(chapterNumber), 
      parseInt(paragraphNumber)
    );
    
    if (!progress) {
      return res.status(404).json({
        success: false,
        error: 'Generation progress not found'
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
 * Get generation statistics for a chapter
 * Lấy thống kê generation cho một chapter
 */
router.get('/novel/:novelId/chapter/:chapterNumber/stats', async (req, res, next) => {
  try {
    const { novelId, chapterNumber } = req.params;
    const stats = await GenerationProgressModel.getChapterStats(novelId, parseInt(chapterNumber));
    
    res.json({
      success: true,
      chapterNumber: parseInt(chapterNumber),
      stats: stats
    });
  } catch (error) {
    next(error);
  }
});

export default router;

