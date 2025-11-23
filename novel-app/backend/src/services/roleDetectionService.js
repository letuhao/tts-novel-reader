/**
 * Role Detection Service - Detect male/female/narrator roles using Ollama
 * Dịch vụ Phát hiện Vai diễn - Phát hiện vai diễn male/female/narrator sử dụng Ollama
 */
import { getOllamaProvider } from './ollamaProvider.js';
import { getVoiceMapping } from '../utils/voiceMapping.js';

export class RoleDetectionService {
  /**
   * Initialize role detection service
   * Khởi tạo dịch vụ phát hiện vai diễn
   * 
   * @param {string} model - Ollama model name (default: qwen3:8b)
   * @param {string} ollamaURL - Ollama base URL
   */
  constructor(model = 'qwen3:8b', ollamaURL = null) {
    this.model = model || process.env.OLLAMA_DEFAULT_MODEL || 'qwen3:8b';
    this.ollama = getOllamaProvider(ollamaURL, this.model);
    this.voiceMapping = getVoiceMapping();
  }

  /**
   * Detect roles for paragraphs
   * Phát hiện vai diễn cho các paragraphs
   * 
   * @param {Array<string>} paragraphs - Array of paragraph texts
   * @param {Object} options - Detection options
   * @param {string} options.chapterContext - Full chapter text for context
   * @param {boolean} options.returnVoiceIds - If true, also return voice IDs
   * @returns {Promise<Object>} Result with role_map and optionally voice_map
   */
  async detectRoles(paragraphs, options = {}) {
    const {
      chapterContext = '',
      returnVoiceIds = true
    } = options;

    if (!paragraphs || paragraphs.length === 0) {
      return {
        role_map: {},
        voice_map: {}
      };
    }

    // Step 1: Detect roles
    const roleMap = await this._detectRolesBatch(paragraphs, chapterContext);

    // Step 2: Map to voice IDs if requested
    let voiceMap = {};
    if (returnVoiceIds) {
      voiceMap = this._mapRolesToVoices(roleMap);
    }

    return {
      role_map: roleMap,
      voice_map: voiceMap
    };
  }

  /**
   * Detect roles using Ollama
   * Phát hiện vai diễn sử dụng Ollama
   * 
   * @param {Array<string>} paragraphs - Paragraph texts
   * @param {string} chapterContext - Full chapter context
   * @returns {Promise<Object>} Role map {index: role}
   */
  async _detectRolesBatch(paragraphs, chapterContext = '') {
    const prompt = this._buildClassificationPrompt(paragraphs, chapterContext);

    try {
      if (!this.model) {
        throw new Error('Model name is required');
      }
      // Calculate maxTokens based on number of paragraphs
      // Each paragraph output is ~30-40 tokens (e.g., "1": "narrator",) including quotes and structure
      // Plus prompt overhead, safety margin
      // Estimate: ~40 tokens per paragraph + 1000 buffer for JSON structure and prompt
      const estimatedResponseTokens = paragraphs.length * 40 + 1000; // More conservative estimate
      const maxTokens = Math.min(32000, Math.max(4000, estimatedResponseTokens)); // Min 4000, Max 32000 (allow for very large chapters)
      
      const response = await this.ollama.generateJSON(prompt, {
        model: this.model,
        temperature: 0.1, // Low temperature for consistent classification
        maxTokens: maxTokens
      });

      // Parse response
      const roleMap = this._parseRoleResponse(response, paragraphs.length);
      return roleMap;
    } catch (error) {
      console.error('[RoleDetectionService] Error detecting roles:', error.message);
      
      // Fallback: return all narrator
      const fallback = {};
      for (let i = 0; i < paragraphs.length; i++) {
        fallback[i] = 'narrator';
      }
      return fallback;
    }
  }

