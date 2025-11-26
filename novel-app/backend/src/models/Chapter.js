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
    const db = await Database.getInstance();
    const chapters = await db.all(`
      SELECT * FROM chapters 
      WHERE novel_id = ? 
      ORDER BY chapter_number ASC
    `, novelId);
    
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
      if (uniqueNumbers.length === 1 && uniqueNumbers[0] === 1) {
        console.warn(`[ChapterModel] ⚠️ WARNING: All chapters have chapterNumber = 1! This suggests a parsing issue.`);
        console.warn(`[ChapterModel] ⚠️ CẢNH BÁO: Tất cả chapters đều có chapterNumber = 1! Điều này cho thấy vấn đề parsing.`);
      }
    }
    
    return transformed;
  }
  
  /**
   * Get chapter by ID
   * Lấy chapter theo ID
   */
  static async getById(id) {
    const db = await Database.getInstance();
    const chapter = await db.get('SELECT * FROM chapters WHERE id = ?', id);
    
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
    const db = await Database.getInstance();
    const chapter = await db.get(`
      SELECT * FROM chapters 
      WHERE novel_id = ? AND chapter_number = ?
    `, novelId, chapterNumber);
    
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
    const db = await Database.getInstance();
    const now = new Date().toISOString();
    
    await db.run(`
      INSERT INTO chapters (
        id, novel_id, chapter_number, title, content,
        total_paragraphs, total_lines, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
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
    const db = await Database.getInstance();
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
    
    await db.run(`
      UPDATE chapters 
      SET ${updatesList.join(', ')}
      WHERE id = ?
    `, values);
    
    return await this.getById(id);
  }
  
  /**
   * Delete chapter
   * Xóa chapter
   */
  static async delete(id) {
    const db = await Database.getInstance();
    const result = await db.run('DELETE FROM chapters WHERE id = ?', id);
    const changes = result?.changes ?? result?.rowCount ?? 0;
    return changes > 0;
  }
  
  /**
   * Delete all chapters for a novel
   * Xóa tất cả chapters cho một novel
   */
  static async deleteByNovel(novelId) {
    const db = await Database.getInstance();
    const result = await db.run('DELETE FROM chapters WHERE novel_id = ?', novelId);
    return result?.changes ?? result?.rowCount ?? 0;
  }
}

