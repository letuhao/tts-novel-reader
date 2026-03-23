/**
 * Enhanced Voice Mapping Routes
 * Routes cho Ánh Xạ Giọng Nâng Cao
 */
import express from 'express';
import { getEnhancedVoiceMapping } from '../utils/enhancedVoiceMapping.js';
import { NovelVoiceMappingModel } from '../models/NovelVoiceMapping.js';
import { NovelModel } from '../models/Novel.js';
import { getBackendConfig, TTS_BACKENDS } from '../config/ttsConfig.js';

const router = express.Router();

/**
 * GET /api/voice-mapping/models
 * Get all available TTS models
 * Lấy tất cả TTS models có sẵn
 */
router.get('/models', (req, res, next) => {
  try {
    const models = Object.values(TTS_BACKENDS).map(backend => ({
      name: backend.name,
      displayName: backend.displayName,
      model: backend.model,
      baseURL: backend.baseURL,
      defaultVoice: backend.defaultVoice
    }));

    res.json({
      success: true,
      models: models,
      count: models.length
    });
  } catch (error) {
    console.error('[VoiceMapping] Get models error:', error);
    next(error);
  }
});

/**
 * GET /api/voice-mapping/voices/:model
 * Get available voices for a specific model
 * Lấy giọng có sẵn cho một model cụ thể
 * 
 * Query params:
 *   - gender: 'male', 'female', 'narrator', or 'all' (default: 'all')
 */
router.get('/voices/:model', (req, res, next) => {
  try {
    const { model } = req.params;
    const { gender = 'all' } = req.query;

    // Validate model
    const backendConfig = getBackendConfig(model);
    if (!backendConfig) {
      return res.status(400).json({
        success: false,
        error: `Unknown TTS model: ${model}`,
        availableModels: Object.keys(TTS_BACKENDS).map(k => TTS_BACKENDS[k].name)
      });
    }

    const mapping = getEnhancedVoiceMapping();
    const voices = mapping.getAvailableVoices(model, gender);

    res.json({
      success: true,
      model: model,
      gender: gender,
      voices: voices,
      count: voices.length
    });
  } catch (error) {
    console.error('[VoiceMapping] Get voices error:', error);
    next(error);
  }
});

/**
 * GET /api/voice-mapping/default/:model
 * Get default voice mappings for a model
 * Lấy ánh xạ giọng mặc định cho một model
 */
router.get('/default/:model', (req, res, next) => {
  try {
    const { model } = req.params;

    // Validate model
    const backendConfig = getBackendConfig(model);
    if (!backendConfig) {
      return res.status(400).json({
        success: false,
        error: `Unknown TTS model: ${model}`,
        availableModels: Object.keys(TTS_BACKENDS).map(k => TTS_BACKENDS[k].name)
      });
    }

    const mapping = getEnhancedVoiceMapping();
    const defaultMappings = mapping.getAllMappings(model);

    res.json({
      success: true,
      model: model,
      mappings: defaultMappings
    });
  } catch (error) {
    console.error('[VoiceMapping] Get default mappings error:', error);
    next(error);
  }
});

/**
 * GET /api/voice-mapping/novel/:novelId
 * Get voice mappings for a specific novel
 * Lấy ánh xạ giọng cho một novel cụ thể
 * 
 * Query params:
 *   - model: TTS model name (optional, returns all models if not specified)
 */
router.get('/novel/:novelId', async (req, res, next) => {
  try {
    const { novelId } = req.params;
    const { model } = req.query;

    // Validate novel exists
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }

    // Get novel-specific mappings
    const novelMappings = await NovelVoiceMappingModel.getByNovel(novelId, model || null);

    // Get default mappings for comparison
    const mapping = getEnhancedVoiceMapping();
    const defaultMappings = model 
      ? mapping.getAllMappings(model)
      : Object.keys(TTS_BACKENDS).reduce((acc, key) => {
          acc[TTS_BACKENDS[key].name] = mapping.getAllMappings(TTS_BACKENDS[key].name);
          return acc;
        }, {});

    res.json({
      success: true,
      novelId: novelId,
      novelTitle: novel.title,
      model: model || 'all',
      novelMappings: novelMappings,
      defaultMappings: defaultMappings,
      hasCustomMappings: Object.keys(novelMappings).length > 0
    });
  } catch (error) {
    console.error('[VoiceMapping] Get novel mappings error:', error);
    next(error);
  }
});

/**
 * PUT /api/voice-mapping/novel/:novelId
 * Set voice mappings for a specific novel
 * Đặt ánh xạ giọng cho một novel cụ thể
 * 
 * Body:
 * {
 *   model: string, // TTS model name (required)
 *   mappings: { // Voice mappings (required)
 *     narrator?: string,
 *     male_1?: string,
 *     male_2?: string,
 *     female_1?: string,
 *     female_2?: string,
 *     ... // Any role: voiceId pairs
 *   }
 * }
 */
