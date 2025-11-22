import { create } from 'zustand'
import type { GenerationStats } from '../types'

interface GenerationState {
  novelId: string | null
  chapterNumber: number | null
  status: 'idle' | 'generating' | 'completed' | 'failed'
  progress: GenerationStats | null
  
  startGeneration: (novelId: string, chapterNumber: number) => void
  updateProgress: (progress: GenerationStats) => void
  completeGeneration: () => void
  failGeneration: () => void
  reset: () => void
}

export const useGenerationStore = create<GenerationState>((set) => ({
  novelId: null,
  chapterNumber: null,
  status: 'idle',
  progress: null,
  
  startGeneration: (novelId: string, chapterNumber: number) =>
    set({
      novelId,
      chapterNumber,
      status: 'generating',
      progress: { total: 0, completed: 0, failed: 0, pending: 0, byStatus: {} },
    }),
  
  updateProgress: (progress: GenerationStats) =>
    set({ progress }),
  
  completeGeneration: () =>
    set((state) => ({
      status: state.progress?.failed && state.progress.failed > 0 ? 'failed' : 'completed',
    })),
  
  failGeneration: () => set({ status: 'failed' }),
  
  reset: () =>
    set({
      novelId: null,
      chapterNumber: null,
      status: 'idle',
      progress: null,
    }),
}))

