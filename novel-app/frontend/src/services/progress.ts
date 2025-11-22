/**
 * Progress Service - API calls for reading progress
 * Dịch vụ Progress - Gọi API cho tiến độ đọc
 */
import api from './api'
import type { Progress, ProgressResponse } from '../types'

export const get = async (novelId: string): Promise<Progress | null> => {
  try {
    const response = await api.get<ProgressResponse>(`/progress/${novelId}`)
    return response.data.progress || null
  } catch (error) {
    // Progress might not exist yet, return null
    return null
  }
}

export const save = async (progressData: {
  novelId: string
  chapterNumber: number
  paragraphNumber: number
  position: number
  completed?: boolean
}): Promise<Progress> => {
  const response = await api.post<ProgressResponse>('/progress/save', {
    novelId: progressData.novelId,
    chapterNumber: progressData.chapterNumber,
    paragraphNumber: progressData.paragraphNumber,
    position: progressData.position,
    completed: progressData.completed || false,
  })
  
  if (!response.data.progress) {
    throw new Error(response.data.error || 'Failed to save progress')
  }
  
  return response.data.progress
}

