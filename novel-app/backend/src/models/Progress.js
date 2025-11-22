/**
 * Progress Model
 * Mô hình Progress
 */
import Database from '../database/db.js';

export class ProgressModel {
  /**
   * Get progress by novel ID
   * Lấy progress theo novel ID
   */
  static async getByNovel(novelId) {
    const db = Database.getInstance();
    const progress = db.prepare(`
      SELECT * FROM progress 
      WHERE novel_id = ?
      ORDER BY last_read_at DESC
      LIMIT 1
    `).get(novelId);
    
    return progress || null;
  }
  
  /**
   * Create progress
   * Tạo progress
   */
  static async create(progressData) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO progress (
        id, novel_id, chapter_id, chapter_number,
        paragraph_id, paragraph_number,
        position, completed, last_read_at, reading_time_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      progressData.id,
      progressData.novelId,
      progressData.chapterId || null,
      progressData.chapterNumber || null,
      progressData.paragraphId || null,
      progressData.paragraphNumber || null,
      progressData.position || 0,
      progressData.completed ? 1 : 0,
      now,
      progressData.readingTimeSeconds || 0
    );
    
    return await this.getById(progressData.id);
  }
  
  /**
   * Update progress
   * Cập nhật progress
   */
  static async update(id, updates) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    const updatesList = [];
    const values = [];
    
    if (updates.chapterId !== undefined) {
      updatesList.push('chapter_id = ?');
      values.push(updates.chapterId);
    }
    if (updates.chapterNumber !== undefined) {
      updatesList.push('chapter_number = ?');
      values.push(updates.chapterNumber);
    }
    if (updates.paragraphId !== undefined) {
      updatesList.push('paragraph_id = ?');
      values.push(updates.paragraphId);
    }
    if (updates.paragraphNumber !== undefined) {
      updatesList.push('paragraph_number = ?');
      values.push(updates.paragraphNumber);
    }
    if (updates.position !== undefined) {
      updatesList.push('position = ?');
      values.push(updates.position);
    }
    if (updates.completed !== undefined) {
      updatesList.push('completed = ?');
      values.push(updates.completed ? 1 : 0);
    }
    if (updates.readingTimeSeconds !== undefined) {
      updatesList.push('reading_time_seconds = ?');
      values.push(updates.readingTimeSeconds);
    }
    
    updatesList.push('last_read_at = ?');
    values.push(now);
    values.push(id);
    
    db.prepare(`
      UPDATE progress 
      SET ${updatesList.join(', ')}
      WHERE id = ?
    `).run(...values);
    
    return await this.getById(id);
  }
  
  /**
   * Get by ID
   */
  static async getById(id) {
    const db = Database.getInstance();
    return db.prepare('SELECT * FROM progress WHERE id = ?').get(id);
  }
  
  /**
   * Get reading statistics
   * Lấy thống kê đọc
   */
  static async getStats(novelId) {
    const db = Database.getInstance();
    const progress = await this.getByNovel(novelId);
    
    if (!progress) {
      return {
        totalReadingTimeSeconds: 0,
        totalReadingTimeHours: 0,
        currentChapter: null,
        completed: false,
        lastReadAt: null
      };
    }
    
    return {
      totalReadingTimeSeconds: progress.reading_time_seconds || 0,
      totalReadingTimeHours: (progress.reading_time_seconds || 0) / 3600,
      currentChapter: progress.chapter_number || null,
      completed: progress.completed === 1,
      lastReadAt: progress.last_read_at
    };
  }
}

