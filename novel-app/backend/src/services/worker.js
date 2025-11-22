/**
 * Audio Generation Worker
 * Worker Tạo Audio
 * 
 * Pre-generates audio for novel chapters/paragraphs/lines
 * Tạo audio trước cho chapters/paragraphs/lines của novel
 */
import { getAudioStorage } from './audioStorage.js';
import { NovelModel } from '../models/Novel.js';
import { ChapterModel } from '../models/Chapter.js';
import { ParagraphModel } from '../models/Paragraph.js';
import { GenerationProgressModel } from '../models/GenerationProgress.js';
import { AudioCacheModel } from '../models/AudioCache.js';
import { v4 as uuidv4 } from 'uuid';

export class AudioWorker {
  constructor(options = {}) {
    this.audioStorage = getAudioStorage();
    this.batchSize = options.batchSize || 1; // Process N items at a time
    this.delayBetweenBatches = options.delayBetweenBatches || 11110; // ms - Increased for slower processing (50% slower)
    this.delayBetweenItems = options.delayBetweenItems || 2000; // ms - Delay between individual items
    this.maxRetries = options.maxRetries || 3;
           this.speakerId = options.speakerId || '05';
           this.expiryHours = options.expiryHours || 365 * 24;
           this.speedFactor = options.speedFactor || 1.0;  // Normal speed (matches preset)
  }

