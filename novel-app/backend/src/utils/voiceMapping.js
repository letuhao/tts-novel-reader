/**
 * Voice Mapping - Map roles to voice IDs for TTS
 * Voice Mapping - Map vai diễn sang voice IDs cho TTS
 */

// Default voice mapping based on role
// Mapping giọng mặc định dựa trên vai diễn
const DEFAULT_VOICE_MAPPING = {
  male: 'cdteam',
  female: 'nu-nhe-nhang',
  narrator: 'quynh'
};

export class VoiceMapping {
  constructor() {
    this.mapping = { ...DEFAULT_VOICE_MAPPING };
  }

  /**
   * Get voice ID for a role
   * Lấy voice ID cho một vai diễn
   * 
   * @param {string} role - Role (male/female/narrator)
   * @returns {string} Voice ID
   */
  getVoiceForRole(role) {
    const normalizedRole = String(role).toLowerCase().trim();
    return this.mapping[normalizedRole] || this.mapping.narrator;
  }

  /**
   * Set custom voice mapping
   * Đặt mapping giọng tùy chỉnh
   * 
   * @param {string} role - Role (male/female/narrator)
   * @param {string} voiceId - Voice ID
   */
  setVoiceForRole(role, voiceId) {
    const normalizedRole = String(role).toLowerCase().trim();
    if (['male', 'female', 'narrator'].includes(normalizedRole)) {
      this.mapping[normalizedRole] = voiceId;
    }
  }

  /**
   * Get all mappings
   * Lấy tất cả mappings
   * 
   * @returns {Object} Mapping object
   */
  getAllMappings() {
    return { ...this.mapping };
  }

  /**
   * Reset to default mappings
   * Đặt lại về mappings mặc định
   */
  reset() {
    this.mapping = { ...DEFAULT_VOICE_MAPPING };
  }
}

// Singleton instance / Instance đơn
let voiceMappingInstance = null;

/**
 * Get singleton voice mapping instance
 * Lấy instance voice mapping đơn
 * 
 * @returns {VoiceMapping} Mapping instance
 */
export function getVoiceMapping() {
  if (!voiceMappingInstance) {
    voiceMappingInstance = new VoiceMapping();
  }
  return voiceMappingInstance;
}

