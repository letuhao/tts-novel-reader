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
    // SIMPLE: Just find chapter markers and extract their titles
    // ĐƠN GIẢN: Chỉ tìm chapter markers và trích xuất title của chúng
    const chapterMarkers = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Chapter detection patterns - just extract the title, don't care about numbers
      // Pattern 1: "Chương 1", "Chương 2:", etc.
      let chapterMatch = line.match(/^Chương\s*\d+[:：]?\s*(.*)$/i);
      let chapterTitle = null;
      
      if (chapterMatch) {
        chapterTitle = chapterMatch[1]?.trim() || line; // Use extracted title or full line
      } else {
        // Pattern 2: "Thứ XXXX chương" or "Thứ XXXX chương (N)"
        const thuMatch = line.match(/^Thứ\s+\d+\s+chương\s*(?:[:：]\s*)?(.*)$/i);
        if (thuMatch) {
          chapterTitle = thuMatch[1]?.trim() || line; // Use extracted title or full line
          chapterMatch = thuMatch;
        }
      }
      
      if (!chapterMatch) {
        // Pattern 3: "Chapter X"
        const engMatch = line.match(/^Chapter\s+\d+[:：]?\s*(.*)$/i);
        if (engMatch) {
          chapterTitle = engMatch[1]?.trim() || line; // Use extracted title or full line
          chapterMatch = engMatch;
        }
      }
      
      if (chapterMatch) {
        chapterMarkers.push({
          lineIndex: i,
          chapterTitle: chapterTitle || line, // Store the title from text (or full line if no title)
          rawLine: line
        });
      }
    }
    
    // Step 2: Build chapter index with start/end line indexes
    // Bước 2: Xây dựng chapter index với start/end line indexes
    // CRITICAL: This ensures NO TEXT IS LOST - we use line indexes to extract text
    // QUAN TRỌNG: Điều này đảm bảo KHÔNG MẤT TEXT - chúng ta sử dụng line indexes để trích xuất text
    
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
    
    // Build chapter index: each chapter has startLineIndex and endLineIndex
    // Xây dựng chapter index: mỗi chapter có startLineIndex và endLineIndex
    // CRITICAL: Ensure NO GAPS between chapters - each line must be covered
    // QUAN TRỌNG: Đảm bảo KHÔNG CÓ KHOẢNG TRỐNG giữa các chapters - mỗi dòng phải được bao phủ
    const chapterIndex = [];
    
    for (let i = 0; i < chapterMarkers.length; i++) {
      const marker = chapterMarkers[i];
      
      // CRITICAL: Include the marker line itself in the chapter content
      // QUAN TRỌNG: Bao gồm dòng marker trong nội dung chapter
      // Chapter 1 starts at line 0 (includes any pre-chapter text AND the first marker line)
      // Chapter 1 bắt đầu ở dòng 0 (bao gồm text trước chapter VÀ dòng marker đầu tiên)
      const startLineIndex = (i === 0) 
        ? 0  // Always start from line 0 for first chapter (includes pre-chapter text and marker)
        : marker.lineIndex;  // Start AT the marker line (include it in content)
      
      // Chapter ends at the next chapter marker line (exclusive - next chapter includes that marker)
      // OR at end of file for last chapter (inclusive)
      // Chapter kết thúc ở dòng chapter marker tiếp theo (exclusive - chapter tiếp theo bao gồm marker đó)
      // HOẶC ở cuối file cho chapter cuối (inclusive)
      const endLineIndex = (i < chapterMarkers.length - 1)
        ? chapterMarkers[i + 1].lineIndex  // End before next marker (next chapter starts at this line)
        : lines.length;  // Last chapter ends at end of file (inclusive)
      
      chapterIndex.push({
        marker: marker,
        startLineIndex: startLineIndex,
        endLineIndex: endLineIndex,
        // Calculate total lines for this chapter section
        // Tính tổng số dòng cho phần chapter này
        totalLinesInSection: endLineIndex - startLineIndex
      });
    }
    
    // Step 3: Extract text using chapter index (ensures NO TEXT IS LOST)
    // Bước 3: Trích xuất text sử dụng chapter index (đảm bảo KHÔNG MẤT TEXT)
    // Process each chapter section using the index
    // Xử lý từng phần chapter sử dụng index
    for (const chapterEntry of chapterIndex) {
      const { marker, startLineIndex, endLineIndex } = chapterEntry;
      
      // CRITICAL: Extract lines by index - this ensures ALL text is captured
      // QUAN TRỌNG: Trích xuất dòng theo index - điều này đảm bảo TẤT CẢ text được capture
      // No text is lost because we use exact line indexes from the original file
      // Không mất text vì chúng ta sử dụng chính xác line indexes từ file gốc
      const chapterLines = lines.slice(startLineIndex, endLineIndex);
      
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
      
      // Create chapter object with SEQUENTIAL chapter number (1, 2, 3...)
      // Tạo object chapter với số chapter TUẦN TỰ (1, 2, 3...)
      // The chapter number is just the position/index, not from the text
      // Số chapter chỉ là vị trí/index, không phải từ text
      const chapter = {
        id: uuidv4(),
        chapterNumber: chapters.length + 1, // Sequential: 1, 2, 3, ...
        title: marker.chapterTitle, // Keep original title from text
        paragraphs: paragraphs,
        totalParagraphs: paragraphs.length,
        totalLines: paragraphs.reduce((sum, p) => sum + p.lines.length, 0),
        // Store index information for debugging
        // Lưu thông tin index để debug
        _indexInfo: {
          startLineIndex: startLineIndex,
          endLineIndex: endLineIndex,
          totalLinesInSection: endLineIndex - startLineIndex
        }
      };
      
      chapters.push(chapter);
    }
    
    // Step 4: Simple logging - no missing chapter detection needed
    // Bước 4: Logging đơn giản - không cần phát hiện missing chapters
    console.log(`[NovelParser] 📚 Parsed ${chapters.length} chapters`);
    console.log(`[NovelParser] 📚 Đã parse ${chapters.length} chapters`);
    if (chapters.length > 0) {
      // Log first few chapter titles
      // Log vài chapter titles đầu tiên
      const titlesToShow = Math.min(5, chapters.length);
      console.log(`[NovelParser] 📚 First ${titlesToShow} chapters:`);
      for (let i = 0; i < titlesToShow; i++) {
        console.log(`  Chapter ${chapters[i].chapterNumber}: "${chapters[i].title}"`);
      }
      if (chapters.length > titlesToShow) {
        console.log(`  ... and ${chapters.length - titlesToShow} more chapters`);
      }
    }
    
    // Step 5: Validation - Ensure no text is lost (using line indexes)
    // Bước 5: Xác thực - Đảm bảo không mất text (sử dụng line indexes)
    // CRITICAL: Validate that all lines are accounted for using indexes
    // QUAN TRỌNG: Xác thực rằng tất cả dòng đều được tính bằng cách sử dụng indexes
    
    // Calculate total lines covered by chapter index
    // Tính tổng số dòng được bao phủ bởi chapter index
    let totalLinesCovered = 0;
    let lastEndIndex = 0;
    
    const gaps = [];
    for (const entry of chapterIndex) {
      // Check for gaps between chapters (this should NEVER happen with correct logic)
      // Kiểm tra khoảng trống giữa các chapters (điều này KHÔNG BAO GIỜ xảy ra với logic đúng)
      if (entry.startLineIndex > lastEndIndex) {
        const gapLines = entry.startLineIndex - lastEndIndex;
        gaps.push({
          start: lastEndIndex,
          end: entry.startLineIndex,
          lines: gapLines
        });
        console.error(`[NovelParser] ❌ CRITICAL: Gap detected: ${gapLines} lines between chapters (lines ${lastEndIndex} to ${entry.startLineIndex})`);
        console.error(`[NovelParser] ❌ QUAN TRỌNG: Phát hiện khoảng trống: ${gapLines} dòng giữa các chapters (dòng ${lastEndIndex} đến ${entry.startLineIndex})`);
        console.error(`[NovelParser] ❌ This indicates TEXT LOSS - these lines are not in any chapter!`);
        console.error(`[NovelParser] ❌ Điều này cho thấy MẤT TEXT - các dòng này không nằm trong chapter nào!`);
      } else if (entry.startLineIndex < lastEndIndex) {
        // Overlap detected (shouldn't happen but log it)
        // Phát hiện overlap (không nên xảy ra nhưng log nó)
        console.warn(`[NovelParser] ⚠️ Overlap detected: Chapter starts at ${entry.startLineIndex} but previous ended at ${lastEndIndex}`);
        console.warn(`[NovelParser] ⚠️ Phát hiện overlap: Chapter bắt đầu ở ${entry.startLineIndex} nhưng chapter trước kết thúc ở ${lastEndIndex}`);
      }
      totalLinesCovered += (entry.endLineIndex - entry.startLineIndex);
      lastEndIndex = entry.endLineIndex;
    }
    
    // Check if we cover all lines from 0 to lines.length
    // Kiểm tra xem chúng ta có bao phủ tất cả dòng từ 0 đến lines.length không
    if (lastEndIndex < lines.length) {
      const missingEndLines = lines.length - lastEndIndex;
      console.error(`[NovelParser] ❌ CRITICAL: Missing ${missingEndLines} lines at end of file (lines ${lastEndIndex} to ${lines.length})`);
      console.error(`[NovelParser] ❌ QUAN TRỌNG: Thiếu ${missingEndLines} dòng ở cuối file (dòng ${lastEndIndex} đến ${lines.length})`);
      gaps.push({
        start: lastEndIndex,
        end: lines.length,
        lines: missingEndLines
      });
    }
    
    if (gaps.length > 0) {
      console.error(`[NovelParser] ❌ TEXT LOSS DETECTED: ${gaps.length} gaps found, total ${gaps.reduce((sum, g) => sum + g.lines, 0)} lines missing`);
      console.error(`[NovelParser] ❌ PHÁT HIỆN MẤT TEXT: ${gaps.length} khoảng trống được tìm thấy, tổng ${gaps.reduce((sum, g) => sum + g.lines, 0)} dòng bị thiếu`);
    }
    
    // Total lines in file
    // Tổng số dòng trong file
    const totalLinesInFile = lines.length;
    const totalLinesInChapters = chapters.reduce((sum, ch) => sum + ch.totalLines, 0);
    
    // Validation: All lines should be covered (accounting for chapter header lines)
    // Xác thực: Tất cả dòng nên được bao phủ (tính cả dòng tiêu đề chapter)
    const chapterHeaderLines = chapterMarkers.length; // Each marker is one line
    const expectedContentLines = totalLinesInFile - chapterHeaderLines;
    
    // Allow some tolerance for empty lines and parsing differences
    // Cho phép một số dung sai cho dòng trống và sự khác biệt parsing
    const tolerance = Math.max(10, Math.floor(expectedContentLines * 0.05)); // 5% tolerance or 10 lines, whichever is larger
    
    if (totalLinesInChapters < expectedContentLines - tolerance) {
      console.warn(`[NovelParser] ⚠️ Potential text loss detected!`);
      console.warn(`[NovelParser] ⚠️ Phát hiện có thể mất text!`);
      console.warn(`  Expected content lines: ${expectedContentLines}`);
      console.warn(`  Lines in chapters: ${totalLinesInChapters}`);
      console.warn(`  Difference: ${expectedContentLines - totalLinesInChapters}`);
      console.warn(`  Chapter markers found: ${chapterHeaderLines}`);
      console.warn(`  Total lines covered by index: ${totalLinesCovered}`);
      console.warn(`  Total lines in file: ${totalLinesInFile}`);
      console.warn(`  Chapters created: ${chapters.length}`);
    } else {
      console.log(`[NovelParser] ✅ Text validation passed`);
      console.log(`[NovelParser] ✅ Xác thực text đã qua`);
      console.log(`  Total lines in file: ${totalLinesInFile}`);
      console.log(`  Chapter markers: ${chapterHeaderLines}`);
      console.log(`  Content lines in chapters: ${totalLinesInChapters}`);
      console.log(`  Chapters created: ${chapters.length}`);
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

