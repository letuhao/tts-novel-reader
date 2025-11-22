/**
 * Generation Service - API calls for generation progress
 * Dịch vụ Generation - Gọi API cho tiến độ tạo audio
 */
import api from './api'
import type { GenerationStats, GenerationStatsResponse, GenerationProgress } from '../types'

export const getChapterStats = async (
  novelId: string,
  chapterNumber: number
): Promise<GenerationStats> => {
  const response = await api.get<GenerationStatsResponse>(
    `/generation/novel/${novelId}/chapter/${chapterNumber}/stats`
  )
  return response.data.stats || { total: 0, completed: 0, failed: 0, pending: 0, byStatus: {} }
}

export const getChapterProgress = async (
  novelId: string,
  chapterNumber: number
): Promise<GenerationProgress[]> => {
  const response = await api.get<{ progress: GenerationProgress[] }>(
    `/generation/novel/${novelId}/chapter/${chapterNumber}`
  )
  return response.data.progress || []
}

