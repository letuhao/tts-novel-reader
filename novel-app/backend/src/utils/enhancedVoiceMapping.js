/**
 * Enhanced Voice Mapping - Flexible role-based voice assignment
 * Ánh Xạ Giọng Nâng Cao - Gán giọng linh hoạt dựa trên vai diễn
 * 
 * Supports:
 * - Multiple characters per gender (male_1, male_2, female_1, etc.)
 * - Per-model voice configuration
 * - Per-novel voice overrides
 * - Automatic round-robin voice assignment
 * - Voice reuse when TTS model has fewer voices than needed
 */

/**
 * Default voice mappings per TTS model
 * Ánh xạ giọng mặc định cho mỗi model TTS
 */
const DEFAULT_MODEL_MAPPINGS = {
  'viettts': {
    'narrator': 'quynh',
    'male_1': 'cdteam',
    'male_2': 'nguyen-ngoc-ngan',
    'male_3': 'nsnd-le-chuc',
    'male_4': 'son-tung-mtp',
    'male_5': 'doremon',
    'female_1': 'nu-nhe-nhang',
    'female_2': 'diep-chi',
    'female_3': 'quynh',  // Reuse narrator voice if needed
    'female_4': 'nu-nhe-nhang',  // Reuse
    'female_5': 'diep-chi'  // Reuse
  },
  'vieneu-tts': {
    'narrator': 'id_0004',
    'male_1': 'id_0007',
    'male_2': 'id_0001',
    'male_3': 'id_0003',
    'male_4': 'id_0005',
    'male_5': 'id_0007',  // Reuse
    'female_1': 'id_0004',
    'female_2': 'id_0002',
    'female_3': 'id_0004',  // Reuse
    'female_4': 'id_0002',  // Reuse
    'female_5': 'id_0004'  // Reuse
  },
  'coqui-xtts-v2': {
    'narrator': 'Claribel Dervla',
    // Male voices (using diverse Coqui speakers)
    'male_1': 'Andrew Chipper',
    'male_2': 'Craig Gutsy',
    'male_3': 'Damien Black',
    'male_4': 'Badr Odhiambo',
    'male_5': 'Dionisio Schuyler',
    'male_6': 'Royston Min',
    'male_7': 'Viktor Eka',
    'male_8': 'Abrahan Mack',
    'male_9': 'Adde Michal',
    'male_10': 'Baldur Sanjin',
    // Female voices (using diverse Coqui speakers)
    'female_1': 'Daisy Studious',
    'female_2': 'Gracie Wise',
    'female_3': 'Ana Florence',
    'female_4': 'Tammie Ema',
    'female_5': 'Alison Dietlinde',
    'female_6': 'Annmarie Nele',
    'female_7': 'Asya Anara',
    'female_8': 'Brenda Stern',
    'female_9': 'Gitta Nikolina',
    'female_10': 'Henriette Usha'
  }
};

/**
 * Available voices per model (for round-robin assignment)
 * Giọng có sẵn cho mỗi model (để gán round-robin)
 */
const AVAILABLE_VOICES = {
  'viettts': {
    male: ['cdteam', 'nguyen-ngoc-ngan', 'nsnd-le-chuc', 'son-tung-mtp', 'doremon'],
    female: ['nu-nhe-nhang', 'diep-chi', 'quynh'],
    narrator: ['quynh']
  },
  'vieneu-tts': {
    male: ['id_0007', 'id_0001', 'id_0003', 'id_0005'],
    female: ['id_0004', 'id_0002'],
    narrator: ['id_0004']
  },
  'coqui-xtts-v2': {
    male: [
      'Andrew Chipper', 'Craig Gutsy', 'Damien Black', 'Badr Odhiambo',
      'Dionisio Schuyler', 'Royston Min', 'Viktor Eka', 'Abrahan Mack',
      'Adde Michal', 'Baldur Sanjin', 'Gilberto Mathias', 'Ilkin Urbano',
      'Kazuhiko Atallah', 'Ludvig Milivoj', 'Suad Qasim', 'Torcull Diarmuid',
      'Viktor Menelaos', 'Zacharie Aimilios', 'Filip Traverse', 'Damjan Chapman',
      'Wulf Carlevaro', 'Aaron Dreschner', 'Kumar Dahl', 'Eugenio Mataracı',
      'Ferran Simen', 'Xavier Hayasaka', 'Luis Moray', 'Marcos Rudaski'
    ],
    female: [
      'Claribel Dervla', 'Daisy Studious', 'Gracie Wise', 'Tammie Ema',
      'Alison Dietlinde', 'Ana Florence', 'Annmarie Nele', 'Asya Anara',
      'Brenda Stern', 'Gitta Nikolina', 'Henriette Usha', 'Sofia Hellen',
      'Tammy Grit', 'Tanja Adelina', 'Vjollca Johnnie', 'Nova Hogarth',
      'Maja Ruoho', 'Uta Obando', 'Lidiya Szekeres', 'Chandra MacFarland',
      'Szofi Granger', 'Camilla Holmström', 'Lilya Stainthorpe', 'Zofija Kendrick',
      'Narelle Moon', 'Barbora MacLean', 'Alexandra Hisakawa', 'Alma María',
      'Rosemary Okafor', 'Ige Behringer'
    ],
    narrator: ['Claribel Dervla', 'Daisy Studious', 'Gracie Wise']
  }
};

