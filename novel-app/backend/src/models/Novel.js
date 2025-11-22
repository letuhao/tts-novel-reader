/**
 * Novel Model - Database operations
 * Mô hình Novel - Thao tác Database
 */
import Database from '../database/db.js';
import { ChapterModel } from './Chapter.js';
import { ParagraphModel } from './Paragraph.js';

export class NovelModel {
  /**
   * Get all novels
   * Lấy tất cả novels
   */
  static async getAll() {
    const db = Database.getInstance();
    
    try {
      const novels = db.prepare('SELECT * FROM novels ORDER BY updated_at DESC').all();
      
      // Load chapters for each novel (can be optimized with JOIN if needed)
      return await Promise.all(novels.map(async (novel) => {
        const chapters = await ChapterModel.getByNovel(novel.id);
        // Load paragraphs for each chapter
        const chaptersWithParagraphs = await Promise.all(chapters.map(async (chapter) => {
          const paragraphs = await ParagraphModel.getByChapter(chapter.id);
          return {
            ...chapter,
            paragraphs: paragraphs
          };
        }));
        
        return {
          ...novel,
          metadata: JSON.parse(novel.metadata || '{}'),
          chapters: chaptersWithParagraphs,
          totalChapters: chaptersWithParagraphs.length || novel.total_chapters || 0,
          totalParagraphs: novel.total_paragraphs || 0
        };
      }));
    } catch (error) {
      console.error('[NovelModel] Error getting all novels:', error);
      throw error;
    }
  }
  
  /**
   * Get novel by ID
   * Lấy novel theo ID
   */
  static async getById(id) {
    const db = Database.getInstance();
    
    try {
      const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(id);
      if (!novel) return null;
      
      // Load chapters from normalized table
      const chapters = await ChapterModel.getByNovel(id);
      
      // Load paragraphs for each chapter
      const chaptersWithParagraphs = await Promise.all(chapters.map(async (chapter) => {
        const paragraphs = await ParagraphModel.getByChapter(chapter.id);
        return {
          ...chapter,
          paragraphs: paragraphs
        };
      }));
      
      return {
        ...novel,
        metadata: JSON.parse(novel.metadata || '{}'),
        chapters: chaptersWithParagraphs,
        totalChapters: chaptersWithParagraphs.length || novel.total_chapters || 0,
        totalParagraphs: novel.total_paragraphs || 0
      };
    } catch (error) {
      console.error('[NovelModel] Error getting novel by ID:', error);
      throw error;
    }
  }
  
  /**
   * Create novel with chapters and paragraphs in normalized tables
   * Tạo novel với chapters và paragraphs trong normalized tables
   */
  static async create(novelData) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    try {
      // Calculate total paragraphs
      let totalParagraphs = 0;
      if (novelData.chapters && Array.isArray(novelData.chapters)) {
        totalParagraphs = novelData.chapters.reduce((sum, chapter) => {
          return sum + (chapter.paragraphs?.length || 0);
        }, 0);
      }
      
      // Insert novel
      db.prepare(`
        INSERT INTO novels (
          id, title, file_path, metadata, 
          total_chapters, total_paragraphs, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        novelData.id,
        novelData.title,
        novelData.filePath,
        JSON.stringify(novelData.metadata || {}),
        novelData.totalChapters || 0,
        totalParagraphs,
        now,
        now
      );
      
      // Insert chapters and paragraphs in normalized tables
      if (novelData.chapters && Array.isArray(novelData.chapters)) {
        for (const chapter of novelData.chapters) {
          // Insert chapter
          await ChapterModel.create({
            id: chapter.id,
            novelId: novelData.id,
            chapterNumber: chapter.chapterNumber,
            title: chapter.title || null,
            content: chapter.content || null,
            totalParagraphs: chapter.paragraphs?.length || 0,
            totalLines: chapter.totalLines || 0
          });
          
          // Insert paragraphs for this chapter
          if (chapter.paragraphs && Array.isArray(chapter.paragraphs)) {
            const paragraphsData = chapter.paragraphs.map(paragraph => ({
              id: paragraph.id,
              novelId: novelData.id,
              chapterId: chapter.id,
              chapterNumber: chapter.chapterNumber,
              paragraphNumber: paragraph.paragraphNumber,
              text: paragraph.text || '',
              lines: paragraph.lines || null
            }));
            
            await ParagraphModel.createBatch(paragraphsData);
          }
        }
      }
      
      // Update total chapters and paragraphs
      db.prepare(`
        UPDATE novels 
        SET total_chapters = ?, total_paragraphs = ?, updated_at = ?
        WHERE id = ?
      `).run(
        novelData.chapters?.length || 0,
        totalParagraphs,
        now,
        novelData.id
      );
      
    } catch (error) {
      console.error('[NovelModel] Error creating novel:', error);
      throw error;
    }
    
    return await this.getById(novelData.id);
  }
  
  /**
   * Update novel
   * Cập nhật novel
   */
  static async update(id, updates) {
    const db = Database.getInstance();
    const now = new Date().toISOString();
    
    try {
      const updatesList = [];
      const values = [];
      
      if (updates.title) {
        updatesList.push('title = ?');
        values.push(updates.title);
      }
      if (updates.chapters) {
        updatesList.push('chapters = ?');
        values.push(JSON.stringify(updates.chapters));
      }
      if (updates.totalChapters !== undefined) {
        updatesList.push('total_chapters = ?');
        values.push(updates.totalChapters);
      }
      
      updatesList.push('updated_at = ?');
      values.push(now);
      values.push(id);
      
      db.prepare(`
        UPDATE novels 
        SET ${updatesList.join(', ')}
        WHERE id = ?
      `).run(...values);
    } catch (error) {
      // Fallback to in-memory
      const novel = novelsStore.get(id);
      if (novel) {
        novelsStore.set(id, {
          ...novel,
          ...updates,
          updatedAt: now
        });
      }
    }
    
    return await this.getById(id);
  }
  
  /**
   * Delete novel (cascade will delete chapters and paragraphs)
   * Xóa novel (cascade sẽ xóa chapters và paragraphs)
   */
  static async delete(id) {
    const db = Database.getInstance();
    
    try {
      // Cascade delete will handle chapters and paragraphs
      const result = db.prepare('DELETE FROM novels WHERE id = ?').run(id);
      return result.changes > 0;
    } catch (error) {
      console.error('[NovelModel] Error deleting novel:', error);
      throw error;
    }
  }
}
