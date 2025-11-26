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
    const db = await Database.getInstance();
    
    try {
      const novels = await db.all('SELECT * FROM novels ORDER BY updated_at DESC');
      
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
        
        // CRITICAL: Use actual chapters count, not database field
        // QUAN TRỌNG: Sử dụng số đếm chapters thực tế, không phải trường database
        const actualChaptersCount = chaptersWithParagraphs.length;
        
        return {
          ...novel,
          metadata: JSON.parse(novel.metadata || '{}'),
          chapters: chaptersWithParagraphs,
          // Always use actual chapters count to ensure accuracy
          // Luôn sử dụng số đếm chapters thực tế để đảm bảo chính xác
          totalChapters: actualChaptersCount,
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
    const db = await Database.getInstance();
    
    try {
      const novel = await db.get('SELECT * FROM novels WHERE id = ?', id);
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
      
      // CRITICAL: Use actual chapters count, not database field
      // QUAN TRỌNG: Sử dụng số đếm chapters thực tế, không phải trường database
      const actualChaptersCount = chaptersWithParagraphs.length;
      
      // Validate and auto-fix: Update database if totalChapters doesn't match actual
      // Xác thực và tự động sửa: Cập nhật database nếu totalChapters không khớp với thực tế
      if (novel.total_chapters && novel.total_chapters !== actualChaptersCount) {
        console.warn(`[NovelModel] ⚠️ Chapter count mismatch for novel ${id}`);
        console.warn(`[NovelModel] ⚠️ Không khớp số chapter cho novel ${id}`);
        console.warn(`  Database total_chapters: ${novel.total_chapters}`);
        console.warn(`  Actual chapters count: ${actualChaptersCount}`);
        console.warn(`  Auto-fixing: Updating database total_chapters to ${actualChaptersCount}`);
        console.warn(`  Tự động sửa: Cập nhật database total_chapters thành ${actualChaptersCount}`);
        
        // Auto-fix: Update database with correct count
        // Tự động sửa: Cập nhật database với số đếm đúng
        try {
          const now = new Date().toISOString();
          await db.run(`
            UPDATE novels 
            SET total_chapters = ?, updated_at = ?
            WHERE id = ?
          `, actualChaptersCount, now, id);
          console.log(`[NovelModel] ✅ Fixed total_chapters for novel ${id}`);
          console.log(`[NovelModel] ✅ Đã sửa total_chapters cho novel ${id}`);
        } catch (error) {
          console.error(`[NovelModel] ❌ Failed to fix total_chapters:`, error);
          console.error(`[NovelModel] ❌ Không thể sửa total_chapters:`, error);
        }
      }
      
      return {
        ...novel,
        metadata: JSON.parse(novel.metadata || '{}'),
        chapters: chaptersWithParagraphs,
        // Always use actual chapters count to ensure accuracy
        // Luôn sử dụng số đếm chapters thực tế để đảm bảo chính xác
        totalChapters: actualChaptersCount,
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
    const db = await Database.getInstance();
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
      await db.run(`
        INSERT INTO novels (
          id, title, file_path, metadata, 
          total_chapters, total_paragraphs, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
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
      await db.run(`
        UPDATE novels 
        SET total_chapters = ?, total_paragraphs = ?, updated_at = ?
        WHERE id = ?
      `,
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
    const db = await Database.getInstance();
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
      
      await db.run(`
        UPDATE novels 
        SET ${updatesList.join(', ')}
        WHERE id = ?
      `, values);
    } catch (error) {
      console.error('[NovelModel] Error updating novel:', error);
      throw error;
    }
    
    return await this.getById(id);
  }
  
  /**
   * Delete novel (cascade will delete chapters and paragraphs)
   * Xóa novel (cascade sẽ xóa chapters và paragraphs)
   */
  static async delete(id) {
    const db = await Database.getInstance();
    
    try {
      // Cascade delete will handle chapters and paragraphs
      const result = await db.run('DELETE FROM novels WHERE id = ?', id);
      const changes = result?.changes ?? result?.rowCount ?? 0;
      return changes > 0;
    } catch (error) {
      console.error('[NovelModel] Error deleting novel:', error);
      throw error;
    }
  }
}
