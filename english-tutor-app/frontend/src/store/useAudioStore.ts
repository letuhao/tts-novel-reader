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
  playAudio: (url: string, messageId?: string) => Promise<void>;
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

  playAudio: async (url: string, _messageId?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const state = get();
      
      // Stop and cleanup current audio if playing
      if (state.audioElement) {
        const currentAudio = state.audioElement;
        // Remove all event listeners to prevent memory leaks
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.src = '';
        currentAudio.load();
        set({ isPlaying: false, audioElement: null, currentAudioUrl: null });
      }

      const audio = new Audio(url);
      
      // Set preload to auto to start loading immediately
      audio.preload = 'auto';
      
      let playbackStarted = false;
      let isResolved = false;
      
      // Handle audio ended - this is when the Promise resolves
      const handleEnded = () => {
        if (isResolved) return;
        isResolved = true;
        console.log('✅ Audio playback ended', { url, messageId: _messageId });
        set({ isPlaying: false, audioElement: null, currentAudioUrl: null });
        // Cleanup
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        resolve();
      };

      // Handle audio error
      const handleError = (error: Event) => {
        if (isResolved) return;
        isResolved = true;
        console.error('❌ Audio playback error:', error);
        set({ isPlaying: false, audioElement: null, currentAudioUrl: null });
        // Cleanup
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
        reject(error);
      };

      // Start playing as soon as we have enough data
      const startPlayback = async () => {
        if (playbackStarted || isResolved) return;
        playbackStarted = true;
        
        try {
          set({ audioElement: audio, currentAudioUrl: url, isPlaying: true });
          await audio.play();
          console.log('✅ Audio playback started successfully', { url, messageId: _messageId });
        } catch (error) {
          console.error('❌ Error starting audio playback:', error);
          handleError(error as Event);
        }
      };

      // Handle canplay event
      const handleCanPlay = () => {
        if (!playbackStarted && !isResolved) {
          void startPlayback();
        }
      };

      // Handle canplaythrough event
      const handleCanPlayThrough = () => {
        if (!playbackStarted && !isResolved) {
          void startPlayback();
        }
      };

      // Set up event listeners
      audio.addEventListener('ended', handleEnded, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      // For blob URLs (which we use), the audio is ready immediately
      // Start playing right away without waiting for events
      if (url.startsWith('blob:')) {
        // Blob URLs are ready immediately - start playing right away
        // Use requestAnimationFrame to ensure the audio element is ready
        requestAnimationFrame(() => {
          if (!isResolved) {
            void startPlayback();
          }
        });
      } else {
        // For other URLs, wait for canplay or canplaythrough
        audio.addEventListener('canplay', handleCanPlay, { once: true });
        audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });

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

