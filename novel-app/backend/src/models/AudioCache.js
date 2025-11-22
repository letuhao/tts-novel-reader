/**
 * Audio Cache Model
 * Mô hình Cache Audio
 */
import Database from '../database/db.js';

export class AudioCacheModel {
  /**
   * Get audio cache by chapter
   * Lấy audio cache theo chapter
   */
  static async getByChapter(novelId, chapterId) {
    const db = Database.getInstance();
    const cache = db.prepare(`
      SELECT * FROM audio_cache 
      WHERE novel_id = ? AND chapter_id = ? AND paragraph_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `).get(novelId, chapterId);
    
    return cache || null;
  }

  /**
   * Get all paragraph audio for a chapter
   * Lấy tất cả audio paragraph cho một chapter
   * 
   * @param {string} novelId - Novel ID
   * @param {string} chapterId - Chapter ID
   * @param {string} speakerId - Speaker ID (optional)
   * @returns {Promise<Array>} Array of paragraph audio cache entries, sorted by paragraph number
   */
  static async getByChapterParagraphs(novelId, chapterId, speakerId = null) {
    const db = Database.getInstance();
    let query = `
      SELECT * FROM audio_cache 
      WHERE novel_id = ? AND chapter_id = ? AND paragraph_id IS NOT NULL
    `;
    const params = [novelId, chapterId];
    
    if (speakerId) {
      query += ` AND speaker_id = ?`;
      params.push(speakerId);
    }
    
    query += ` ORDER BY paragraph_number ASC`;
    
    return db.prepare(query).all(...params);
  }

  /**
   * Get audio cache by paragraph
   * Lấy audio cache theo paragraph
   * 
   * @param {string} novelId - Novel ID
   * @param {string} chapterId - Chapter ID
   * @param {string} paragraphId - Paragraph ID
   * @param {string} speakerId - Speaker ID (optional)
   * @returns {Promise<Object|null>} Audio cache entry or null
   */
  static async getByParagraph(novelId, chapterId, paragraphId, speakerId = null) {
    const db = Database.getInstance();
    let query = `
      SELECT * FROM audio_cache 
      WHERE novel_id = ? AND chapter_id = ? AND paragraph_id = ?
    `;
    const params = [novelId, chapterId, paragraphId];
    
    if (speakerId) {
      query += ` AND speaker_id = ?`;
      params.push(speakerId);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 1`;
    
    const cache = db.prepare(query).get(...params);
    return cache || null;
  }

  /**
   * Get audio cache by chapter and paragraph number
   * Lấy audio cache theo chapter và paragraph number
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {number} paragraphNumber - Paragraph number
   * @param {string} speakerId - Speaker ID (optional)
   * @returns {Promise<Object|null>} Audio cache entry or null
   */
  static async getByChapterAndParagraphNumber(novelId, chapterNumber, paragraphNumber, speakerId = null) {
    const db = Database.getInstance();
    let query = `
      SELECT * FROM audio_cache 
      WHERE novel_id = ? AND chapter_number = ? AND paragraph_number = ?
    `;
    const params = [novelId, chapterNumber, paragraphNumber];
    
    if (speakerId) {
      query += ` AND speaker_id = ?`;
      params.push(speakerId);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 1`;
    
    const cache = db.prepare(query).get(...params);
    return cache || null;
  }
  
  /**
   * Create audio cache entry
   * Tạo entry cache audio
   */
  static async create(cacheData) {
    const db = Database.getInstance();
    
    // Generate ID
    let id = cacheData.id;
    if (!id) {
      try {
        const uuidModule = await import('uuid');
        id = uuidModule.v4();
      } catch (e) {
        id = crypto.randomUUID();
      }
    }
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO audio_cache (
        id, novel_id, chapter_id, chapter_number,
        paragraph_id, paragraph_number,
        tts_file_id, speaker_id, model,
        local_audio_path, audio_duration, audio_file_size,
        expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      cacheData.novelId,
      cacheData.chapterId || null,
      cacheData.chapterNumber || null,
      cacheData.paragraphId || null,
      cacheData.paragraphNumber || null,
      cacheData.ttsFileId,
      cacheData.speakerId || null,
      cacheData.model || 'dia',
      cacheData.localAudioPath || null,
      cacheData.audioDuration || null,
      cacheData.audioFileSize || null,
      cacheData.expiresAt || null,
      now
    );
    
    return await this.getById(id);
  }
  
  /**
   * Get by ID
   */
  static async getById(id) {
    const db = Database.getInstance();
    return db.prepare('SELECT * FROM audio_cache WHERE id = ?').get(id);
  }
  
  /**
   * Clean expired cache entries
   * Dọn dẹp cache entries hết hạn
   */
  static async cleanExpired() {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    const result = db.prepare(`
      DELETE FROM audio_cache 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `).run(now);
    
    return result.changes;
  }
}

