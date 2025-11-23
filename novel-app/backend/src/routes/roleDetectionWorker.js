/**
 * Role Detection Worker Routes
 * Routes cho Worker Phát hiện Vai diễn
 */
import express from 'express';
import { getRoleDetectionWorker } from '../services/roleDetectionWorker.js';

const router = express.Router();

/**
 * POST /api/role-detection/detect-chapter
 * Detect roles for all paragraphs in a chapter
 * Phát hiện vai diễn cho tất cả paragraphs trong một chapter
 * 
 * Body:
 * {
 *   novelId: string,
 *   chapterNumber: number,
 *   updateProgress?: boolean,      // Default: true
 *   saveMetadata?: boolean,        // Default: true
 *   forceRegenerateRoles?: boolean // Default: false (if true, overwrite existing roles)
 * }
 */
router.post('/detect-chapter', async (req, res, next) => {
  try {
    const { novelId, chapterNumber, updateProgress = true, saveMetadata = true, forceRegenerateRoles = false } = req.body;

    // Validate input
    if (!novelId || chapterNumber === undefined) {
      return res.status(400).json({
        success: false,
        error: 'novelId and chapterNumber are required'
      });
    }

    if (typeof chapterNumber !== 'number' || chapterNumber < 1) {
      return res.status(400).json({
        success: false,
        error: 'chapterNumber must be a positive number'
      });
    }

    console.log(`[RoleDetectionWorker] API: Detecting roles for novel ${novelId}, chapter ${chapterNumber}`);

    // Get worker
    const worker = getRoleDetectionWorker();

    // Create progress entry first
    const { GenerationProgressModel } = await import('../models/GenerationProgress.js');
    const { ChapterModel } = await import('../models/Chapter.js');
    const chapter = await ChapterModel.getByNovelAndNumber(novelId, chapterNumber);
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }

    const progress = await GenerationProgressModel.createOrUpdate({
      novelId: novelId,
      chapterId: chapter.id,
      chapterNumber: chapterNumber,
      status: 'pending',
      model: 'role-detection',
      progressPercent: 0,
      startedAt: new Date().toISOString()
    });

    // Start detection in background (don't await)
    worker.detectChapterRoles(novelId, chapterNumber, {
      updateProgress: updateProgress,
      saveMetadata: saveMetadata,
      forceRegenerateRoles: forceRegenerateRoles
    }).catch(error => {
      console.error(`[RoleDetectionWorker] Background error: ${error.message}`);
      // Update progress to failed
      GenerationProgressModel.update(progress.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date().toISOString()
      }).catch(updateError => {
        console.error(`[RoleDetectionWorker] Failed to update progress: ${updateError.message}`);
      });
    });

    // Return immediately with progressId
    res.json({
      success: true,
      message: 'Role detection started in background',
      progressId: progress.id,
      data: {
        novelId: novelId,
        chapterNumber: chapterNumber,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('[RoleDetectionWorker] API Error:', error);
    next(error);
  }
});

/**
 * POST /api/role-detection/detect-novel
 * Detect roles for all chapters in a novel
 * Phát hiện vai diễn cho tất cả chapters trong một novel
 * 
 * Body:
 * {
 *   novelId: string,
 *   overwriteComplete?: boolean,  // Default: false (skip complete chapters)
 *   updateProgress?: boolean,      // Default: true
 *   saveMetadata?: boolean         // Default: true
 * }
 */
router.post('/detect-novel', async (req, res, next) => {
  try {
    const { 
      novelId, 
      overwriteComplete = false,
      updateProgress = true, 
      saveMetadata = true 
    } = req.body;

    // Validate input
    if (!novelId) {
      return res.status(400).json({
        success: false,
        error: 'novelId is required'
      });
    }

    console.log(`[RoleDetectionWorker] API: Detecting roles for novel ${novelId}`);

    // Get worker and novel
    const { NovelModel } = await import('../models/Novel.js');
    const novel = await NovelModel.getById(novelId);
    
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }

    const worker = getRoleDetectionWorker();

    // Create overall progress entry
    const { GenerationProgressModel } = await import('../models/GenerationProgress.js');
    const progress = await GenerationProgressModel.createOrUpdate({
      novelId: novelId,
      status: 'pending',
      model: 'role-detection-novel',
      progressPercent: 0,
      startedAt: new Date().toISOString()
    });

    // Run detection in background (don't await)
    worker.detectNovelRoles(novelId, {
      overwriteComplete: overwriteComplete,
      updateProgress: updateProgress,
      saveMetadata: saveMetadata
    }).catch(error => {
      console.error(`[RoleDetectionWorker] Background novel detection error: ${error.message}`);
      // Update progress to failed
      GenerationProgressModel.update(progress.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date().toISOString()
      }).catch(updateError => {
        console.error(`[RoleDetectionWorker] Failed to update progress: ${updateError.message}`);
      });
    });

    // Return immediately with progressId
    res.json({
      success: true,
      message: 'Novel role detection started in background',
      progressId: progress.id,
      data: {
        novelId: novelId,
        novelTitle: novel.title,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('[RoleDetectionWorker] API Error:', error);
    next(error);
  }
});

/**
 * GET /api/role-detection/novel-status/:novelId
 * Get role detection status for entire novel
 * Lấy trạng thái phát hiện vai diễn cho toàn bộ novel
 */
router.get('/novel-status/:novelId', async (req, res, next) => {
  try {
    const { novelId } = req.params;

    // Get novel and chapters
    const { NovelModel } = await import('../models/Novel.js');
    const { ChapterModel } = await import('../models/Chapter.js');
    const { ParagraphModel } = await import('../models/Paragraph.js');
    const { getRoleDetectionWorker } = await import('../services/roleDetectionWorker.js');

    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }

    const chapters = await ChapterModel.getByNovel(novelId);
    chapters.sort((a, b) => a.chapter_number - b.chapter_number);

    // Check status for each chapter
    const worker = getRoleDetectionWorker();
    const chapterStatuses = [];

    for (const chapter of chapters) {
      const paragraphs = await ParagraphModel.getByChapter(chapter.id);
      const total = paragraphs.length;
      const withRole = paragraphs.filter(p => p.role && p.voiceId).length;
      const isComplete = total > 0 && withRole === total;

      chapterStatuses.push({
        chapterNumber: chapter.chapter_number,
        chapterTitle: chapter.title,
        totalParagraphs: total,
        paragraphsWithRoles: withRole,
        isComplete: isComplete,
        progressPercent: total > 0 ? Math.floor((withRole / total) * 100) : 0
      });
    }

    // Aggregate statistics
    const totalChapters = chapters.length;
    const completeChapters = chapterStatuses.filter(s => s.isComplete).length;
    const incompleteChapters = totalChapters - completeChapters;
    const totalParagraphs = chapterStatuses.reduce((sum, s) => sum + s.totalParagraphs, 0);
    const paragraphsWithRoles = chapterStatuses.reduce((sum, s) => sum + s.paragraphsWithRoles, 0);
    const overallProgress = totalParagraphs > 0 
      ? Math.floor((paragraphsWithRoles / totalParagraphs) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        novelId: novelId,
        novelTitle: novel.title,
        totalChapters: totalChapters,
        completeChapters: completeChapters,
        incompleteChapters: incompleteChapters,
        totalParagraphs: totalParagraphs,
        paragraphsWithRoles: paragraphsWithRoles,
        overallProgress: overallProgress,
        isComplete: incompleteChapters === 0 && totalChapters > 0,
        chapterStatuses: chapterStatuses
      }
    });

  } catch (error) {
    console.error('[RoleDetectionWorker] Novel status error:', error);
    next(error);
  }
});