export class EnhancedVoiceMapping {
  constructor() {
    // Default mappings per model
    this.modelMappings = JSON.parse(JSON.stringify(DEFAULT_MODEL_MAPPINGS));
    
    // Novel-specific overrides (loaded from database)
    // Format: { novelId: { model: { role: voiceId } } }
    this.novelMappings = {};
    
    // Voice assignment strategy: 'round-robin' or 'manual'
    this.assignmentStrategy = 'round-robin';
  }
  
  /**
   * Normalize role for backward compatibility
   * Chuẩn hóa vai diễn để tương thích ngược
   * 
   * @param {string} role - Role (male, female, narrator, male_1, etc.)
   * @returns {string} Normalized role
   */
  normalizeRole(role) {
    if (!role) return 'narrator';
    
    const normalized = String(role).toLowerCase().trim();
    
    // Backward compatibility: male → male_1, female → female_1
    if (normalized === 'male') return 'male_1';
    if (normalized === 'female') return 'female_1';
    
    return normalized;
  }
  
  /**
   * Get voice for role and model (with automatic assignment if needed)
   * Lấy giọng cho vai diễn và model (với gán tự động nếu cần)
   * 
   * @param {string} role - Role (male_1, female_1, narrator, etc.)
   * @param {string} model - TTS model name
   * @param {string} novelId - Novel ID (optional, for per-novel mapping)
   * @returns {Promise<string>|string} Voice ID (async if novelId provided, sync otherwise)
   */
  async getVoiceForRole(role, model, novelId = null) {
    const normalizedRole = this.normalizeRole(role);
    
    // Load novel-specific mapping if novelId provided
    if (novelId) {
      await this._loadNovelMapping(novelId, model);
      await this._loadNovelStrategy(novelId);
      
      // Check novel-specific mapping first
      if (this.novelMappings[novelId]?.[model]?.[normalizedRole]) {
        return this.novelMappings[novelId][model][normalizedRole];
      }
      
      // Use novel-specific strategy
      const novelStrategy = this.novelStrategies[novelId] || 'round-robin';
      if (novelStrategy === 'round-robin') {
        return this._assignVoiceAutomatically(normalizedRole, model);
      }
    }
    
    // Check default model mapping
    const modelMapping = this.modelMappings[model];
    if (modelMapping && modelMapping[normalizedRole]) {
      return modelMapping[normalizedRole];
    }
    
    // Automatic assignment: round-robin from available voices
    if (this.assignmentStrategy === 'round-robin') {
      return this._assignVoiceAutomatically(normalizedRole, model);
    }
    
    // Fallback to narrator
    return modelMapping?.narrator || this._getDefaultVoice(model);
  }
  
  /**
   * Get voice for role and model (synchronous version, for backward compatibility)
   * Lấy giọng cho vai diễn và model (phiên bản đồng bộ, để tương thích ngược)
   * 
   * @param {string} role - Role (male_1, female_1, narrator, etc.)
   * @param {string} model - TTS model name
   * @param {string} novelId - Novel ID (optional, for per-novel mapping)
   * @returns {string} Voice ID
   */
  getVoiceForRoleSync(role, model, novelId = null) {
    const normalizedRole = this.normalizeRole(role);
    
    // Check novel-specific mapping (if already loaded)
    if (novelId && this.novelMappings[novelId]?.[model]?.[normalizedRole]) {
      return this.novelMappings[novelId][model][normalizedRole];
    }
    
    // Check default model mapping
    const modelMapping = this.modelMappings[model];
    if (modelMapping && modelMapping[normalizedRole]) {
      return modelMapping[normalizedRole];
    }
    
    // Automatic assignment: round-robin from available voices
    const strategy = novelId ? (this.novelStrategies[novelId] || 'round-robin') : this.assignmentStrategy;
    if (strategy === 'round-robin') {
      return this._assignVoiceAutomatically(normalizedRole, model);
    }
    
    // Fallback to narrator
    return modelMapping?.narrator || this._getDefaultVoice(model);
  }
  
