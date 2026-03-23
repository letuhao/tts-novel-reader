/**
 * Settings Store - Zustand store for settings state
 */
import { create } from 'zustand';

interface SettingsState {
  selectedVoice: string;
  selectedLanguage: string;
  playbackSpeed: number;
  voices: string[];
  isLoading: boolean;
  
  // Actions
  setVoice: (voice: string) => void;
  setLanguage: (language: string) => void;
  setPlaybackSpeed: (speed: number) => void;
  setVoices: (voices: string[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  selectedVoice: 'Ana Florence',
  selectedLanguage: 'en',
  playbackSpeed: 1.0,
  voices: [],
  isLoading: false,

  setVoice: (voice) => {
    set({ selectedVoice: voice });
  },

  setLanguage: (language) => {
    set({ selectedLanguage: language });
  },

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: Math.max(0.5, Math.min(2.0, speed)) });
  },

  setVoices: (voices) => {
    set({ voices });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));

