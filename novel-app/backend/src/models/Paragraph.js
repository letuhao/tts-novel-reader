/**
 * Paragraph Model - Database operations
 * Mô hình Paragraph - Thao tác Database
 */
import Database from '../database/db.js';

export class ParagraphModel {
  /**
   * Get all paragraphs for a chapter
   * Lấy tất cả paragraphs cho một chapter
   */
  static async getByChapter(chapterId) {
    const db = Database.getInstance();
    const paragraphs = db.prepare(`
      SELECT * FROM paragraphs 
      WHERE chapter_id = ? 
      ORDER BY paragraph_number ASC
    `).all(chapterId);
    
    // Convert snake_case database columns to camelCase
    return paragraphs.map(paragraph => ({
      id: paragraph.id,
      novelId: paragraph.novel_id,
      chapterId: paragraph.chapter_id,
      chapterNumber: paragraph.chapter_number,
      paragraphNumber: paragraph.paragraph_number,  // Convert to camelCase
      text: paragraph.text,
      lines: paragraph.lines ? JSON.parse(paragraph.lines) : null,
      createdAt: paragraph.created_at,
      updatedAt: paragraph.updated_at
    }));
  }
  
  /**
   * Get paragraphs by novel and chapter number
   * Lấy paragraphs theo novel và số chapter
   */
  static async getByNovelAndChapter(novelId, chapterNumber) {
    const db = Database.getInstance();
    const paragraphs = db.prepare(`
      SELECT * FROM paragraphs 
      WHERE novel_id = ? AND chapter_number = ? 
      ORDER BY paragraph_number ASC
    `).all(novelId, chapterNumber);
    
    // Convert snake_case database columns to camelCase
    return paragraphs.map(paragraph => ({
      id: paragraph.id,
      novelId: paragraph.novel_id,
      chapterId: paragraph.chapter_id,
      chapterNumber: paragraph.chapter_number,
      paragraphNumber: paragraph.paragraph_number,  // Convert to camelCase
      text: paragraph.text,
      lines: paragraph.lines ? JSON.parse(paragraph.lines) : null,
      createdAt: paragraph.created_at,
      updatedAt: paragraph.updated_at
    }));
  }
  
  /**
   * Get paragraph by ID
   * Lấy paragraph theo ID
   */
  static async getById(id) {
    const db = Database.getInstance();
    const paragraph = db.prepare('SELECT * FROM paragraphs WHERE id = ?').get(id);
    
    if (!paragraph) return null;
    
    // Convert snake_case database columns to camelCase
    return {
      id: paragraph.id,
      novelId: paragraph.novel_id,
      chapterId: paragraph.chapter_id,
      chapterNumber: paragraph.chapter_number,
      paragraphNumber: paragraph.paragraph_number,  // Convert to camelCase
      text: paragraph.text,
      lines: paragraph.lines ? JSON.parse(paragraph.lines) : null,
      createdAt: paragraph.created_at,
      updatedAt: paragraph.updated_at
    };
  }
  
  /**
   * Get paragraph by novel, chapter number, and paragraph number
   * Lấy paragraph theo novel, số chapter, và số paragraph
   */
  static async getByNumbers(novelId, chapterNumber, paragraphNumber) {
    const db = Database.getInstance();
    const paragraph = db.prepare(`
      SELECT * FROM paragraphs 
      WHERE novel_id = ? AND chapter_number = ? AND paragraph_number = ?
    `).get(novelId, chapterNumber, paragraphNumber);
    
    if (!paragraph) return null;
    
    // Convert snake_case database columns to camelCase
    return {
      id: paragraph.id,
      novelId: paragraph.novel_id,
      chapterId: paragraph.chapter_id,
      chapterNumber: paragraph.chapter_number,
      paragraphNumber: paragraph.paragraph_number,  // Convert to camelCase
      text: paragraph.text,
      lines: paragraph.lines ? JSON.parse(paragraph.lines) : null,
      createdAt: paragraph.created_at,
      updatedAt: paragraph.updated_at
    };
  }
  
  /**
   * Create paragraph
   * Tạo paragraph
   */
  static async create(paragraphData) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO paragraphs (
        id, novel_id, chapter_id, chapter_number, paragraph_number,
        text, lines, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paragraphData.id,
      paragraphData.novelId,
      paragraphData.chapterId,
      paragraphData.chapterNumber,
      paragraphData.paragraphNumber,
      paragraphData.text,
      paragraphData.lines ? JSON.stringify(paragraphData.lines) : null,
      now,
      now
    );
    
    return await this.getById(paragraphData.id);
  }
  
  /**
   * Create multiple paragraphs in batch
   * Tạo nhiều paragraphs trong batch
   */
  static async createBatch(paragraphsData) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    // Get SQLite instance directly
    const sqlite = db.db;  // db.db is the sqlite instance
    
    const insert = sqlite.prepare(`
      INSERT INTO paragraphs (
        id, novel_id, chapter_id, chapter_number, paragraph_number,
        text, lines, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Use SQLite transaction
    const insertMany = sqlite.transaction((paragraphs) => {
      for (const paragraph of paragraphs) {
        insert.run(
          paragraph.id,
          paragraph.novelId,
          paragraph.chapterId,
          paragraph.chapterNumber,
          paragraph.paragraphNumber,
          paragraph.text,
          paragraph.lines ? JSON.stringify(paragraph.lines) : null,
          now,
          now
        );
      }
    });
    
    insertMany(paragraphsData);
    
    return paragraphsData.length;
  }
  
  /**
   * Update paragraph
   * Cập nhật paragraph
   */
  static async update(id, updates) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    const updatesList = [];
    const values = [];
    
    if (updates.text !== undefined) {
      updatesList.push('text = ?');
      values.push(updates.text);
    }
    if (updates.lines !== undefined) {
      updatesList.push('lines = ?');
      values.push(JSON.stringify(updates.lines));
    }
    
    updatesList.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    db.prepare(`
      UPDATE paragraphs 
      SET ${updatesList.join(', ')}
      WHERE id = ?
    `).run(...values);
    
    return await this.getById(id);
  }
  
  /**
   * Delete paragraph
   * Xóa paragraph
   */
  static async delete(id) {
    const db = Database.getInstance();
    const result = db.prepare('DELETE FROM paragraphs WHERE id = ?').run(id);
    return result.changes > 0;
  }
  
  /**
   * Delete all paragraphs for a chapter
   * Xóa tất cả paragraphs cho một chapter
   */
  static async deleteByChapter(chapterId) {
    const db = Database.getInstance();
    const result = db.prepare('DELETE FROM paragraphs WHERE chapter_id = ?').run(chapterId);
    return result.changes;
  }
}

