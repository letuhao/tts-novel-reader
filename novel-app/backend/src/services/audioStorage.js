/**
 * Audio Storage Service - Organized Storage
 * Dịch vụ Lưu trữ Audio - Lưu trữ Có Tổ chức
 */
import { TTSService } from './ttsService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AudioStorageService {
  constructor() {
    this.ttsService = new TTSService();
    this.baseStorageDir = path.join(__dirname, '../../../storage/audio');
  }

  /**
   * Sanitize string for use in file/folder names
   * Làm sạch chuỗi để dùng trong tên file/thư mục
   * 
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeFileName(str) {
    if (!str) return '';
    // Replace invalid characters with underscore
    // Thay thế ký tự không hợp lệ bằng dấu gạch dưới
    return str
      .replace(/[<>:"/\\|?*]/g, '_')  // Invalid file chars
      .replace(/\s+/g, '_')            // Spaces to underscore
      .replace(/_+/g, '_')             // Multiple underscores to single
      .replace(/^_+|_+$/g, '')         // Trim underscores
      .substring(0, 100);               // Limit length
  }

  /**
   * Get organized storage path for audio
   * Lấy đường dẫn lưu trữ có tổ chức cho audio
   * 
   * Structure: storage/audio/{novel_id}_{novel_title}/chapter_{number}_{chapter_title}/paragraph_{number}/
   * Cấu trúc: storage/audio/{novel_id}_{novel_title}/chapter_{number}_{chapter_title}/paragraph_{number}/
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {number} paragraphNumber - Paragraph number (optional)
   * @param {string} chapterTitle - Chapter title (optional, for better organization)
   * @param {string} novelTitle - Novel title (optional, for better organization)
   * @returns {string} Storage directory path
   */
  getStoragePath(novelId, chapterNumber, paragraphNumber = null, chapterTitle = null, novelTitle = null) {
    // Base novel directory: Use only novel ID to avoid encoding issues
    // Thư mục novel cơ bản: Chỉ dùng novel ID để tránh vấn đề mã hóa
    // Removed novel title from folder name to prevent encoding problems
    // Đã loại bỏ tiêu đề novel khỏi tên thư mục để tránh vấn đề mã hóa
    const novelDirName = novelId;
    const novelDir = path.join(this.baseStorageDir, novelDirName);
    
    // Chapter directory: chapter_{number} (ASCII-only, no title to avoid encoding issues)
    // Thư mục chapter: chapter_{number} (chỉ ASCII, không có tiêu đề để tránh vấn đề mã hóa)
    // Removed chapter title from folder name to prevent encoding problems
    // Đã loại bỏ tiêu đề chapter khỏi tên thư mục để tránh vấn đề mã hóa
    const chapterDirName = `chapter_${String(chapterNumber).padStart(3, '0')}`;
    const chapterDir = path.join(novelDir, chapterDirName);
    
    // Check if paragraphNumber is provided (including 0)
    // 0 is a valid paragraph number, so we need to check for null/undefined explicitly
    if (paragraphNumber !== null && paragraphNumber !== undefined) {
      // Paragraph directory: paragraph_{number}
      // Thư mục paragraph: paragraph_{number}
      const paraDir = path.join(chapterDir, `paragraph_${String(paragraphNumber).padStart(3, '0')}`);
      return paraDir;
    }
    
    return chapterDir;
  }

  /**
   * Get audio file path
   * Lấy đường dẫn file audio
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {string} fileId - TTS file ID (for reference, but we'll use simpler name)
   * @param {number} paragraphNumber - Paragraph number (optional)
   * @param {string} chapterTitle - Chapter title (optional)
   * @param {string} novelTitle - Novel title (optional)
   * @returns {string} Audio file path
   */
  getAudioFilePath(novelId, chapterNumber, fileId, paragraphNumber = null, chapterTitle = null, novelTitle = null) {
    const storageDir = this.getStoragePath(novelId, chapterNumber, paragraphNumber, chapterTitle, novelTitle);
    // Use simpler filename: paragraph_{number}.wav or audio.wav
    // Sử dụng tên file đơn giản hơn: paragraph_{number}.wav hoặc audio.wav
    // Check if paragraphNumber is provided (including 0)
    if (paragraphNumber !== null && paragraphNumber !== undefined) {
      return path.join(storageDir, `paragraph_${String(paragraphNumber).padStart(3, '0')}.wav`);
    }
    return path.join(storageDir, `${fileId}.wav`);
  }

  /**
   * Get metadata file path
   * Lấy đường dẫn file metadata
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {string} fileId - TTS file ID (for reference)
   * @param {number} paragraphNumber - Paragraph number (optional)
   * @param {string} chapterTitle - Chapter title (optional)
   * @param {string} novelTitle - Novel title (optional)
   * @returns {string} Metadata file path
   */
  getMetadataFilePath(novelId, chapterNumber, fileId, paragraphNumber = null, chapterTitle = null, novelTitle = null) {
    const storageDir = this.getStoragePath(novelId, chapterNumber, paragraphNumber, chapterTitle, novelTitle);
    // Use simpler filename: paragraph_{number}_metadata.json or metadata.json
    // Sử dụng tên file đơn giản hơn: paragraph_{number}_metadata.json hoặc metadata.json
    // Check if paragraphNumber is provided (including 0)
    if (paragraphNumber !== null && paragraphNumber !== undefined) {
      return path.join(storageDir, `paragraph_${String(paragraphNumber).padStart(3, '0')}_metadata.json`);
    }
    return path.join(storageDir, `metadata.json`);
  }

  /**
   * Ensure storage directory exists
   * Đảm bảo thư mục lưu trữ tồn tại
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {number} paragraphNumber - Paragraph number (optional)
   * @param {string} chapterTitle - Chapter title (optional)
   * @param {string} novelTitle - Novel title (optional)
   * @returns {Promise<string>} Storage directory path
   */
  async ensureStorageDir(novelId, chapterNumber, paragraphNumber = null, chapterTitle = null, novelTitle = null) {
    const storageDir = this.getStoragePath(novelId, chapterNumber, paragraphNumber, chapterTitle, novelTitle);
    await fs.mkdir(storageDir, { recursive: true });
    return storageDir;
  }

  /**
   * Generate and store audio for chapter/paragraph
   * Tạo và lưu audio cho chapter/paragraph
   * 
   * Note: Audio files are stored in TTS backend storage.
   * We organize metadata and tracking here by novel/chapter.
   * 
   * Lưu ý: File audio được lưu trong TTS backend storage.
   * Chúng ta tổ chức metadata và tracking ở đây theo novel/chapter.
   * 
   * @param {string} text - Text to generate
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {number} paragraphNumber - Paragraph number (optional)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Audio metadata
   */
  async generateAndStore(text, novelId, chapterNumber, paragraphNumber = null, options = {}) {
    const {
      speakerId = '05',
      ttsExpiryHours = 2,  // TTS backend cache: 2 hours (short-term temporary storage)
      model = 'dia',
      speedFactor = 1.0,  // Normal speed (matches preset quality)
      deleteFromTTSAfterDownload = true,  // Clean up TTS cache after successful download
      chapterTitle = null,  // Chapter title for organization (optional)
      novelTitle = null,    // Novel title for organization (optional)
      paragraphId = null,   // Paragraph database ID (optional, for linking)
      paragraphIndex = null, // Paragraph index in chapter (optional, for navigation)
      forceRegenerate = false  // Force regeneration even if audio exists
    } = options;
    
    console.log(`[AudioStorage] ==========================================`);
    console.log(`[AudioStorage] Starting generateAndStore for paragraph ${paragraphNumber}`);
    console.log(`[AudioStorage] Bắt đầu generateAndStore cho paragraph ${paragraphNumber}`);
    console.log(`[AudioStorage] Novel ID: ${novelId}${novelTitle ? ` (${novelTitle})` : ''}`);
    console.log(`[AudioStorage] Chapter: ${chapterNumber}${chapterTitle ? ` - ${chapterTitle}` : ''}`);
    console.log(`[AudioStorage] Paragraph: ${paragraphNumber}`);
    console.log(`[AudioStorage] Text length: ${text.length} chars`);
    console.log(`[AudioStorage] Text preview: ${text.substring(0, 100)}...`);
    console.log(`[AudioStorage] Force regenerate: ${forceRegenerate}`);
    
    try {
      // Check if audio already exists (skip if exists and not forcing regeneration)
      // Kiểm tra xem audio đã tồn tại chưa (bỏ qua nếu đã có và không buộc tạo lại)
      if (!forceRegenerate && paragraphNumber !== null && paragraphNumber !== undefined) {
        const existingAudio = await this.checkExistingAudio(novelId, chapterNumber, paragraphNumber, speakerId);
        if (existingAudio && existingAudio.exists && existingAudio.valid) {
          console.log(`[AudioStorage] ⏭️ Skipping generation - Audio already exists`);
          console.log(`[AudioStorage] ⏭️ Bỏ qua tạo - Audio đã tồn tại`);
          console.log(`[AudioStorage]   - Paragraph: ${paragraphNumber}`);
          console.log(`[AudioStorage]   - File path: ${existingAudio.filePath}`);
          console.log(`[AudioStorage]   - File ID: ${existingAudio.fileId}`);
          
          return {
            fileId: existingAudio.fileId,
            audioURL: this.getAudioURL(existingAudio.fileId),
            localAudioPath: existingAudio.filePath,
            cached: true,
            skipped: true,
            expiresAt: existingAudio.expiresAt,
            metadata: existingAudio.metadata || {}
          };
        }
      }
      // Step 1: Generate audio from TTS backend (stored in TTS backend storage)
      console.log(`[AudioStorage] Step 1: Generating audio via TTS backend...`);
      console.log(`[AudioStorage] Bước 1: Đang tạo audio qua TTS backend...`);
      // Step 1: Generate audio from TTS backend (temporary cache: 2 hours)
      // Bước 1: Tạo audio từ TTS backend (cache tạm thời: 2 giờ)
      const audioMetadata = await this.ttsService.generateAudio(text, {
        speakerId: speakerId,
        model: model,
        expiryHours: ttsExpiryHours,  // Short-term cache in TTS backend
        speedFactor: speedFactor,  // Pass speed factor for slower narration
        store: true,
        returnAudio: false
      });
      console.log(`[AudioStorage] ✅ Step 1: Audio generated successfully!`);
      console.log(`[AudioStorage] ✅ Bước 1: Đã tạo audio thành công!`);
      console.log(`[AudioStorage] File ID: ${audioMetadata.fileId}`);
      console.log(`[AudioStorage] Expires At: ${audioMetadata.expiresAt}`);
      
      // Step 2: Ensure storage directory exists for metadata and audio
      console.log(`[AudioStorage] Step 2: Ensuring storage directory exists...`);
      console.log(`[AudioStorage] Bước 2: Đang đảm bảo thư mục lưu trữ tồn tại...`);
      const storageDir = await this.ensureStorageDir(novelId, chapterNumber, paragraphNumber, chapterTitle, novelTitle);
      console.log(`[AudioStorage] ✅ Step 2: Storage directory ready: ${storageDir}`);
      console.log(`[AudioStorage] ✅ Bước 2: Thư mục lưu trữ sẵn sàng: ${storageDir}`);
      
      // Step 3: IMMEDIATELY download and save audio file to organized structure
      // Bước 3: NGAY LẬP TỨC tải và lưu file audio vào cấu trúc có tổ chức
      console.log(`[AudioStorage] Step 3: Immediately downloading audio to organized storage...`);
      console.log(`[AudioStorage] Bước 3: Ngay lập tức tải audio vào lưu trữ có tổ chức...`);
      let localAudioPath = null;
      try {
        localAudioPath = await this.downloadAndSaveAudio(
          audioMetadata.fileId,
          novelId,
          chapterNumber,
          paragraphNumber,
          chapterTitle,
          novelTitle
        );
        console.log(`[AudioStorage] ✅ Step 3: Audio downloaded and saved successfully!`);
        console.log(`[AudioStorage] ✅ Bước 3: Audio đã được tải và lưu thành công!`);
        console.log(`[AudioStorage] Local path: ${localAudioPath}`);
        
        // Step 3.5: Optional cleanup - Delete from TTS backend cache after successful download
        // Bước 3.5: Dọn dẹp tùy chọn - Xóa khỏi cache TTS backend sau khi tải thành công
        if (deleteFromTTSAfterDownload) {
          console.log(`[AudioStorage] Step 3.5: Cleaning up TTS backend cache...`);
          console.log(`[AudioStorage] Bước 3.5: Đang dọn dẹp cache TTS backend...`);
          try {
            await this.ttsService.deleteAudio(audioMetadata.fileId);
            console.log(`[AudioStorage] ✅ Step 3.5: TTS cache cleaned up successfully!`);
            console.log(`[AudioStorage] ✅ Bước 3.5: Cache TTS đã được dọn dẹp thành công!`);
          } catch (cleanupError) {
            // Non-critical: Cache will expire naturally in 2 hours anyway
            // Không quan trọng: Cache sẽ tự động hết hạn sau 2 giờ
            console.warn(`[AudioStorage] ⚠️ Step 3.5: Failed to cleanup TTS cache (will expire naturally): ${cleanupError.message}`);
            console.warn(`[AudioStorage] ⚠️ Bước 3.5: Thất bại khi dọn dẹp cache TTS (sẽ tự động hết hạn): ${cleanupError.message}`);
          }
        }
      } catch (error) {
        // Download failure is critical - we need the file!
        // Thất bại tải xuống là nghiêm trọng - chúng ta cần file!
        console.error(`[AudioStorage] ❌ Step 3 FAILED: Failed to download audio to organized storage`);
        console.error(`[AudioStorage] ❌ Bước 3 THẤT BẠI: Không thể tải audio vào lưu trữ có tổ chức`);
        console.error(`[AudioStorage] Error: ${error.message}`);
        console.error(`[AudioStorage] Stack: ${error.stack}`);
        // Throw error - download must succeed for proper pipeline
        // Ném lỗi - tải xuống phải thành công cho pipeline đúng
        throw new Error(`Failed to download audio: ${error.message}`);
      }
      
      // Step 4: Save metadata locally with organized structure
      console.log(`[AudioStorage] Step 4: Saving metadata...`);
      console.log(`[AudioStorage] Bước 4: Đang lưu metadata...`);
      const metadataFile = await this.saveMetadata(
        audioMetadata,
        novelId,
        chapterNumber,
        paragraphNumber,
        {
          storageDir: storageDir,
          localAudioPath: localAudioPath,
          chapterTitle: chapterTitle,  // Pass chapter title for metadata
          novelTitle: novelTitle,       // Pass novel title for metadata
          subtitle: text,               // Pass input text for subtitle storage
          paragraphId: options.paragraphId || null,  // Pass paragraph database ID
          paragraphIndex: options.paragraphIndex !== undefined ? options.paragraphIndex : null,  // Pass paragraph index
          totalParagraphsInChapter: options.totalParagraphsInChapter || null,  // Pass total paragraphs
          speakerId: speakerId,  // Pass speaker ID
          model: model,  // Pass model name
          speedFactor: speedFactor  // Pass speed factor
        }
      );
      console.log(`[AudioStorage] ✅ Step 4: Metadata saved successfully!`);
      console.log(`[AudioStorage] ✅ Bước 4: Đã lưu metadata thành công!`);
      console.log(`[AudioStorage] Metadata path: ${metadataFile}`);
      
      const result = {
        ...audioMetadata,
        novelId: novelId,
        chapterNumber: chapterNumber,
        paragraphNumber: paragraphNumber,
        audioURL: this.ttsService.getAudioURL(audioMetadata.fileId),
        localAudioPath: localAudioPath,
        metadataPath: metadataFile,
        storageDir: storageDir,
        subtitle: text,  // Include subtitle (input text) in result for subtitle display
        text: text,  // Alias for subtitle (for compatibility/backwards compatibility)
        createdAt: new Date().toISOString()
      };
      
      console.log(`[AudioStorage] ==========================================`);
      console.log(`[AudioStorage] ✅ generateAndStore completed successfully!`);
      console.log(`[AudioStorage] ✅ generateAndStore hoàn tất thành công!`);
      console.log(`[AudioStorage] Local audio: ${localAudioPath ? 'YES ✅' : 'NO ❌'}`);
      console.log(`[AudioStorage] Subtitle length: ${text ? text.length : 0} chars`);
      console.log(`[AudioStorage] ==========================================`);
      
      return result;
    } catch (error) {
      console.error(`[AudioStorage] ==========================================`);
      console.error(`[AudioStorage] ❌ generateAndStore FAILED!`);
      console.error(`[AudioStorage] ❌ generateAndStore THẤT BẠI!`);
      console.error(`[AudioStorage] Error: ${error.message}`);
      console.error(`[AudioStorage] Stack: ${error.stack}`);
      console.error(`[AudioStorage] ==========================================`);
      throw new Error(`Failed to generate audio: ${error.message}`);
    }
  }

  /**
   * Download audio from TTS backend and save to organized location (optional)
   * Tải audio từ TTS backend và lưu vào vị trí có tổ chức (tùy chọn)
   * 
   * Note: Audio is stored in TTS backend. This is for local caching if needed.
   * 
   * @param {string} fileId - TTS file ID
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {number} paragraphNumber - Paragraph number (optional)
   * @returns {Promise<string>} Local file path
   */
  async downloadAndSaveAudio(fileId, novelId, chapterNumber, paragraphNumber = null, chapterTitle = null, novelTitle = null) {
    console.log(`[AudioStorage] [downloadAndSaveAudio] Starting download for file: ${fileId}`);
    console.log(`[AudioStorage] [downloadAndSaveAudio] Bắt đầu tải file: ${fileId}`);
    
    try {
      // Step 1: Get audio file from TTS backend using TTS service
      console.log(`[AudioStorage] [downloadAndSaveAudio] Step 1: Fetching audio from TTS backend...`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] Bước 1: Đang lấy audio từ TTS backend...`);
      const audioData = await this.ttsService.getAudioFile(fileId);
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ Step 1: Audio fetched. Size: ${audioData.byteLength} bytes`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ Bước 1: Đã lấy audio. Kích thước: ${audioData.byteLength} bytes`);
      
      // Step 2: Ensure storage directory
      console.log(`[AudioStorage] [downloadAndSaveAudio] Step 2: Ensuring storage directory...`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] Bước 2: Đang đảm bảo thư mục lưu trữ...`);
      const storageDir = await this.ensureStorageDir(novelId, chapterNumber, paragraphNumber, chapterTitle, novelTitle);
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ Step 2: Storage directory: ${storageDir}`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ Bước 2: Thư mục lưu trữ: ${storageDir}`);
      
      // Step 3: Get target file path (with organized structure)
      console.log(`[AudioStorage] [downloadAndSaveAudio] Step 3: Preparing file path...`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] Bước 3: Đang chuẩn bị đường dẫn file...`);
      const audioFilePath = this.getAudioFilePath(novelId, chapterNumber, fileId, paragraphNumber, chapterTitle, novelTitle);
      console.log(`[AudioStorage] [downloadAndSaveAudio] Target path: ${audioFilePath}`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] Đường dẫn đích: ${audioFilePath}`);
      
      // Step 4: Save to organized location
      console.log(`[AudioStorage] [downloadAndSaveAudio] Step 4: Writing audio file to disk...`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] Bước 4: Đang ghi file audio vào đĩa...`);
      await fs.writeFile(audioFilePath, Buffer.from(audioData));
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ Step 4: Audio file saved successfully!`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ Bước 4: Đã lưu file audio thành công!`);
      
      // Step 5: Verify file was created
      console.log(`[AudioStorage] [downloadAndSaveAudio] Step 5: Verifying file exists...`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] Bước 5: Đang xác minh file tồn tại...`);
      const stats = await fs.stat(audioFilePath);
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ Step 5: File verified! Size: ${stats.size} bytes`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ Bước 5: File đã được xác minh! Kích thước: ${stats.size} bytes`);
      
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ SUCCESS: Audio file saved to: ${audioFilePath}`);
      console.log(`[AudioStorage] [downloadAndSaveAudio] ✅ THÀNH CÔNG: File audio đã được lưu tại: ${audioFilePath}`);
      return audioFilePath;
    } catch (error) {
      console.error(`[AudioStorage] [downloadAndSaveAudio] ❌ FAILED: ${error.message}`);
      console.error(`[AudioStorage] [downloadAndSaveAudio] ❌ THẤT BẠI: ${error.message}`);
      console.error(`[AudioStorage] [downloadAndSaveAudio] Stack: ${error.stack}`);
      throw new Error(`Failed to download and save audio: ${error.message}`);
    }
  }

  /**
   * Save metadata to organized location
   * Lưu metadata vào vị trí có tổ chức
   * 
   * @param {Object} audioMetadata - Audio metadata from TTS backend
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {number} paragraphNumber - Paragraph number (optional)
   * @param {Object} localInfo - Local file information
   * @returns {Promise<string>} Metadata file path
   */
  async saveMetadata(audioMetadata, novelId, chapterNumber, paragraphNumber, localInfo) {
    console.log(`[AudioStorage] [saveMetadata] Saving metadata for paragraph ${paragraphNumber}`);
    console.log(`[AudioStorage] [saveMetadata] Đang lưu metadata cho paragraph ${paragraphNumber}`);
    
    try {
      const chapterTitle = localInfo.chapterTitle || null;
      const novelTitle = localInfo.novelTitle || null;
      
      // Extract subtitle and generation parameters
      const subtitle = localInfo?.subtitle || null;
      const paragraphId = localInfo?.paragraphId || null;
      const paragraphIndex = localInfo?.paragraphIndex !== undefined ? localInfo.paragraphIndex : null;
      
      // Extract audio information from TTS backend metadata
      const ttsMetadata = audioMetadata.metadata || audioMetadata.metadata || {};
      const audioDuration = ttsMetadata.duration_seconds || ttsMetadata.duration || null;
      const sampleRate = ttsMetadata.sample_rate || null;
      const audioFileSize = ttsMetadata.file_size || null;
      
      // Calculate text statistics
      const textStats = subtitle ? {
        characterCount: subtitle.length,
        wordCount: subtitle.trim().split(/\s+/).filter(w => w.length > 0).length,
        estimatedReadingTimeSeconds: subtitle ? Math.ceil(subtitle.length / 200) : null // ~200 chars per minute reading speed
      } : null;
      
      const metadata = {
        fileId: audioMetadata.fileId,
        novelId: novelId,
        novelTitle: novelTitle,
        chapterNumber: chapterNumber,
        chapterTitle: chapterTitle,
        paragraphNumber: paragraphNumber,
        paragraphId: paragraphId,  // Database paragraph ID (for linking)
        paragraphIndex: paragraphIndex,  // Position in chapter (for navigation)
        totalParagraphsInChapter: localInfo?.totalParagraphsInChapter || null,  // Total paragraphs in chapter (for progress calculation)
        storageDir: localInfo.storageDir,
        ttsFileId: audioMetadata.fileId,
        audioURL: this.ttsService.getAudioURL(audioMetadata.fileId),
        localAudioPath: localInfo.localAudioPath || null,
        
        // Subtitle/Input text - Text used to generate this audio (for subtitle display)
        // Phụ đề/Văn bản đầu vào - Văn bản được sử dụng để tạo audio này (để hiển thị phụ đề)
        subtitle: subtitle,  // Original input text
        text: subtitle,  // Alias for subtitle for compatibility
        textStats: textStats,  // Text statistics (char count, word count, reading time)
        
        // Audio information / Thông tin audio
        audioDuration: audioDuration,  // Duration in seconds (for progress bar)
        audioDurationFormatted: audioDuration ? `${Math.floor(audioDuration / 60)}:${String(Math.floor(audioDuration % 60)).padStart(2, '0')}` : null,  // Formatted as MM:SS
        audioFileSize: audioFileSize,  // File size in bytes
        audioFileSizeMB: audioFileSize ? (audioFileSize / (1024 * 1024)).toFixed(2) : null,  // File size in MB
        sampleRate: sampleRate,  // Audio sample rate (Hz)
        
        // Generation parameters / Tham số tạo
        generationParams: {
          speakerId: localInfo?.speakerId || null,
          model: localInfo?.model || null,
          speedFactor: localInfo?.speedFactor !== undefined ? localInfo.speedFactor : null
        },
        
        expiresAt: audioMetadata.expiresAt || audioMetadata.metadata?.expires_at,
        createdAt: new Date().toISOString(),
        metadata: ttsMetadata  // Full TTS backend metadata (for reference)
      };
      
      console.log(`[AudioStorage] [saveMetadata] Metadata prepared:`);
      console.log(`[AudioStorage] [saveMetadata] Metadata đã chuẩn bị:`);
      console.log(`[AudioStorage] [saveMetadata]   - Novel: ${novelId}${novelTitle ? ` (${novelTitle})` : ''}`);
      console.log(`[AudioStorage] [saveMetadata]   - Chapter: ${chapterNumber}${chapterTitle ? ` - ${chapterTitle}` : ''}`);
      console.log(`[AudioStorage] [saveMetadata]   - Paragraph: ${paragraphNumber}`);
      console.log(`[AudioStorage] [saveMetadata]   - File ID: ${metadata.fileId}`);
      console.log(`[AudioStorage] [saveMetadata]   - Local Audio Path: ${metadata.localAudioPath || 'NULL ❌'}`);
      console.log(`[AudioStorage] [saveMetadata]   - Audio URL: ${metadata.audioURL}`);
      console.log(`[AudioStorage] [saveMetadata]   - Storage Dir: ${metadata.storageDir}`);
      console.log(`[AudioStorage] [saveMetadata]   - Subtitle length: ${subtitle ? subtitle.length : 0} chars`);
      console.log(`[AudioStorage] [saveMetadata]   - Subtitle preview: ${subtitle ? subtitle.substring(0, 50) + '...' : 'N/A'}`);
      
      // Add local path if provided
      if (localInfo.localPath) {
        metadata.localPath = localInfo.localPath;
      }
      
      const metadataFilePath = this.getMetadataFilePath(
        novelId, 
        chapterNumber, 
        audioMetadata.fileId, 
        paragraphNumber,
        chapterTitle,
        novelTitle
      );
      
      console.log(`[AudioStorage] [saveMetadata] Writing metadata file to: ${metadataFilePath}`);
      console.log(`[AudioStorage] [saveMetadata] Đang ghi file metadata vào: ${metadataFilePath}`);
      
      await fs.writeFile(
        metadataFilePath, 
        JSON.stringify(metadata, null, 2), 
        'utf-8'
      );
      
      // Verify file was created
      const stats = await fs.stat(metadataFilePath);
      console.log(`[AudioStorage] [saveMetadata] ✅ Metadata file saved! Size: ${stats.size} bytes`);
      console.log(`[AudioStorage] [saveMetadata] ✅ File metadata đã được lưu! Kích thước: ${stats.size} bytes`);
      
      return metadataFilePath;
    } catch (error) {
      console.error(`[AudioStorage] [saveMetadata] ❌ FAILED: ${error.message}`);
      console.error(`[AudioStorage] [saveMetadata] ❌ THẤT BẠI: ${error.message}`);
      console.error(`[AudioStorage] [saveMetadata] Stack: ${error.stack}`);
      throw new Error(`Failed to save metadata: ${error.message}`);
    }
  }

  /**
   * Get audio file URL by file ID
   * Lấy URL file audio theo file ID
   * 
   * @param {string} fileId - File ID
   * @returns {string} Audio URL
   */
  getAudioURL(fileId) {
    return this.ttsService.getAudioURL(fileId);
  }

  /**
   * Check if audio already exists for a paragraph
   * Kiểm tra xem audio đã tồn tại cho paragraph chưa
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {number} paragraphNumber - Paragraph number
   * @param {string} speakerId - Speaker ID (optional)
   * @returns {Promise<Object|null>} Existing audio info or null
   */
  async checkExistingAudio(novelId, chapterNumber, paragraphNumber, speakerId = '05') {
    try {
      // Check database cache
      // Kiểm tra cache trong database
      const { AudioCacheModel } = await import('../models/AudioCache.js');
      const { ChapterModel } = await import('../models/Chapter.js');
      
      // Get chapter to get chapter ID
      const chapter = await ChapterModel.getByNovelAndNumber(novelId, chapterNumber);
      if (!chapter) {
        return null;
      }
      
      // Check database cache entry
      const cacheEntry = await AudioCacheModel.getByChapterAndParagraphNumber(
        novelId,
        chapterNumber,
        paragraphNumber,
        speakerId
      );
      
      if (!cacheEntry) {
        // No database entry
        return null;
      }
      
      // Check expiration
      const expiresAt = new Date(cacheEntry.expires_at);
      const isValid = expiresAt > new Date();
      
      if (!isValid) {
        // Expired
        return null;
      }
      
      // Check if physical file exists
      // Kiểm tra xem file vật lý có tồn tại không
      let filePath = null;
      if (cacheEntry.local_audio_path) {
        // Use path from database
        filePath = cacheEntry.local_audio_path;
      } else {
        // Build expected path
        filePath = this.getAudioFilePath(novelId, chapterNumber, cacheEntry.tts_file_id, paragraphNumber);
      }
      
      // Check if file exists
      let fileExists = false;
      try {
        const stats = await fs.stat(filePath);
        fileExists = stats.isFile() && stats.size > 0;
      } catch (e) {
        // File doesn't exist
        fileExists = false;
      }
      
      if (!fileExists) {
        // Database entry exists but file is missing
        console.log(`[AudioStorage] [checkExistingAudio] ⚠️ Database entry exists but file missing: ${filePath}`);
        return null;
      }
      
      // Load metadata if exists
      let metadata = null;
      try {
        const metadataPath = this.getMetadataFilePath(
          novelId,
          chapterNumber,
          cacheEntry.tts_file_id,
          paragraphNumber
        );
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metadataContent);
      } catch (e) {
        // Metadata doesn't exist, that's okay
        metadata = null;
      }
      
      return {
        exists: true,
        valid: true,
        fileId: cacheEntry.tts_file_id,
        filePath: filePath,
        expiresAt: cacheEntry.expires_at,
        metadata: metadata
      };
    } catch (error) {
      console.error(`[AudioStorage] [checkExistingAudio] Error checking existing audio: ${error.message}`);
      return null;
    }
  }

  /**
   * Get local audio file path if exists
   * Lấy đường dẫn file audio local nếu tồn tại
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {string} fileId - TTS file ID
   * @param {number} paragraphNumber - Paragraph number (optional)
   * @returns {Promise<string|null>} Local file path or null
   */
  async getLocalAudioPath(novelId, chapterNumber, fileId, paragraphNumber = null) {
    const audioPath = this.getAudioFilePath(novelId, chapterNumber, fileId, paragraphNumber);
    
    try {
      await fs.access(audioPath);
      return audioPath;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if audio exists and is valid
   * Kiểm tra audio có tồn tại và hợp lệ
   * 
   * @param {string} fileId - File ID
   * @returns {Promise<boolean>} Valid status
   */
  async checkAudioValid(fileId) {
    try {
      await this.ttsService.getAudioMetadata(fileId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage structure for a novel
   * Lấy cấu trúc lưu trữ cho một novel
   * 
   * @param {string} novelId - Novel ID
   * @returns {Object} Storage structure info
   */
  async getStorageStructure(novelId) {
    const novelDir = path.join(this.baseStorageDir, novelId);
    
    try {
      const entries = await fs.readdir(novelDir, { withFileTypes: true });
      const chapters = [];
      
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('chapter_')) {
          const chapterNumber = parseInt(entry.name.replace('chapter_', ''));
          const chapterDir = path.join(novelDir, entry.name);
          
          const files = await fs.readdir(chapterDir);
          const audioFiles = files.filter(f => f.endsWith('.wav'));
          const metadataFiles = files.filter(f => f.endsWith('.json'));
          
          chapters.push({
            chapterNumber: chapterNumber,
            chapterDir: entry.name,
            audioCount: audioFiles.length,
            metadataCount: metadataFiles.length
          });
        }
      }
      
      return {
        novelId: novelId,
        baseDir: novelDir,
        chapters: chapters.sort((a, b) => a.chapterNumber - b.chapterNumber)
      };
    } catch (error) {
      return {
        novelId: novelId,
        baseDir: novelDir,
        chapters: [],
        error: error.message
      };
    }
  }
}

// Singleton instance
let audioStorageInstance = null;

export function getAudioStorage() {
  if (!audioStorageInstance) {
    audioStorageInstance = new AudioStorageService();
  }
  return audioStorageInstance;
}
