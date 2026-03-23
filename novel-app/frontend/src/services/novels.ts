/**
 * Novel Service - API calls for novels
 * Dịch vụ Novel - Gọi API cho novels
 */
import api from './api'
import type { Novel, NovelListResponse, NovelResponse } from '../types'

export const getAll = async (): Promise<Novel[]> => {
  const response = await api.get<NovelListResponse>('/novels')
  if (response.data.novels) {
    return response.data.novels
  }
  if (Array.isArray(response.data)) {
    return response.data
  }
  return []
}

export const getById = async (id: string): Promise<Novel> => {
  const response = await api.get<NovelResponse>(`/novels/${id}`)
  if (!response.data.novel) {
    throw new Error('Novel not found')
  }
  return response.data.novel
}

export const upload = async (
  file: File,
  options?: {
    useLLMStructureDetection?: boolean
    language?: string
  }
): Promise<Novel> => {
  const formData = new FormData()
  formData.append('novel', file)
  
  // Add LLM structure detection options (default: disabled - use former regex parser)
  // Thêm tùy chọn LLM structure detection (mặc định: tắt - dùng parser regex cũ)
  if (options?.useLLMStructureDetection !== undefined) {
    formData.append('useLLMStructureDetection', String(options.useLLMStructureDetection))
  } else {
    formData.append('useLLMStructureDetection', 'false') // Default: disabled - use former parser
  }
  
  if (options?.language) {
    formData.append('language', options.language)
  } else {
    formData.append('language', 'auto') // Default: auto-detect
  }
  
  // Disable paragraph splitting (use former parser behavior)
  // Tắt chia paragraph (dùng hành vi parser cũ)
  formData.append('splitLongParagraphs', 'false')
  
  const response = await api.post<NovelResponse>('/novels/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  if (!response.data.novel) {
    throw new Error(response.data.error || 'Failed to upload novel')
  }
  
  return response.data.novel
}

export const process = async (filePath: string): Promise<Novel> => {
  const response = await api.post<NovelResponse>('/novels/process', { filePath })
  
  if (!response.data.novel) {
    throw new Error(response.data.error || 'Failed to process novel')
  }
  
  return response.data.novel
}

export const remove = async (id: string): Promise<void> => {
  await api.delete(`/novels/${id}`)
}

