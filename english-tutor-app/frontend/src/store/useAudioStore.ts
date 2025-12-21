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

  playAudio: async (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const { audioElement, stopAudio } = get();
      
      // Stop current audio if playing
      if (audioElement) {
        stopAudio();
      }

      const audio = new Audio(url);
      
      // Set preload to auto to start loading immediately
      audio.preload = 'auto';
      
      let playbackStarted = false;
      let playbackPromise: Promise<void> | null = null;
      
      audio.addEventListener('ended', () => {
        set({ isPlaying: false, audioElement: null });
        resolve();
      });

      audio.addEventListener('error', (error) => {
        console.error('Audio playback error:', error);
        set({ isPlaying: false, audioElement: null });
        reject(error);
      });

      // Start playing as soon as we have enough data
      const startPlayback = async () => {
        if (playbackStarted) return;
        playbackStarted = true;
        
        try {
          set({ audioElement: audio, currentAudioUrl: url, isPlaying: true });
          playbackPromise = audio.play();
          await playbackPromise;
          console.log('✅ Audio playback started successfully');
        } catch (error) {
          console.error('❌ Error starting audio playback:', error);
          set({ isPlaying: false, audioElement: null });
          reject(error);
        }
      };

      // For blob URLs (which we use), the audio is ready immediately
      // Start playing right away without waiting for events
      if (url.startsWith('blob:')) {
        // Blob URLs are ready immediately - start playing right away
        // Use a small timeout to ensure the audio element is ready
        setTimeout(() => {
          void startPlayback();
        }, 0);
      } else {
        // For other URLs, wait for canplay or canplaythrough
        // Try canplay first (fires earlier)
        audio.addEventListener('canplay', () => {
          if (!playbackStarted) {
            void startPlayback();
          }
        }, { once: true });

        // Also listen for canplaythrough (more reliable but fires later)
        audio.addEventListener('canplaythrough', () => {
          if (!playbackStarted) {
            void startPlayback();
          }
        }, { once: true });

        // If audio is already loaded enough, play immediately
        if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
          void startPlayback();
        } else {
          // Load the audio explicitly
          audio.load();
        }
      }
    });
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

