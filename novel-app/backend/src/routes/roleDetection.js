/**
 * Role Detection Routes
 * Routes cho Phát hiện Vai diễn
 */
import express from 'express';
import { getRoleDetectionService } from '../services/roleDetectionService.js';
import { getVoiceMapping } from '../utils/voiceMapping.js';

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

export default router;