  /**
   * Automatically assign voice using round-robin
   * Tự động gán giọng sử dụng round-robin
   * 
   * @param {string} role - Normalized role
   * @param {string} model - TTS model name
   * @returns {string} Assigned voice ID
   */
  _assignVoiceAutomatically(role, model) {
    const availableVoices = AVAILABLE_VOICES[model];
    if (!availableVoices) {
      return this._getDefaultVoice(model);
    }
    
    // Determine voice pool based on role
    let voicePool = [];
    if (role === 'narrator') {
      voicePool = availableVoices.narrator || availableVoices.female || [];
    } else if (role.startsWith('male_')) {
      voicePool = availableVoices.male || [];
    } else if (role.startsWith('female_')) {
      voicePool = availableVoices.female || [];
    } else {
      // Unknown role, use narrator pool
      voicePool = availableVoices.narrator || availableVoices.female || [];
    }
    
    if (voicePool.length === 0) {
      return this._getDefaultVoice(model);
    }
    
    // Extract number from role (e.g., male_3 → 3)
    const match = role.match(/(male|female)_(\d+)/);
    if (match) {
      const index = parseInt(match[2]) - 1; // Convert to 0-based
      // Use modulo to reuse voices if needed
      return voicePool[index % voicePool.length];
    }
    
    // For narrator or unknown roles, use first available
    return voicePool[0];
  }
  
  /**
   * Get default voice for a model
   * Lấy giọng mặc định cho một model
   * 
   * @param {string} model - TTS model name
   * @returns {string} Default voice ID
   */
  _getDefaultVoice(model) {
    const modelMapping = this.modelMappings[model];
    if (modelMapping && modelMapping.narrator) {
      return modelMapping.narrator;
    }
    
    // Fallback defaults
    const fallbacks = {
      'viettts': 'quynh',
      'vieneu-tts': 'id_0004',
      'coqui-xtts-v2': 'Claribel Dervla'
    };
    
    return fallbacks[model] || 'narrator';
  }
  
  /**
   * Set novel-specific voice mapping
   * Đặt ánh xạ giọng cụ thể cho novel
   * 
   * @param {string} novelId - Novel ID
   * @param {string} model - TTS model name
   * @param {string} role - Role
   * @param {string} voiceId - Voice ID
   */
  setNovelMapping(novelId, model, role, voiceId) {
    if (!this.novelMappings[novelId]) {
      this.novelMappings[novelId] = {};
    }
    if (!this.novelMappings[novelId][model]) {
      this.novelMappings[novelId][model] = {};
    }
    
    const normalizedRole = this.normalizeRole(role);
    this.novelMappings[novelId][model][normalizedRole] = voiceId;
  }
  
  /**
   * Get novel-specific voice mapping
   * Lấy ánh xạ giọng cụ thể cho novel
   * 
   * @param {string} novelId - Novel ID
   * @param {string} model - TTS model name
   * @returns {Object} Voice mapping object
   */
  getNovelMapping(novelId, model) {
    return this.novelMappings[novelId]?.[model] || {};
  }
  
  /**
   * Clear novel-specific mapping
   * Xóa ánh xạ cụ thể cho novel
   * 
   * @param {string} novelId - Novel ID
   * @param {string} model - TTS model name (optional, clears all if not provided)
   */
  clearNovelMapping(novelId, model = null) {
    if (!this.novelMappings[novelId]) return;
    
    if (model) {
      delete this.novelMappings[novelId][model];
    } else {
      delete this.novelMappings[novelId];
    }
  }
  
  /**
   * Get available voices for a model
   * Lấy giọng có sẵn cho một model
   * 
   * @param {string} model - TTS model name
   * @param {string} gender - 'male', 'female', 'narrator', or 'all'
   * @returns {Array<string>} List of available voice IDs
   */
  getAvailableVoices(model, gender = 'all') {
    const available = AVAILABLE_VOICES[model];
    if (!available) return [];
    
    if (gender === 'all') {
      return [
        ...(available.narrator || []),
        ...(available.male || []),
        ...(available.female || [])
      ];
    }
    
    if (gender === 'narrator') {
      return available.narrator || available.female || [];
    }
    
    return available[gender] || [];
  }
  
  /**
   * Get all mappings for a model
   * Lấy tất cả ánh xạ cho một model
   * 
   * @param {string} model - TTS model name
   * @returns {Object} Mapping object
   */
  getAllMappings(model) {
    return this.modelMappings[model] || {};
  }
  
  /**
   * Set assignment strategy
   * Đặt chiến lược gán giọng
   * 
   * @param {string} strategy - 'round-robin' or 'manual'
   */
  setAssignmentStrategy(strategy) {
    if (['round-robin', 'manual'].includes(strategy)) {
      this.assignmentStrategy = strategy;
    }
  }
  
  /**
   * Get assignment strategy
   * Lấy chiến lược gán giọng
   * 
   * @returns {string} Strategy name
   */
  getAssignmentStrategy() {
    return this.assignmentStrategy;
  }
}

// Singleton instance
let enhancedVoiceMappingInstance = null;

/**
 * Get singleton enhanced voice mapping instance
 * Lấy instance enhanced voice mapping đơn
 * 
 * @returns {EnhancedVoiceMapping} Mapping instance
 */
export function getEnhancedVoiceMapping() {
  if (!enhancedVoiceMappingInstance) {
    enhancedVoiceMappingInstance = new EnhancedVoiceMapping();
  }
  return enhancedVoiceMappingInstance;
}

