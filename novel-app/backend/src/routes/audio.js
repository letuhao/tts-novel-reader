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
    const { novelId, chapterNumber, speakerId = '05', expiryHours = 365 * 24 } = req.body;
    
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
    
    const chapter = NovelParser.getChapter(novel, parseInt(chapterNumber));
    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }
    
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
      return res.status(404).json({
        success: false,
        error: 'No audio files found for this chapter. Please generate them first.',
        totalParagraphs: chapter.paragraphs.length
      });
    }

    // Get TTS service for base URL
    const audioStorage = getAudioStorage();

    // Return list of paragraph audio files (for seamless playback in frontend)
    const audioFiles = paragraphAudios.map(cache => ({
      paragraphNumber: cache.paragraph_number,
      paragraphId: cache.paragraph_id,
      fileId: cache.tts_file_id,
      audioURL: audioStorage.getAudioURL(cache.tts_file_id),
      expiresAt: cache.expires_at,
      createdAt: cache.created_at
    })).sort((a, b) => a.paragraphNumber - b.paragraphNumber);

    res.json({
      success: true,
      chapterNumber: parseInt(chapterNumber),
      chapterId: chapter.id,
      totalParagraphs: chapter.paragraphs.length,
      audioFileCount: audioFiles.length,
      audioFiles: audioFiles,
      message: `Found ${audioFiles.length} audio file(s) for ${chapter.paragraphs.length} paragraph(s)`
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
