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
    
    // Convert snake_case database columns to camelCase
    // Chuyển đổi các cột database snake_case sang camelCase
    const transformed = chapters.map(chapter => ({
      id: chapter.id,
      novelId: chapter.novel_id,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      content: chapter.content,
      totalParagraphs: chapter.total_paragraphs,
      totalLines: chapter.total_lines,
      lines: chapter.lines ? JSON.parse(chapter.lines) : null,
      createdAt: chapter.created_at,
      updatedAt: chapter.updated_at
    }));
    
    // Debug: Log chapter numbers to verify transformation
    // Debug: Log số chapter để xác minh transformation
    if (transformed.length > 0) {
      const chapterNumbers = transformed.map(ch => ch.chapterNumber);
      const uniqueNumbers = [...new Set(chapterNumbers)];
      console.log(`[ChapterModel] 📚 Loaded ${transformed.length} chapters for novel ${novelId}`);
      console.log(`[ChapterModel] 📚 Unique chapter numbers: ${uniqueNumbers.length} (${uniqueNumbers.slice(0, 10).join(', ')}${uniqueNumbers.length > 10 ? '...' : ''})`);
      // Only warn if there are MULTIPLE chapters but they all have the same number
      // Chỉ cảnh báo nếu có NHIỀU chapters nhưng tất cả đều có cùng số
      if (transformed.length > 1 && uniqueNumbers.length === 1 && uniqueNumbers[0] === 1) {
        console.warn(`[ChapterModel] ⚠️ WARNING: All ${transformed.length} chapters have chapterNumber = 1! This suggests a parsing issue.`);
        console.warn(`[ChapterModel] ⚠️ CẢNH BÁO: Tất cả ${transformed.length} chapters đều có chapterNumber = 1! Điều này cho thấy vấn đề parsing.`);
      } else if (transformed.length === 1 && uniqueNumbers[0] === 1) {
        // Single chapter with number 1 is normal (novel has no chapter markers)
        // Một chapter với số 1 là bình thường (novel không có chapter markers)
        console.log(`[ChapterModel] ℹ️  Single chapter detected (no chapter markers found in novel)`);
        console.log(`[ChapterModel] ℹ️  Phát hiện một chapter (không tìm thấy chapter markers trong novel)`);
      }
    }
    
    return transformed;
  }
  
  /**
   * Get chapter by ID
   * Lấy chapter theo ID
   */
  static async getById(id) {
    const db = Database.getInstance();
    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(id);
    
    if (!chapter) return null;
    
    // Convert snake_case database columns to camelCase
    // Chuyển đổi các cột database snake_case sang camelCase
    return {
      id: chapter.id,
      novelId: chapter.novel_id,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      content: chapter.content,
      totalParagraphs: chapter.total_paragraphs,
      totalLines: chapter.total_lines,
      lines: chapter.lines ? JSON.parse(chapter.lines) : null,
      createdAt: chapter.created_at,
      updatedAt: chapter.updated_at
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
    
    // Convert snake_case database columns to camelCase
    // Chuyển đổi các cột database snake_case sang camelCase
    return {
      id: chapter.id,
      novelId: chapter.novel_id,
      chapterNumber: chapter.chapter_number,
      title: chapter.title,
      content: chapter.content,
      totalParagraphs: chapter.total_paragraphs,
      totalLines: chapter.total_lines,
      lines: chapter.lines ? JSON.parse(chapter.lines) : null,
      createdAt: chapter.created_at,
      updatedAt: chapter.updated_at
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

