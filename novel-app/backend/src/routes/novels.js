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
    
    res.json({
      success: true,
      chapters: novel.chapters.map(ch => ({
        id: ch.id,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        totalParagraphs: ch.totalParagraphs,
        totalLines: ch.totalLines
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get specific chapter
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
    const chapter = NovelParser.getChapter(novel, chapterNumber);
    
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }
    
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

