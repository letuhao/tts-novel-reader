/**
 * Audio Store - Zustand store for audio playback state
 */
import { create } from 'zustand';

interface AudioState {
  isPlaying: boolean;
  isRecording: boolean;
  currentAudioUrl: string | null;
  audioElement: HTMLAudioElement | null;
  recordingMediaRecorder: MediaRecorder | null;
  recordingChunks: Blob[];
  
  // Actions
  setPlaying: (playing: boolean) => void;
  setRecording: (recording: boolean) => void;
  setCurrentAudioUrl: (url: string | null) => void;
  setAudioElement: (element: HTMLAudioElement | null) => void;
  setMediaRecorder: (recorder: MediaRecorder | null) => void;
  addRecordingChunk: (chunk: Blob) => void;
  clearRecordingChunks: () => void;
  playAudio: (url: string) => Promise<void>;
  stopAudio: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
}

export const useAudioStore = create<AudioState>((set, get) => ({
  isPlaying: false,
  isRecording: false,
  currentAudioUrl: null,
  audioElement: null,
  recordingMediaRecorder: null,
  recordingChunks: [],

  setPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  setRecording: (recording) => {
    set({ isRecording: recording });
  },

  setCurrentAudioUrl: (url) => {
    set({ currentAudioUrl: url });
  },

  setAudioElement: (element) => {
    set({ audioElement: element });
  },

  setMediaRecorder: (recorder) => {
    set({ recordingMediaRecorder: recorder });
  },

  addRecordingChunk: (chunk) => {
    set((state) => ({
      recordingChunks: [...state.recordingChunks, chunk],
    }));
  },

  clearRecordingChunks: () => {
    set({ recordingChunks: [] });
  },

  playAudio: async (url: string) => {
    const { audioElement, stopAudio } = get();
    
    // Stop current audio if playing
    if (audioElement) {
      stopAudio();
    }

    const audio = new Audio(url);
    audio.addEventListener('ended', () => {
      set({ isPlaying: false, audioElement: null });
    });

    set({ audioElement: audio, currentAudioUrl: url, isPlaying: true });
    await audio.play();
  },

  stopAudio: () => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      set({ isPlaying: false, audioElement: null });
    }
  },

  startRecording: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          get().addRecordingChunk(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      set({ recordingMediaRecorder: mediaRecorder, isRecording: true, recordingChunks: [] });
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  },

  stopRecording: (): Promise<Blob> => {
    return new Promise((resolve) => {
      const { recordingMediaRecorder } = get();
      
      if (!recordingMediaRecorder) {
        resolve(new Blob());
        return;
      }

      recordingMediaRecorder.onstop = () => {
        const { recordingChunks } = get();
        const audioBlob = new Blob(recordingChunks, { type: 'audio/wav' });
        set({ isRecording: false, recordingMediaRecorder: null, recordingChunks: [] });
        resolve(audioBlob);
      };

      recordingMediaRecorder.stop();
    });
  },
}));