  /**
   * Generate audio for a single chapter (split by paragraphs)
   * Tạo audio cho một chapter (chia theo paragraphs)
   * 
   * Generates separate audio files for each paragraph to avoid token limits
   * and enable seamless playback in frontend.
   * 
   * Tạo các file audio riêng cho từng paragraph để tránh giới hạn token
   * và cho phép phát liền mạch ở frontend.
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result with paragraph audio files
   */
  async generateChapterAudio(novelId, chapterNumber, options = {}) {
    const {
      speakerId = this.speakerId,
      expiryHours = this.expiryHours,
      forceRegenerate = false,
      maxParagraphs = null  // Limit number of paragraphs to generate (null = all)
    } = options;

    try {
      // Get novel
      const novel = await NovelModel.getById(novelId);
      if (!novel) {
        throw new Error(`Novel not found: ${novelId}`);
      }

      // Get chapter from database (normalized table)
      const chapter = await ChapterModel.getByNovelAndNumber(novelId, chapterNumber);
      if (!chapter) {
        throw new Error(`Chapter ${chapterNumber} not found in novel ${novelId}`);
      }
      
      // Get paragraphs from database (normalized table)
      const paragraphs = await ParagraphModel.getByChapter(chapter.id);
      if (!paragraphs || paragraphs.length === 0) {
        throw new Error(`Chapter ${chapterNumber} has no paragraphs`);
      }
      
      // Transform to expected format for compatibility
      chapter.paragraphs = paragraphs;

      // Generate audio for each paragraph separately
      const paragraphResults = [];
      const errors = [];
      
      // Limit number of paragraphs if maxParagraphs is set
      // Giới hạn số paragraph nếu maxParagraphs được đặt
      const totalParagraphs = chapter.paragraphs.length;
      const paragraphsToProcess = maxParagraphs !== null && maxParagraphs > 0
        ? Math.min(maxParagraphs, totalParagraphs)
        : totalParagraphs;
      
      console.log(`Generating audio for chapter ${chapterNumber} with ${totalParagraphs} paragraphs (processing ${paragraphsToProcess})...`);
      console.log(`Tạo audio cho chapter ${chapterNumber} với ${totalParagraphs} paragraphs (đang xử lý ${paragraphsToProcess})...`);

      for (let i = 0; i < paragraphsToProcess; i++) {
        const paragraph = chapter.paragraphs[i];
        const paragraphText = paragraph.text?.trim();
        
        // Skip empty paragraphs
        if (!paragraphText || paragraphText.length === 0) {
          console.log(`Skipping empty paragraph ${i} in chapter ${chapterNumber}`);
          continue;
        }

        try {
          // Check if paragraph audio already exists
          if (!forceRegenerate) {
            const existingAudio = await AudioCacheModel.getByParagraph(
              novelId,
              chapter.id,
              paragraph.id
            );
            if (existingAudio) {
              const expiresAt = new Date(existingAudio.expires_at);
              if (expiresAt > new Date()) {
                paragraphResults.push({
                  success: true,
                  cached: true,
                  paragraphNumber: paragraph.paragraphNumber,
                  paragraphId: paragraph.id,
                  fileId: existingAudio.tts_file_id,
                  audioURL: this.audioStorage.getAudioURL(existingAudio.tts_file_id),
                  text: paragraphText.substring(0, 50) + '...'
                });
                continue; // Skip generation, use cached
              }
            }
          }

          // Track generation progress - Mark as started
          // Theo dõi tiến độ tạo - Đánh dấu đã bắt đầu
          let progressId = null;
          try {
            const progress = await GenerationProgressModel.createOrUpdate({
              novelId: novelId,
              chapterId: chapter.id,
              chapterNumber: chapterNumber,
              paragraphId: paragraph.id,
              paragraphNumber: paragraph.paragraphNumber,
              status: 'in_progress',
              speakerId: speakerId,
              model: 'dia',
              progressPercent: 0,
              startedAt: new Date().toISOString()
            });
            progressId = progress.id;
            console.log(`[Worker] Generation progress tracked: ${progressId}`);
            console.log(`[Worker] Tiến độ tạo được theo dõi: ${progressId}`);
          } catch (progressError) {
            console.warn(`[Worker] ⚠️ Failed to track progress: ${progressError.message}`);
            console.warn(`[Worker] ⚠️ Không thể theo dõi tiến độ: ${progressError.message}`);
          }
          
          // Generate audio for this paragraph
          console.log(`[Worker] ==========================================`);
          console.log(`[Worker] Processing paragraph ${paragraph.paragraphNumber}`);
          console.log(`[Worker] Xử lý paragraph ${paragraph.paragraphNumber}`);
          console.log(`[Worker] Text length: ${paragraphText.length} chars`);
          console.log(`[Worker] Text preview: ${paragraphText.substring(0, 100)}...`);
          console.log(`[Worker] Paragraph ID: ${paragraph.id}`);
          console.log(`[Worker] Chapter: ${chapterNumber}, Novel: ${novelId}`);
          
          // Get novel and chapter info for better organization
          // Lấy thông tin novel và chapter để tổ chức tốt hơn
          const novelTitle = novel.title || null;
          const chapterTitle = chapter.title || null;
          
          const audioMetadata = await this.audioStorage.generateAndStore(
            paragraphText,
            novelId,
            chapterNumber,
            paragraph.paragraphNumber,
            {
              speakerId: speakerId,
              ttsExpiryHours: 2,  // TTS backend cache: 2 hours (short-term temporary storage)
              speedFactor: this.speedFactor,  // Normal speed (1.0) to match preset
              deleteFromTTSAfterDownload: true,  // Clean up TTS cache after download
              chapterTitle: chapterTitle,  // Include chapter title for better organization
              novelTitle: novelTitle,       // Include novel title for better organization
              paragraphId: paragraph.id,    // Include paragraph database ID
              paragraphIndex: i,            // Include paragraph index in chapter (for navigation)
              totalParagraphsInChapter: chapter.paragraphs.length,  // Total paragraphs for progress (e.g., "5 of 112")
              model: 'dia'                  // Include model name
            }
          );
          
          console.log(`[Worker] ✅ Paragraph ${paragraph.paragraphNumber} audio generated`);
          console.log(`[Worker] ✅ Audio paragraph ${paragraph.paragraphNumber} đã được tạo`);
          console.log(`[Worker] File ID: ${audioMetadata.fileId}`);
          console.log(`[Worker] Local Audio Path: ${audioMetadata.localAudioPath || 'NOT SAVED ❌'}`);
          console.log(`[Worker] ==========================================`);

          // Cache paragraph audio metadata
          await AudioCacheModel.create({
            novelId: novelId,
            chapterId: chapter.id,
            chapterNumber: chapterNumber,
            paragraphId: paragraph.id,
            paragraphNumber: paragraph.paragraphNumber,
            ttsFileId: audioMetadata.fileId,
            speakerId: speakerId,
            expiresAt: audioMetadata.expiresAt,
            model: 'dia',
            localAudioPath: audioMetadata.localAudioPath || null,
            audioDuration: audioMetadata.audioDuration || null,
            audioFileSize: audioMetadata.audioFileSize || null
          });
          
          // Update generation progress - Mark as completed
          // Cập nhật tiến độ tạo - Đánh dấu hoàn thành
          if (progressId) {
            try {
              await GenerationProgressModel.update(progressId, {
                status: 'completed',
                progressPercent: 100,
                completedAt: new Date().toISOString()
              });
              console.log(`[Worker] ✅ Generation progress marked as completed`);
              console.log(`[Worker] ✅ Tiến độ tạo được đánh dấu hoàn thành`);
            } catch (progressError) {
              console.warn(`[Worker] ⚠️ Failed to update progress: ${progressError.message}`);
              console.warn(`[Worker] ⚠️ Không thể cập nhật tiến độ: ${progressError.message}`);
            }
          }

          paragraphResults.push({
            success: true,
            cached: false,
            paragraphNumber: paragraph.paragraphNumber,
            paragraphId: paragraph.id,
            fileId: audioMetadata.fileId,
            audioURL: audioMetadata.audioURL,
            text: paragraphText.substring(0, 50) + '...'
          });

          // Small delay between paragraphs to avoid overloading TTS backend
          // Only delay if not the last paragraph being processed
          if (i < paragraphsToProcess - 1) {
            await new Promise(resolve => setTimeout(resolve, this.delayBetweenItems / 2));
          }
        } catch (error) {
          console.error(`[Worker] ❌ Error generating audio for paragraph ${paragraph.paragraphNumber}: ${error.message}`);
          console.error(`[Worker] ❌ Lỗi tạo audio cho paragraph ${paragraph.paragraphNumber}: ${error.message}`);
          
          // Update generation progress - Mark as failed
          // Cập nhật tiến độ tạo - Đánh dấu thất bại
          if (progressId) {
            try {
              await GenerationProgressModel.update(progressId, {
                status: 'failed',
                errorMessage: error.message
              });
              console.log(`[Worker] ⚠️ Generation progress marked as failed`);
              console.log(`[Worker] ⚠️ Tiến độ tạo được đánh dấu thất bại`);
            } catch (progressError) {
              console.warn(`[Worker] ⚠️ Failed to update progress: ${progressError.message}`);
            }
          } else {
            // Create progress entry for failed generation
            try {
              await GenerationProgressModel.createOrUpdate({
                novelId: novelId,
                chapterId: chapter.id,
                chapterNumber: chapterNumber,
                paragraphId: paragraph.id,
                paragraphNumber: paragraph.paragraphNumber,
                status: 'failed',
                speakerId: speakerId,
                model: 'dia',
                errorMessage: error.message
              });
            } catch (progressError) {
              console.warn(`[Worker] ⚠️ Failed to create progress entry: ${progressError.message}`);
            }
          }
          
          errors.push({
            paragraphNumber: paragraph.paragraphNumber,
            paragraphId: paragraph.id,
            error: error.message
          });
          // Continue with next paragraph instead of failing entire chapter
        }
      }

      // Get generation statistics from database
      // Lấy thống kê generation từ database
      let generationStats = null;
      try {
        generationStats = await GenerationProgressModel.getChapterStats(novelId, chapterNumber);
        console.log(`[Worker] Generation statistics:`, generationStats);
        console.log(`[Worker] Thống kê generation:`, generationStats);
      } catch (statsError) {
        console.warn(`[Worker] ⚠️ Failed to get generation stats: ${statsError.message}`);
      }
      
      // Return results
      const successCount = paragraphResults.filter(r => r.success).length;
      const failedCount = errors.length;
      const cachedCount = paragraphResults.filter(r => r.cached).length;
      const generatedCount = paragraphResults.filter(r => !r.cached).length;

      return {
        success: successCount > 0,
        chapterNumber: chapterNumber,
        chapterId: chapter.id,
        totalParagraphs: chapter.paragraphs.length,
        successCount: successCount,
        failedCount: failedCount,
        cachedCount: cachedCount,
        generatedCount: generatedCount,
        paragraphResults: paragraphResults,
        errors: errors,
        generationStats: generationStats,  // Include generation progress statistics
        message: `Generated ${generatedCount} new, ${cachedCount} cached, ${failedCount} failed out of ${chapter.paragraphs.length} paragraphs`
      };
    } catch (error) {
      return {
        success: false,
        chapterNumber: chapterNumber,
        error: error.message,
        message: `Failed to generate chapter audio: ${error.message}`
      };
    }
  }

