import { create } from 'zustand'
import type { Progress } from '../types'
import * as progressService from '../services/progress'
import { logError } from '../utils/logger'

interface ProgressState {
  currentNovelId: string | null
  currentChapter: number | null
  currentParagraph: number | null
  audioPosition: number
  lastSaved: Date | null
  progress: Progress | null
  
  loadProgress: (novelId: string) => Promise<void>
  saveProgress: (progressData: {
    novelId: string
    chapterNumber: number
    paragraphNumber: number
    position: number
  }) => Promise<void>
  updatePosition: (position: number) => void
  setCurrentChapter: (chapter: number | null) => void
  setCurrentParagraph: (paragraph: number | null) => void
}

export const useProgressStore = create<ProgressState>((set) => ({
  currentNovelId: null,
  currentChapter: null,
  currentParagraph: null,
  audioPosition: 0,
  lastSaved: null,
  progress: null,
  
  loadProgress: async (novelId: string) => {
    try {
      const progress = await progressService.get(novelId)
      if (progress) {
        set({
          currentNovelId: novelId,
          currentChapter: progress.chapterNumber || null,
          currentParagraph: progress.paragraphNumber || null,
          audioPosition: progress.position,
          progress,
        })
      }
    } catch (error) {
      logError('Failed to load progress', error)
    }
  },
  
  saveProgress: async (progressData) => {
    try {
      await progressService.save(progressData)
      set({
        lastSaved: new Date(),
        currentNovelId: progressData.novelId,
        currentChapter: progressData.chapterNumber,
        currentParagraph: progressData.paragraphNumber,
        audioPosition: progressData.position,
      })
    } catch (error) {
      logError('Failed to save progress', error)
    }
  },
  
  updatePosition: (position: number) => set({ audioPosition: position }),
  setCurrentChapter: (chapter: number | null) => set({ currentChapter: chapter }),
  setCurrentParagraph: (paragraph: number | null) => set({ currentParagraph: paragraph }),
}))

