/**
 * Repository Types
 * Common types and interfaces for database repositories
 */

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ConversationStatus = 'active' | 'paused' | 'completed' | 'archived';
export type MemoryStrategy = 'sliding' | 'summarization' | 'hierarchical' | 'semantic';
export type MessageRole = 'user' | 'assistant' | 'system';
export type TTSStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Emotion = 'happy' | 'encouraging' | 'neutral' | 'excited' | 'calm' | 'curious' | 'supportive';

export interface Conversation {
  id: string;
  userId: string;
  title: string | null;
  level: CEFRLevel;
  status: ConversationStatus;
  metadata: Record<string, unknown> | null;
  memoryStrategy: MemoryStrategy;
  maxContextMessages: number;
  maxContextTokens: number;
  autoSummarize: boolean;
  summarizeThreshold: number;
  aiSettings: Record<string, unknown>;
  isPinned: boolean;
  pinnedAt: Date | null;
  pinOrder: number | null;
  folderId: string | null;
  exportedAt: Date | null;
  exportFormat: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
}

export interface CreateConversationInput {
  userId: string;
  title?: string;
  level?: CEFRLevel;
  status?: ConversationStatus;
  metadata?: Record<string, unknown>;
  memoryStrategy?: MemoryStrategy;
  maxContextMessages?: number;
  maxContextTokens?: number;
  autoSummarize?: boolean;
  summarizeThreshold?: number;
  aiSettings?: Record<string, unknown>;
  folderId?: string;
}

export interface UpdateConversationInput {
  title?: string;
  level?: CEFRLevel;
  status?: ConversationStatus;
  metadata?: Record<string, unknown>;
  memoryStrategy?: MemoryStrategy;
  maxContextMessages?: number;
  maxContextTokens?: number;
  autoSummarize?: boolean;
  summarizeThreshold?: number;
  aiSettings?: Record<string, unknown>;
  isPinned?: boolean;
  pinnedAt?: Date | null;
  pinOrder?: number | null;
  folderId?: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sequenceNumber: number;
  metadata: Record<string, unknown> | null;
  audioFileId: string | null;
  audioDuration: number | null;
  sttTranscript: string | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  editCount: number;
  createdAt: Date;
}

export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  sequenceNumber: number;
  metadata?: Record<string, unknown>;
  audioFileId?: string;
  audioDuration?: number;
  sttTranscript?: string;
}

export interface UpdateMessageInput {
  content?: string;
  metadata?: Record<string, unknown>;
  audioFileId?: string;
  audioDuration?: number;
  sttTranscript?: string;
}

export interface MessageChunk {
  id: string;
  messageId: string;
  chunkIndex: number;
  text: string;
  emotion: Emotion | null;
  icon: string | null;
  pauseAfter: number | null;
  emphasis: boolean;
  audioFileId: string | null;
  audioDuration: number | null;
  ttsStatus: TTSStatus;
  createdAt: Date;
}

export interface CreateChunkInput {
  messageId: string;
  chunkIndex: number;
  text: string;
  emotion?: Emotion;
  icon?: string;
  pauseAfter?: number;
  emphasis?: boolean;
  audioFileId?: string;
  audioDuration?: number;
  ttsStatus?: TTSStatus;
}

export interface UpdateChunkInput {
  text?: string;
  emotion?: Emotion;
  icon?: string;
  pauseAfter?: number;
  emphasis?: boolean;
  audioFileId?: string;
  audioDuration?: number;
  ttsStatus?: TTSStatus;
}

export interface User {
  id: string;
  email: string;
  name: string;
  level: CEFRLevel;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
  level?: CEFRLevel;
  emailVerified?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  level?: CEFRLevel;
  emailVerified?: boolean;
  lastLoginAt?: Date;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

