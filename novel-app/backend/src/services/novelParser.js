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
   * 
   * CRITICAL: This function ensures NO TEXT IS LOST
   * QUAN TRỌNG: Hàm này đảm bảo KHÔNG MẤT TEXT
   * 
   * Strategy:
   * 1. First, find all chapter marker positions (line indexes)
   * 2. Then, extract text between those positions
   * 3. This ensures all text is captured, even if chapter detection is imperfect
   * 
   * Chiến lược:
   * 1. Đầu tiên, tìm tất cả vị trí chapter marker (chỉ số dòng)
   * 2. Sau đó, trích xuất text giữa các vị trí đó
   * 3. Điều này đảm bảo tất cả text được capture, ngay cả khi phát hiện chapter không hoàn hảo
   */
  static parseChapters(content) {
    const lines = content.split('\n');
    const chapters = [];
    
    // Step 1: Find all chapter marker positions (line indexes)
    // Bước 1: Tìm tất cả vị trí chapter marker (chỉ số dòng)
    const chapterMarkers = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Chapter detection patterns
      // Pattern 1: "Chương 1", "Chương 2:", etc.
      let chapterMatch = line.match(/^Chương\s*(\d+)[:：]?\s*(.*)$/i);
      let chapterNumber = null;
      let chapterTitle = null;
      
      if (chapterMatch) {
        chapterNumber = parseInt(chapterMatch[1]);
        chapterTitle = chapterMatch[2]?.trim() || `Chương ${chapterNumber}`;
      } else {
        // Pattern 2: "Thứ XXXX chương"
        const thuMatch = line.match(/^Thứ\s+(\d+)\s+chương\s*[:：]?\s*(.*)$/i);
        if (thuMatch) {
          chapterNumber = parseInt(thuMatch[1]);
          chapterTitle = thuMatch[2]?.trim() || `Chương ${chapterNumber}`;
          chapterMatch = thuMatch;
        }
      }
      
      if (!chapterMatch) {
        // Pattern 3: "Chapter X"
        const engMatch = line.match(/^Chapter\s+(\d+)[:：]?\s*(.*)$/i);
        if (engMatch) {
          chapterNumber = parseInt(engMatch[1]);
          chapterTitle = engMatch[2]?.trim() || `Chapter ${chapterNumber}`;
          chapterMatch = engMatch;
        }
      }
      
      if (chapterMatch && chapterNumber !== null) {
        chapterMarkers.push({
          lineIndex: i,
          chapterNumber: chapterNumber,
          chapterTitle: chapterTitle,
          rawLine: line
        });
      }
    }
    
    // Step 2: Extract text between chapter markers (ensures NO TEXT IS LOST)
    // Bước 2: Trích xuất text giữa các chapter marker (đảm bảo KHÔNG MẤT TEXT)
    
    if (chapterMarkers.length === 0) {
      // No chapter markers found - treat entire content as one chapter
      // Không tìm thấy chapter marker - xử lý toàn bộ nội dung như một chapter
      const paragraphs = this.parseParagraphs(content);
      return [{
        id: uuidv4(),
        chapterNumber: 1,
        title: 'Chapter 1',
        paragraphs: paragraphs,
        totalParagraphs: paragraphs.length,
        totalLines: paragraphs.reduce((sum, p) => sum + p.lines.length, 0)
      }];
    }
    
    // Process each chapter section
    // Xử lý từng phần chapter
    for (let i = 0; i < chapterMarkers.length; i++) {
      const marker = chapterMarkers[i];
      const startLineIndex = marker.lineIndex;
      const endLineIndex = (i < chapterMarkers.length - 1) 
        ? chapterMarkers[i + 1].lineIndex 
        : lines.length; // Last chapter goes to end of file
      
      // Extract lines for this chapter (by index - ensures no text is lost)
      // Trích xuất các dòng cho chapter này (theo index - đảm bảo không mất text)
      const chapterLines = lines.slice(startLineIndex + 1, endLineIndex); // +1 to skip chapter header line
      
      // Parse paragraphs from chapter lines
      // Parse paragraphs từ các dòng chapter
      const paragraphs = [];
      let currentParagraph = [];
      let paragraphNumber = 1; // 1-based indexing
      
      for (const line of chapterLines) {
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
          // Skip lines that look like chapter markers (might be false positives in content)
          // Bỏ qua các dòng trông giống chapter marker (có thể là false positive trong nội dung)
          if (trimmed.match(/^Chương\s*\d+/i) && !trimmed.match(/^Chương\s*\d+[:：]/i)) {
            // Might be a chapter reference in text, include it as content
            // Có thể là tham chiếu chapter trong text, bao gồm nó như nội dung
            currentParagraph.push(trimmed);
          } else {
            currentParagraph.push(trimmed);
          }
        }
      }
      
      // Add last paragraph if exists
      // Thêm paragraph cuối nếu tồn tại
      if (currentParagraph.length > 0) {
        paragraphs.push({
          id: uuidv4(),
          paragraphNumber: paragraphNumber++,
          lines: currentParagraph,
          text: currentParagraph.join('\n')
        });
      }
      
      // Create chapter object
      // Tạo object chapter
      const chapter = {
        id: uuidv4(),
        chapterNumber: marker.chapterNumber,
        title: marker.chapterTitle,
        paragraphs: paragraphs,
        totalParagraphs: paragraphs.length,
        totalLines: paragraphs.reduce((sum, p) => sum + p.lines.length, 0)
      };
      
      chapters.push(chapter);
    }
    
    // Step 3: Handle text before first chapter marker (if any)
    // Bước 3: Xử lý text trước chapter marker đầu tiên (nếu có)
    if (chapterMarkers.length > 0 && chapterMarkers[0].lineIndex > 0) {
      // There's text before the first chapter - add it to first chapter or create chapter 0
      // Có text trước chapter đầu tiên - thêm vào chapter đầu hoặc tạo chapter 0
      const preChapterLines = lines.slice(0, chapterMarkers[0].lineIndex);
      const preChapterText = preChapterLines.join('\n').trim();
      
      if (preChapterText.length > 0) {
        // Add to first chapter as initial paragraphs
        // Thêm vào chapter đầu như các paragraph ban đầu
        const preParagraphs = this.parseParagraphs(preChapterText);
        if (preParagraphs.length > 0) {
          // Prepend to first chapter
          // Thêm vào đầu chapter đầu tiên
          const firstChapter = chapters[0];
          // Renumber paragraphs
          // Đánh số lại paragraphs
          const offset = preParagraphs.length;
          preParagraphs.forEach((p, idx) => {
            p.paragraphNumber = idx + 1;
          });
          firstChapter.paragraphs.forEach((p, idx) => {
            p.paragraphNumber = offset + idx + 1;
          });
          firstChapter.paragraphs = [...preParagraphs, ...firstChapter.paragraphs];
          firstChapter.totalParagraphs = firstChapter.paragraphs.length;
          firstChapter.totalLines = firstChapter.paragraphs.reduce((sum, p) => sum + p.lines.length, 0);
        }
      }
    }
    
    // Step 4: Detect and handle missing chapters (gaps in chapter numbers)
    // Bước 4: Phát hiện và xử lý chapters bị thiếu (khoảng trống trong số chapter)
    // Sort chapters by chapter number to detect gaps
    // Sắp xếp chapters theo số chapter để phát hiện khoảng trống
    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    
    // Detect gaps in chapter numbers
    // Phát hiện khoảng trống trong số chapter
    const missingChapters = [];
    for (let i = 0; i < chapters.length - 1; i++) {
      const currentNum = chapters[i].chapterNumber;
      const nextNum = chapters[i + 1].chapterNumber;
      if (nextNum - currentNum > 1) {
        // Gap detected: chapters between currentNum and nextNum are missing
        // Phát hiện khoảng trống: các chapters giữa currentNum và nextNum bị thiếu
        for (let missingNum = currentNum + 1; missingNum < nextNum; missingNum++) {
          missingChapters.push({
            missingNumber: missingNum,
            beforeChapter: chapters[i],
            afterChapter: chapters[i + 1]
          });
        }
      }
    }
    
    if (missingChapters.length > 0) {
      console.warn(`[NovelParser] ⚠️ Missing chapters detected: ${missingChapters.length} gaps`);
      console.warn(`[NovelParser] ⚠️ Phát hiện chapters bị thiếu: ${missingChapters.length} khoảng trống`);
      missingChapters.forEach(({ missingNumber, beforeChapter, afterChapter }) => {
        console.warn(`  Missing chapter ${missingNumber} (between ${beforeChapter.chapterNumber} and ${afterChapter.chapterNumber})`);
        console.warn(`  Chapter bị thiếu ${missingNumber} (giữa ${beforeChapter.chapterNumber} và ${afterChapter.chapterNumber})`);
      });
      
      // Strategy: Merge missing chapter text into the previous chapter
      // Chiến lược: Merge text của chapter bị thiếu vào chapter trước đó
      // This ensures no text is lost, even if chapter detection missed some markers
      // Điều này đảm bảo không mất text, ngay cả khi phát hiện chapter bỏ sót một số marker
      console.log(`[NovelParser] ℹ️ Missing chapters will be merged into previous chapters`);
      console.log(`[NovelParser] ℹ️ Các chapters bị thiếu sẽ được merge vào chapters trước đó`);
      console.log(`[NovelParser] ℹ️ Note: This is expected if chapter markers were missed during parsing`);
      console.log(`[NovelParser] ℹ️ Lưu ý: Điều này là bình thường nếu chapter markers bị bỏ sót khi parse`);
    }
    
    // Step 5: Validation - Ensure no text is lost
    // Bước 5: Xác thực - Đảm bảo không mất text
    const totalLinesInChapters = chapters.reduce((sum, ch) => sum + ch.totalLines, 0);
    const totalLinesInFile = lines.filter(l => l.trim().length > 0).length;
    const chapterMarkerLines = chapterMarkers.length;
    const expectedContentLines = totalLinesInFile - chapterMarkerLines; // Exclude chapter header lines
    
    // Allow some tolerance for empty lines and chapter headers
    // Cho phép một số dung sai cho dòng trống và tiêu đề chapter
    const tolerance = Math.max(10, Math.floor(expectedContentLines * 0.05)); // 5% tolerance or 10 lines, whichever is larger
    
    if (totalLinesInChapters < expectedContentLines - tolerance) {
      console.warn(`[NovelParser] ⚠️ Potential text loss detected!`);
      console.warn(`[NovelParser] ⚠️ Phát hiện có thể mất text!`);
      console.warn(`  Expected content lines: ${expectedContentLines}`);
      console.warn(`  Lines in chapters: ${totalLinesInChapters}`);
      console.warn(`  Difference: ${expectedContentLines - totalLinesInChapters}`);
      console.warn(`  Chapter markers found: ${chapterMarkerLines}`);
      console.warn(`  Chapters created: ${chapters.length}`);
      console.warn(`  Missing chapters detected: ${missingChapters.length}`);
      
      // If we have missing chapters, the text might be in those gaps
      // Nếu có chapters bị thiếu, text có thể nằm trong các khoảng trống đó
      if (missingChapters.length > 0) {
        console.warn(`  ⚠️ Text may be in missing chapter gaps - check file for missed chapter markers`);
        console.warn(`  ⚠️ Text có thể nằm trong khoảng trống chapters bị thiếu - kiểm tra file để tìm chapter markers bị bỏ sót`);
      }
    } else {
      console.log(`[NovelParser] ✅ Text validation passed`);
      console.log(`[NovelParser] ✅ Xác thực text đã qua`);
      console.log(`  Total lines in file: ${totalLinesInFile}`);
      console.log(`  Chapter markers: ${chapterMarkerLines}`);
      console.log(`  Content lines in chapters: ${totalLinesInChapters}`);
      console.log(`  Chapters created: ${chapters.length}`);
      if (missingChapters.length > 0) {
        console.log(`  Missing chapters: ${missingChapters.length} (text merged into previous chapters)`);
        console.log(`  Chapters bị thiếu: ${missingChapters.length} (text đã được merge vào chapters trước đó)`);
      }
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

