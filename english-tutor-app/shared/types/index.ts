/**
 * Shared TypeScript types for English Tutor App
 * Used by both backend and frontend
 */

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  level: CEFRLevel;
  createdAt: Date;
  updatedAt: Date;
}

// CEFR Levels
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// Lesson Types
export interface Lesson {
  id: string;
  level: CEFRLevel;
  title: string;
  description: string;
  content: LessonContent;
  exercises: Exercise[];
  order: number;
}

export interface LessonContent {
  vocabulary: VocabularyItem[];
  grammar: GrammarTopic[];
  text: string;
  audioUrl?: string;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  example: string;
  audioUrl?: string;
}

export interface GrammarTopic {
  topic: string;
  explanation: string;
  examples: string[];
}

// Exercise Types
export interface Exercise {
  id: string;
  type: ExerciseType;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
}

export type ExerciseType =
  | 'multiple-choice'
  | 'fill-blank'
  | 'match'
  | 'translation'
  | 'speaking'
  | 'listening'
  | 'writing';

// Progress Types
export interface UserProgress {
  userId: string;
  lessonId: string;
  completed: boolean;
  score?: number;
  completedAt?: Date;
  attempts: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Ollama Types
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaChatResponse {
  message: OllamaMessage;
  done: boolean;
}

// TTS Types
export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface TTSResponse {
  audioUrl: string;
  duration: number;
}

// STT Types
export interface STTRequest {
  audioUrl: string;
  language?: string;
}

export interface STTResponse {
  text: string;
  confidence: number;
  segments?: TranscriptSegment[];
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