router.put('/novel/:novelId', async (req, res, next) => {
  try {
    const { novelId } = req.params;
    const { model, mappings } = req.body;

    // Validate input
    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'model is required'
      });
    }

    if (!mappings || typeof mappings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'mappings is required and must be an object'
      });
    }

    // Validate model
    const backendConfig = getBackendConfig(model);
    if (!backendConfig) {
      return res.status(400).json({
        success: false,
        error: `Unknown TTS model: ${model}`,
        availableModels: Object.keys(TTS_BACKENDS).map(k => TTS_BACKENDS[k].name)
      });
    }

    // Validate novel exists
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }

    // Validate voices exist for the model
    const voiceMapping = getEnhancedVoiceMapping();
    const availableVoices = voiceMapping.getAvailableVoices(model, 'all');
    
    const invalidVoices = [];
    for (const [role, voiceId] of Object.entries(mappings)) {
      if (voiceId && !availableVoices.includes(voiceId)) {
        invalidVoices.push({ role, voiceId });
      }
    }

    if (invalidVoices.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid voices for this model',
        invalidVoices: invalidVoices,
        availableVoices: availableVoices
      });
    }

    // Save mappings
    await NovelVoiceMappingModel.setMappings(novelId, model, mappings);

    // Get updated mappings
    const updatedMappings = await NovelVoiceMappingModel.getByNovel(novelId, model);

    res.json({
      success: true,
      message: 'Voice mappings updated',
      novelId: novelId,
      model: model,
      mappings: updatedMappings
    });
  } catch (error) {
    console.error('[VoiceMapping] Set novel mappings error:', error);
    next(error);
  }
});

/**
 * DELETE /api/voice-mapping/novel/:novelId
 * Clear voice mappings for a specific novel
 * Xóa ánh xạ giọng cho một novel cụ thể
 * 
 * Query params:
 *   - model: TTS model name (optional, clears all models if not specified)
 */
router.delete('/novel/:novelId', async (req, res, next) => {
  try {
    const { novelId } = req.params;
    const { model } = req.query;

    // Validate novel exists
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }

    // Clear mappings
    await NovelVoiceMappingModel.clearMapping(novelId, model || null);

    res.json({
      success: true,
      message: model ? `Voice mappings cleared for model ${model}` : 'All voice mappings cleared',
      novelId: novelId,
      model: model || 'all'
    });
  } catch (error) {
    console.error('[VoiceMapping] Clear novel mappings error:', error);
    next(error);
  }
});

/**
 * GET /api/voice-mapping/novel/:novelId/strategy
 * Get assignment strategy for a novel
 * Lấy chiến lược gán giọng cho một novel
 */
router.get('/novel/:novelId/strategy', async (req, res, next) => {
  try {
    const { novelId } = req.params;

    // Validate novel exists
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }

    const strategy = await NovelVoiceMappingModel.getAssignmentStrategy(novelId);

    res.json({
      success: true,
      novelId: novelId,
      strategy: strategy,
      description: strategy === 'round-robin' 
        ? 'Automatically assign voices in round-robin fashion'
        : 'Manually assign voices based on novel-specific mappings'
    });
  } catch (error) {
    console.error('[VoiceMapping] Get strategy error:', error);
    next(error);
  }
});

/**
 * PUT /api/voice-mapping/novel/:novelId/strategy
 * Set assignment strategy for a novel
 * Đặt chiến lược gán giọng cho một novel
 * 
 * Body:
 * {
 *   strategy: 'round-robin' | 'manual'
 * }
 */
router.put('/novel/:novelId/strategy', async (req, res, next) => {
  try {
    const { novelId } = req.params;
    const { strategy } = req.body;

    // Validate input
    if (!strategy) {
      return res.status(400).json({
        success: false,
        error: 'strategy is required'
      });
    }

    if (!['round-robin', 'manual'].includes(strategy)) {
      return res.status(400).json({
        success: false,
        error: 'strategy must be either "round-robin" or "manual"'
      });
    }

    // Validate novel exists
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }

    // Set strategy
    await NovelVoiceMappingModel.setAssignmentStrategy(novelId, strategy);

    res.json({
      success: true,
      message: 'Assignment strategy updated',
      novelId: novelId,
      strategy: strategy
    });
  } catch (error) {
    console.error('[VoiceMapping] Set strategy error:', error);
    next(error);
  }
});

/**
 * POST /api/voice-mapping/resolve
 * Resolve voice for a role (useful for testing)
 * Giải quyết giọng cho một vai diễn (hữu ích cho testing)
 * 
 * Body:
 * {
 *   role: string, // Role (e.g., 'male_1', 'narrator', 'male')
 *   model: string, // TTS model name
 *   novelId?: string // Optional novel ID for novel-specific mapping
 * }
 */
router.post('/resolve', async (req, res, next) => {
  try {
    const { role, model, novelId } = req.body;

    // Validate input
    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'role is required'
      });
    }

    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'model is required'
      });
    }

    // Validate model
    const backendConfig = getBackendConfig(model);
    if (!backendConfig) {
      return res.status(400).json({
        success: false,
        error: `Unknown TTS model: ${model}`,
        availableModels: Object.keys(TTS_BACKENDS).map(k => TTS_BACKENDS[k].name)
      });
    }

    const mapping = getEnhancedVoiceMapping();
    const voice = mapping.getVoiceForRoleSync(role, model, novelId || null);

    // Check if novel-specific mapping exists
    let isNovelSpecific = false;
    if (novelId) {
      const novelMappings = await NovelVoiceMappingModel.getByNovel(novelId, model);
      isNovelSpecific = novelMappings[mapping.normalizeRole(role)] !== undefined;
    }

    res.json({
      success: true,
      role: role,
      normalizedRole: mapping.normalizeRole(role),
      model: model,
      novelId: novelId || null,
      voice: voice,
      isNovelSpecific: isNovelSpecific
    });
  } catch (error) {
    console.error('[VoiceMapping] Resolve voice error:', error);
    next(error);
  }
});

export default router;

