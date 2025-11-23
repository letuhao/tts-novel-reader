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
import { getVoiceMapping } from '../utils/voiceMapping.js';
import { v4 as uuidv4 } from 'uuid';

export class AudioWorker {
  constructor(options = {}) {
    this.audioStorage = getAudioStorage();
    this.batchSize = options.batchSize || 1; // Process N items at a time (deprecated, use parallelChapters instead)
    this.delayBetweenBatches = options.delayBetweenBatches || 11110; // ms - Increased for slower processing (50% slower)
    this.delayBetweenItems = options.delayBetweenItems || 2000; // ms - Delay between individual items
    // Parallel processing for paragraphs to better utilize GPU
    // Xử lý song song cho paragraphs để sử dụng GPU tốt hơn
    this.parallelParagraphs = options.parallelParagraphs || 1; // Process N paragraphs concurrently (default: 1)
    // Parallel processing for chapters to maximize GPU utilization
    // Xử lý song song cho chapters để tối đa hóa sử dụng GPU
    this.parallelChapters = options.parallelChapters || 1; // Process N chapters concurrently (default: 1)
    // Total concurrent jobs = parallelParagraphs × parallelChapters = 1 × 1 = 1 job at same time (sequential processing)
    // Tổng số jobs đồng thời = parallelParagraphs × parallelChapters = 1 × 1 = 1 job cùng lúc (xử lý tuần tự)
    this.maxRetries = options.maxRetries || 3;
    this.speakerId = options.speakerId || '05';
    this.expiryHours = options.expiryHours || 365 * 24;
    this.speedFactor = options.speedFactor || 1.0;  // Normal speed (matches preset)
    // VietTTS options / Tùy chọn VietTTS
    this.voice = options.voice || 'quynh';  // Default voice (fallback if no role detected)
    this.autoVoice = options.autoVoice || false;
    this.autoChunk = options.autoChunk !== false; // Default true
    this.maxChars = options.maxChars || 256;
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
      console.log(`[Worker] ⚡ Using parallel processing: ${this.parallelParagraphs} paragraphs concurrently`);
      console.log(`[Worker] ⚡ Sử dụng xử lý song song: ${this.parallelParagraphs} paragraphs đồng thời`);

      // First, check cache and filter paragraphs that need processing
      // Đầu tiên, kiểm tra cache và lọc các paragraphs cần xử lý
      const paragraphsToGenerate = [];
      
      for (let i = 0; i < paragraphsToProcess; i++) {
        const paragraph = chapter.paragraphs[i];
        const paragraphText = paragraph.text?.trim();
        
        // Skip empty paragraphs
        if (!paragraphText || paragraphText.length === 0) {
          console.log(`[Worker] Skipping empty paragraph ${i} in chapter ${chapterNumber}`);
          continue;
        }

        // Check cache if not forcing regeneration
        if (!forceRegenerate) {
          try {
            const existingAudio = await AudioCacheModel.getByParagraph(
              novelId,
              chapter.id,
              paragraph.id,
              speakerId
            );
            
            if (existingAudio) {
              const expiresAt = new Date(existingAudio.expires_at);
              const isValid = expiresAt > new Date();
              
              if (isValid) {
                // Check if physical file exists
                let fileExists = false;
                if (existingAudio.local_audio_path) {
                  try {
                    const fs = await import('fs/promises');
                    const stats = await fs.stat(existingAudio.local_audio_path);
                    fileExists = stats.isFile() && stats.size > 0;
                  } catch (e) {
                    fileExists = false;
                  }
                }
                
                if (fileExists) {
                  console.log(`[Worker] ⏭️ Skipping paragraph ${paragraph.paragraphNumber} - Audio already exists`);
                  paragraphResults.push({
                    success: true,
                    cached: true,
                    skipped: true,
                    paragraphNumber: paragraph.paragraphNumber,
                    paragraphId: paragraph.id,
                    fileId: existingAudio.tts_file_id,
                    audioURL: this.audioStorage.getAudioURL(existingAudio.tts_file_id),
                    localAudioPath: existingAudio.local_audio_path,
                    text: paragraphText.substring(0, 50) + '...'
                  });
                  continue; // Skip generation, use cached
                }
              }
            }
          } catch (checkError) {
            console.warn(`[Worker] ⚠️ Error checking cache: ${checkError.message}`);
          }
        }

        // Add to processing queue
        paragraphsToGenerate.push({ paragraph, index: i });
      }

      // Helper function to process a single paragraph
      // Hàm helper để xử lý một paragraph
      const processParagraph = async (paragraph, index) => {
        const paragraphText = paragraph.text?.trim();
        
        if (!paragraphText || paragraphText.length === 0) {
          return { success: true, cached: true, skipped: true, paragraphNumber: paragraph.paragraphNumber };
        }

        try {
          // Check if paragraph audio already exists (skip if exists and not forcing regeneration)
          // Kiểm tra xem audio paragraph đã tồn tại chưa (bỏ qua nếu đã có và không buộc tạo lại)
          if (!forceRegenerate) {
            // Check both database entry AND physical file existence
            // Kiểm tra cả entry trong database VÀ sự tồn tại của file vật lý
            const existingAudio = await AudioCacheModel.getByParagraph(
              novelId,
              chapter.id,
              paragraph.id,
              speakerId
            );
            
            if (existingAudio) {
              const expiresAt = new Date(existingAudio.expires_at);
              const isValid = expiresAt > new Date();
              
              if (isValid) {
                // Check if physical file exists
                // Kiểm tra xem file vật lý có tồn tại không
                let fileExists = false;
                if (existingAudio.local_audio_path) {
                  try {
                    const fs = await import('fs/promises');
                    const stats = await fs.stat(existingAudio.local_audio_path);
                    fileExists = stats.isFile() && stats.size > 0;
                  } catch (e) {
                    // File doesn't exist, will regenerate
                    fileExists = false;
                  }
                }
                
                if (fileExists) {
                  // File already exists, skip generation
                  return {
                    success: true,
                    cached: true,
                    skipped: true,
                    paragraphNumber: paragraph.paragraphNumber,
                    paragraphId: paragraph.id,
                    fileId: existingAudio.tts_file_id,
                    audioURL: this.audioStorage.getAudioURL(existingAudio.tts_file_id),
                    localAudioPath: existingAudio.local_audio_path,
                    text: paragraphText.substring(0, 50) + '...'
                  };
                }
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
              model: 'viettts',  // Changed default to VietTTS / Đã đổi mặc định sang VietTTS
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
          
          // Determine voice based on paragraph role/voiceId
          // Xác định giọng dựa trên vai diễn/voiceId của paragraph
          let selectedVoice = 'quynh';  // Default fallback voice / Giọng mặc định
          
          if (paragraph.voiceId) {
            // Use voice from role detection / Sử dụng giọng từ role detection
            selectedVoice = paragraph.voiceId;
            console.log(`[Worker] Using detected voice: ${selectedVoice} (from role detection)`);
            console.log(`[Worker] Sử dụng giọng đã phát hiện: ${selectedVoice} (từ role detection)`);
          } else if (paragraph.role) {
            // Use voice mapping based on role / Sử dụng voice mapping dựa trên vai diễn
            const voiceMapping = getVoiceMapping();
            selectedVoice = voiceMapping.getVoiceForRole(paragraph.role);
            console.log(`[Worker] Using mapped voice: ${selectedVoice} (role: ${paragraph.role})`);
            console.log(`[Worker] Sử dụng giọng đã map: ${selectedVoice} (vai diễn: ${paragraph.role})`);
          } else {
            // Fallback to default 'quynh' if no role detected / Dùng mặc định 'quynh' nếu chưa phát hiện vai diễn
            selectedVoice = 'quynh';
            console.log(`[Worker] No role detected, using fallback voice: ${selectedVoice}`);
            console.log(`[Worker] Chưa phát hiện vai diễn, dùng giọng mặc định: ${selectedVoice}`);
          }
          
          const audioMetadata = await this.audioStorage.generateAndStore(
            paragraphText,
            novelId,
            chapterNumber,
            paragraph.paragraphNumber,
            {
              speakerId: speakerId,
              ttsExpiryHours: 2,  // TTS backend cache: 2 hours (short-term temporary storage)
              model: 'viettts',  // Changed default to VietTTS / Đã đổi mặc định sang VietTTS
              // VietTTS parameters / Tham số VietTTS
              voice: selectedVoice,  // Use selected voice based on role / Sử dụng giọng đã chọn dựa trên vai diễn
              speedFactor: this.speedFactor,  // Speed factor (1.0 = normal) / Hệ số tốc độ (1.0 = bình thường)
              // Legacy VieNeu-TTS parameters (not used by VietTTS but kept for compatibility)
              autoVoice: this.autoVoice,
              autoChunk: this.autoChunk,
              maxChars: this.maxChars,
              deleteFromTTSAfterDownload: true,  // Clean up TTS cache after download
              chapterTitle: chapterTitle,  // Include chapter title for better organization
              novelTitle: novelTitle,       // Include novel title for better organization
              paragraphId: paragraph.id,    // Include paragraph database ID
              paragraphIndex: index,        // Include paragraph index in chapter (for navigation)
              totalParagraphsInChapter: chapter.paragraphs.length,  // Total paragraphs for progress (e.g., "5 of 112")
              forceRegenerate: forceRegenerate  // Pass forceRegenerate flag to skip existing audio check
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
            model: 'viettts',  // Changed default to VietTTS / Đã đổi mặc định sang VietTTS
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

          return {
            success: true,
            cached: false,
            paragraphNumber: paragraph.paragraphNumber,
            paragraphId: paragraph.id,
            fileId: audioMetadata.fileId,
            audioURL: audioMetadata.audioURL,
            text: paragraphText.substring(0, 50) + '...'
          };
        } catch (error) {
          // Check if it's a "skip" error (meaningless text)
          // Kiểm tra xem có phải lỗi "skip" (text không có nghĩa) không
          const isSkipError = error.message && (
            error.message.includes('Skipping paragraph') ||
            error.message.includes('meaningless') ||
            error.message.includes('too short or meaningless')
          );
          
          if (isSkipError) {
            console.warn(`[Worker] ⚠️ Skipping paragraph ${paragraph.paragraphNumber}: ${error.message}`);
            console.warn(`[Worker] ⚠️ Bỏ qua paragraph ${paragraph.paragraphNumber}: ${error.message}`);
            
            // Return success with skip flag so generation can continue
            // Trả về thành công với cờ skip để generation có thể tiếp tục
            return {
              success: true,
              skipped: true,
              paragraphNumber: paragraph.paragraphNumber,
              paragraphId: paragraph.id,
              reason: error.message
            };
          }
          
          console.error(`[Worker] ❌ Error generating audio for paragraph ${paragraph.paragraphNumber}: ${error.message}`);
          console.error(`[Worker] ❌ Lỗi tạo audio cho paragraph ${paragraph.paragraphNumber}: ${error.message}`);
          
          // Update generation progress - Mark as failed
          if (progressId) {
            try {
              await GenerationProgressModel.update(progressId, {
                status: 'failed',
                errorMessage: error.message
              });
            } catch (progressError) {
              console.warn(`[Worker] ⚠️ Failed to update progress: ${progressError.message}`);
            }
          } else {
            try {
              await GenerationProgressModel.createOrUpdate({
                novelId: novelId,
                chapterId: chapter.id,
                chapterNumber: chapterNumber,
                paragraphId: paragraph.id,
                paragraphNumber: paragraph.paragraphNumber,
                status: 'failed',
                speakerId: speakerId,
                model: 'viettts',
                errorMessage: error.message
              });
            } catch (progressError) {
              console.warn(`[Worker] ⚠️ Failed to create progress entry: ${progressError.message}`);
            }
          }
          
          return {
            success: false,
            paragraphNumber: paragraph.paragraphNumber,
            paragraphId: paragraph.id,
            error: error.message
          };
        }
      };

      // Process paragraphs in parallel batches
      // Xử lý paragraphs theo batch song song
      const parallelLimit = this.parallelParagraphs;
      for (let i = 0; i < paragraphsToGenerate.length; i += parallelLimit) {
        const batch = paragraphsToGenerate.slice(i, i + parallelLimit);
        const batchNum = Math.floor(i / parallelLimit) + 1;
        const totalBatches = Math.ceil(paragraphsToGenerate.length / parallelLimit);
        
        console.log(`[Worker] 🔄 Processing batch ${batchNum}/${totalBatches}: paragraphs ${batch[0].paragraph.paragraphNumber} to ${batch[batch.length - 1].paragraph.paragraphNumber}`);
        console.log(`[Worker] 🔄 Xử lý batch ${batchNum}/${totalBatches}: paragraphs ${batch[0].paragraph.paragraphNumber} đến ${batch[batch.length - 1].paragraph.paragraphNumber}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(({ paragraph, index }) => processParagraph(paragraph, index));
        const batchResults = await Promise.all(batchPromises);
        
        // Collect results
        for (const result of batchResults) {
          if (result.success) {
            paragraphResults.push(result);
          } else {
            errors.push({
              paragraphNumber: result.paragraphNumber,
              paragraphId: result.paragraphId,
              error: result.error
            });
          }
        }
        
        // Small delay between batches to avoid overloading TTS backend
        if (i + parallelLimit < paragraphsToGenerate.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between batches
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
    
    // Use parallel chapters for better GPU utilization
    // Sử dụng chapters song song để sử dụng GPU tốt hơn
    const parallelChapters = options.parallelChapters || this.parallelChapters || 2;
    
    console.log(`[Worker] 📚 Processing ${total} chapters with ${parallelChapters} parallel chapters`);
    console.log(`[Worker] 📚 Xử lý ${total} chapters với ${parallelChapters} chapters song song`);

    // Process chapters in parallel batches
    // Xử lý chapters theo batch song song
    for (let i = 0; i < chapterNumbers.length; i += parallelChapters) {
      const batch = chapterNumbers.slice(i, i + parallelChapters);
      const batchNum = Math.floor(i / parallelChapters) + 1;
      const totalBatches = Math.ceil(chapterNumbers.length / parallelChapters);
      
      console.log(`[Worker] 📖 Processing chapter batch ${batchNum}/${totalBatches}: chapters ${batch.join(', ')}`);
      console.log(`[Worker] 📖 Xử lý batch chapters ${batchNum}/${totalBatches}: chapters ${batch.join(', ')}`);
      
      // Process chapters in parallel
      // Xử lý chapters song song
      const batchPromises = batch.map(chapterNumber => 
        this.generateChapterAudio(novelId, chapterNumber, options)
          .catch(error => {
            // Return error result instead of throwing
            // Trả về kết quả lỗi thay vì throw
            console.error(`[Worker] ❌ Error processing chapter ${chapterNumber}: ${error.message}`);
            return {
              success: false,
              chapterNumber: chapterNumber,
              error: error.message
            };
          })
      );
      
      const batchResults = await Promise.all(batchPromises);

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
    try {
      const novel = await NovelModel.getById(novelId);
      if (!novel) {
        throw new Error(`Novel not found: ${novelId}`);
      }

      if (!novel.chapters || !Array.isArray(novel.chapters) || novel.chapters.length === 0) {
        console.error(`[Worker] [generateAllChapters] Novel ${novelId} has no chapters`);
        throw new Error(`Novel ${novelId} has no chapters`);
      }

      // Extract chapter numbers - handle both camelCase (chapterNumber) and snake_case (chapter_number)
      // Trích xuất số chapter - xử lý cả camelCase (chapterNumber) và snake_case (chapter_number)
      const allChapterNumbers = novel.chapters.map(ch => {
        // Try camelCase first, fall back to snake_case
        // Thử camelCase trước, nếu không có thì dùng snake_case
        const chapterNum = ch.chapterNumber !== undefined ? ch.chapterNumber : ch.chapter_number;
        return chapterNum !== undefined && chapterNum !== null ? parseInt(chapterNum) : null;
      }).filter(num => num !== null && num !== undefined && !isNaN(num)); // Filter out invalid numbers
      
      if (allChapterNumbers.length === 0) {
        console.error(`[Worker] [generateAllChapters] Novel ${novelId} has no valid chapter numbers`);
        console.error(`[Worker] [generateAllChapters] Raw chapters data:`, JSON.stringify(novel.chapters.slice(0, 3), null, 2));
        throw new Error(`Novel ${novelId} has no valid chapter numbers`);
      }

      console.log(`[Worker] [generateAllChapters] Generating audio for ${allChapterNumbers.length} chapters in novel ${novelId}`);
      console.log(`[Worker] [generateAllChapters] Đang tạo audio cho ${allChapterNumbers.length} chapters trong novel ${novelId}`);
      console.log(`[Worker] [generateAllChapters] Chapter numbers: ${allChapterNumbers.slice(0, 10).join(', ')}${allChapterNumbers.length > 10 ? '...' : ''}`);
      
      return await this.generateBatchAudio(novelId, allChapterNumbers, options);
    } catch (error) {
      console.error(`[Worker] [generateAllChapters] ERROR: ${error.message}`);
      console.error(`[Worker] [generateAllChapters] Stack: ${error.stack}`);
      throw error;
    }
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

