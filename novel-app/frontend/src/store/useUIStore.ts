import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Theme } from '../types'

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  currentView: 'library' | 'reader' | 'settings'
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  setCurrentView: (view: 'library' | 'reader' | 'settings') => void
}

export const useThemeStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: false,
      currentView: 'library',
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setCurrentView: (view: 'library' | 'reader' | 'settings') =>
        set({ currentView: view }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

