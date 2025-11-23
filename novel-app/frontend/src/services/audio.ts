/**
 * Audio Service - API calls for audio
 * Dịch vụ Audio - Gọi API cho audio
 */
import api from './api'
import type { AudioFilesResponse, WorkerGenerateResponse } from '../types'

export const getChapterAudio = async (
  novelId: string,
  chapterNumber: number
): Promise<AudioFile[]> => {
  try {
    const response = await api.get<AudioFilesResponse>(`/audio/${novelId}/${chapterNumber}`)
    // Always return an array, never null
    return Array.isArray(response.data.audioFiles) ? response.data.audioFiles : []
  } catch (error) {
    // If audio files don't exist, return empty array instead of null
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } }
      if (axiosError.response?.status === 404) {
        return []
      }
    }
    throw error
  }
}

export const generateChapter = async (
  novelId: string,
  chapterNumber: number,
  options: {
    speakerId?: string
    speedFactor?: number
    maxParagraphs?: number
    forceRegenerate?: boolean
  } = {}
): Promise<WorkerGenerateResponse> => {
  const response = await api.post<WorkerGenerateResponse>(
    '/worker/generate/chapter',
    {
      novelId,
      chapterNumber,
      speakerId: options.speakerId || '05',
      speedFactor: options.speedFactor || 1.0,
      maxParagraphs: options.maxParagraphs || null,
      forceRegenerate: options.forceRegenerate || false,
    }
  )
  return response.data
}

export const generateAllChapters = async (
  novelId: string,
  options: {
    speakerId?: string
    speedFactor?: number
    forceRegenerate?: boolean
  } = {}
): Promise<WorkerGenerateResponse> => {
  const response = await api.post<WorkerGenerateResponse>(
    '/audio/generate/novel',
    {
      novelId,
      speakerId: options.speakerId || '05',
      speedFactor: options.speedFactor || 1.0,
      forceRegenerate: options.forceRegenerate || false,
    }
  )
  return response.data
}

