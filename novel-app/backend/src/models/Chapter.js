/**
 * Chapter Model - Database operations
 * Mô hình Chapter - Thao tác Database
 */
import Database from '../database/db.js';

export class ChapterModel {
  /**
   * Get all chapters for a novel
   * Lấy tất cả chapters cho một novel
   */
  static async getByNovel(novelId) {
    const db = Database.getInstance();
    const chapters = db.prepare(`
      SELECT * FROM chapters 
      WHERE novel_id = ? 
      ORDER BY chapter_number ASC
    `).all(novelId);
    
    return chapters.map(chapter => ({
      ...chapter,
      lines: chapter.lines ? JSON.parse(chapter.lines) : null
    }));
  }
  
  /**
   * Get chapter by ID
   * Lấy chapter theo ID
   */
  static async getById(id) {
    const db = Database.getInstance();
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(id);
    
    if (!chapter) return null;
    
    return {
      ...chapter,
      lines: chapter.lines ? JSON.parse(chapter.lines) : null
    };
  }
  
  /**
   * Get chapter by novel and chapter number
   * Lấy chapter theo novel và số chapter
   */
  static async getByNovelAndNumber(novelId, chapterNumber) {
    const db = Database.getInstance();
    const chapter = db.prepare(`
      SELECT * FROM chapters 
      WHERE novel_id = ? AND chapter_number = ?
    `).get(novelId, chapterNumber);
    
    if (!chapter) return null;
    
    return {
      ...chapter,
      lines: chapter.lines ? JSON.parse(chapter.lines) : null
    };
  }
  
  /**
   * Create chapter
   * Tạo chapter
   */
  static async create(chapterData) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO chapters (
        id, novel_id, chapter_number, title, content,
        total_paragraphs, total_lines, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      chapterData.id,
      chapterData.novelId,
      chapterData.chapterNumber,
      chapterData.title || null,
      chapterData.content || null,
      chapterData.totalParagraphs || 0,
      chapterData.totalLines || 0,
      now,
      now
    );
    
    return await this.getById(chapterData.id);
  }
  
  /**
   * Update chapter
   * Cập nhật chapter
   */
  static async update(id, updates) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    const updatesList = [];
    const values = [];
    
    if (updates.title !== undefined) {
      updatesList.push('title = ?');
      values.push(updates.title);
    }
    if (updates.content !== undefined) {
      updatesList.push('content = ?');
      values.push(updates.content);
    }
    if (updates.totalParagraphs !== undefined) {
      updatesList.push('total_paragraphs = ?');
      values.push(updates.totalParagraphs);
    }
    if (updates.totalLines !== undefined) {
      updatesList.push('total_lines = ?');
      values.push(updates.totalLines);
    }
    
    updatesList.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    db.prepare(`
      UPDATE chapters 
      SET ${updatesList.join(', ')}
      WHERE id = ?
    `).run(...values);
    
    return await this.getById(id);
  }
  
  /**
   * Delete chapter
   * Xóa chapter
   */
  static async delete(id) {
    const db = Database.getInstance();
    const result = db.prepare('DELETE FROM chapters WHERE id = ?').run(id);
    return result.changes > 0;
  }
  
  /**
   * Delete all chapters for a novel
   * Xóa tất cả chapters cho một novel
   */
  static async deleteByNovel(novelId) {
    const db = Database.getInstance();
    const result = db.prepare('DELETE FROM chapters WHERE novel_id = ?').run(novelId);
    return result.changes;
  }
}

