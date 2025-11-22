/**
 * Chapter Service - API calls for chapters
 * Dịch vụ Chapter - Gọi API cho chapters
 */
import api from './api'
import type { Chapter, ChapterResponse } from '../types'

export const getChapter = async (novelId: string, chapterNumber: number): Promise<Chapter> => {
  const response = await api.get<ChapterResponse>(`/novels/${novelId}/chapters/${chapterNumber}`)
  
  if (!response.data.chapter) {
    throw new Error('Chapter not found')
  }
  
  return response.data.chapter
}

export const getChapters = async (novelId: string): Promise<Chapter[]> => {
  const response = await api.get<{ chapters: Chapter[] }>(`/novels/${novelId}/chapters`)
  return response.data.chapters || []
}

