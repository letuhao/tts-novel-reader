/**
 * Novel Routes
 * Routes cho Novel
 */
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { NovelParser } from '../services/novelParser.js';
import { NovelModel } from '../models/Novel.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage configuration for uploaded files
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const novelsDir = path.join(__dirname, '../../../storage/novels');
    await fs.mkdir(novelsDir, { recursive: true });
    cb(null, novelsDir);
  },
  filename: (req, file, cb) => {
    // Preserve original filename
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'));
    }
  }
});

// List all novels
router.get('/', async (req, res, next) => {
  try {
    const novels = await NovelModel.getAll();
    res.json({
      success: true,
      novels: novels
    });
  } catch (error) {
    next(error);
  }
});

// Get novel by ID
router.get('/:id', async (req, res, next) => {
  try {
    const novel = await NovelModel.getById(req.params.id);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }
    res.json({
      success: true,
      novel: novel
    });
  } catch (error) {
    next(error);
  }
});

// Upload and parse novel
router.post('/upload', upload.single('novel'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const filePath = req.file.path;
    
    // Parse novel
    const parsedNovel = await NovelParser.parseNovel(filePath);
    
    // Save to database
    const novel = await NovelModel.create(parsedNovel);
    
    res.json({
      success: true,
      novel: novel,
      message: 'Novel uploaded and parsed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Process existing file by path (for files already in novels directory)
router.post('/process', async (req, res, next) => {
  try {
    const { filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'filePath is required'
      });
    }
    
    // Normalize path and check if file exists
    let normalizedPath;
    if (path.isAbsolute(filePath)) {
      normalizedPath = filePath;
    } else {
      // Relative to novels directory
      normalizedPath = path.join(__dirname, '../../../novels', filePath);
    }
    
    // Check if file exists
    try {
      await fs.access(normalizedPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: `File not found: ${normalizedPath}`
      });
    }
    
    // Parse novel
    const parsedNovel = await NovelParser.parseNovel(normalizedPath);
    
    // Save to database
    const novel = await NovelModel.create(parsedNovel);
    
    res.json({
      success: true,
      novel: novel,
      message: 'Novel processed successfully',
      filePath: normalizedPath
    });
  } catch (error) {
    next(error);
  }
});

// Get all chapters of a novel
router.get('/:id/chapters', async (req, res, next) => {
  try {
    const novel = await NovelModel.getById(req.params.id);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }
    
    // CRITICAL: Use actual chapters array length, not totalChapters field
    // QUAN TRỌNG: Sử dụng độ dài mảng chapters thực tế, không phải trường totalChapters
    const actualChapters = novel.chapters || [];
    const actualTotalChapters = actualChapters.length;
    
    // Validate: Log warning if totalChapters doesn't match actual chapters
    // Xác thực: Log cảnh báo nếu totalChapters không khớp với chapters thực tế
    if (novel.totalChapters !== actualTotalChapters) {
      console.warn(`[Novels Route] ⚠️ Chapter count mismatch for novel ${req.params.id}`);
      console.warn(`[Novels Route] ⚠️ Không khớp số chapter cho novel ${req.params.id}`);
      console.warn(`  Database totalChapters: ${novel.totalChapters}`);
      console.warn(`  Actual chapters count: ${actualTotalChapters}`);
      console.warn(`  Using actual count: ${actualTotalChapters}`);
    }
    
    // CRITICAL: Sort chapters by chapter number to support non-sequential numbers
    // QUAN TRỌNG: Sắp xếp chapters theo số chapter để hỗ trợ số không liên tục
    // Handle both camelCase and snake_case for backward compatibility
    // Xử lý cả camelCase và snake_case để tương thích ngược
    const sortedChapters = [...actualChapters].sort((a, b) => {
      const aNum = a.chapterNumber || a.chapter_number || 0;
      const bNum = b.chapterNumber || b.chapter_number || 0;
      return aNum - bNum;
    });
    
    // Detect gaps in chapter numbers for logging
    // Phát hiện khoảng trống trong số chapter để log
    const chapterNumbers = sortedChapters.map(ch => ch.chapterNumber || ch.chapter_number || 0);
    
    // Debug: Log first few chapters to verify chapter numbers
    // Debug: Log vài chapters đầu để xác minh số chapter
    if (sortedChapters.length > 0) {
      const firstFew = sortedChapters.slice(0, 5).map(ch => ({
        id: ch.id,
        chapterNumber: ch.chapterNumber || ch.chapter_number,
        title: ch.title
      }));
      console.log(`[Novels Route] 📋 First 5 chapters:`, firstFew);
      
      // Check if all chapters have the same number (parsing issue)
      // Kiểm tra xem tất cả chapters có cùng số không (vấn đề parsing)
      const allChapterNumbers = sortedChapters.map(ch => ch.chapterNumber || ch.chapter_number);
      const uniqueNumbers = [...new Set(allChapterNumbers)];
      // Only warn if there are MULTIPLE chapters but they all have the same number
      // Chỉ cảnh báo nếu có NHIỀU chapters nhưng tất cả đều có cùng số
      if (uniqueNumbers.length === 1 && sortedChapters.length > 1) {
        console.error(`[Novels Route] ❌ CRITICAL: All ${sortedChapters.length} chapters have the same chapterNumber: ${uniqueNumbers[0]}`);
        console.error(`[Novels Route] ❌ QUAN TRỌNG: Tất cả ${sortedChapters.length} chapters đều có cùng chapterNumber: ${uniqueNumbers[0]}`);
        console.error(`[Novels Route] ❌ This indicates a parsing error. The novel file may need to be re-parsed.`);
        console.error(`[Novels Route] ❌ Điều này cho thấy lỗi parsing. File novel có thể cần được parse lại.`);
      } else if (sortedChapters.length === 1 && uniqueNumbers[0] === 1) {
        // Single chapter with number 1 is normal (novel has no chapter markers)
        // Một chapter với số 1 là bình thường (novel không có chapter markers)
        console.log(`[Novels Route] ℹ️  Single chapter detected (no chapter markers found in novel)`);
        console.log(`[Novels Route] ℹ️  Phát hiện một chapter (không tìm thấy chapter markers trong novel)`);
      }
    }
    const gaps = [];
    for (let i = 0; i < chapterNumbers.length - 1; i++) {
      if (chapterNumbers[i + 1] - chapterNumbers[i] > 1) {
        gaps.push({
          from: chapterNumbers[i],
          to: chapterNumbers[i + 1],
          missing: chapterNumbers[i + 1] - chapterNumbers[i] - 1
        });
      }
    }
    
    if (gaps.length > 0) {
      console.log(`[Novels Route] ℹ️ Non-sequential chapters detected: ${gaps.length} gaps`);
      console.log(`[Novels Route] ℹ️ Phát hiện chapters không liên tục: ${gaps.length} khoảng trống`);
      console.log(`  Chapter range: ${chapterNumbers[0]} to ${chapterNumbers[chapterNumbers.length - 1]}`);
      console.log(`  Total chapters: ${actualTotalChapters}`);
      if (gaps.length <= 5) {
        gaps.forEach(gap => {
          console.log(`  Gap: chapters ${gap.from + 1} to ${gap.to - 1} missing (${gap.missing} chapters)`);
        });
      } else {
        console.log(`  Sample gaps: ${gaps.slice(0, 3).map(g => `${g.from + 1}-${g.to - 1}`).join(', ')}...`);
      }
    }
    
    res.json({
      success: true,
      chapters: sortedChapters.map(ch => {
        // Handle both camelCase and snake_case for backward compatibility
        // Xử lý cả camelCase và snake_case để tương thích ngược
        const chapterNumber = ch.chapterNumber || ch.chapter_number || 0;
        const totalParagraphs = ch.totalParagraphs || ch.total_paragraphs || 0;
        const totalLines = ch.totalLines || ch.total_lines || 0;
        
        return {
          id: ch.id,
          chapterNumber: chapterNumber,
          title: ch.title,
          totalParagraphs: totalParagraphs,
          totalLines: totalLines
        };
      }),
      // Return actual count, not database field
      // Trả về số đếm thực tế, không phải trường database
      totalChapters: actualTotalChapters,
      // Return chapter number range for frontend reference
      // Trả về phạm vi số chapter để frontend tham khảo
      chapterRange: chapterNumbers.length > 0 ? {
        min: chapterNumbers[0],
        max: chapterNumbers[chapterNumbers.length - 1]
      } : null
    });
  } catch (error) {
    next(error);
  }
});

// Get specific chapter (from normalized database table)
router.get('/:id/chapters/:chapterNumber', async (req, res, next) => {
  try {
    const novel = await NovelModel.getById(req.params.id);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }
    
    const chapterNumber = parseInt(req.params.chapterNumber);
    
    // Get chapter from normalized database table
    const { ChapterModel } = await import('../models/Chapter.js');
    const { ParagraphModel } = await import('../models/Paragraph.js');
    
    const chapter = await ChapterModel.getByNovelAndNumber(req.params.id, chapterNumber);
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }
    
    // Load paragraphs from normalized database table
    const paragraphs = await ParagraphModel.getByChapter(chapter.id);
    chapter.paragraphs = paragraphs;
    
    res.json({
      success: true,
      chapter: chapter
    });
  } catch (error) {
    next(error);
  }
});

// Delete novel
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await NovelModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Novel deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;

