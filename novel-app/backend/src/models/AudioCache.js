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
    const db = await Database.getInstance();
    const cache = await db.get(`
      SELECT * FROM audio_cache 
      WHERE novel_id = ? AND chapter_id = ? AND paragraph_id IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `, novelId, chapterId);
    
    return cache || null;
  }

  /**
   * Get all paragraph audio for a chapter
   * Lấy tất cả audio paragraph cho một chapter
   * 
   * Returns only ONE entry per paragraph_number (most recent by created_at)
   * Trả về chỉ MỘT entry cho mỗi paragraph_number (mới nhất theo created_at)
   * 
   * @param {string} novelId - Novel ID
   * @param {string} chapterId - Chapter ID
   * @param {string} speakerId - Speaker ID (optional)
   * @returns {Promise<Array>} Array of paragraph audio cache entries, sorted by paragraph number, with duplicates removed
   */
  static async getByChapterParagraphs(novelId, chapterId, speakerId = null) {
    const db = await Database.getInstance();
    
    try {
      // Use a subquery with ROW_NUMBER() to get only the most recent entry per paragraph_number
      // Sử dụng subquery với ROW_NUMBER() để chỉ lấy entry mới nhất cho mỗi paragraph_number
      // This ensures DISTINCT at database level (SQLite 3.25.0+)
      // Điều này đảm bảo DISTINCT ở cấp database (SQLite 3.25.0+)
      let query = `
        SELECT * FROM (
          SELECT *,
            ROW_NUMBER() OVER (
              PARTITION BY paragraph_number 
              ORDER BY created_at DESC
            ) as rn
          FROM audio_cache 
          WHERE novel_id = ? AND chapter_id = ? AND paragraph_id IS NOT NULL AND paragraph_number IS NOT NULL
      `;
      const params = [novelId, chapterId];
      
      if (speakerId) {
        query += ` AND speaker_id = ?`;
        params.push(speakerId);
      }
      
      query += `
        ) ranked
        WHERE rn = 1
        ORDER BY paragraph_number ASC
      `;
      
      const results = await db.all(query, ...params);
      
      // Remove the rn column from results (it's just for filtering)
      // Loại bỏ cột rn khỏi kết quả (nó chỉ để lọc)
      return results.map(row => {
        const { rn, ...rest } = row;
        return rest;
      });
    } catch (error) {
      // Fallback: If window functions not supported (SQLite < 3.25.0), use simple query
      // Dự phòng: Nếu window functions không được hỗ trợ (SQLite < 3.25.0), dùng query đơn giản
      console.warn(`[AudioCache] Window functions not supported, using fallback query: ${error.message}`);
      
      let query = `
        SELECT * FROM audio_cache 
        WHERE novel_id = ? AND chapter_id = ? AND paragraph_id IS NOT NULL AND paragraph_number IS NOT NULL
      `;
      const params = [novelId, chapterId];
      
      if (speakerId) {
        query += ` AND speaker_id = ?`;
        params.push(speakerId);
      }
      
      query += ` ORDER BY paragraph_number ASC, created_at DESC`;
      
      // Return results - JavaScript deduplication will handle duplicates
      // Trả về kết quả - JavaScript deduplication sẽ xử lý trùng lặp
      return await db.all(query, ...params);
    }
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
    const db = await Database.getInstance();
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
    
    const cache = await db.get(query, ...params);
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
    const db = await Database.getInstance();
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
    
    const cache = await db.get(query, ...params);
    return cache || null;
  }
  
  /**
   * Create audio cache entry
   * Tạo entry cache audio
   */
  static async create(cacheData) {
    const db = await Database.getInstance();
    
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
    
    await db.run(`
      INSERT INTO audio_cache (
        id, novel_id, chapter_id, chapter_number,
        paragraph_id, paragraph_number,
        tts_file_id, speaker_id, model,
        local_audio_path, audio_duration, audio_file_size,
        expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
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
    const db = await Database.getInstance();
    return await db.get('SELECT * FROM audio_cache WHERE id = ?', id);
  }
  
  /**
   * Clean expired cache entries
   * Dọn dẹp cache entries hết hạn
   */
  static async cleanExpired() {
    const db = await Database.getInstance();
    const now = new Date().toISOString();
    
    const result = await db.run(`
      DELETE FROM audio_cache 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `, now);
    
    return result?.changes ?? result?.rowCount ?? 0;
  }
}

