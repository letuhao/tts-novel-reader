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
    const db = await Database.getInstance();
    const paragraphs = await db.all(`
      SELECT * FROM paragraphs 
      WHERE chapter_id = ? 
      ORDER BY paragraph_number ASC
    `, chapterId);
    
    // Convert snake_case database columns to camelCase
    return paragraphs.map(paragraph => ({
      id: paragraph.id,
      novelId: paragraph.novel_id,
      chapterId: paragraph.chapter_id,
      chapterNumber: paragraph.chapter_number,
      paragraphNumber: paragraph.paragraph_number,  // Convert to camelCase
      text: paragraph.text,
      lines: paragraph.lines ? JSON.parse(paragraph.lines) : null,
      role: paragraph.role || null,  // Add role (may not exist in old databases)
      voiceId: paragraph.voice_id || null,  // Add voice_id (may not exist in old databases)
      createdAt: paragraph.created_at,
      updatedAt: paragraph.updated_at
    }));
  }
  
  /**
   * Get paragraphs by novel and chapter number
   * Lấy paragraphs theo novel và số chapter
   */
  static async getByNovelAndChapter(novelId, chapterNumber) {
    const db = await Database.getInstance();
    const paragraphs = await db.all(`
      SELECT * FROM paragraphs 
      WHERE novel_id = ? AND chapter_number = ? 
      ORDER BY paragraph_number ASC
    `, novelId, chapterNumber);
    
    // Convert snake_case database columns to camelCase
    return paragraphs.map(paragraph => ({
      id: paragraph.id,
      novelId: paragraph.novel_id,
      chapterId: paragraph.chapter_id,
      chapterNumber: paragraph.chapter_number,
      paragraphNumber: paragraph.paragraph_number,  // Convert to camelCase
      text: paragraph.text,
      lines: paragraph.lines ? JSON.parse(paragraph.lines) : null,
      role: paragraph.role || null,
      voiceId: paragraph.voice_id || null,
      createdAt: paragraph.created_at,
      updatedAt: paragraph.updated_at
    }));
  }
  
  /**
   * Get paragraph by ID
   * Lấy paragraph theo ID
   */
  static async getById(id) {
    const db = await Database.getInstance();
    const paragraph = await db.get('SELECT * FROM paragraphs WHERE id = ?', id);
    
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
      role: paragraph.role || null,
      voiceId: paragraph.voice_id || null,
      createdAt: paragraph.created_at,
      updatedAt: paragraph.updated_at
    };
  }
  
  /**
   * Get paragraph by novel, chapter number, and paragraph number
   * Lấy paragraph theo novel, số chapter, và số paragraph
   */
  static async getByNumbers(novelId, chapterNumber, paragraphNumber) {
    const db = await Database.getInstance();
    const paragraph = await db.get(`
      SELECT * FROM paragraphs 
      WHERE novel_id = ? AND chapter_number = ? AND paragraph_number = ?
    `, novelId, chapterNumber, paragraphNumber);
    
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
      role: paragraph.role || null,
      voiceId: paragraph.voice_id || null,
      createdAt: paragraph.created_at,
      updatedAt: paragraph.updated_at
    };
  }
  
  /**
   * Create paragraph
   * Tạo paragraph
   */
  static async create(paragraphData) {
    const db = await Database.getInstance();
    const now = new Date().toISOString();
    
    await db.run(`
      INSERT INTO paragraphs (
        id, novel_id, chapter_id, chapter_number, paragraph_number,
        text, lines, role, voice_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      paragraphData.id,
      paragraphData.novelId,
      paragraphData.chapterId,
      paragraphData.chapterNumber,
      paragraphData.paragraphNumber,
      paragraphData.text,
      paragraphData.lines ? JSON.stringify(paragraphData.lines) : null,
      paragraphData.role || null,
      paragraphData.voiceId || null,
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
    const db = await Database.getInstance();
    const now = new Date().toISOString();
    
    await db.transaction(async (tx) => {
      for (const paragraph of paragraphsData) {
        await tx.run(`
          INSERT INTO paragraphs (
            id, novel_id, chapter_id, chapter_number, paragraph_number,
            text, lines, role, voice_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        paragraph.id,
        paragraph.novelId,
        paragraph.chapterId,
        paragraph.chapterNumber,
        paragraph.paragraphNumber,
        paragraph.text,
        paragraph.lines ? JSON.stringify(paragraph.lines) : null,
        paragraph.role || null,
        paragraph.voiceId || null,
        now,
        now
        );
      }
    });
    
    return paragraphsData.length;
  }
  
  /**
   * Update paragraph
   * Cập nhật paragraph
   */
  static async update(id, updates) {
    const db = await Database.getInstance();
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
    if (updates.role !== undefined) {
      updatesList.push('role = ?');
      values.push(updates.role);
    }
    if (updates.voiceId !== undefined) {
      updatesList.push('voice_id = ?');
      values.push(updates.voiceId);
    }
    
    updatesList.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    await db.run(`
      UPDATE paragraphs 
      SET ${updatesList.join(', ')}
      WHERE id = ?
    `, values);
    
    return await this.getById(id);
  }
  
  /**
   * Delete paragraph
   * Xóa paragraph
   */
  static async delete(id) {
    const db = await Database.getInstance();
    const result = await db.run('DELETE FROM paragraphs WHERE id = ?', id);
    const changes = result?.changes ?? result?.rowCount ?? 0;
    return changes > 0;
  }
  
  /**
   * Delete all paragraphs for a chapter
   * Xóa tất cả paragraphs cho một chapter
   */
  static async deleteByChapter(chapterId) {
    const db = await Database.getInstance();
    const result = await db.run('DELETE FROM paragraphs WHERE chapter_id = ?', chapterId);
    return result?.changes ?? result?.rowCount ?? 0;
  }
}

