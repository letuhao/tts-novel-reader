/**
 * Role Detection Worker - Detect and save roles for paragraphs
 * Worker Phát hiện Vai diễn - Phát hiện và lưu vai diễn cho paragraphs
 */
import { getRoleDetectionService } from './roleDetectionService.js';
import { ParagraphModel } from '../models/Paragraph.js';
import { ChapterModel } from '../models/Chapter.js';
import { NovelModel } from '../models/Novel.js';
import { GenerationProgressModel } from '../models/GenerationProgress.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class RoleDetectionWorker {
  /**
   * Detect roles for all paragraphs in a chapter
   * Phát hiện vai diễn cho tất cả paragraphs trong một chapter
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {Object} options - Worker options
   * @returns {Promise<Object>} Detection results
   */
  async detectChapterRoles(novelId, chapterNumber, options = {}) {
    const {
      updateProgress = true,
      saveMetadata = true,
      forceRegenerateRoles = false
    } = options;

    try {
      // Get novel and chapter
      const novel = await NovelModel.getById(novelId);
      if (!novel) {
        throw new Error(`Novel not found: ${novelId}`);
      }

      const chapter = await ChapterModel.getByNovelAndNumber(novelId, chapterNumber);
      if (!chapter) {
        throw new Error(`Chapter ${chapterNumber} not found in novel ${novelId}`);
      }

      // Get paragraphs
      const paragraphs = await ParagraphModel.getByChapter(chapter.id);
      if (!paragraphs || paragraphs.length === 0) {
        throw new Error(`Chapter ${chapterNumber} has no paragraphs`);
      }

      console.log(`[RoleDetectionWorker] Detecting roles for chapter ${chapterNumber}`);
      console.log(`[RoleDetectionWorker] Phát hiện vai diễn cho chapter ${chapterNumber}`);
      console.log(`[RoleDetectionWorker] Total paragraphs: ${paragraphs.length}`);
      console.log(`[RoleDetectionWorker] Force regenerate roles: ${forceRegenerateRoles}`);

      // Filter paragraphs that need role detection
      // Lọc các paragraphs cần phát hiện vai diễn
      let paragraphsToDetect = paragraphs;
      let skippedCount = 0;
      
      // Count paragraphs with existing roles for logging
      const paragraphsWithRoles = paragraphs.filter(p => p.role && p.voiceId).length;
      const paragraphsWithoutRoles = paragraphs.length - paragraphsWithRoles;
      
      console.log(`[RoleDetectionWorker] Paragraphs status: ${paragraphsWithRoles} with roles, ${paragraphsWithoutRoles} without roles`);
      
      if (!forceRegenerateRoles) {
        // Skip paragraphs that already have roles
        // Bỏ qua các paragraphs đã có vai diễn
        const paragraphsNeedingRoles = paragraphs.filter(p => !p.role || !p.voiceId);
        skippedCount = paragraphs.length - paragraphsNeedingRoles.length;
        
        if (skippedCount > 0) {
          console.log(`[RoleDetectionWorker] Skipping ${skippedCount} paragraphs that already have roles`);
          console.log(`[RoleDetectionWorker] Bỏ qua ${skippedCount} paragraphs đã có vai diễn`);
        }
        
        if (paragraphsNeedingRoles.length === 0) {
          console.log(`[RoleDetectionWorker] All paragraphs already have roles. Nothing to detect.`);
          console.log(`[RoleDetectionWorker] Tất cả paragraphs đã có vai diễn. Không cần phát hiện.`);
          
          // Update progress to completed
          if (updateProgress && progressId) {
            try {
              await GenerationProgressModel.update(progressId, {
                status: 'completed',
                progressPercent: 100,
                completedAt: new Date().toISOString()
              });
            } catch (progressError) {
              // Ignore progress update errors
            }
          }
          
          return {
            novelId: novelId,
            chapterNumber: chapterNumber,
            totalParagraphs: paragraphs.length,
            updatedParagraphs: 0,
            skippedParagraphs: skippedCount,
            roleCounts: {},
            voiceCounts: {},
            processingTime: '0.00',
            message: 'All paragraphs already have roles'
          };
        }
        
        paragraphsToDetect = paragraphsNeedingRoles;
      } else {
        // Force regenerate: process ALL paragraphs regardless of existing roles
        // Ép tạo lại: xử lý TẤT CẢ paragraphs bất kể vai diễn hiện có
        console.log(`[RoleDetectionWorker] Force regenerate mode: Will overwrite roles for ALL ${paragraphs.length} paragraphs`);
        console.log(`[RoleDetectionWorker] Chế độ ép tạo lại: Sẽ ghi đè vai diễn cho TẤT CẢ ${paragraphs.length} paragraphs`);
        paragraphsToDetect = paragraphs; // Process all paragraphs
        skippedCount = 0; // No skipping in force regenerate mode
      }
      
      console.log(`[RoleDetectionWorker] Will detect roles for ${paragraphsToDetect.length} paragraphs`);

      // Track progress (declare outside try-catch so it's accessible in catch block)
      let progressId = null;
      if (updateProgress) {
        try {
          const progress = await GenerationProgressModel.createOrUpdate({
            novelId: novelId,
            chapterId: chapter.id,
            chapterNumber: chapterNumber,
            status: 'in_progress',
            model: 'role-detection',
            progressPercent: 0,
            startedAt: new Date().toISOString()
          });
          progressId = progress.id;
          console.log(`[RoleDetectionWorker] Progress tracking started: ${progressId}`);
        } catch (progressError) {
          console.warn(`[RoleDetectionWorker] Failed to track progress: ${progressError.message}`);
        }
      }

      // Prepare paragraphs for detection
      // Chuẩn bị paragraphs để phát hiện
      const paragraphTexts = paragraphsToDetect.map(p => p.text || ''); // Handle null/undefined text
      const chapterContext = paragraphs.map(p => p.text || '').join('\n\n');
      
      // Log what we're about to process
      const paragraphsWithText = paragraphTexts.filter(t => t && t.trim().length > 0).length;
      const paragraphsWithoutText = paragraphTexts.length - paragraphsWithText;
      console.log(`[RoleDetectionWorker] Preparing ${paragraphsToDetect.length} paragraphs for detection:`);
      console.log(`[RoleDetectionWorker]   - ${paragraphsWithText} paragraphs with text`);
      console.log(`[RoleDetectionWorker]   - ${paragraphsWithoutText} paragraphs without text (will get 'narrator' role)`);
      if (forceRegenerateRoles) {
        console.log(`[RoleDetectionWorker] Force regenerate mode: ALL paragraphs will be processed and overwritten`);
      }
      
      // Create a mapping from paragraph index to original paragraph index
      // Tạo mapping từ index paragraph cần phát hiện đến index paragraph gốc
      const indexMap = new Map();
      paragraphsToDetect.forEach((p, idx) => {
        const originalIdx = paragraphs.findIndex(orig => orig.id === p.id);
        indexMap.set(idx, originalIdx);
      });

      // Initialize role detection service
      const roleService = getRoleDetectionService();

      // Check if service is available
      const available = await roleService.isAvailable();
      if (!available) {
        throw new Error('Role detection service is not available. Make sure Ollama is running with qwen3:8b model.');
      }

      // Detect roles
      console.log(`[RoleDetectionWorker] Starting role detection...`);
      const startTime = Date.now();
      
      const result = await roleService.detectRoles(paragraphTexts, {
        chapterContext: chapterContext.substring(0, 3000), // Limit context size
        returnVoiceIds: true
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`[RoleDetectionWorker] Role detection completed in ${duration} seconds`);
      console.log(`[RoleDetectionWorker] Phát hiện vai diễn hoàn thành trong ${duration} giây`);

      // Update paragraphs in database
      console.log(`[RoleDetectionWorker] Updating paragraphs in database...`);
      console.log(`[RoleDetectionWorker] Role detection result: ${Object.keys(result.role_map).length} roles detected from ${paragraphsToDetect.length} paragraphs`);
      
      let updatedCount = 0;
      let skippedInUpdate = 0;

      // Update ALL paragraphs that were in paragraphsToDetect (force regenerate mode processes all)
      // Cập nhật TẤT CẢ paragraphs đã được đưa vào paragraphsToDetect (chế độ ép tạo lại xử lý tất cả)
      for (const [detectedIdx, detectedParagraph] of paragraphsToDetect.entries()) {
        const role = result.role_map[detectedIdx];
        const voiceId = result.voice_map[detectedIdx];

        if (role && voiceId) {
          // Always update when we have a valid role (this overwrites existing roles in force regenerate mode)
          // Luôn cập nhật khi có vai diễn hợp lệ (điều này ghi đè vai diễn hiện có trong chế độ ép tạo lại)
          await ParagraphModel.update(detectedParagraph.id, {
            role: role,
            voiceId: voiceId
          });
          updatedCount++;

          // Update progress every 10 paragraphs
          if (updateProgress && progressId && updatedCount % 10 === 0) {
            const progressPercent = Math.floor((updatedCount / paragraphsToDetect.length) * 100);
            try {
              await GenerationProgressModel.update(progressId, {
                progressPercent: progressPercent
              });
            } catch (progressError) {
              // Ignore progress update errors
            }
          }
        } else {
          // Log paragraphs that didn't get roles from detection
          // Ghi log các paragraphs không nhận được vai diễn từ phát hiện
          skippedInUpdate++;
          console.warn(`[RoleDetectionWorker] ⚠️ No role detected for paragraph ${detectedParagraph.paragraphNumber || detectedIdx + 1} (index ${detectedIdx})`);
        }
      }
      
      // Count skipped paragraphs (those without roles in detection result)
      // Đếm các paragraphs bị bỏ qua (những cái không có vai diễn trong kết quả phát hiện)
      skippedCount += skippedInUpdate;
      
      if (skippedInUpdate > 0) {
        console.warn(`[RoleDetectionWorker] ⚠️ ${skippedInUpdate} paragraphs did not get roles from detection`);
        console.warn(`[RoleDetectionWorker] ⚠️ ${skippedInUpdate} paragraphs không nhận được vai diễn từ phát hiện`);
      }

      console.log(`[RoleDetectionWorker] Updated ${updatedCount} paragraphs in database`);

      // Save metadata to file if requested
      if (saveMetadata) {
        await this.saveRoleMetadata(novelId, chapterNumber, result, paragraphs, novel, chapter);
      }

      // Update progress to completed
      if (updateProgress && progressId) {
        try {
          await GenerationProgressModel.update(progressId, {
            status: 'completed',
            progressPercent: 100,
            completedAt: new Date().toISOString()
          });
        } catch (progressError) {
          // Ignore progress update errors
        }
      }

      // Count roles
      const roleCounts = {};
      for (const role of Object.values(result.role_map)) {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      }

      const voiceCounts = {};
      for (const voice of Object.values(result.voice_map)) {
        voiceCounts[voice] = (voiceCounts[voice] || 0) + 1;
      }

      return {
        success: true,
        novelId: novelId,
        chapterNumber: chapterNumber,
        totalParagraphs: paragraphs.length,
        updatedParagraphs: updatedCount,
        skippedParagraphs: skippedCount,
        roleCounts: roleCounts,
        voiceCounts: voiceCounts,
        processingTime: duration,
        roleMap: result.role_map,
        voiceMap: result.voice_map
      };

    } catch (error) {
      console.error(`[RoleDetectionWorker] Error: ${error.message}`);
      
      // Update progress to failed (progressId is defined in outer scope)
      if (updateProgress && typeof progressId !== 'undefined' && progressId !== null) {
        try {
          await GenerationProgressModel.update(progressId, {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date().toISOString()
          });
        } catch (progressError) {
          // Ignore progress update errors
          console.warn(`[RoleDetectionWorker] Failed to update progress on error: ${progressError.message}`);
        }
      }

      throw error;
    }
  }

  /**
   * Check if chapter is completely classified
   * Kiểm tra chapter đã được phân loại hoàn toàn chưa
   * 
   * @param {string} chapterId - Chapter ID
   * @returns {Promise<{isComplete: boolean, total: number, withRole: number}>}
   */
  async checkChapterClassificationStatus(chapterId) {
    const paragraphs = await ParagraphModel.getByChapter(chapterId);
    const total = paragraphs.length;
    const withRole = paragraphs.filter(p => p.role && p.voiceId).length;
    
    return {
      isComplete: total > 0 && withRole === total,
      total: total,
      withRole: withRole
    };
  }

  /**
   * Detect roles for all chapters in a novel
   * Phát hiện vai diễn cho tất cả chapters trong một novel
   * 
   * - Skip chapters that are already completely classified
   * - Overwrite paragraphs in incomplete chapters
   * - Process chapters sequentially for best accuracy
   * 
   * @param {string} novelId - Novel ID
   * @param {Object} options - Worker options
   * @returns {Promise<Object>} Detection results
   */
  async detectNovelRoles(novelId, options = {}) {
    const {
      updateProgress = true,
      saveMetadata = true,
      overwriteComplete = false,  // If true, re-detect even complete chapters
      forceRegenerateRoles = false  // If true, overwrite existing roles in paragraphs
    } = options;

    try {
      // Get novel
      const novel = await NovelModel.getById(novelId);
      if (!novel) {
        throw new Error(`Novel not found: ${novelId}`);
      }

      // Get all chapters
      const chapters = await ChapterModel.getByNovel(novelId);
      if (!chapters || chapters.length === 0) {
        throw new Error(`Novel ${novelId} has no chapters`);
      }

      // Sort chapters by number
      chapters.sort((a, b) => a.chapter_number - b.chapter_number);

      console.log(`[RoleDetectionWorker] Detecting roles for novel: ${novel.title}`);
      console.log(`[RoleDetectionWorker] Phát hiện vai diễn cho novel: ${novel.title}`);
      console.log(`[RoleDetectionWorker] Total chapters: ${chapters.length}`);

      // OPTIMIZED: Check chapter status on-the-fly instead of all upfront
      // TỐI ƯU: Kiểm tra status chapter on-the-fly thay vì tất cả trước
      // This allows processing to start immediately instead of waiting for 1600+ DB queries
      // Điều này cho phép xử lý bắt đầu ngay lập tức thay vì chờ 1600+ truy vấn DB
      console.log(`[RoleDetectionWorker] Starting processing immediately (will check status on-the-fly)`);
      console.log(`[RoleDetectionWorker] Bắt đầu xử lý ngay lập tức (sẽ kiểm tra status on-the-fly)`);

      // Track overall progress
      let overallProgressId = null;
      if (updateProgress) {
        try {
          const progress = await GenerationProgressModel.createOrUpdate({
            novelId: novelId,
            status: 'in_progress',
            model: 'role-detection-novel',
            progressPercent: 0,
            startedAt: new Date().toISOString()
          });
          overallProgressId = progress.id;
          console.log(`[RoleDetectionWorker] Overall progress tracking started: ${overallProgressId}`);
        } catch (progressError) {
          console.warn(`[RoleDetectionWorker] Failed to track overall progress: ${progressError.message}`);
        }
      }

      // Process chapters sequentially (one at a time for best accuracy)
      // OPTIMIZED: Check status on-the-fly instead of upfront
      // TỐI ƯU: Kiểm tra status on-the-fly thay vì trước
      const results = [];
      const errors = [];
      const skippedChapters = [];
      let totalProcessed = 0;
      let totalUpdated = 0;
      let processedCount = 0;

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const chapterNumber = chapter.chapter_number;
        
        // Check status on-the-fly (only for this chapter)
        // Kiểm tra status on-the-fly (chỉ cho chapter này)
        const status = await this.checkChapterClassificationStatus(chapter.id);
        
        // Skip if already complete (unless overwriteComplete is true)
        // Bỏ qua nếu đã hoàn thành (trừ khi overwriteComplete là true)
        if (!overwriteComplete && status.isComplete) {
          skippedChapters.push({
            chapter: chapter,
            ...status
          });
          if ((i + 1) % 100 === 0 || i === chapters.length - 1) {
            console.log(`[RoleDetectionWorker] Progress: ${i + 1}/${chapters.length} chapters checked, ${processedCount} processed, ${skippedChapters.length} skipped`);
          }
          continue;
        }
        
        processedCount++;
        console.log(`[RoleDetectionWorker] Processing chapter ${chapterNumber} (${processedCount} processing, ${i + 1}/${chapters.length} total)...`);

        try {
          // Detect roles for this chapter
          const result = await this.detectChapterRoles(novelId, chapterNumber, {
            forceRegenerateRoles: forceRegenerateRoles,
            updateProgress: false, // We'll update overall progress instead
            saveMetadata: saveMetadata
          });

          results.push({
            chapterNumber: chapterNumber,
            ...result
          });

          totalProcessed += result.totalParagraphs;
          totalUpdated += result.updatedParagraphs;

          // Update overall progress
          if (updateProgress && overallProgressId) {
            const progressPercent = Math.floor(((i + 1) / chapters.length) * 100);
            try {
              await GenerationProgressModel.update(overallProgressId, {
                progressPercent: progressPercent
              });
            } catch (progressError) {
              // Ignore
            }
          }

          console.log(`[RoleDetectionWorker] Chapter ${chapterNumber} completed: ${result.updatedParagraphs}/${result.totalParagraphs} paragraphs updated`);

        } catch (error) {
          console.error(`[RoleDetectionWorker] Error processing chapter ${chapterNumber}: ${error.message}`);
          errors.push({
            chapterNumber: chapterNumber,
            error: error.message
          });
        }
      }

      console.log(`[RoleDetectionWorker] Chapters to process: ${processedCount}`);
      console.log(`[RoleDetectionWorker] Chapters skipped (already complete): ${skippedChapters.length}`);

      // Update overall progress to completed
      if (updateProgress && overallProgressId) {
        try {
          await GenerationProgressModel.update(overallProgressId, {
            status: errors.length > 0 ? 'failed' : 'completed',
            progressPercent: 100,
            completedAt: new Date().toISOString(),
            errorMessage: errors.length > 0 ? `${errors.length} chapters failed` : null
          });
        } catch (progressError) {
          // Ignore
        }
      }

      // Aggregate results
      const aggregatedRoleCounts = {};
      const aggregatedVoiceCounts = {};

      for (const result of results) {
        for (const [role, count] of Object.entries(result.roleCounts || {})) {
          aggregatedRoleCounts[role] = (aggregatedRoleCounts[role] || 0) + count;
        }
        for (const [voice, count] of Object.entries(result.voiceCounts || {})) {
          aggregatedVoiceCounts[voice] = (aggregatedVoiceCounts[voice] || 0) + count;
        }
      }

      // Get skipped chapters summary
      const skippedSummary = skippedChapters.map(({ chapter, total, withRole }) => ({
        chapterNumber: chapter.chapter_number,
        chapterTitle: chapter.title,
        totalParagraphs: total,
        alreadyClassified: withRole
      }));

      console.log(`[RoleDetectionWorker] Novel role detection completed!`);
      console.log(`[RoleDetectionWorker] Processed: ${chaptersToProcessCount} chapters, ${totalUpdated} paragraphs updated`);
      console.log(`[RoleDetectionWorker] Skipped: ${skippedChapters.length} chapters (already complete)`);

      return {
        success: true,
        novelId: novelId,
        novelTitle: novel.title,
        totalChapters: chapters.length,
        processedChapters: chaptersToProcessCount,
        skippedChapters: skippedChapters.length,
        totalParagraphsProcessed: totalProcessed,
        totalParagraphsUpdated: totalUpdated,
        aggregatedRoleCounts: aggregatedRoleCounts,
        aggregatedVoiceCounts: aggregatedVoiceCounts,
        chapterResults: results,
        skippedChapters: skippedSummary,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error(`[RoleDetectionWorker] Novel detection error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save role metadata to file
   * Lưu role metadata vào file
   * 
   * @param {string} novelId - Novel ID
   * @param {number} chapterNumber - Chapter number
   * @param {Object} result - Detection result
   * @param {Array} paragraphs - Paragraph data
   * @param {Object} novel - Novel data
   * @param {Object} chapter - Chapter data
   */
  async saveRoleMetadata(novelId, chapterNumber, result, paragraphs, novel, chapter) {
    try {
      // Get audio storage path structure
      const audioStorageDir = path.join(__dirname, '../../../storage/audio');
      const novelDir = path.join(audioStorageDir, novelId);
      const chapterDir = path.join(novelDir, `chapter_${String(chapterNumber).padStart(3, '0')}`);
      const metadataDir = path.join(chapterDir, 'metadata');

      // Ensure directories exist
      await fs.mkdir(metadataDir, { recursive: true });

      // Create metadata object
      const metadata = {
        novelId: novelId,
        novelTitle: novel.title,
        chapterNumber: chapterNumber,
        chapterTitle: chapter.title,
        totalParagraphs: paragraphs.length,
        detectedAt: new Date().toISOString(),
        roleDetection: {
          roleMap: result.role_map,
          voiceMap: result.voice_map,
          roleCounts: {},
          voiceCounts: {}
        },
        paragraphs: paragraphs.map((para, idx) => ({
          paragraphNumber: para.paragraphNumber,
          role: result.role_map[idx] || null,
          voiceId: result.voice_map[idx] || null,
          textPreview: para.text.substring(0, 100) + (para.text.length > 100 ? '...' : '')
        }))
      };

      // Count roles and voices
      for (const role of Object.values(result.role_map)) {
        metadata.roleDetection.roleCounts[role] = (metadata.roleDetection.roleCounts[role] || 0) + 1;
      }
      for (const voice of Object.values(result.voice_map)) {
        metadata.roleDetection.voiceCounts[voice] = (metadata.roleDetection.voiceCounts[voice] || 0) + 1;
      }

      // Save metadata file
      const metadataFile = path.join(metadataDir, 'role_detection.json');
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');

      console.log(`[RoleDetectionWorker] Metadata saved to: ${metadataFile}`);
      console.log(`[RoleDetectionWorker] Đã lưu metadata tại: ${metadataFile}`);

    } catch (error) {
      console.warn(`[RoleDetectionWorker] Failed to save metadata: ${error.message}`);
      // Don't throw - metadata save is optional
    }
  }
}

// Singleton instance
let roleDetectionWorkerInstance = null;

/**
 * Get singleton role detection worker instance
 * Lấy instance role detection worker đơn
 * 
 * @returns {RoleDetectionWorker} Worker instance
 */
export function getRoleDetectionWorker() {
  if (!roleDetectionWorkerInstance) {
    roleDetectionWorkerInstance = new RoleDetectionWorker();
  }
  return roleDetectionWorkerInstance;
}