/**
 * GET /api/role-detection/chapter-status/:novelId/:chapterNumber
 * Get role detection status for a chapter
 * Lấy trạng thái phát hiện vai diễn cho một chapter
 */
router.get('/chapter-status/:novelId/:chapterNumber', async (req, res, next) => {
  try {
    const { novelId, chapterNumber } = req.params;
    const chapterNum = parseInt(chapterNumber);

    // Get paragraphs and check if they have roles
    const { ParagraphModel } = await import('../models/Paragraph.js');
    const { ChapterModel } = await import('../models/Chapter.js');

    const chapter = await ChapterModel.getByNovelAndNumber(novelId, chapterNum);
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }

    const paragraphs = await ParagraphModel.getByChapter(chapter.id);
    
    const totalParagraphs = paragraphs.length;
    const paragraphsWithRoles = paragraphs.filter(p => p.role && p.voiceId).length;
    const progressPercent = totalParagraphs > 0 
      ? Math.floor((paragraphsWithRoles / totalParagraphs) * 100) 
      : 0;

    // Count roles
    const roleCounts = {};
    const voiceCounts = {};
    for (const para of paragraphs) {
      if (para.role) {
        roleCounts[para.role] = (roleCounts[para.role] || 0) + 1;
      }
      if (para.voiceId) {
        voiceCounts[para.voiceId] = (voiceCounts[para.voiceId] || 0) + 1;
      }
    }

    res.json({
      success: true,
      data: {
        novelId: novelId,
        chapterNumber: chapterNum,
        totalParagraphs: totalParagraphs,
        paragraphsWithRoles: paragraphsWithRoles,
        progressPercent: progressPercent,
        isComplete: paragraphsWithRoles === totalParagraphs && totalParagraphs > 0,
        roleCounts: roleCounts,
        voiceCounts: voiceCounts
      }
    });

  } catch (error) {
    console.error('[RoleDetectionWorker] Status error:', error);
    next(error);
  }
});

export default router;

