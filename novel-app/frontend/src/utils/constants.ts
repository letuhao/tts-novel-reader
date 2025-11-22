/**
 * Application Constants
 * Centralized constants to avoid magic numbers/strings
 */

// Audio Configuration
export const AUDIO_CONFIG = {
  DEFAULT_SPEAKER_ID: '05',
  DEFAULT_SPEED_FACTOR: 1.0,
  PROGRESS_SAVE_INTERVAL_SECONDS: 5,
  PROGRESS_UPDATE_INTERVAL_MS: 100,
  GENERATION_CHECK_INTERVAL_MS: 2000,
} as const

// Audio Player
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0] as const
export const VOLUME_MIN = 0
export const VOLUME_MAX = 1
export const VOLUME_STEP = 0.1

// API Configuration
export const API_CONFIG = {
  TIMEOUT_MS: 60000, // 60 seconds for audio generation
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 50,
  ALLOWED_EXTENSIONS: ['.txt'],
  ACCEPTED_TYPES: ['text/plain'],
} as const

// Progress Save
export const PROGRESS_SAVE = {
  DEBOUNCE_MS: 1000,
  AUTO_SAVE_INTERVAL_SECONDS: 5,
} as const

// Theme
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  NOVEL: (id: string) => `/novel/${id}`,
  SETTINGS: '/settings',
} as const

// UI
export const UI = {
  TOAST_DURATION_MS: 11110,
  ANIMATION_DURATION_MS: 200,
} as const

