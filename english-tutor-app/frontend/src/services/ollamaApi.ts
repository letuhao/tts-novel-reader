/**
 * Ollama API Service
 */
import apiClient from './api.js';
import type { AxiosResponse } from 'axios';

export interface OllamaChatRequest {
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  level?: string;
  context?: string;
  usePipeline?: boolean; // Use structured response pipeline (default: true)
  voice?: string; // Voice for TTS
  conversationId?: string; // Conversation ID for WebSocket events
  useWebSocket?: boolean; // Use WebSocket for real-time updates (default: false)
}

export interface StructuredChunk {
  id?: string;
  text: string;
  emotion?: 'happy' | 'encouraging' | 'neutral' | 'excited' | 'calm';
  icon?: string;
  pause?: number;
  emphasis?: boolean;
  audioFileId?: string;
  duration?: number;
  ttsStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  ttsError?: string;
}

export interface OllamaChatResponse {
  success: boolean;
  data?: {
    // New pipeline format - all chunks returned immediately
    chunks?: StructuredChunk[]; // Array of all chunks with TTS status
    metadata?: {
      totalChunks: number;
      estimatedDuration?: number;
      tone?: string;
      language?: string;
    };
    source?: 'structured' | 'fallback';
    
    // Legacy format (if usePipeline=false)
    response?: string;
    message?: string;
    model?: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  error?: string;
}

export interface GrammarAnalysisRequest {
  text: string;
  level?: string;
}

export interface GrammarAnalysisResponse {
  success: boolean;
  data?: {
    original: string;
    corrected: string;
    errors: Array<{
      type: string;
      position: { start: number; end: number };
      original: string;
      correction: string;
      explanation: string;
    }>;
    score: number;
    feedback: string;
  };
  error?: string;
}

export interface ExerciseRequest {
  level: string;
  topic?: string;
  type?: 'vocabulary' | 'grammar' | 'conversation' | 'listening';
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ExerciseResponse {
  success: boolean;
  data?: {
    exercise: {
      id: string;
      type: string;
      question: string;
      options?: string[];
      correctAnswer: string;
      explanation: string;
      level: string;
    };
  };
  error?: string;
}

export interface FeedbackRequest {
  userAnswer: string;
  correctAnswer: string;
  context?: string;
}

export interface FeedbackResponse {
  success: boolean;
  data?: {
    feedback: string;
    score: number;
    suggestions: string[];
    encouragement: string;
  };
  error?: string;
}

/**
 * Chat with tutor
 */
export async function chatWithTutor(request: OllamaChatRequest): Promise<OllamaChatResponse> {
  const response: AxiosResponse<OllamaChatResponse> = await apiClient.post('/api/ollama/chat', request);
  return response.data;
}

/**
 * Analyze grammar
 */
export async function analyzeGrammar(request: GrammarAnalysisRequest): Promise<GrammarAnalysisResponse> {
  const response: AxiosResponse<GrammarAnalysisResponse> = await apiClient.post('/api/ollama/grammar', request);
  return response.data;
}

/**
 * Generate exercise
 */
export async function generateExercise(request: ExerciseRequest): Promise<ExerciseResponse> {
  const response: AxiosResponse<ExerciseResponse> = await apiClient.post('/api/ollama/exercise', request);
  return response.data;
}

/**
 * Get feedback
 */
export async function getFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
  const response: AxiosResponse<FeedbackResponse> = await apiClient.post('/api/ollama/feedback', request);
  return response.data;
}

/**
 * Check Ollama health
 */
export async function checkOllamaHealth(): Promise<{ success: boolean; data?: { available: boolean } }> {
  const response = await apiClient.get('/api/ollama/health');
  return response.data;
}

