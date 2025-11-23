/**
 * Role Detection Routes
 * Routes cho Phát hiện Vai diễn
 */
import express from 'express';
import { getRoleDetectionService } from '../services/roleDetectionService.js';
import { getVoiceMapping } from '../utils/voiceMapping.js';
import { getRoleDetectionWorker } from '../services/roleDetectionWorker.js';

const router = express.Router();

/**
 * POST /api/role-detection/detect
 * Detect roles for paragraphs
 * Phát hiện vai diễn cho các paragraphs
 * 
 * Body:
 * {
 *   paragraphs: string[], // Array of paragraph texts
 *   chapterContext?: string, // Optional full chapter text
 *   returnVoiceIds?: boolean // If true, return voice IDs (default: true)
 * }
 */
router.post('/detect', async (req, res, next) => {
  try {
    const { paragraphs, chapterContext, returnVoiceIds = true } = req.body;

    // Validate input
    if (!paragraphs || !Array.isArray(paragraphs) || paragraphs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'paragraphs is required and must be a non-empty array'
      });
    }

    // Validate paragraph texts
    if (!paragraphs.every(p => typeof p === 'string' && p.trim().length > 0)) {
      return res.status(400).json({
        success: false,
        error: 'All paragraphs must be non-empty strings'
      });
    }

    // Get service
    const service = getRoleDetectionService();

    // Check if service is available
    const available = await service.isAvailable();
    if (!available) {
      return res.status(503).json({
        success: false,
        error: 'Role detection service is not available. Make sure Ollama is running with qwen3:8b model.',
        details: 'Please check: 1) Ollama is running, 2) qwen3:8b model is installed'
      });
    }

    // Detect roles
    const result = await service.detectRoles(paragraphs, {
      chapterContext: chapterContext || '',
      returnVoiceIds: returnVoiceIds !== false
    });

    res.json({
      success: true,
      data: result,
      count: paragraphs.length
    });

  } catch (error) {
    console.error('[RoleDetection] Error:', error);
    next(error);
  }
});

/**
 * GET /api/role-detection/status
 * Check service status
 * Kiểm tra trạng thái dịch vụ
 */
router.get('/status', async (req, res, next) => {
  try {
    const service = getRoleDetectionService();
    const available = await service.isAvailable();

    if (!available) {
      return res.json({
        success: false,
        available: false,
        message: 'Role detection service is not available',
        details: 'Please check: 1) Ollama is running, 2) qwen3:8b model is installed'
      });
    }

    res.json({
      success: true,
      available: true,
      model: service.model,
      message: 'Role detection service is available'
    });

  } catch (error) {
    console.error('[RoleDetection] Status error:', error);
    next(error);
  }
});

/**
 * GET /api/role-detection/voices
 * Get voice mapping configuration
 * Lấy cấu hình voice mapping
 */
router.get('/voices', (req, res, next) => {
  try {
    const voiceMapping = getVoiceMapping();
    const mappings = voiceMapping.getAllMappings();

    res.json({
      success: true,
      mappings: mappings,
      default_mappings: {
        male: 'cdteam',
        female: 'nu-nhe-nhang',
        narrator: 'quynh'
      }
    });

  } catch (error) {
    console.error('[RoleDetection] Voices error:', error);
    next(error);
  }
});

/**
 * PUT /api/role-detection/voices
 * Update voice mapping
 * Cập nhật voice mapping
 * 
 * Body:
 * {
 *   male?: string, // Voice ID for male
 *   female?: string, // Voice ID for female
 *   narrator?: string // Voice ID for narrator
 * }
 */
router.put('/voices', (req, res, next) => {
  try {
    const { male, female, narrator } = req.body;
    const voiceMapping = getVoiceMapping();

    if (male) voiceMapping.setVoiceForRole('male', male);
    if (female) voiceMapping.setVoiceForRole('female', female);
    if (narrator) voiceMapping.setVoiceForRole('narrator', narrator);

    const mappings = voiceMapping.getAllMappings();

    res.json({
      success: true,
      message: 'Voice mapping updated',
      mappings: mappings
    });

  } catch (error) {
    console.error('[RoleDetection] Update voices error:', error);
    next(error);
  }
});

/**
 * POST /api/role-detection/detect-novel
 * Detect roles for all chapters in a novel (delegates to worker)
 * Phát hiện vai diễn cho tất cả chapters trong một novel (ủy thác cho worker)
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

    console.log(`[RoleDetection] API: Detecting roles for novel ${novelId}`);

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
      console.error(`[RoleDetection] Background novel detection error: ${error.message}`);
      // Update progress to failed
      GenerationProgressModel.update(progress.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date().toISOString()
      }).catch(updateError => {
        console.error(`[RoleDetection] Failed to update progress: ${updateError.message}`);
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
    console.error('[RoleDetection] API Error:', error);
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
    
    const worker = getRoleDetectionWorker();
    const status = await worker.getNovelRoleStatus(novelId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('[RoleDetection] Novel status error:', error);
    next(error);
  }
});

export default router;

