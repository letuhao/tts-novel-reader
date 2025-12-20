/**
 * Novel Voice Mapping Model - Store per-novel voice configurations
 * Mô hình Ánh Xạ Giọng Novel - Lưu cấu hình giọng cho mỗi novel
 */
import Database from '../database/db.js';

export class NovelVoiceMappingModel {
  /**
   * Get voice mapping for a novel
   * Lấy ánh xạ giọng cho một novel
   * 
   * @param {string} novelId - Novel ID
   * @param {string} model - TTS model name (optional)
   * @returns {Object} Voice mapping object
   */
  static async getByNovel(novelId, model = null) {
    const db = Database.getInstance();
    
    let query = `
      SELECT * FROM novel_voice_mappings 
      WHERE novel_id = ?
    `;
    const params = [novelId];
    
    if (model) {
      query += ` AND model = ?`;
      params.push(model);
    }
    
    const rows = db.prepare(query).all(...params);
    
    // Convert to mapping object: { model: { role: voiceId } }
    const mapping = {};
    for (const row of rows) {
      if (!mapping[row.model]) {
        mapping[row.model] = {};
      }
      mapping[row.model][row.role] = row.voice_id;
    }
    
    return model ? (mapping[model] || {}) : mapping;
  }
  
  /**
   * Set voice mapping for a novel
   * Đặt ánh xạ giọng cho một novel
   * 
   * @param {string} novelId - Novel ID
   * @param {string} model - TTS model name
   * @param {string} role - Role (narrator, male_1, female_1, etc.)
   * @param {string} voiceId - Voice ID
   */
  static async setMapping(novelId, model, role, voiceId) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    // Check if mapping exists
    const existing = db.prepare(`
      SELECT id FROM novel_voice_mappings 
      WHERE novel_id = ? AND model = ? AND role = ?
    `).get(novelId, model, role);
    
    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE novel_voice_mappings 
        SET voice_id = ?, updated_at = ?
        WHERE id = ?
      `).run(voiceId, now, existing.id);
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO novel_voice_mappings (novel_id, model, role, voice_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(novelId, model, role, voiceId, now, now);
    }
  }
  
  /**
   * Set multiple voice mappings for a novel
   * Đặt nhiều ánh xạ giọng cho một novel
   * 
   * @param {string} novelId - Novel ID
   * @param {string} model - TTS model name
   * @param {Object} mappings - Mapping object { role: voiceId }
   */
  static async setMappings(novelId, model, mappings) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    // Use transaction for atomicity
    const transaction = db.transaction((mappings) => {
      for (const [role, voiceId] of Object.entries(mappings)) {
        // Check if mapping exists
        const existing = db.prepare(`
          SELECT id FROM novel_voice_mappings 
          WHERE novel_id = ? AND model = ? AND role = ?
        `).get(novelId, model, role);
        
        if (existing) {
          // Update existing
          db.prepare(`
            UPDATE novel_voice_mappings 
            SET voice_id = ?, updated_at = ?
            WHERE id = ?
          `).run(voiceId, now, existing.id);
        } else {
          // Insert new
          db.prepare(`
            INSERT INTO novel_voice_mappings (novel_id, model, role, voice_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(novelId, model, role, voiceId, now, now);
        }
      }
    });
    
    transaction(mappings);
  }
  
  /**
   * Clear voice mapping for a novel
   * Xóa ánh xạ giọng cho một novel
   * 
   * @param {string} novelId - Novel ID
   * @param {string} model - TTS model name (optional, clears all if not provided)
   */
  static async clearMapping(novelId, model = null) {
    const db = Database.getInstance();
    
    if (model) {
      db.prepare(`
        DELETE FROM novel_voice_mappings 
        WHERE novel_id = ? AND model = ?
      `).run(novelId, model);
    } else {
      db.prepare(`
        DELETE FROM novel_voice_mappings 
        WHERE novel_id = ?
      `).run(novelId);
    }
  }
  
  /**
   * Get assignment strategy for a novel
   * Lấy chiến lược gán giọng cho một novel
   * 
   * @param {string} novelId - Novel ID
   * @returns {string} Strategy ('round-robin' or 'manual')
   */
  static async getAssignmentStrategy(novelId) {
    const db = Database.getInstance();
    
    const row = db.prepare(`
      SELECT assignment_strategy FROM novel_voice_configs
      WHERE novel_id = ?
    `).get(novelId);
    
    return row?.assignment_strategy || 'round-robin';
  }
  
  /**
   * Set assignment strategy for a novel
   * Đặt chiến lược gán giọng cho một novel
   * 
   * @param {string} novelId - Novel ID
   * @param {string} strategy - Strategy ('round-robin' or 'manual')
   */
  static async setAssignmentStrategy(novelId, strategy) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    if (!['round-robin', 'manual'].includes(strategy)) {
      throw new Error(`Invalid strategy: ${strategy}. Must be 'round-robin' or 'manual'`);
    }
    
    // Check if config exists
    const existing = db.prepare(`
      SELECT id FROM novel_voice_configs WHERE novel_id = ?
    `).get(novelId);
    
    if (existing) {
      // Update existing
      db.prepare(`
        UPDATE novel_voice_configs 
        SET assignment_strategy = ?, updated_at = ?
        WHERE id = ?
      `).run(strategy, now, existing.id);
    } else {
      // Insert new
      db.prepare(`
        INSERT INTO novel_voice_configs (novel_id, assignment_strategy, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(novelId, strategy, now, now);
    }
  }
}

