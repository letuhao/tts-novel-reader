/**
 * Role Detection Service - API calls for role detection
 * Dịch vụ Phát hiện Vai diễn - Gọi API cho role detection
 */
import api from './api'
import type { ApiResponse } from '../types'

export interface RoleDetectionResult {
  novelId: string
  chapterNumber?: number
  totalParagraphs: number
  updatedParagraphs: number
  roleCounts: Record<string, number>
  voiceCounts: Record<string, number>
  processingTime: string
  roleMap?: Record<string, string>
  voiceMap?: Record<string, string>
}

export interface NovelRoleDetectionResult {
  novelId: string
  novelTitle: string
  totalChapters: number
  processedChapters: number
  skippedChapters: number
  totalParagraphsProcessed: number
  totalParagraphsUpdated: number
  aggregatedRoleCounts: Record<string, number>
  aggregatedVoiceCounts: Record<string, number>
  chapterResults: RoleDetectionResult[]
  skippedChapters: Array<{
    chapterNumber: number
    chapterTitle: string
    totalParagraphs: number
    alreadyClassified: number
  }>
  errors?: Array<{
    chapterNumber: number
    error: string
  }>
}

export interface ChapterRoleStatus {
  novelId: string
  chapterNumber: number
  totalParagraphs: number
  paragraphsWithRoles: number
  progressPercent: number
  isComplete: boolean
  roleCounts: Record<string, number>
  voiceCounts: Record<string, number>
}

export interface NovelRoleStatus {
  novelId: string
  novelTitle: string
  totalChapters: number
  completeChapters: number
  incompleteChapters: number
  totalParagraphs: number
  paragraphsWithRoles: number
  overallProgress: number
  isComplete: boolean
  chapterStatuses: Array<{
    chapterNumber: number
    chapterTitle: string | null
    totalParagraphs: number
    paragraphsWithRoles: number
    isComplete: boolean
    progressPercent: number
  }>
}

/**
 * Detect roles for a chapter
 * Phát hiện vai diễn cho một chapter
 */
export interface RoleDetectionStartResult {
  progressId: string
  novelId: string
  chapterNumber: number
  status: string
}

export const detectChapterRoles = async (
  novelId: string,
  chapterNumber: number,
  options?: {
    updateProgress?: boolean
    saveMetadata?: boolean
    forceRegenerateRoles?: boolean
  }
): Promise<RoleDetectionStartResult> => {
  const response = await api.post<ApiResponse<RoleDetectionStartResult>>(
    '/role-detection-worker/detect-chapter',
    {
      novelId,
      chapterNumber,
      updateProgress: options?.updateProgress ?? true,
      saveMetadata: options?.saveMetadata ?? true,
      forceRegenerateRoles: options?.forceRegenerateRoles ?? false,
    },
    {
      timeout: 10000, // 10 seconds - just to start the job
    }
  )

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to start role detection')
  }

  return response.data.data
}

/**
 * Detect roles for entire novel
 * Phát hiện vai diễn cho toàn bộ novel
 */
export const detectNovelRoles = async (
  novelId: string,
  options?: {
    overwriteComplete?: boolean
    forceRegenerateRoles?: boolean
    updateProgress?: boolean
    saveMetadata?: boolean
  }
): Promise<NovelRoleDetectionResult> => {
  const response = await api.post<ApiResponse<NovelRoleDetectionResult>>(
    '/role-detection/detect-novel',
    {
      novelId,
      overwriteComplete: options?.overwriteComplete ?? false,
      forceRegenerateRoles: options?.forceRegenerateRoles ?? false,
      updateProgress: options?.updateProgress ?? true,
      saveMetadata: options?.saveMetadata ?? true,
    }
  )

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to detect novel roles')
  }

  return response.data.data
}

/**
 * Get chapter role detection status
 * Lấy trạng thái phát hiện vai diễn của chapter
 */
export const getChapterRoleStatus = async (
  novelId: string,
  chapterNumber: number
): Promise<ChapterRoleStatus> => {
  const response = await api.get<ApiResponse<ChapterRoleStatus>>(
    `/role-detection-worker/chapter-status/${novelId}/${chapterNumber}`
  )

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to get chapter status')
  }

  return response.data.data
}

/**
 * Get novel role detection status
 * Lấy trạng thái phát hiện vai diễn của novel
 */
export const getNovelRoleStatus = async (
  novelId: string
): Promise<NovelRoleStatus> => {
  const response = await api.get<ApiResponse<NovelRoleStatus>>(
    `/role-detection/novel-status/${novelId}`
  )

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.error || 'Failed to get novel status')
  }

  return response.data.data
}

/**
 * Check if role detection service is available
 * Kiểm tra dịch vụ role detection có sẵn không
 */
export const checkRoleDetectionStatus = async (): Promise<boolean> => {
  try {
    const response = await api.get<ApiResponse<{ available: boolean }>>(
      '/role-detection/status'
    )
    return response.data.success && response.data.data?.available === true
  } catch (error) {
    return false
  }
}