  /**
   * Generate audio for multiple chapters
   * Tạo audio cho nhiều chapters
   * 
   * @param {string} novelId - Novel ID
   * @param {number[]} chapterNumbers - Array of chapter numbers
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Batch generation results
   */
  async generateBatchAudio(novelId, chapterNumbers, options = {}) {
    const results = [];
    const total = chapterNumbers.length;

    for (let i = 0; i < chapterNumbers.length; i += this.batchSize) {
      const batch = chapterNumbers.slice(i, i + this.batchSize);
      
      // Process items sequentially with delay for slower processing (50% slower)
      const batchResults = [];
      for (const chapterNumber of batch) {
        const result = await this.generateChapterAudio(novelId, chapterNumber, options);
        batchResults.push(result);
        
        // Delay between individual items (except for last item in batch)
        if (chapterNumber !== batch[batch.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, this.delayBetweenItems));
        }
      }

      results.push(...batchResults);

      // Progress callback
      if (options.onProgress) {
        options.onProgress({
          completed: results.length,
          total: total,
          percentage: Math.round((results.length / total) * 100),
          currentBatch: batch,
          results: batchResults
        });
      }

      // Delay between batches (except for last batch) - Increased delay for slower processing
      if (i + this.batchSize < chapterNumbers.length) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    const cachedCount = results.filter(r => r.cached).length;

    return {
      success: true,
      total: total,
      completed: successCount,
      failed: failedCount,
      cached: cachedCount,
      generated: successCount - cachedCount,
      results: results,
      summary: {
        total: total,
        success: successCount,
        failed: failedCount,
        cached: cachedCount,
        newlyGenerated: successCount - cachedCount
      }
    };
  }

