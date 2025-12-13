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
      const novelTitle = novel.title || null;

      // Get chapter from database (normalized table)
      const chapter = await ChapterModel.getByNovelAndNumber(novelId, chapterNumber);
      if (!chapter) {
        throw new Error(`Chapter ${chapterNumber} not found in novel ${novelId}`);
      }
      const chapterTitle = chapter.title || null;
      
      // Get paragraphs from database (normalized table)
      const paragraphs = await ParagraphModel.getByChapter(chapter.id);
      if (!paragraphs || paragraphs.length === 0) {
        throw new Error(`Chapter ${chapterNumber} has no paragraphs`);
      }
      
      // Transform to expected format for compatibility
      chapter.paragraphs = paragraphs;

      // Preload generation progress and audio cache to avoid per-paragraph DB hits
      const progressList = await GenerationProgressModel.getByChapter(novelId, chapterNumber);
      const progressMap = new Map(progressList.map(p => [p.paragraph_number, p]));
      const audioCacheList = await AudioCacheModel.getByChapterParagraphs(novelId, chapter.id, speakerId);
      const audioCacheByParagraphId = new Map(audioCacheList.map(c => [c.paragraph_id, c]));
      const audioCacheByParagraphNumber = new Map(audioCacheList.map(c => [c.paragraph_number, c]));

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
            // Check generation progress for failed/skipped status (preloaded map)
            const generationProgress = progressMap.get(paragraph.paragraphNumber) || null;
            
            // Check if paragraph was previously failed - regenerate it
            // Kiểm tra xem paragraph đã từng thất bại - tạo lại
            if (generationProgress && generationProgress.status === 'failed') {
              console.log(`[Worker] 🔄 Paragraph ${paragraph.paragraphNumber} was previously failed (status: failed) - will regenerate`);
              console.log(`[Worker] 🔄 Paragraph ${paragraph.paragraphNumber} đã từng thất bại (status: failed) - sẽ tạo lại`);
              // Continue to add to generation queue (don't skip)
            }
            // Check if paragraph was skipped - check metadata to confirm
            // Kiểm tra xem paragraph đã được bỏ qua - kiểm tra metadata để xác nhận
            else if (generationProgress && generationProgress.status === 'skipped') {
              // Check metadata to confirm it's actually skipped (meaningless)
              // Kiểm tra metadata để xác nhận nó thực sự đã được bỏ qua (vô nghĩa)
              try {
                const fs = await import('fs/promises');
                const path = await import('path');
                const storageDir = await this.audioStorage.ensureStorageDir(
                  novelId,
                  chapterNumber,
                  paragraph.paragraphNumber,
                  chapterTitle,
                  novelTitle
                );
                const metadataPath = path.join(storageDir, `paragraph_${String(paragraph.paragraphNumber).padStart(3, '0')}_metadata.json`);
                try {
                  const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                  const metadata = JSON.parse(metadataContent);
                  if (metadata.skipped === true || metadata.status === 'skipped') {
                    console.log(`[Worker] ⏭️ Skipping paragraph ${paragraph.paragraphNumber} - Already marked as skipped in metadata`);
                    console.log(`[Worker] ⏭️ Bỏ qua paragraph ${paragraph.paragraphNumber} - Đã được đánh dấu bỏ qua trong metadata`);
                    continue; // Skip generation - this is a meaningless paragraph
                  }
                } catch (e) {
                  // Metadata doesn't exist or is invalid - continue to check audio
                }
              } catch (metaError) {
                // Error checking metadata - continue to check audio
              }
            }
            
            // Check for existing audio file using preloaded cache
            const existingAudio = audioCacheByParagraphId.get(paragraph.id)
              || audioCacheByParagraphNumber.get(paragraph.paragraphNumber)
              || null;
            
            let fileExists = false;
            let localAudioPath = null;
            
            if (existingAudio) {
              const isValid = existingAudio.valid !== false;
              
              if (isValid && existingAudio.local_audio_path && !forceRegenerate) {
                // Trust valid cache without extra disk I/O
                fileExists = true;
                localAudioPath = existingAudio.local_audio_path;
              }
            }
            
            // If file exists, skip generation
            // Nếu file tồn tại, bỏ qua generation
            if (fileExists && localAudioPath) {
              console.log(`[Worker] ⏭️ Skipping paragraph ${paragraph.paragraphNumber} - Audio already exists at: ${localAudioPath}`);
              paragraphResults.push({
                success: true,
                cached: true,
                skipped: true,
                paragraphNumber: paragraph.paragraphNumber,
                paragraphId: paragraph.id,
                fileId: existingAudio?.tts_file_id || null,
                audioURL: existingAudio?.tts_file_id ? this.audioStorage.getAudioURL(existingAudio.tts_file_id) : null,
                localAudioPath: localAudioPath,
                text: paragraphText.substring(0, 50) + '...'
              });
              continue; // Skip generation, use cached
            } else if (existingAudio && !fileExists) {
              // File doesn't exist, but database entry exists - log for debugging
              // File không tồn tại, nhưng entry database tồn tại - log để debug
              console.log(`[Worker] ⚠️ Database entry exists but file missing for paragraph ${paragraph.paragraphNumber}, will regenerate`);
              console.log(`[Worker] ⚠️ Entry database tồn tại nhưng file thiếu cho paragraph ${paragraph.paragraphNumber}, sẽ tạo lại`);
            }
          } catch (checkError) {
            console.warn(`[Worker] ⚠️ Error checking cache: ${checkError.message}`);
          }
        }

        // Add to processing queue (this paragraph needs audio generation)
        // Thêm vào hàng đợi xử lý (paragraph này cần tạo audio)
        paragraphsToGenerate.push({ paragraph, index: i });
        console.log(`[Worker] ➕ Added paragraph ${paragraph.paragraphNumber} to generation queue (index ${i})`);
      }
      
      console.log(`[Worker] 📋 Total paragraphs to generate: ${paragraphsToGenerate.length} out of ${paragraphsToProcess}`);
      console.log(`[Worker] 📋 Tổng số paragraphs cần tạo: ${paragraphsToGenerate.length} trong ${paragraphsToProcess}`);
      if (paragraphsToGenerate.length > 0) {
        const paraNumbers = paragraphsToGenerate.map(p => p.paragraph.paragraphNumber).join(', ');
        console.log(`[Worker] 📋 Paragraphs to generate: ${paraNumbers}`);
        console.log(`[Worker] 📋 Các paragraphs cần tạo: ${paraNumbers}`);
      }

      // Helper function to check if paragraph is meaningless
      // Hàm helper để kiểm tra xem paragraph có vô nghĩa không
      const isMeaninglessParagraph = (text) => {
        if (!text || text.trim().length === 0) {
          return true;
        }
        
        // Check for meaningful content (at least 5 alphanumeric characters)
        // Kiểm tra nội dung có nghĩa (ít nhất 5 ký tự chữ số)
        const meaningfulText = text.replace(/[^a-zA-Z0-9\s\u00C0-\u1EF9]/g, '').trim();
        if (meaningfulText.length < 5) {
          // Check if it's a separator line (all dashes, equals, underscores, etc.)
          // Kiểm tra nếu là dòng phân cách (toàn dấu gạch ngang, dấu bằng, gạch dưới, v.v.)
          const coreText = text.replace(/\s/g, '');
          if (coreText.length > 0) {
            const separatorChars = new Set('-=_~*#@$%^&+|\\/<>{}[]().,;:!?');
            const isOnlySeparators = Array.from(coreText).every(c => separatorChars.has(c));
            if (isOnlySeparators) {
              return true;
            }
          }
          // Very short text with no meaningful content
          // Text rất ngắn không có nội dung có nghĩa
          return text.length < 10;
        }
        return false;
      };
      
      // Helper function to process a single paragraph
      // Hàm helper để xử lý một paragraph
      const processParagraph = async (paragraph, index) => {
        const startTime = Date.now();
        const paragraphText = paragraph.text?.trim();
        
        if (!paragraphText || paragraphText.length === 0) {
          console.log(`[Worker] ⏱️ Paragraph ${paragraph.paragraphNumber} skipped (empty) in ${Date.now() - startTime}ms`);
          return { success: true, cached: true, skipped: true, paragraphNumber: paragraph.paragraphNumber };
        }
        
        // Client-side validation: Skip meaningless paragraphs before calling TTS
        // Xác thực phía client: Bỏ qua paragraphs vô nghĩa trước khi gọi TTS
        if (isMeaninglessParagraph(paragraphText)) {
          console.warn(`[Worker] ⚠️ Skipping meaningless paragraph ${paragraph.paragraphNumber} (client-side validation)`);
          console.warn(`[Worker] ⚠️ Bỏ qua paragraph vô nghĩa ${paragraph.paragraphNumber} (xác thực phía client)`);
          console.warn(`[Worker] Text preview: ${paragraphText.substring(0, 50)}...`);
          
          // Save metadata for skipped paragraph
          // Lưu metadata cho paragraph đã bỏ qua
          try {
            const novel = await NovelModel.getById(novelId);
            const novelTitle = novel?.title || null;
            const chapterTitle = chapter.title || null;
            
            // Ensure storage directory exists
            const storageDir = await this.audioStorage.ensureStorageDir(
              novelId,
              chapterNumber,
              paragraph.paragraphNumber,
              chapterTitle,
              novelTitle
            );
            
            // Create metadata for skipped paragraph
            const skippedMetadata = {
              fileId: null,  // No audio file
              novelId: novelId,
              novelTitle: novelTitle,
              chapterNumber: chapterNumber,
              chapterTitle: chapterTitle,
              paragraphNumber: paragraph.paragraphNumber,
              paragraphId: paragraph.id,
              paragraphIndex: index,
              totalParagraphsInChapter: chapter.paragraphs.length,
              storageDir: storageDir,
              ttsFileId: null,
              audioURL: null,
              localAudioPath: null,
              
              // Subtitle/Input text
              subtitle: paragraphText,
              normalizedText: paragraphText,
              text: paragraphText,
              textStats: {
                characterCount: paragraphText.length,
                wordCount: paragraphText.trim().split(/\s+/).filter(w => w.length > 0).length,
                estimatedReadingTimeSeconds: 0
              },
              
              // Audio information (none for skipped paragraphs)
              audioDuration: 0,
              audioDurationFormatted: '0:00',
              audioFileSize: 0,
              audioFileSizeMB: '0.00',
              sampleRate: null,
              
              // Generation parameters
              generationParams: {
                speakerId: speakerId,
                model: options.model || this.audioStorage.getDefaultModel(),
                speedFactor: options.speedFactor || 1.0
              },
              
              // Status information
              status: 'skipped',
              reason: 'Meaningless paragraph (separator/decorator line) - skipped by client-side validation',
              
              skipped: true,
              skippedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            
            // Save metadata file
            const fs = await import('fs/promises');
            const path = await import('path');
            const metadataFilePath = path.join(storageDir, `paragraph_${String(paragraph.paragraphNumber).padStart(3, '0')}_metadata.json`);
            await fs.writeFile(metadataFilePath, JSON.stringify(skippedMetadata, null, 2), 'utf-8');
            console.log(`[Worker] ✅ Saved metadata for skipped paragraph ${paragraph.paragraphNumber} at ${metadataFilePath}`);
            console.log(`[Worker] ✅ Đã lưu metadata cho paragraph đã bỏ qua ${paragraph.paragraphNumber} tại ${metadataFilePath}`);
          } catch (metadataError) {
            console.warn(`[Worker] ⚠️ Failed to save metadata for skipped paragraph: ${metadataError.message}`);
            console.warn(`[Worker] ⚠️ Không thể lưu metadata cho paragraph đã bỏ qua: ${metadataError.message}`);
          }
          
          // Update generation progress - Mark as skipped
          try {
            await GenerationProgressModel.createOrUpdate({
              novelId: novelId,
              chapterId: chapter.id,
              chapterNumber: chapterNumber,
              paragraphId: paragraph.id,
              paragraphNumber: paragraph.paragraphNumber,
              status: 'skipped',
              speakerId: speakerId,
              model: this.audioStorage.getDefaultModel(),
              errorMessage: 'Meaningless paragraph (separator/decorator line)'
            });
          } catch (progressError) {
            console.warn(`[Worker] ⚠️ Failed to track progress: ${progressError.message}`);
          }
          
          console.log(`[Worker] ⏱️ Paragraph ${paragraph.paragraphNumber} skipped in ${Date.now() - startTime}ms (meaningless text)`);
          return {
            success: true,
            skipped: true,
            paragraphNumber: paragraph.paragraphNumber,
            paragraphId: paragraph.id,
            reason: 'Meaningless paragraph (separator/decorator line) - skipped by client-side validation'
          };
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
              model: this.audioStorage.getDefaultModel(),  // Use default model from config / Sử dụng model mặc định từ config
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
              model: this.audioStorage.getDefaultModel(),  // Use default model from config / Sử dụng model mặc định từ config
              // TTS parameters / Tham số TTS
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
          console.log(`[Worker] ⏱️ Paragraph ${paragraph.paragraphNumber} completed in ${Date.now() - startTime}ms`);
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
          const isSkipError = error.isSkip || 
                             error.name === 'SkipError' ||
                             (error.message && (
                               error.message.includes('Skipping paragraph') ||
                               error.message.includes('meaningless') ||
                               error.message.includes('too short or meaningless') ||
                               error.message.includes('only punctuation') ||
                               error.message.includes('separator') ||
                               error.message.includes('decorator line')
                             ));
          
          if (isSkipError) {
            const reason = error.reason || error.message || 'Meaningless paragraph';
            console.warn(`[Worker] ⚠️ Skipping paragraph ${paragraph.paragraphNumber}: ${reason}`);
            console.warn(`[Worker] ⚠️ Bỏ qua paragraph ${paragraph.paragraphNumber}: ${reason}`);
            console.warn(`[Worker] ⏱️ Paragraph ${paragraph.paragraphNumber} skipped in ${Date.now() - startTime}ms (TTS validation)`);
            
            // Update generation progress - Mark as skipped
            if (progressId) {
              try {
                await GenerationProgressModel.update(progressId, {
                  status: 'skipped',
                  errorMessage: reason
                });
              } catch (progressError) {
                console.warn(`[Worker] ⚠️ Failed to update progress: ${progressError.message}`);
              }
            }
            
            // Return success with skip flag so generation can continue
            // Trả về thành công với cờ skip để generation có thể tiếp tục
            return {
              success: true,
              skipped: true,
              paragraphNumber: paragraph.paragraphNumber,
              paragraphId: paragraph.id,
              reason: reason
            };
          }
          
          console.error(`[Worker] ❌ Error generating audio for paragraph ${paragraph.paragraphNumber}: ${error.message}`);
          console.error(`[Worker] ❌ Lỗi tạo audio cho paragraph ${paragraph.paragraphNumber}: ${error.message}`);
          
          // Save metadata for failed paragraph so resume logic can detect it
          // Lưu metadata cho paragraph thất bại để logic resume có thể phát hiện
          try {
            const novel = await NovelModel.getById(novelId);
            const novelTitle = novel?.title || null;
            const chapterTitle = chapter.title || null;
            
            // Ensure storage directory exists
            const storageDir = await this.audioStorage.ensureStorageDir(
              novelId,
              chapterNumber,
              paragraph.paragraphNumber,
              chapterTitle,
              novelTitle
            );
            
            // Create metadata for failed paragraph
            const failedMetadata = {
              fileId: null,  // No audio file
              novelId: novelId,
              novelTitle: novelTitle,
              chapterNumber: chapterNumber,
              chapterTitle: chapterTitle,
              paragraphNumber: paragraph.paragraphNumber,
              paragraphId: paragraph.id,
              paragraphIndex: index,
              totalParagraphsInChapter: chapter.paragraphs.length,
              storageDir: storageDir,
              ttsFileId: null,
              audioURL: null,
              localAudioPath: null,
              subtitle: paragraphText,
              normalizedText: paragraphText,
              text: paragraphText,
              textStats: {
                characterCount: paragraphText.length,
                wordCount: paragraphText.trim().split(/\s+/).filter(w => w.length > 0).length,
                estimatedReadingTimeSeconds: 0
              },
              audioDuration: 0,
              audioDurationFormatted: '0:00',
              audioFileSize: 0,
              audioFileSizeMB: 0,
              sampleRate: null,
              generationParams: {
                speakerId: speakerId,
                model: this.audioStorage.getDefaultModel(),
                speedFactor: this.speedFactor
              },
              expiresAt: null,
              createdAt: new Date().toISOString(),
              metadata: {
                failed: true,
                error: error.message,
                status: 'failed'
              },
              failed: true,
              error: error.message,
              status: 'failed'
            };
            
            // Save metadata file
            const fs = await import('fs/promises');
            const path = await import('path');
            const metadataFilePath = path.join(storageDir, `paragraph_${String(paragraph.paragraphNumber).padStart(3, '0')}_metadata.json`);
            await fs.writeFile(metadataFilePath, JSON.stringify(failedMetadata, null, 2), 'utf-8');
            console.log(`[Worker] ✅ Saved metadata for failed paragraph ${paragraph.paragraphNumber} at ${metadataFilePath}`);
          } catch (metadataError) {
            console.warn(`[Worker] ⚠️ Failed to save metadata for failed paragraph ${paragraph.paragraphNumber}: ${metadataError.message}`);
          }
          
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
                model: this.audioStorage.getDefaultModel(),
                errorMessage: error.message
              });
            } catch (progressError) {
              console.warn(`[Worker] ⚠️ Failed to create progress entry: ${progressError.message}`);
            }
          }
          
          // IMPORTANT: Return success: false but don't throw - let generation continue
          // QUAN TRỌNG: Trả về success: false nhưng không throw - để generation tiếp tục
          return {
            success: false,
            paragraphNumber: paragraph.paragraphNumber,
            paragraphId: paragraph.id,
            error: error.message,
            failed: true  // Mark as failed for tracking
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
        const batchStart = Date.now();
        
        console.log(`[Worker] 🔄 Processing batch ${batchNum}/${totalBatches}: paragraphs ${batch[0].paragraph.paragraphNumber} to ${batch[batch.length - 1].paragraph.paragraphNumber}`);
        console.log(`[Worker] 🔄 Xử lý batch ${batchNum}/${totalBatches}: paragraphs ${batch[0].paragraph.paragraphNumber} đến ${batch[batch.length - 1].paragraph.paragraphNumber}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(({ paragraph, index }) => processParagraph(paragraph, index));
        // Use allSettled so one rejected paragraph doesn't abort the whole batch
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Collect results
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            const value = result.value;
            if (value.success) {
              paragraphResults.push(value);
            } else {
              errors.push({
                paragraphNumber: value.paragraphNumber,
                paragraphId: value.paragraphId,
                error: value.error
              });
            }
          } else {
            errors.push({
              paragraphNumber: null,
              paragraphId: null,
              error: result.reason?.message || 'Unknown error'
            });
          }
        }

        const batchDuration = Date.now() - batchStart;
        const batchFulfilled = batchResults.filter(r => r.status === 'fulfilled').length;
        const batchRejected = batchResults.filter(r => r.status === 'rejected').length;
        const batchSkipped = batchResults.filter(r => r.status === 'fulfilled' && r.value?.skipped).length;
        console.log(`[Worker] ⏱️ Batch ${batchNum}/${totalBatches} done in ${batchDuration}ms (fulfilled: ${batchFulfilled}, rejected: ${batchRejected}, skipped: ${batchSkipped})`);
        
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
      
      // Verify chapter is actually complete before returning success
      // Xác minh chapter thực sự đã hoàn thành trước khi trả về thành công
      let isActuallyComplete = false;
      let verificationStatus = null;
      try {
        const verification = await this.isChapterComplete(novelId, chapterNumber, speakerId);
        isActuallyComplete = verification.complete;
        verificationStatus = verification;
        
        if (!isActuallyComplete) {
          console.error(`[Worker] ❌ Chapter ${chapterNumber} generation finished but is INCOMPLETE: ${verification.completeCount}/${verification.totalParagraphs} paragraphs (${verification.percentage}%)`);
          console.error(`[Worker] ❌ Chapter ${chapterNumber} generation hoàn tất nhưng CHƯA HOÀN THÀNH: ${verification.completeCount}/${verification.totalParagraphs} paragraphs (${verification.percentage}%)`);
          if (verification.missingParagraphs && verification.missingParagraphs.length > 0) {
            // Log all missing paragraphs (not just first 10) so they can all be regenerated
            // Ghi log tất cả paragraphs thiếu (không chỉ 10 đầu tiên) để có thể tạo lại tất cả
            const allMissing = verification.missingParagraphs;
            const displayMissing = allMissing.length > 20 
              ? allMissing.slice(0, 20).join(', ') + ` ... (+${allMissing.length - 20} more)`
              : allMissing.join(', ');
            console.error(`[Worker] Missing paragraphs (${allMissing.length} total): ${displayMissing}`);
            console.error(`[Worker] Paragraphs thiếu (${allMissing.length} tổng cộng): ${displayMissing}`);
          }
        }
      } catch (verifyError) {
        console.warn(`[Worker] ⚠️ Failed to verify chapter completion: ${verifyError.message}`);
        // If verification fails, assume incomplete to be safe
        // Nếu xác minh thất bại, giả định chưa hoàn thành để an toàn
        isActuallyComplete = false;
      }

      // Count skipped paragraphs (they don't have audio files but are marked as success)
      // Đếm các paragraphs đã bỏ qua (chúng không có file audio nhưng được đánh dấu là thành công)
      const skippedCount = paragraphResults.filter(r => r.success && r.skipped).length;
      
      // Use verification status for accurate missing count
      // Sử dụng trạng thái xác minh để đếm chính xác số lượng thiếu
      const missingCount = verificationStatus ? verificationStatus.missingCount : (chapter.paragraphs.length - successCount);

      return {
        success: isActuallyComplete && successCount > 0,  // Only true if actually complete
        chapterNumber: chapterNumber,
        chapterId: chapter.id,
        totalParagraphs: chapter.paragraphs.length,
        successCount: successCount,
        failedCount: failedCount,
        cachedCount: cachedCount,
        generatedCount: generatedCount,
        skippedCount: skippedCount,  // Count of skipped paragraphs
        paragraphResults: paragraphResults,
        errors: errors,
        generationStats: generationStats,  // Include generation progress statistics
        isComplete: isActuallyComplete,  // Explicit completion flag
        verificationStatus: verificationStatus,  // Include verification details
        message: isActuallyComplete 
          ? `Generated ${generatedCount} new, ${cachedCount} cached, ${failedCount} failed out of ${chapter.paragraphs.length} paragraphs - COMPLETE`
          : `Generated ${generatedCount} new, ${cachedCount} cached, ${failedCount} failed, ${skippedCount} skipped out of ${chapter.paragraphs.length} paragraphs - INCOMPLETE (missing ${missingCount} paragraph(s) with audio files)`
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
   * Check if a chapter is complete (all paragraphs have audio files)
   * Kiểm tra xem một chapter đã hoàn thành chưa (tất cả paragraphs đều có file audio)
   * 
   * Checks both database entries and physical files on disk
   * Kiểm tra cả entry database và file vật lý trên disk
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {string} speakerId - Speaker ID
   * @returns {Promise<Object>} Completion status with details
   */
  async isChapterComplete(novelId, chapterNumber, speakerId) {
    try {
      // Get chapter and paragraphs
      const chapter = await ChapterModel.getByNovelAndNumber(novelId, chapterNumber);
      if (!chapter) {
        return { complete: false, reason: 'Chapter not found' };
      }
      
      const paragraphs = await ParagraphModel.getByChapter(chapter.id);
      if (!paragraphs || paragraphs.length === 0) {
        return { complete: false, reason: 'No paragraphs found' };
      }
      
      // Helper function to check if paragraph is meaningless (same logic as in generateChapterAudio)
      // Hàm helper để kiểm tra nếu paragraph vô nghĩa (cùng logic như trong generateChapterAudio)
      const isMeaninglessParagraph = (text) => {
        if (!text || text.trim().length === 0) {
          return true;
        }
        
        // Check for meaningful content (at least 5 alphanumeric characters)
        // Kiểm tra nội dung có nghĩa (ít nhất 5 ký tự chữ số)
        const meaningfulText = text.replace(/[^a-zA-Z0-9\s\u00C0-\u1EF9]/g, '').trim();
        if (meaningfulText.length < 5) {
          // Check if it's a separator line (all dashes, equals, underscores, etc.)
          // Kiểm tra nếu là dòng phân cách (toàn dấu gạch ngang, dấu bằng, gạch dưới, v.v.)
          const coreText = text.replace(/\s/g, '');
          if (coreText.length > 0) {
            const separatorChars = new Set('-=_~*#@$%^&+|\\/<>{}[]().,;:!?');
            const isOnlySeparators = Array.from(coreText).every(c => separatorChars.has(c));
            if (isOnlySeparators) {
              return true;
            }
          }
          // Very short text with no meaningful content
          // Text rất ngắn không có nội dung có nghĩa
          return text.length < 10;
        }
        return false;
      };
      
      const totalParagraphs = paragraphs.length;
      let completeCount = 0;
      let missingParagraphs = [];
      let skippedParagraphs = []; // Track skipped paragraphs for reporting
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Get novel info for path building
      const novel = await NovelModel.getById(novelId);
      const novelTitle = novel?.title || null;
      const chapterTitle = chapter.title || null;
      
      // Check each paragraph
      for (const paragraph of paragraphs) {
        const paragraphText = paragraph.text?.trim();
        
        // Skip empty paragraphs - they count as "complete"
        if (!paragraphText || paragraphText.length === 0) {
          completeCount++;
          continue;
        }
        
        // Skip meaningless paragraphs - they also count as "complete" (no audio needed)
        // Bỏ qua paragraphs vô nghĩa - chúng cũng được tính là "complete" (không cần audio)
        if (isMeaninglessParagraph(paragraphText)) {
          completeCount++;
          skippedParagraphs.push(paragraph.paragraphNumber);
          continue;
        }
        
        let fileExists = false;
        
        // First check database cache
        const existingAudio = await AudioCacheModel.getByParagraph(
          novelId,
          chapter.id,
          paragraph.id,
          speakerId
        );
        
        if (existingAudio) {
          const expiresAt = new Date(existingAudio.expires_at);
          const isValid = expiresAt > new Date();
          
          if (isValid && existingAudio.local_audio_path) {
            try {
              const stats = await fs.stat(existingAudio.local_audio_path);
              fileExists = stats.isFile() && stats.size > 0;
            } catch (e) {
              // Database path doesn't exist, check standard path
              fileExists = false;
            }
          }
        }
        
        // If database check failed, check standard storage path
        if (!fileExists) {
          try {
            const storageDir = await this.audioStorage.ensureStorageDir(
              novelId,
              chapterNumber,
              paragraph.paragraphNumber,
              chapterTitle,
              novelTitle
            );
            const expectedPath = path.join(storageDir, `paragraph_${String(paragraph.paragraphNumber).padStart(3, '0')}.wav`);
            
            try {
              const stats = await fs.stat(expectedPath);
              fileExists = stats.isFile() && stats.size > 0;
            } catch (e) {
              fileExists = false;
            }
          } catch (pathError) {
            // Path check failed
            fileExists = false;
          }
        }
        
        // If audio file doesn't exist, check metadata and generation progress for status
        // Nếu file audio không tồn tại, kiểm tra metadata và generation progress cho trạng thái
        if (!fileExists) {
          try {
            const { GenerationProgressModel } = await import('../models/GenerationProgress.js');
            const generationProgress = await GenerationProgressModel.getByParagraph(
              novelId,
              chapterNumber,
              paragraph.paragraphNumber
            );
            
            // Check if paragraph was failed - it needs regeneration
            // Kiểm tra xem paragraph đã thất bại - nó cần tạo lại
            if (generationProgress && generationProgress.status === 'failed') {
              missingParagraphs.push(paragraph.paragraphNumber);
              continue;
            }
            
            // Check if paragraph was skipped (meaningless) - check metadata to confirm
            // Kiểm tra xem paragraph đã được bỏ qua (vô nghĩa) - kiểm tra metadata để xác nhận
            if (generationProgress && generationProgress.status === 'skipped') {
              try {
                const storageDir = await this.audioStorage.ensureStorageDir(
                  novelId,
                  chapterNumber,
                  paragraph.paragraphNumber,
                  chapterTitle,
                  novelTitle
                );
                const metadataPath = path.join(storageDir, `paragraph_${String(paragraph.paragraphNumber).padStart(3, '0')}_metadata.json`);
                try {
                  const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                  const metadata = JSON.parse(metadataContent);
                  if (metadata.skipped === true || metadata.status === 'skipped') {
                    // Paragraph is skipped (meaningless) - count as complete
                    // Paragraph đã được bỏ qua (vô nghĩa) - tính là complete
                    completeCount++;
                    skippedParagraphs.push(paragraph.paragraphNumber);
                    continue;
                  }
                } catch (e) {
                  // Metadata doesn't exist or invalid - treat as missing
                }
              } catch (metaError) {
                // Error checking metadata - treat as missing
              }
            }
            
            // Check metadata file directly for skipped/failed status
            // Kiểm tra file metadata trực tiếp cho trạng thái skipped/failed
            try {
              const storageDir = await this.audioStorage.ensureStorageDir(
                novelId,
                chapterNumber,
                paragraph.paragraphNumber,
                chapterTitle,
                novelTitle
              );
              const metadataPath = path.join(storageDir, `paragraph_${String(paragraph.paragraphNumber).padStart(3, '0')}_metadata.json`);
              try {
                const metadataContent = await fs.readFile(metadataPath, 'utf-8');
                const metadata = JSON.parse(metadataContent);
                
                // If skipped in metadata, count as complete
                // Nếu skipped trong metadata, tính là complete
                if (metadata.skipped === true || metadata.status === 'skipped') {
                  completeCount++;
                  skippedParagraphs.push(paragraph.paragraphNumber);
                  continue;
                }
                
                // If failed in metadata, needs regeneration
                // Nếu failed trong metadata, cần tạo lại
                if (metadata.failed === true || metadata.status === 'failed') {
                  missingParagraphs.push(paragraph.paragraphNumber);
                  continue;
                }
              } catch (e) {
                // Metadata doesn't exist - treat as missing
              }
            } catch (metaError) {
              // Error checking metadata - treat as missing
            }
          } catch (progressError) {
            // Error checking generation progress - treat as missing
          }
          
          // No audio file found and no skipped/failed status - it's missing
          // Không tìm thấy file audio và không có trạng thái skipped/failed - nó bị thiếu
          missingParagraphs.push(paragraph.paragraphNumber);
        } else {
          completeCount++;
        }
      }
      
      const isComplete = completeCount === totalParagraphs;
      
      // Return ALL missing paragraphs (not just first 10) so they can all be regenerated
      // Trả về TẤT CẢ paragraphs thiếu (không chỉ 10 đầu tiên) để có thể tạo lại tất cả
      return {
        complete: isComplete,
        totalParagraphs: totalParagraphs,
        completeCount: completeCount,
        missingCount: missingParagraphs.length,
        missingParagraphs: missingParagraphs, // Return ALL missing paragraphs
        skippedCount: skippedParagraphs.length,
        skippedParagraphs: skippedParagraphs, // Return ALL skipped paragraphs
        percentage: Math.round((completeCount / totalParagraphs) * 100)
      };
    } catch (error) {
      console.error(`[Worker] ⚠️ Error checking chapter completeness: ${error.message}`);
      return { complete: false, reason: error.message };
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
      const batchPromises = batch.map(async (chapterNumber) => {
        const speakerId = options.speakerId || this.speakerId;
        
        // Check if chapter is already complete (unless forcing regeneration)
        // Kiểm tra xem chapter đã hoàn thành chưa (trừ khi buộc tạo lại)
        if (!options.forceRegenerate) {
          const completionStatus = await this.isChapterComplete(novelId, chapterNumber, speakerId);
          
          if (completionStatus.complete) {
            console.log(`[Worker] ✅ Chapter ${chapterNumber} is already complete (${completionStatus.completeCount}/${completionStatus.totalParagraphs} paragraphs) - skipping`);
            console.log(`[Worker] ✅ Chapter ${chapterNumber} đã hoàn thành (${completionStatus.completeCount}/${completionStatus.totalParagraphs} paragraphs) - bỏ qua`);
            return {
              success: true,
              chapterNumber: chapterNumber,
              cached: true,
              skipped: true,
              message: `Chapter already complete (${completionStatus.completeCount}/${completionStatus.totalParagraphs} paragraphs)`,
              completionStatus: completionStatus
            };
          } else {
            console.log(`[Worker] ⚠️ Chapter ${chapterNumber} is incomplete: ${completionStatus.completeCount}/${completionStatus.totalParagraphs} paragraphs (${completionStatus.percentage}%)`);
            console.log(`[Worker] ⚠️ Chapter ${chapterNumber} chưa hoàn thành: ${completionStatus.completeCount}/${completionStatus.totalParagraphs} paragraphs (${completionStatus.percentage}%)`);
            if (completionStatus.missingParagraphs && completionStatus.missingParagraphs.length > 0) {
              // Log all missing paragraphs (not just first 10) for visibility
              // Ghi log tất cả paragraphs thiếu (không chỉ 10 đầu tiên) để dễ thấy
              const allMissing = completionStatus.missingParagraphs;
              const displayMissing = allMissing.length > 20 
                ? allMissing.slice(0, 20).join(', ') + ` ... (+${allMissing.length - 20} more)`
                : allMissing.join(', ');
              console.log(`[Worker] Missing paragraphs (${allMissing.length} total): ${displayMissing}`);
              console.log(`[Worker] Paragraphs thiếu (${allMissing.length} tổng cộng): ${displayMissing}`);
            }
          }
        }
        
        // Generate chapter audio
        // Tạo audio cho chapter
        return this.generateChapterAudio(novelId, chapterNumber, options)
          .catch(error => {
            // Return error result instead of throwing
            // Trả về kết quả lỗi thay vì throw
            console.error(`[Worker] ❌ Error processing chapter ${chapterNumber}: ${error.message}`);
            return {
              success: false,
              chapterNumber: chapterNumber,
              error: error.message
            };
          });
      });
      
      const batchResults = await Promise.all(batchPromises);

      // Verify completion for each processed chapter (not skipped/cached ones)
      // Xác minh hoàn thành cho mỗi chapter đã xử lý (không phải những cái đã bỏ qua/cached)
      for (const result of batchResults) {
        if (result.success && !result.cached && !result.skipped) {
          // Verify chapter is actually complete after processing
          // Xác minh chapter thực sự đã hoàn thành sau khi xử lý
          const speakerId = options.speakerId || this.speakerId;
          const verification = await this.isChapterComplete(novelId, result.chapterNumber, speakerId);
          
          if (!verification.complete) {
            console.error(`[Worker] ❌ Chapter ${result.chapterNumber} processing reported success but verification shows INCOMPLETE: ${verification.completeCount}/${verification.totalParagraphs} paragraphs (${verification.percentage}%)`);
            console.error(`[Worker] ❌ Chapter ${result.chapterNumber} xử lý báo thành công nhưng xác minh cho thấy CHƯA HOÀN THÀNH: ${verification.completeCount}/${verification.totalParagraphs} paragraphs (${verification.percentage}%)`);
            if (verification.missingParagraphs && verification.missingParagraphs.length > 0) {
              // Log all missing paragraphs (not just first 10) so they can all be regenerated
              // Ghi log tất cả paragraphs thiếu (không chỉ 10 đầu tiên) để có thể tạo lại tất cả
              const allMissing = verification.missingParagraphs;
              const displayMissing = allMissing.length > 20 
                ? allMissing.slice(0, 20).join(', ') + ` ... (+${allMissing.length - 20} more)`
                : allMissing.join(', ');
              console.error(`[Worker] Missing paragraphs (${allMissing.length} total): ${displayMissing}`);
              console.error(`[Worker] Paragraphs thiếu (${allMissing.length} tổng cộng): ${displayMissing}`);
            }
            
            // Mark as incomplete (but continue processing other chapters)
            // Đánh dấu là chưa hoàn thành (nhưng vẫn tiếp tục xử lý các chapters khác)
            result.success = false;
            result.verificationFailed = true;
            result.verificationStatus = verification;
            result.error = `Chapter incomplete: ${verification.completeCount}/${verification.totalParagraphs} paragraphs (${verification.percentage}%)`;
            result.message = `Chapter ${result.chapterNumber} is incomplete. Missing ${verification.missingCount} paragraph(s). Can be regenerated later.`;
            result.canRegenerate = true; // Mark that this can be regenerated later
            console.warn(`[Worker] ⚠️ Chapter ${result.chapterNumber} marked as incomplete but will continue with other chapters`);
            console.warn(`[Worker] ⚠️ Chapter ${result.chapterNumber} được đánh dấu chưa hoàn thành nhưng sẽ tiếp tục với các chapters khác`);
          } else {
            console.log(`[Worker] ✅ Verified chapter ${result.chapterNumber} is complete: ${verification.completeCount}/${verification.totalParagraphs} paragraphs`);
            console.log(`[Worker] ✅ Đã xác minh chapter ${result.chapterNumber} hoàn thành: ${verification.completeCount}/${verification.totalParagraphs} paragraphs`);
            result.verificationStatus = verification;
          }
        }
      }

      results.push(...batchResults);
      
      // Log incomplete chapters but DON'T STOP - continue processing other chapters
      // Ghi log các chapters chưa hoàn thành nhưng KHÔNG DỪNG - tiếp tục xử lý các chapters khác
      const incompleteChapters = batchResults.filter(r => r.verificationFailed || (r.success === false && r.isComplete === false));
      if (incompleteChapters.length > 0) {
        console.warn(`[Worker] ⚠️ Batch ${batchNum} contains ${incompleteChapters.length} incomplete chapter(s). Continuing with next chapters...`);
        console.warn(`[Worker] ⚠️ Batch ${batchNum} chứa ${incompleteChapters.length} chapter(s) chưa hoàn thành. Tiếp tục với các chapters tiếp theo...`);
        for (const incomplete of incompleteChapters) {
          console.warn(`[Worker]   - Chapter ${incomplete.chapterNumber}: ${incomplete.error || incomplete.message}`);
          console.warn(`[Worker]     (Will be marked as failed for later regeneration)`);
          console.warn(`[Worker]     (Sẽ được đánh dấu thất bại để tạo lại sau)`);
        }
        // CONTINUE processing - don't break
        // TIẾP TỤC xử lý - không dừng
        // The incomplete chapters are marked as failed but we continue with other chapters
        // Các chapters chưa hoàn thành được đánh dấu thất bại nhưng chúng ta tiếp tục với các chapters khác
      }

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

