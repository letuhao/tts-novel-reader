import { create } from 'zustand'
import type { Paragraph } from '../types'
import * as chapterService from '../services/chapters'

interface ReaderState {
  novelId: string | null
  chapterNumber: number | null
  paragraphs: Paragraph[] | null
  currentParagraphNumber: number | null
  chapterTitle: string | null
  loading: boolean
  error: string | null
  loadChapter: (novelId: string, chapterNumber: number) => Promise<void>
  setCurrentParagraph: (paragraphNumber: number) => void
  setNovelId: (novelId: string | null) => void
}

export const useReaderStore = create<ReaderState>((set) => ({
  novelId: null,
  chapterNumber: null,
  paragraphs: null,
  currentParagraphNumber: null,
  chapterTitle: null,
  loading: false,
  error: null,
  
  loadChapter: async (novelId: string, chapterNumber: number) => {
    set({ loading: true, error: null })
    try {
      const chapter = await chapterService.getChapter(novelId, chapterNumber)
      set({
        novelId,
        chapterNumber,
        paragraphs: chapter.paragraphs || [],
        chapterTitle: chapter.title || null,
        currentParagraphNumber: null,
        loading: false,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load chapter',
        loading: false,
      })
    }
  },
  
  setCurrentParagraph: (paragraphNumber: number) =>
    set({ currentParagraphNumber: paragraphNumber }),
  
  setNovelId: (novelId: string | null) => set({ novelId }),
}))

