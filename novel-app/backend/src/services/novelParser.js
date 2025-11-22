/**
 * Novel Parser Service
 * Dịch vụ Parse Novel
 */
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse novel text file into structured data
 * Parse file text novel thành dữ liệu có cấu trúc
 */
export class NovelParser {
  /**
   * Parse novel file into chapters, paragraphs, and lines
   * Parse file novel thành chapters, paragraphs, và lines
   * 
   * @param {string} filePath - Path to novel file
   * @returns {Object} Parsed novel data
   */
  static async parseNovel(filePath) {
    try {
      // Read file
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Extract metadata
      const metadata = this.extractMetadata(content);
      
      // Parse chapters
      const chapters = this.parseChapters(content);
      
      return {
        id: uuidv4(),
        title: metadata.title || path.basename(filePath, '.txt'),
        filePath: filePath,
        metadata: metadata,
        chapters: chapters,
        totalChapters: chapters.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to parse novel: ${error.message}`);
    }
  }
  
  /**
   * Extract metadata from novel content
   * Trích xuất metadata từ nội dung novel
   */
  static extractMetadata(content) {
    const lines = content.split('\n').slice(0, 20);
    const metadata = {
      author: 'Unknown',
      description: '',
      totalChapters: 0
    };
    
    let titleFound = false;
    
    // Try to extract author and title from first lines
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      
      // Skip copyright/header lines
      if (trimmed.toLowerCase().includes('bản quyền') || 
          trimmed.toLowerCase().includes('copyright') ||
          trimmed.toLowerCase().includes('have fun') ||
          trimmed.length === 0) {
        continue;
      }
      
      // Author pattern - extract from line containing "tác giả"
      if (trimmed.toLowerCase().includes('tác giả')) {
        const authorMatch = trimmed.match(/tác giả[:\s]*([^\[\]]+)/i);
        if (authorMatch) {
          metadata.author = authorMatch[1].trim();
        } else {
          metadata.author = trimmed.split(/tác giả/i).pop()?.split(/[\[\]]/)[0]?.trim() || 'Unknown';
        }
      }
      
      // Title pattern - look for meaningful line that's not copyright or chapter
      if (!titleFound && trimmed && 
          !trimmed.match(/^(chương|chapter)/i) &&
          !trimmed.match(/^truyện bạn đang theo/i) &&
          trimmed.length > 10) {
        
        // Extract title (might include chapter count info)
        let title = trimmed;
        
        // Clean up title - remove chapter count info in brackets/parentheses if present
        title = title.replace(/\s*\(\d+-\d+\s*chương[^)]*\)/gi, '').trim();
        title = title.replace(/\s*\[\s*[^\]]+\]\s*/g, '').trim();
        title = title.replace(/\s*tác giả[:\s]*.*$/i, '').trim();
        
        if (title.length > 5) {
          metadata.title = title;
          titleFound = true;
        }
      }
    }
    
    // Fallback: use filename or first meaningful line
    if (!metadata.title) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed.length > 5 && !trimmed.match(/^(chương|chapter)/i)) {
          metadata.title = trimmed.substring(0, 100); // Limit length
          break;
        }
      }
    }
    
    return metadata;
  }
  
  /**
   * Parse chapters from content
   * Parse chapters từ nội dung
   */
  static parseChapters(content) {
    const chapters = [];
    const lines = content.split('\n');
    
    let currentChapter = null;
    let currentParagraph = [];
    let chapterNumber = 0;
    // Use 1-based indexing for paragraph numbers (paragraph_001, paragraph_002, etc.)
    // Sử dụng đánh số bắt đầu từ 1 cho paragraph (paragraph_001, paragraph_002, v.v.)
    let paragraphNumber = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines between chapters
      if (!line && !currentChapter) {
        continue;
      }
      
      // Chapter detection - Multiple patterns
      const chapterMatch = line.match(/^Chương\s*(\d+)[:：]?\s*(.*)$/i);
      if (chapterMatch) {
        // Save previous chapter
        if (currentChapter) {
          if (currentParagraph.length > 0) {
            currentChapter.paragraphs.push({
              id: uuidv4(),
              paragraphNumber: paragraphNumber++,
              lines: currentParagraph,
              text: currentParagraph.join('\n')
            });
          }
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        chapterNumber = parseInt(chapterMatch[1]);
        const chapterTitle = chapterMatch[2] || `Chương ${chapterNumber}`;
        
        currentChapter = {
          id: uuidv4(),
          chapterNumber: chapterNumber,
          title: chapterTitle,
          paragraphs: [],
          totalParagraphs: 0,
          totalLines: 0
        };
        
        currentParagraph = [];
        // Reset paragraph number to 1 for new chapter (1-based indexing)
        // Đặt lại số paragraph về 1 cho chapter mới (đánh số bắt đầu từ 1)
        paragraphNumber = 1;
        continue;
      }
      
      // If we have a chapter
      if (currentChapter) {
        // Empty line = paragraph break (but preserve single empty lines within paragraphs)
        if (!line) {
          // If we have content in current paragraph, save it
          if (currentParagraph.length > 0) {
            currentChapter.paragraphs.push({
              id: uuidv4(),
              paragraphNumber: paragraphNumber++,
              lines: currentParagraph,
              text: currentParagraph.join('\n')
            });
            currentChapter.totalLines += currentParagraph.length;
            currentParagraph = [];
          }
          continue;
        }
        
        // Skip lines that look like chapter markers (might be mis-parsed)
        if (line.match(/^Chương\s*\d+/i) && !line.match(/^Chương\s*\d+[:：]/i)) {
          // This might be a chapter header in the middle, skip it
          continue;
        }
        
        // Add line to current paragraph (trim whitespace but keep tabs if intentional)
        // Remove leading/trailing whitespace but keep structure
        const cleanLine = line.replace(/^\s+|\s+$/g, '');
        if (cleanLine) {
          currentParagraph.push(cleanLine);
        }
      }
    }
    
    // Save last chapter and paragraph
    if (currentChapter) {
      if (currentParagraph.length > 0) {
        currentChapter.paragraphs.push({
          id: uuidv4(),
          paragraphNumber: paragraphNumber++,
          lines: currentParagraph,
          text: currentParagraph.join('\n')
        });
        currentChapter.totalLines += currentParagraph.length;
      }
      
      currentChapter.totalParagraphs = currentChapter.paragraphs.length;
      chapters.push(currentChapter);
    }
    
    // If no chapters found, treat entire content as one chapter
    if (chapters.length === 0) {
      const paragraphs = this.parseParagraphs(content);
      chapters.push({
        id: uuidv4(),
        chapterNumber: 1,
        title: 'Chapter 1',
        paragraphs: paragraphs,
        totalParagraphs: paragraphs.length,
        totalLines: paragraphs.reduce((sum, p) => sum + p.lines.length, 0)
      });
    }
    
    return chapters;
  }
  
  /**
   * Parse paragraphs from content
   * Parse paragraphs từ nội dung
   */
  static parseParagraphs(content) {
    const paragraphs = [];
    const lines = content.split('\n');
    let currentParagraph = [];
    // Use 1-based indexing for paragraph numbers (paragraph_001, paragraph_002, etc.)
    // Sử dụng đánh số bắt đầu từ 1 cho paragraph (paragraph_001, paragraph_002, v.v.)
    let paragraphNumber = 1;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed) {
        // Empty line = paragraph break
        if (currentParagraph.length > 0) {
          paragraphs.push({
            id: uuidv4(),
            paragraphNumber: paragraphNumber++,
            lines: currentParagraph,
            text: currentParagraph.join('\n')
          });
          currentParagraph = [];
        }
      } else {
        currentParagraph.push(trimmed);
      }
    }
    
    // Add last paragraph
    if (currentParagraph.length > 0) {
      paragraphs.push({
        id: uuidv4(),
        paragraphNumber: paragraphNumber++,
        lines: currentParagraph,
        text: currentParagraph.join('\n')
      });
    }
    
    return paragraphs;
  }
  
  /**
   * Get chapter by number
   * Lấy chapter theo số
   */
  static getChapter(novel, chapterNumber) {
    return novel.chapters.find(ch => ch.chapterNumber === chapterNumber);
  }
  
  /**
   * Get paragraph by IDs
   * Lấy paragraph theo IDs
   */
  static getParagraph(novel, chapterNumber, paragraphNumber) {
    const chapter = this.getChapter(novel, chapterNumber);
    if (!chapter) return null;
    
    return chapter.paragraphs.find(p => p.paragraphNumber === paragraphNumber);
  }
}

