/**
 * useVoiceResolver Hook - Resolve voice for a role based on current model
 * Hook useVoiceResolver - Giải quyết giọng cho vai diễn dựa trên model hiện tại
 */
import { useState, useEffect } from 'react'
import { resolveVoice } from '../services/voiceMapping'

interface UseVoiceResolverOptions {
  novelId?: string | null
  model?: string | null  // TTS model name (e.g., 'coqui-xtts-v2', 'viettts')
}

// Simple cache for resolved voices (5 minute TTL)
// Cache đơn giản cho các giọng đã giải quyết (TTL 5 phút)
const voiceCache = new Map<string, { voice: string | null; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCacheKey(role: string, model: string, novelId?: string | null): string {
  return `${role}:${model}:${novelId || 'null'}`
}

function getCachedVoice(role: string, model: string, novelId?: string | null): string | null | undefined {
  const key = getCacheKey(role, model, novelId)
  const cached = voiceCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.voice
  }
  return undefined
}

function setCachedVoice(role: string, model: string, novelId: string | null | undefined, voice: string | null): void {
  const key = getCacheKey(role, model, novelId)
  voiceCache.set(key, { voice, timestamp: Date.now() })
}

/**
 * Resolve voice for a role
 * Giải quyết giọng cho vai diễn
 */
export function useVoiceResolver(role: string | null | undefined, options: UseVoiceResolverOptions = {}) {
  const { novelId, model } = options
  const [resolvedVoice, setResolvedVoice] = useState<string | null | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get default model from environment or use provided model
  // Lấy model mặc định từ environment hoặc sử dụng model được cung cấp
  const currentModel = model || import.meta.env.VITE_TTS_DEFAULT_MODEL || 'coqui-xtts-v2'

  useEffect(() => {
    if (!role || !currentModel) {
      setResolvedVoice(null)
      setIsLoading(false)
      return
    }

    // Check cache first
    // Kiểm tra cache trước
    const cached = getCachedVoice(role, currentModel, novelId)
    if (cached !== undefined) {
      setResolvedVoice(cached)
      setIsLoading(false)
      return
    }

    // Resolve voice from API
    // Giải quyết giọng từ API
    setIsLoading(true)
    setError(null)
    
    resolveVoice(role, currentModel, novelId || undefined)
      .then((result) => {
        const voice = result.voice
        setResolvedVoice(voice)
        setCachedVoice(role, currentModel, novelId, voice)
        setIsLoading(false)
      })
      .catch((err) => {
        console.warn(`[useVoiceResolver] Failed to resolve voice for role "${role}":`, err)
        setError(err as Error)
        setResolvedVoice(null)
        setCachedVoice(role, currentModel, novelId, null)
        setIsLoading(false)
      })
  }, [role, currentModel, novelId])

  return {
    voice: resolvedVoice,
    isLoading,
    error,
  }
}

