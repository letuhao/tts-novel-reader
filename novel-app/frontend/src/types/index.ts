/**
 * Type Definitions
 * Định nghĩa Kiểu
 */

export interface Novel {
  id: string
  title: string
  filePath: string
  metadata: {
    author?: string
    description?: string
    [key: string]: unknown
  }
  totalChapters: number
  totalParagraphs: number
  chapters?: Chapter[]
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: string
  novelId: string
  chapterNumber: number
  title: string | null
  content: string | null
  totalParagraphs: number
  totalLines: number
  paragraphs?: Paragraph[]
  createdAt: string
  updatedAt: string
}

export interface Paragraph {
  id: string
  novelId: string
  chapterId: string
  chapterNumber: number
  paragraphNumber: number
  text: string
  lines: string[] | null
  role?: string | null  // male/female/narrator
  voiceId?: string | null  // cdteam/quynh/nu-nhe-nhang
  createdAt: string
  updatedAt: string
}

export interface AudioFile {
  paragraphNumber: number
  paragraphId: string
  fileId: string
  audioURL: string
  expiresAt: string | null
  createdAt: string
}

export interface Progress {
  id: string
  novelId: string
  chapterId: string | null
  chapterNumber: number | null
  paragraphId: string | null
  paragraphNumber: number | null
  position: number
  completed: boolean
  lastReadAt: string
  readingTimeSeconds: number
}

export interface GenerationProgress {
  id: string
  novelId: string
  chapterId: string | null
  chapterNumber: number | null
  paragraphId: string | null
  paragraphNumber: number | null
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  speakerId: string | null
  model: string | null
  progressPercent: number
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
}

export interface GenerationStats {
  total: number
  completed: number
  failed: number
  pending: number
  byStatus: Record<string, number>
}

export interface AudioMetadata {
  fileId: string
  audioURL: string
  localAudioPath: string | null
  audioDuration: number | null
  audioDurationFormatted: string | null
  audioFileSize: number | null
  audioFileSizeMB: number | null
  sampleRate: number | null
  audioFormat: string | null
  expiresAt: string | null
  subtitle?: string
  text?: string
  textStats?: {
    characterCount: number
    wordCount: number
    estimatedReadingTimeSeconds: number
  }
  generationParams?: {
    speakerId: string
    model: string
    speedFactor: number
  }
  paragraphId?: string
  paragraphIndex?: number
  totalParagraphsInChapter?: number
  metadata?: Record<string, unknown>
}

export type Theme = 'light' | 'dark'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  [key: string]: unknown
}

export interface NovelListResponse extends ApiResponse<Novel[]> {
  novels?: Novel[]
}

export interface NovelResponse extends ApiResponse<Novel> {
  novel?: Novel
}

export interface ChapterResponse extends ApiResponse<Chapter> {
  chapter?: Chapter
}

export interface AudioFilesResponse extends ApiResponse<AudioFile[]> {
  audioFiles?: AudioFile[]
  chapterNumber?: number
  chapterId?: string
  totalParagraphs?: number
  audioFileCount?: number
}

export interface ProgressResponse extends ApiResponse<Progress> {
  progress?: Progress
}

export interface GenerationStatsResponse extends ApiResponse<GenerationStats> {
  stats?: GenerationStats
  chapterNumber?: number
}

export interface WorkerGenerateResponse {
  success: boolean
  chapterNumber: number
  chapterId: string
  totalParagraphs: number
  successCount: number
  failedCount: number
  cachedCount: number
  generatedCount: number
  paragraphResults: Array<{
    success: boolean
    cached: boolean
    paragraphNumber: number
    paragraphId: string
    fileId: string
    audioURL: string
    text: string
  }>
  errors: Array<{
    paragraphNumber: number
    paragraphId: string
    error: string
  }>
  generationStats?: GenerationStats
  message: string
}