  /**
   * Build classification prompt for Ollama
   * Xây dựng prompt classification cho Ollama
   * 
   * @param {Array<string>} paragraphs - Paragraph texts
   * @param {string} chapterContext - Chapter context
   * @returns {string} Prompt text
   */
  _buildClassificationPrompt(paragraphs, chapterContext = '') {
    // Truncate paragraphs for prompt (keep first 200 chars each)
    const paragraphsText = paragraphs.map((para, idx) => {
      const truncated = para.length > 200 ? para.substring(0, 200) + '...' : para;
      return `${idx + 1}. ${truncated}`;
    }).join('\n');

    const contextText = chapterContext.length > 3000 
      ? chapterContext.substring(0, 3000) + '...' 
      : chapterContext;

    return `Bạn là hệ thống phân loại vai diễn cho tiểu thuyết tiếng Việt.

Nhiệm vụ: Phân loại mỗi đoạn văn sau thành một trong ba loại:
- narrator: Văn bản dẫn chuyện, mô tả, tường thuật của tác giả (không có đối thoại trực tiếp)
- male: Lời nói, suy nghĩ, hoặc hành động của nhân vật nam
- female: Lời nói, suy nghĩ, hoặc hành động của nhân vật nữ

Ngữ cảnh chapter (để tham khảo, phân tích xem ai đang nói):
${contextText || 'Không có ngữ cảnh'}

Danh sách đoạn văn cần phân loại (mỗi đoạn trên một dòng, đánh số):
${paragraphsText}

Yêu cầu:
1. Phân tích từng đoạn văn dựa trên ngữ cảnh
2. Xác định xem đoạn văn là dẫn chuyện hay lời/suy nghĩ/hành động nhân vật
3. Nếu là nhân vật, xác định giới tính (nam/nữ) từ ngữ cảnh, đại từ, tên nhân vật
4. Trả lời DẠNG JSON duy nhất, không có giải thích thêm

Định dạng trả lời (JSON):
{"1": "narrator", "2": "male", "3": "female", "4": "narrator", ...}

Chỉ trả lời JSON, không có văn bản khác.`;
  }

  /**
   * Parse role response from Ollama
   * Parse response vai diễn từ Ollama
   * 
   * @param {Object} response - JSON response from Ollama
   * @param {number} numParagraphs - Number of paragraphs
   * @returns {Object} Role map {index: role}
   */
  _parseRoleResponse(response, numParagraphs) {
    const roleMap = {};

    // Response should be like {"1": "narrator", "2": "male", ...}
    for (const [key, value] of Object.entries(response)) {
      try {
        const idx = parseInt(key) - 1; // Convert 1-based to 0-based
        if (idx >= 0 && idx < numParagraphs) {
          const role = String(value).toLowerCase().trim();
          if (['narrator', 'male', 'female'].includes(role)) {
            roleMap[idx] = role;
          } else {
            roleMap[idx] = 'narrator'; // Default fallback
          }
        }
      } catch (error) {
        // Skip invalid entries
        continue;
      }
    }

    // Fill missing indices with narrator
    for (let i = 0; i < numParagraphs; i++) {
      if (!(i in roleMap)) {
        roleMap[i] = 'narrator';
      }
    }

    return roleMap;
  }

  /**
   * Map roles to voice IDs
   * Map vai diễn sang voice IDs
   * 
   * @param {Object} roleMap - Role map {index: role}
   * @returns {Object} Voice map {index: voiceId}
   */
  _mapRolesToVoices(roleMap) {
    const voiceMap = {};
    for (const [idx, role] of Object.entries(roleMap)) {
      voiceMap[idx] = this.voiceMapping.getVoiceForRole(role);
    }
    return voiceMap;
  }

  /**
   * Check if service is available
   * Kiểm tra dịch vụ có sẵn không
   * 
   * @returns {Promise<boolean>} True if available
   */
  async isAvailable() {
    try {
      const available = await this.ollama.isAvailable();
      if (!available) return false;
      return await this.ollama.isModelAvailable(this.model);
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance / Instance đơn
let roleDetectionServiceInstance = null;

/**
 * Get singleton role detection service instance
 * Lấy instance role detection service đơn
 * 
 * @param {string} model - Model name
 * @param {string} ollamaURL - Ollama URL
 * @returns {RoleDetectionService} Service instance
 */
export function getRoleDetectionService(model = null, ollamaURL = null) {
  if (!roleDetectionServiceInstance) {
    roleDetectionServiceInstance = new RoleDetectionService(model, ollamaURL);
  }
  return roleDetectionServiceInstance;
}

