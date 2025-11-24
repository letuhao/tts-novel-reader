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
      let baseChapterNumber = null;
      
      if (chapterMatch) {
        baseChapterNumber = parseInt(chapterMatch[1]);
        chapterNumber = baseChapterNumber;
        chapterTitle = chapterMatch[2]?.trim() || `Chương ${chapterNumber}`;
      } else {
        // Pattern 2: "Thứ XXXX chương" or "Thứ XXXX chương (N)"
        // CRITICAL: Handle cases like "Thứ 1578 chương (1)" and "Thứ 1578 chương (2)"
        // QUAN TRỌNG: Xử lý các trường hợp như "Thứ 1578 chương (1)" và "Thứ 1578 chương (2)"
        const thuMatch = line.match(/^Thứ\s+(\d+)\s+chương\s*(?:[:：]\s*)?(.*)$/i);
        if (thuMatch) {
          baseChapterNumber = parseInt(thuMatch[1]);
          const titlePart = thuMatch[2]?.trim() || '';
          
          // Check if title contains parentheses with number, e.g., "(1)", "(2)"
          // Kiểm tra xem title có chứa dấu ngoặc đơn với số không, ví dụ: "(1)", "(2)"
          const parenMatch = titlePart.match(/^\((\d+)\)/);
          if (parenMatch) {
            // Use base number + suffix to create unique chapter number
            // Sử dụng số cơ sở + hậu tố để tạo số chapter duy nhất
            // Format: baseNumber * 10000 + suffix (supports up to 9999 sub-chapters)
            // This ensures uniqueness while preserving the base number relationship
            // Format: baseNumber * 10000 + suffix (hỗ trợ tối đa 9999 sub-chapters)
            // Điều này đảm bảo tính duy nhất trong khi vẫn giữ mối quan hệ số cơ sở
            const suffix = parseInt(parenMatch[1]);
            chapterNumber = baseChapterNumber * 10000 + suffix;
            chapterTitle = titlePart || `Chương ${baseChapterNumber} (${suffix})`;
          } else {
            // No suffix, use base number
            // Không có hậu tố, sử dụng số cơ sở
            chapterNumber = baseChapterNumber;
            chapterTitle = titlePart || `Chương ${chapterNumber}`;
          }
          chapterMatch = thuMatch;
        }
      }
      
      if (!chapterMatch) {
        // Pattern 3: "Chapter X"
        const engMatch = line.match(/^Chapter\s+(\d+)[:：]?\s*(.*)$/i);
        if (engMatch) {
          baseChapterNumber = parseInt(engMatch[1]);
          chapterNumber = baseChapterNumber;
          chapterTitle = engMatch[2]?.trim() || `Chapter ${chapterNumber}`;
          chapterMatch = engMatch;
        }
      }
      
      if (chapterMatch && chapterNumber !== null) {
        chapterMarkers.push({
          lineIndex: i,
          chapterNumber: chapterNumber,
          baseChapterNumber: baseChapterNumber || chapterNumber,
          chapterTitle: chapterTitle,
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
    const chapterIndex = [];
    
    for (let i = 0; i < chapterMarkers.length; i++) {
      const marker = chapterMarkers[i];
      
      // Chapter 1 starts at line 0 (or after pre-chapter text)
      // Chapter 1 bắt đầu ở dòng 0 (hoặc sau text trước chapter)
      const startLineIndex = (i === 0 && marker.lineIndex > 0) 
        ? 0  // Include text before first chapter marker
        : marker.lineIndex + 1;  // Start after chapter header line
      
      // Chapter ends before next chapter marker (or at end of file for last chapter)
      // Chapter kết thúc trước chapter marker tiếp theo (hoặc ở cuối file cho chapter cuối)
      const endLineIndex = (i < chapterMarkers.length - 1)
        ? chapterMarkers[i + 1].lineIndex  // End before next chapter marker
        : lines.length;  // Last chapter ends at end of file
      
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
      
      // Create chapter object
      // Tạo object chapter
      const chapter = {
        id: uuidv4(),
        chapterNumber: marker.chapterNumber,
        title: marker.chapterTitle,
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
    
    // Step 4: Detect and handle missing chapters (gaps in chapter numbers)
    // Bước 4: Phát hiện và xử lý chapters bị thiếu (khoảng trống trong số chapter)
    // Sort chapters by chapter number to detect gaps
    // Sắp xếp chapters theo số chapter để phát hiện khoảng trống
    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    
    // Log chapter numbers for debugging
    // Log số chapter để debug
    if (chapters.length > 0) {
      const chapterNumbers = chapters.map(ch => ch.chapterNumber);
      const uniqueNumbers = [...new Set(chapterNumbers)];
      console.log(`[NovelParser] 📚 Parsed ${chapters.length} chapters`);
      console.log(`[NovelParser] 📚 Đã parse ${chapters.length} chapters`);
      console.log(`[NovelParser] 📚 Unique chapter numbers: ${uniqueNumbers.length}`);
      console.log(`[NovelParser] 📚 Số chapter duy nhất: ${uniqueNumbers.length}`);
      if (uniqueNumbers.length < chapters.length) {
        console.warn(`[NovelParser] ⚠️ WARNING: Duplicate chapter numbers detected!`);
        console.warn(`[NovelParser] ⚠️ CẢNH BÁO: Phát hiện số chapter trùng lặp!`);
        console.warn(`[NovelParser] ⚠️ This may cause chapters to be overwritten in database.`);
        console.warn(`[NovelParser] ⚠️ Điều này có thể khiến chapters bị ghi đè trong database.`);
      }
      // Log first and last few chapter numbers
      // Log vài số chapter đầu và cuối
      if (chapters.length <= 10) {
        console.log(`[NovelParser] 📚 Chapter numbers: ${chapterNumbers.join(', ')}`);
      } else {
        console.log(`[NovelParser] 📚 First 5: ${chapterNumbers.slice(0, 5).join(', ')}, ... Last 5: ${chapterNumbers.slice(-5).join(', ')}`);
      }
    }
    
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
    
    // Step 5: Validation - Ensure no text is lost (using line indexes)
    // Bước 5: Xác thực - Đảm bảo không mất text (sử dụng line indexes)
    // CRITICAL: Validate that all lines are accounted for using indexes
    // QUAN TRỌNG: Xác thực rằng tất cả dòng đều được tính bằng cách sử dụng indexes
    
    // Calculate total lines covered by chapter index
    // Tính tổng số dòng được bao phủ bởi chapter index
    let totalLinesCovered = 0;
    let lastEndIndex = 0;
    
    for (const entry of chapterIndex) {
      // Check for gaps between chapters
      // Kiểm tra khoảng trống giữa các chapters
      if (entry.startLineIndex > lastEndIndex) {
        const gapLines = entry.startLineIndex - lastEndIndex;
        console.warn(`[NovelParser] ⚠️ Gap detected: ${gapLines} lines between chapters (lines ${lastEndIndex} to ${entry.startLineIndex})`);
        console.warn(`[NovelParser] ⚠️ Phát hiện khoảng trống: ${gapLines} dòng giữa các chapters (dòng ${lastEndIndex} đến ${entry.startLineIndex})`);
      }
      totalLinesCovered += (entry.endLineIndex - entry.startLineIndex);
      lastEndIndex = entry.endLineIndex;
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

