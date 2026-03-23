/**
 * Voice Mapping Service - API calls for voice management
 * Dịch vụ Ánh Xạ Giọng - Gọi API cho quản lý giọng
 */
import api from './api'

export interface TTSModel {
  name: string
  displayName: string
  model: string
  baseURL: string
  defaultVoice: string
}

export interface VoiceMapping {
  [role: string]: string // role -> voiceId
}

export interface NovelVoiceMapping {
  novelId: string
  novelTitle: string
  model: string
  novelMappings: VoiceMapping
  defaultMappings: VoiceMapping
  hasCustomMappings: boolean
}

export interface VoiceResolve {
  role: string
  normalizedRole: string
  model: string
  novelId: string | null
  voice: string
  isNovelSpecific: boolean
}

// Get all TTS models
export const getModels = async (): Promise<TTSModel[]> => {
  const response = await api.get<{ success: boolean; models: TTSModel[]; count: number }>('/voice-mapping/models')
  return response.data.models
}

// Get available voices for a model
export const getVoices = async (model: string, gender: 'male' | 'female' | 'narrator' | 'all' = 'all'): Promise<string[]> => {
  const response = await api.get<{ success: boolean; model: string; gender: string; voices: string[]; count: number }>(
    `/voice-mapping/voices/${model}?gender=${gender}`
  )
  return response.data.voices
}

// Get default voice mappings for a model
export const getDefaultMappings = async (model: string): Promise<VoiceMapping> => {
  const response = await api.get<{ success: boolean; model: string; mappings: VoiceMapping }>(
    `/voice-mapping/default/${model}`
  )
  return response.data.mappings
}

// Get novel voice mappings
export const getNovelMappings = async (novelId: string, model?: string): Promise<NovelVoiceMapping> => {
  const url = model 
    ? `/voice-mapping/novel/${novelId}?model=${model}`
    : `/voice-mapping/novel/${novelId}`
  const response = await api.get<{ success: boolean } & NovelVoiceMapping>(url)
  return {
    novelId: response.data.novelId,
    novelTitle: response.data.novelTitle,
    model: response.data.model,
    novelMappings: response.data.novelMappings,
    defaultMappings: response.data.defaultMappings,
    hasCustomMappings: response.data.hasCustomMappings
  }
}

// Set novel voice mappings
export const setNovelMappings = async (
  novelId: string,
  model: string,
  mappings: VoiceMapping
): Promise<VoiceMapping> => {
  const response = await api.put<{ success: boolean; message: string; novelId: string; model: string; mappings: VoiceMapping }>(
    `/voice-mapping/novel/${novelId}`,
    { model, mappings }
  )
  return response.data.mappings
}

// Clear novel voice mappings
export const clearNovelMappings = async (novelId: string, model?: string): Promise<void> => {
  const url = model 
    ? `/voice-mapping/novel/${novelId}?model=${model}`
    : `/voice-mapping/novel/${novelId}`
  await api.delete(url)
}

// Get assignment strategy
export const getAssignmentStrategy = async (novelId: string): Promise<'round-robin' | 'manual'> => {
  const response = await api.get<{ success: boolean; novelId: string; strategy: 'round-robin' | 'manual'; description: string }>(
    `/voice-mapping/novel/${novelId}/strategy`
  )
  return response.data.strategy
}

// Set assignment strategy
export const setAssignmentStrategy = async (
  novelId: string,
  strategy: 'round-robin' | 'manual'
): Promise<void> => {
  await api.put(`/voice-mapping/novel/${novelId}/strategy`, { strategy })
}

// Resolve voice for a role
export const resolveVoice = async (
  role: string,
  model: string,
  novelId?: string
): Promise<VoiceResolve> => {
  const response = await api.post<{ success: boolean } & VoiceResolve>(
    '/voice-mapping/resolve',
    { role, model, novelId: novelId || null }
  )
  return {
    role: response.data.role,
    normalizedRole: response.data.normalizedRole,
    model: response.data.model,
    novelId: response.data.novelId,
    voice: response.data.voice,
    isNovelSpecific: response.data.isNovelSpecific
  }
}

