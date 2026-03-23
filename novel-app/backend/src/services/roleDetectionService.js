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
   * @param {number} options.maxBatchSize - Maximum paragraphs per batch (default: 100)
   * @returns {Promise<Object>} Result with role_map and optionally voice_map
   */
  async detectRoles(paragraphs, options = {}) {
    const {
      chapterContext = '',
      returnVoiceIds = true,
      maxBatchSize = 50  // Process max 50 paragraphs per batch to avoid truncation (reduced from 100)
    } = options;

    if (!paragraphs || paragraphs.length === 0) {
      return {
        role_map: {},
        voice_map: {}
      };
    }

    // Step 1: Detect roles (with batching for large chapters)
    let roleMap = {};
    
    // If chapter is too large, split into batches
    // Nếu chapter quá lớn, chia thành các batch
    if (paragraphs.length > maxBatchSize) {
      console.log(`[RoleDetectionService] Large chapter detected (${paragraphs.length} paragraphs). Splitting into batches of ${maxBatchSize}...`);
      console.log(`[RoleDetectionService] Phát hiện chapter lớn (${paragraphs.length} paragraphs). Chia thành các batch ${maxBatchSize} paragraphs...`);
      
      const numBatches = Math.ceil(paragraphs.length / maxBatchSize);
      
      for (let batchNum = 0; batchNum < numBatches; batchNum++) {
        const startIdx = batchNum * maxBatchSize;
        const endIdx = Math.min(startIdx + maxBatchSize, paragraphs.length);
        const batchParagraphs = paragraphs.slice(startIdx, endIdx);
        
        console.log(`[RoleDetectionService] Processing batch ${batchNum + 1}/${numBatches} (paragraphs ${startIdx + 1}-${endIdx}, indices ${startIdx}-${endIdx - 1})...`);
        console.log(`[RoleDetectionService] Xử lý batch ${batchNum + 1}/${numBatches} (paragraphs ${startIdx + 1}-${endIdx}, indices ${startIdx}-${endIdx - 1})...`);
        
        try {
          // Use full chapter context for all batches (helps with consistency)
          // Sử dụng toàn bộ context chapter cho tất cả batches (giúp nhất quán)
          const batchRoleMap = await this._detectRolesBatch(batchParagraphs, chapterContext, options);
          
          // Map batch indices (0-based within batch) to global indices (0-based in full paragraphs array)
          // Map các chỉ số batch (0-based trong batch) sang chỉ số global (0-based trong mảng paragraphs đầy đủ)
          for (const [batchIdxStr, role] of Object.entries(batchRoleMap)) {
            const batchIdx = parseInt(batchIdxStr);
            const globalIdx = startIdx + batchIdx;
            roleMap[globalIdx] = role;
          }
          
          const detectedCount = Object.keys(batchRoleMap).length;
          console.log(`[RoleDetectionService] ✅ Batch ${batchNum + 1}/${numBatches} completed (${detectedCount}/${batchParagraphs.length} roles detected)`);
          
          // Small delay between batches to avoid overwhelming Ollama
          // Đợi một chút giữa các batch để tránh quá tải Ollama
          if (batchNum < numBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`[RoleDetectionService] ❌ Batch ${batchNum + 1}/${numBatches} failed: ${error.message}`);
          // Fill missing batch with narrator (fallback)
          // Điền batch thiếu bằng narrator (fallback)
          for (let i = startIdx; i < endIdx; i++) {
            if (!(i in roleMap)) {
              roleMap[i] = 'narrator';
            }
          }
        }
      }
      
      const totalDetected = Object.keys(roleMap).length;
      console.log(`[RoleDetectionService] ✅ All batches completed. Total roles detected: ${totalDetected}/${paragraphs.length}`);
      if (totalDetected < paragraphs.length) {
        console.warn(`[RoleDetectionService] ⚠️ Missing ${paragraphs.length - totalDetected} paragraph roles (filled with narrator)`);
      }
    } else {
      // Small chapter - process all at once
      // Chapter nhỏ - xử lý tất cả cùng lúc
      console.log(`[RoleDetectionService] Processing ${paragraphs.length} paragraphs in single batch...`);
      roleMap = await this._detectRolesBatch(paragraphs, chapterContext, options);
    }

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
   * @param {Object} options - Detection options (maxMaleCharacters, maxFemaleCharacters)
   * @returns {Promise<Object>} Role map {index: role}
   */
  async _detectRolesBatch(paragraphs, chapterContext = '', options = {}) {
    const prompt = this._buildClassificationPrompt(paragraphs, chapterContext, options);

    try {
      if (!this.model) {
        throw new Error('Model name is required');
      }
      // Calculate maxTokens based on number of paragraphs
      // Each paragraph output is ~30-40 tokens (e.g., "1": "narrator",) including quotes and structure
      // Plus prompt overhead, safety margin
      // Estimate: ~50 tokens per paragraph + 3000 buffer for JSON structure and prompt
      // More conservative estimate to prevent truncation
      const estimatedResponseTokens = paragraphs.length * 60 + 3000; // Increased per-paragraph estimate and buffer
      const maxTokens = Math.min(16384, Math.max(4000, estimatedResponseTokens)); // Min 4000, Max 16384 (increased limit)
      
      // Add retry logic for incomplete JSON responses
      const maxRetries = 3;
      let lastError = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await this.ollama.generateJSON(prompt, {
            model: this.model,
            temperature: 0.1, // Low temperature for consistent classification
            maxTokens: attempt === maxRetries ? Math.min(16384, maxTokens * 1.5) : maxTokens // Increase tokens on last retry (up to 16384)
          });

          // Parse response
          const roleMap = this._parseRoleResponse(response, paragraphs.length);
          
          // Verify we got responses for all paragraphs
          const missingCount = paragraphs.length - Object.keys(roleMap).length;
          if (missingCount > 0 && attempt < maxRetries) {
            console.warn(`[RoleDetectionService] Missing ${missingCount} paragraph responses, retrying... (attempt ${attempt}/${maxRetries})`);
            lastError = new Error(`Incomplete response: ${missingCount} paragraphs missing`);
            continue; // Retry
          }
          
          return roleMap;
        } catch (error) {
          lastError = error;
          console.warn(`[RoleDetectionService] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
          
          // Check if it's a JSON parse error (truncated response)
          if (error.message.includes('JSON') || error.message.includes('parse')) {
            if (attempt < maxRetries) {
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }
          }
          
          // If not a parse error or last attempt, throw immediately
          if (attempt === maxRetries || !error.message.includes('JSON')) {
            throw error;
          }
        }
      }
      
      // If we exhausted retries, throw last error
      throw lastError;
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
   * @param {Object} options - Options (maxMaleCharacters, maxFemaleCharacters)
   * @returns {string} Prompt text
   */
  _buildClassificationPrompt(paragraphs, chapterContext = '', options = {}) {
    // Truncate paragraphs for prompt (keep first 200 chars each)
    const paragraphsText = paragraphs.map((para, idx) => {
      const truncated = para.length > 200 ? para.substring(0, 200) + '...' : para;
      return `${idx + 1}. ${truncated}`;
    }).join('\n');

    const contextText = chapterContext.length > 3000 
      ? chapterContext.substring(0, 3000) + '...' 
      : chapterContext;

    // Build dynamic role list based on max characters
    // Xây dựng danh sách vai diễn động dựa trên số nhân vật tối đa
    const maxMaleCharacters = options?.maxMaleCharacters || 10;
    const maxFemaleCharacters = options?.maxFemaleCharacters || 10;
    
    const roles = ['narrator'];
    for (let i = 1; i <= maxMaleCharacters; i++) {
      roles.push(`male_${i}`);
    }
    for (let i = 1; i <= maxFemaleCharacters; i++) {
      roles.push(`female_${i}`);
    }
    
    const rolesList = roles.join(', ');
    
    return `Bạn là hệ thống phân loại vai diễn cho tiểu thuyết.

Nhiệm vụ: Phân loại mỗi đoạn văn sau thành một trong các loại sau:
- narrator: Văn bản dẫn chuyện, mô tả, tường thuật của tác giả (không có đối thoại trực tiếp)
- male_1, male_2, male_3, ...: Lời nói, suy nghĩ, hoặc hành động của nhân vật nam (phân biệt các nhân vật nam khác nhau)
- female_1, female_2, female_3, ...: Lời nói, suy nghĩ, hoặc hành động của nhân vật nữ (phân biệt các nhân vật nữ khác nhau)

Các vai diễn có sẵn: ${rolesList}

Ngữ cảnh chapter (để tham khảo, phân tích xem ai đang nói):
${contextText || 'Không có ngữ cảnh'}

Danh sách đoạn văn cần phân loại (mỗi đoạn trên một dòng, đánh số):
${paragraphsText}

Yêu cầu:
1. Phân tích từng đoạn văn dựa trên ngữ cảnh
2. Xác định xem đoạn văn là dẫn chuyện hay lời/suy nghĩ/hành động nhân vật
3. Nếu là nhân vật, xác định giới tính (nam/nữ) và phân biệt các nhân vật khác nhau:
   - Nhân vật nam đầu tiên → male_1
   - Nhân vật nam thứ hai → male_2
   - Nhân vật nữ đầu tiên → female_1
   - Nhân vật nữ thứ hai → female_2
   - (và tiếp tục cho các nhân vật tiếp theo)
4. Giữ tính nhất quán: cùng một nhân vật trong chapter phải có cùng vai diễn (ví dụ: cùng là male_1)
5. Trả lời DẠNG JSON duy nhất, không có giải thích thêm

Định dạng trả lời (JSON):
{"1": "narrator", "2": "male_1", "3": "female_1", "4": "male_2", "5": "narrator", ...}

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
        // Accept narrator, male, female (backward compatibility), and male_1, male_2, etc.
        // Chấp nhận narrator, male, female (tương thích ngược), và male_1, male_2, etc.
        if (role === 'narrator' || 
            role === 'male' || role === 'female' ||
            role.match(/^male_\d+$/) || role.match(/^female_\d+$/)) {
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