  /**
   * Generate audio for all chapters in a novel
   * Tạo audio cho tất cả chapters trong novel
   * 
   * @param {string} novelId - Novel ID
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation results
   */
  async generateAllChapters(novelId, options = {}) {
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      throw new Error(`Novel not found: ${novelId}`);
    }

    const allChapterNumbers = novel.chapters.map(ch => ch.chapterNumber);
    
    return await this.generateBatchAudio(novelId, allChapterNumbers, options);
  }

  /**
   * Get generation status for a chapter
   * Lấy trạng thái tạo audio cho chapter
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @returns {Promise<Object>} Generation status
   */
  async getChapterStatus(novelId, chapterNumber) {
    const novel = await NovelModel.getById(novelId);
    if (!novel) {
      throw new Error(`Novel not found: ${novelId}`);
    }

    const chapter = NovelParser.getChapter(novel, chapterNumber);
    if (!chapter) {
      throw new Error(`Chapter ${chapterNumber} not found`);
    }

    const cachedAudio = await AudioCacheModel.getByChapter(novelId, chapter.id);
    
    if (cachedAudio) {
      const expiresAt = new Date(cachedAudio.expires_at);
      const isValid = expiresAt > new Date();

      return {
        chapterNumber: chapterNumber,
        hasAudio: true,
        isValid: isValid,
        fileId: cachedAudio.tts_file_id,
        audioURL: this.audioStorage.getAudioURL(cachedAudio.tts_file_id),
        expiresAt: cachedAudio.expires_at,
        createdAt: cachedAudio.created_at,
        speakerId: cachedAudio.speaker_id
      };
    }

    return {
      chapterNumber: chapterNumber,
      hasAudio: false,
      isValid: false,
      message: 'Audio not generated yet'
    };
  }
}

// Singleton instance
let workerInstance = null;

export function getWorker(options = {}) {
  if (!workerInstance) {
    workerInstance = new AudioWorker(options);
  }
  return workerInstance;
}

