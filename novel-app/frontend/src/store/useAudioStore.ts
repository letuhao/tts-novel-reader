import { create } from 'zustand'
import type { Howl } from 'howler'
import type { AudioFile } from '../types'

interface AudioState {
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  volume: number
  audioFiles: AudioFile[]
  currentAudioIndex: number
  isLoading: boolean
  currentAudio: Howl | null
  
  // Actions
  setAudioFiles: (files: AudioFile[]) => void
  setCurrentAudioIndex: (index: number) => void
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setPlaybackRate: (rate: number) => void
  setVolume: (volume: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsLoading: (loading: boolean) => void
  setCurrentAudio: (audio: Howl | null) => void
}

export const useAudioStore = create<AudioState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  volume: 1.0,
  audioFiles: [],
  currentAudioIndex: 0,
  isLoading: false,
  currentAudio: null,
  
  setAudioFiles: (files: AudioFile[]) => set({ audioFiles: files }),
  setCurrentAudioIndex: (index: number) => set({ currentAudioIndex: index }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  seek: (time: number) => set({ currentTime: time }),
  setPlaybackRate: (rate: number) => set({ playbackRate: rate }),
  setVolume: (volume: number) => set({ volume }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
  setDuration: (duration: number) => set({ duration }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  setCurrentAudio: (audio: Howl | null) => set({ currentAudio: audio }),
}))

