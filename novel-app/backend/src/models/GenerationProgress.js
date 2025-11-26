/**
 * Generation Progress Model - Track audio generation status
 * Mô hình Generation Progress - Theo dõi trạng thái tạo audio
 */
import Database from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';

export class GenerationProgressModel {
  /**
   * Get generation progress by novel
   * Lấy generation progress theo novel
   */
  static async getByNovel(novelId) {
    const db = await Database.getInstance();
    return await db.all(`
      SELECT * FROM generation_progress 
      WHERE novel_id = ? 
      ORDER BY chapter_number ASC, paragraph_number ASC
    `, novelId);
  }
  
  /**
   * Get generation progress by chapter
   * Lấy generation progress theo chapter
   */
  static async getByChapter(novelId, chapterNumber) {
    const db = await Database.getInstance();
    return await db.all(`
      SELECT * FROM generation_progress 
      WHERE novel_id = ? AND chapter_number = ? 
      ORDER BY paragraph_number ASC
    `, novelId, chapterNumber);
  }
  
  /**
   * Get generation progress by paragraph
   * Lấy generation progress theo paragraph
   */
  static async getByParagraph(novelId, chapterNumber, paragraphNumber) {
    const db = await Database.getInstance();
    return await db.get(`
      SELECT * FROM generation_progress 
      WHERE novel_id = ? AND chapter_number = ? AND paragraph_number = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, novelId, chapterNumber, paragraphNumber);
  }
  
  /**
   * Get generation statistics for a chapter
   * Lấy thống kê generation cho một chapter
   */
  static async getChapterStats(novelId, chapterNumber) {
    const db = await Database.getInstance();
    const stats = await db.all(`
      SELECT 
        status,
        COUNT(*) as count
      FROM generation_progress
      WHERE novel_id = ? AND chapter_number = ?
      GROUP BY status
    `, novelId, chapterNumber);
    
    const total = await db.get(`
      SELECT COUNT(*) as total
      FROM generation_progress
      WHERE novel_id = ? AND chapter_number = ?
    `, novelId, chapterNumber);
    
    const completed = await db.get(`
      SELECT COUNT(*) as completed
      FROM generation_progress
      WHERE novel_id = ? AND chapter_number = ? AND status = 'completed'
    `, novelId, chapterNumber);
    
    const failed = await db.get(`
      SELECT COUNT(*) as failed
      FROM generation_progress
      WHERE novel_id = ? AND chapter_number = ? AND status = 'failed'
    `, novelId, chapterNumber);
    
    const pending = await db.get(`
      SELECT COUNT(*) as pending
      FROM generation_progress
      WHERE novel_id = ? AND chapter_number = ? AND status = 'pending'
    `, novelId, chapterNumber);
    
    return {
      total: total?.total || 0,
      completed: completed?.completed || 0,
      failed: failed?.failed || 0,
      pending: pending?.pending || 0,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat.count;
        return acc;
      }, {})
    };
  }
  
  /**
   * Create or update generation progress
   * Tạo hoặc cập nhật generation progress
   */
  static async createOrUpdate(progressData) {
    const db = await Database.getInstance();
    const now = new Date().toISOString();
    
    // Check if exists
    const existing = progressData.id 
      ? await this.getById(progressData.id)
      : await this.getByParagraph(
          progressData.novelId,
          progressData.chapterNumber,
          progressData.paragraphNumber
        );
    
    if (existing) {
      // Update existing
      return await this.update(existing.id, {
        status: progressData.status || existing.status,
        progressPercent: progressData.progressPercent,
        startedAt: progressData.startedAt || existing.started_at,
        completedAt: progressData.completedAt || existing.completed_at,
        errorMessage: progressData.errorMessage,
        retryCount: progressData.retryCount !== undefined ? progressData.retryCount : existing.retry_count
      });
    }
    
    // Create new
    const id = progressData.id || uuidv4();
    
    await db.run(`
      INSERT INTO generation_progress (
        id, novel_id, chapter_id, chapter_number,
        paragraph_id, paragraph_number, status,
        speaker_id, model, progress_percent,
        started_at, completed_at, error_message, retry_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      id,
      progressData.novelId,
      progressData.chapterId || null,
      progressData.chapterNumber || null,
      progressData.paragraphId || null,
      progressData.paragraphNumber || null,
      progressData.status || 'pending',
      progressData.speakerId || null,
      progressData.model || null,
      progressData.progressPercent || 0,
      progressData.startedAt || now,
      progressData.completedAt || null,
      progressData.errorMessage || null,
      progressData.retryCount || 0,
      now,
      now
    );
    
    return await this.getById(id);
  }
  
  /**
   * Update generation progress
   * Cập nhật generation progress
   */
  static async update(id, updates) {
    const db = await Database.getInstance();
    const now = new Date().toISOString();
    
    const updatesList = [];
    const values = [];
    
    if (updates.status !== undefined) {
      updatesList.push('status = ?');
      values.push(updates.status);
    }
    if (updates.progressPercent !== undefined) {
      updatesList.push('progress_percent = ?');
      values.push(updates.progressPercent);
    }
    if (updates.startedAt !== undefined) {
      updatesList.push('started_at = ?');
      values.push(updates.startedAt);
    }
    if (updates.completedAt !== undefined) {
      updatesList.push('completed_at = ?');
      values.push(updates.completedAt);
    }
    if (updates.errorMessage !== undefined) {
      updatesList.push('error_message = ?');
      values.push(updates.errorMessage);
    }
    if (updates.retryCount !== undefined) {
      updatesList.push('retry_count = ?');
      values.push(updates.retryCount);
    }
    
    updatesList.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    await db.run(`
      UPDATE generation_progress 
      SET ${updatesList.join(', ')}
      WHERE id = ?
    `, values);
    
    return await this.getById(id);
  }
  
  /**
   * Get by ID
   * Lấy theo ID
   */
  static async getById(id) {
    const db = await Database.getInstance();
    return await db.get('SELECT * FROM generation_progress WHERE id = ?', id);
  }
  
  /**
   * Mark as completed
   * Đánh dấu hoàn thành
   */
  static async markCompleted(id) {
    const now = new Date().toISOString();
    return await this.update(id, {
      status: 'completed',
      completedAt: now,
      progressPercent: 100
    });
  }
  
  /**
   * Mark as failed
   * Đánh dấu thất bại
   */
  static async markFailed(id, errorMessage) {
    return await this.update(id, {
      status: 'failed',
      errorMessage: errorMessage
    });
  }
  
  /**
   * Clean old progress entries
   * Dọn dẹp progress entries cũ
   */
  static async cleanOld(daysOld = 30) {
    const db = await Database.getInstance();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoff = cutoffDate.toISOString();
    
    const result = await db.run(`
      DELETE FROM generation_progress 
      WHERE status = 'completed' AND completed_at < ?
    `, cutoff);
    
    return result?.changes ?? result?.rowCount ?? 0;
  }
}

