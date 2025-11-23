/**
 * Audio Routes
 * Routes cho Audio
 */
import express from 'express';
import { getAudioStorage } from '../services/audioStorage.js';
import { NovelModel } from '../models/Novel.js';
import { ChapterModel } from '../models/Chapter.js';
import { ParagraphModel } from '../models/Paragraph.js';
import { AudioCacheModel } from '../models/AudioCache.js';

const router = express.Router();

/**
 * Generate audio for chapter
 * Tạo audio cho chapter
 */
router.post('/generate/chapter', async (req, res, next) => {
  try {
    const { novelId, chapterNumber, speakerId = '05', expiryHours = 365 * 24, forceRegenerate = false, speedFactor = 1.0 } = req.body;
    
    if (!novelId || chapterNumber === undefined) {
      return res.status(400).json({
        success: false,
        error: 'novelId and chapterNumber are required'
      });
    }
    
    // Get novel and chapter
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }
    
    // Get chapter from database (normalized table)
    const chapter = await ChapterModel.getByNovelAndNumber(novelId, parseInt(chapterNumber));
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }
    
    // Get paragraphs from database (normalized table)
    const paragraphs = await ParagraphModel.getByChapter(chapter.id);
    chapter.paragraphs = paragraphs;
    
    // Check if audio already exists
    let existingAudio = null;
    try {
      existingAudio = await AudioCacheModel.getByChapter(novelId, chapter.id);
    } catch (e) {
      // Database might not be initialized, continue
    }
    
    if (existingAudio) {
      // Check if still valid
      const expiresAt = new Date(existingAudio.expires_at);
      if (expiresAt > new Date()) {
        return res.json({
          success: true,
          audio: {
            fileId: existingAudio.tts_file_id,
            audioURL: getAudioStorage().getAudioURL(existingAudio.tts_file_id),
            expiresAt: existingAudio.expires_at,
            cached: true
          }
        });
      }
    }
    
    // Combine all paragraphs into one text
    const chapterText = chapter.paragraphs
      .map(p => p.text)
      .filter(t => t.trim())
      .join('\n\n');
    
    // Generate audio
    const audioStorage = getAudioStorage();
    const audioMetadata = await audioStorage.generateAndStore(
      chapterText,
      novelId,
      chapterNumber,
      null,
      { speakerId, expiryHours }
    );
    
    // Cache audio metadata
    try {
      await AudioCacheModel.create({
        novelId: novelId,
        chapterId: chapter.id,
        chapterNumber: chapterNumber,
        ttsFileId: audioMetadata.fileId,
        speakerId: speakerId,
        expiresAt: audioMetadata.expiresAt
      });
    } catch (e) {
      // Database might not be ready, continue anyway
      console.warn('Could not cache audio metadata:', e.message);
    }
    
    res.json({
      success: true,
      audio: {
        fileId: audioMetadata.fileId,
        audioURL: audioMetadata.audioURL,
        expiresAt: audioMetadata.expiresAt,
        cached: false
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate audio for all chapters in a novel
 * Tạo audio cho tất cả chapters trong novel
 */
router.post('/generate/novel', async (req, res, next) => {
  try {
    const { novelId, speakerId = '05', expiryHours = 365 * 24, forceRegenerate = false, speedFactor = 1.0 } = req.body;
    
    if (!novelId) {
      return res.status(400).json({
        success: false,
        error: 'novelId is required'
      });
    }
    
    // Get novel to verify it exists
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }
    
    // Import worker service
    const { getWorker } = await import('../services/worker.js');
    const worker = getWorker({ 
      speakerId, 
      expiryHours,
      speedFactor
    });
    
    // Generate audio for all chapters using existing pipeline
    // This loops through all chapters and calls generateChapterAudio for each
    const result = await worker.generateAllChapters(novelId, {
      speakerId,
      expiryHours,
      speedFactor,
      forceRegenerate
    });
    
    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all paragraph audio files for a chapter
 * Lấy tất cả file audio paragraph cho một chapter
 */
router.get('/:novelId/:chapterNumber', async (req, res, next) => {
  try {
    const { novelId, chapterNumber } = req.params;
    const { speakerId = '05' } = req.query;

    // Get novel
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      return res.status(404).json({
        success: false,
        error: 'Novel not found'
      });
    }

    // Get chapter from normalized database table
    const chapter = await ChapterModel.getByNovelAndNumber(novelId, parseInt(chapterNumber));
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }
    
    // Get paragraphs from normalized database table
    const paragraphs = await ParagraphModel.getByChapter(chapter.id);
    chapter.paragraphs = paragraphs;

    // Get all paragraph audio files for this chapter
    const paragraphAudios = await AudioCacheModel.getByChapterParagraphs(
      novelId,
      chapter.id,
      speakerId
    );

    if (!paragraphAudios || paragraphAudios.length === 0) {
      return res.status(200).json({
        success: true,
        chapterNumber: parseInt(chapterNumber),
        chapterId: chapter.id,
        totalParagraphs: chapter.paragraphs.length,
        audioFileCount: 0,
        audioFiles: [],
        message: `No audio files found for this chapter. Please generate them first.`,
        needsGeneration: true
      });
    }

    // CRITICAL: Deduplicate by paragraph_number
    // Keep only the most recent entry for each paragraph (by created_at DESC)
    // Loại bỏ trùng lặp theo paragraph_number - chỉ giữ entry mới nhất cho mỗi paragraph
    const paragraphMap = new Map();
    paragraphAudios.forEach(cache => {
      const paraNum = cache.paragraph_number;
      
      // Skip entries with null/undefined paragraph_number
      if (paraNum === null || paraNum === undefined) {
        return;
      }
      
      // If we haven't seen this paragraph, or this entry is newer, keep it
      if (!paragraphMap.has(paraNum)) {
        paragraphMap.set(paraNum, cache);
      } else {
        const existing = paragraphMap.get(paraNum);
        const existingDate = new Date(existing.created_at || 0);
        const currentDate = new Date(cache.created_at || 0);
        
        // Keep the most recent one
        if (currentDate > existingDate) {
          paragraphMap.set(paraNum, cache);
        }
      }
    });
    
    // Convert map back to array
    const uniqueParagraphAudios = Array.from(paragraphMap.values());
    
    if (paragraphAudios.length !== uniqueParagraphAudios.length) {
      console.log(`[Audio Route] ⚠️ Deduplicated audio files: ${paragraphAudios.length} -> ${uniqueParagraphAudios.length} (removed ${paragraphAudios.length - uniqueParagraphAudios.length} duplicates)`);
    }
    console.log(`[Audio Route] Chapter ${chapterNumber}: ${chapter.paragraphs.length} paragraphs, returning ${uniqueParagraphAudios.length} unique audio files`);

    // Get TTS service for base URL
    const audioStorage = getAudioStorage();

    // Get novel and chapter info for URL generation (already retrieved above)
    const novelTitle = novel ? novel.title : null;
    const chapterTitle = chapter ? chapter.title : null;

    // Build novel and chapter directory names for URL generation
    // Use only novel ID and chapter number (ASCII-only, no titles to avoid encoding issues)
    // Chỉ dùng novel ID và số chapter (chỉ ASCII, không có tiêu đề để tránh vấn đề mã hóa)
    // Removed both novel title and chapter title from folder names to prevent encoding problems
    // Đã loại bỏ cả tiêu đề novel và tiêu đề chapter khỏi tên thư mục để tránh vấn đề mã hóa
    const novelDirName = novelId;  // Use only novel ID, no title
    const chapterDirName = `chapter_${String(chapterNumber).padStart(3, '0')}`;  // Use only chapter number, no title

    // Return list of paragraph audio files (for seamless playback in frontend)
    const audioFiles = uniqueParagraphAudios.map(cache => {
      // Use local audio file URL if available, otherwise fall back to TTS backend URL
      // Sử dụng URL file audio local nếu có, nếu không thì dùng URL TTS backend
      let audioURL = null;
      
      // Ensure paragraph_number is valid (not null/undefined)
      // Đảm bảo paragraph_number hợp lệ (không phải null/undefined)
      const paragraphNumber = cache.paragraph_number;
      
      if (cache.local_audio_path && paragraphNumber !== null && paragraphNumber !== undefined) {
        // Build path relative to storage directory
        // Xây dựng đường dẫn tương đối với thư mục storage
        const paragraphDirName = `paragraph_${String(paragraphNumber).padStart(3, '0')}`;
        const fileName = `paragraph_${String(paragraphNumber).padStart(3, '0')}.wav`;
        
        // Local URL: /static/audio/{novel_dir}/chapter_XXX/paragraph_XXX/paragraph_XXX.wav
        // Static files are served from /static which maps to storage directory
        audioURL = `/static/audio/${novelDirName}/${chapterDirName}/${paragraphDirName}/${fileName}`;
      } else {
        // Fallback to TTS backend URL if local path not available or paragraph_number is null
        // Dự phòng: dùng URL TTS backend nếu đường dẫn local không có hoặc paragraph_number là null
        audioURL = audioStorage.getAudioURL(cache.tts_file_id);
      }
      
      return {
        paragraphNumber: paragraphNumber, // Can be null, but we handle it
        paragraphId: cache.paragraph_id,
        fileId: cache.tts_file_id,
        audioURL: audioURL,
        expiresAt: cache.expires_at,
        createdAt: cache.created_at
      };
    }).sort((a, b) => {
      // Sort handling null values: nulls go to the end
      if (a.paragraphNumber === null || a.paragraphNumber === undefined) return 1;
      if (b.paragraphNumber === null || b.paragraphNumber === undefined) return -1;
      return a.paragraphNumber - b.paragraphNumber;
    });

    // Final validation: ensure no duplicate paragraph_numbers in response
    const paragraphNumbers = audioFiles.map(f => f.paragraphNumber).filter(p => p !== null && p !== undefined);
    const uniqueParagraphNumbers = new Set(paragraphNumbers);
    if (paragraphNumbers.length !== uniqueParagraphNumbers.size) {
      console.error(`[Audio Route] ❌ ERROR: Still have duplicates after deduplication! ${paragraphNumbers.length} paragraph numbers, ${uniqueParagraphNumbers.size} unique`);
    }

    res.json({
      success: true,
      chapterNumber: parseInt(chapterNumber),
      chapterId: chapter.id,
      totalParagraphs: chapter.paragraphs.length,
      audioFileCount: audioFiles.length,
      audioFiles: audioFiles,
      message: `Found ${audioFiles.length} unique audio file(s) for ${chapter.paragraphs.length} paragraph(s)`
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Get audio for a specific paragraph
 * Lấy audio cho một paragraph cụ thể
 */
router.get('/:novelId/:chapterNumber/:paragraphNumber', async (req, res, next) => {
  try {
    const { novelId, chapterNumber, paragraphNumber } = req.params;
    const { speakerId = '05' } = req.query;

    const cacheEntry = await AudioCacheModel.getByChapterAndParagraphNumber(
      novelId,
      parseInt(chapterNumber),
      parseInt(paragraphNumber),
      speakerId
    );

    if (!cacheEntry) {
      return res.status(404).json({
        success: false,
        error: 'Audio not found for this paragraph. Please generate it first.'
      });
    }

    // Get audio storage for URL
    const audioStorage = getAudioStorage();

    // Redirect to TTS backend for streaming
    const audioURL = audioStorage.getAudioURL(cacheEntry.tts_file_id);
    res.redirect(audioURL);

  } catch (error) {
    next(error);
  }
});

/**
 * Get audio URL
 * Lấy URL audio
 */
router.get('/url/:fileId', async (req, res) => {
  const audioStorage = getAudioStorage();
  const audioURL = audioStorage.getAudioURL(req.params.fileId);
  
  res.json({
    success: true,
    audioURL: audioURL
  });
});

export default router;
