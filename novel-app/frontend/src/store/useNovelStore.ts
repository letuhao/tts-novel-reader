import { create } from 'zustand'
import type { Novel } from '../types'
import * as novelService from '../services/novels'

interface NovelState {
  novels: Novel[]
  currentNovel: Novel | null
  loading: boolean
  error: string | null
  fetchNovels: () => Promise<void>
  fetchNovel: (id: string) => Promise<void>
  addNovel: (novel: Novel) => void
  removeNovel: (id: string) => void
  setCurrentNovel: (novel: Novel | null) => void
}

export const useNovelStore = create<NovelState>((set) => ({
  novels: [],
  currentNovel: null,
  loading: false,
  error: null,
  
  fetchNovels: async () => {
    set({ loading: true, error: null })
    try {
      const novels = await novelService.getAll()
      set({ novels, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch novels',
        loading: false,
      })
    }
  },
  
  fetchNovel: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const novel = await novelService.getById(id)
      set({ currentNovel: novel, loading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch novel',
        loading: false,
      })
    }
  },
  
  addNovel: (novel: Novel) =>
    set((state) => ({
      novels: [...state.novels, novel],
    })),
  
  removeNovel: (id: string) =>
    set((state) => ({
      novels: state.novels.filter((n) => n.id !== id),
      currentNovel: state.currentNovel?.id === id ? null : state.currentNovel,
    })),
  
  setCurrentNovel: (novel: Novel | null) => set({ currentNovel: novel }),
}))

