/**
 * Memory Service Types
 * Types and interfaces for memory management
 */
import type { MessageRole } from '../../repositories/types.js';

export type MemoryStrategy = 'sliding' | 'summarization' | 'hierarchical' | 'semantic';

export interface MemoryMessage {
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

export interface MemoryContext {
  messages: MemoryMessage[];
  summary?: string;
  keyFacts?: string[];
  tokenCount?: number;
}

export interface MemoryService {
  /**
   * Save a conversation turn (user input + assistant output)
   */
  saveContext(input: string, output: string): Promise<void>;

  /**
   * Load memory context for conversation
   */
  loadMemoryVariables(): Promise<MemoryContext>;

  /**
   * Clear all memory
   */
  clear(): Promise<void>;

  /**
   * Get current token count
   */
  getTokenCount(): Promise<number>;

  /**
   * Get memory summary (if available)
   */
  getSummary(): Promise<string | null>;
}

export interface MemoryServiceConfig {
  conversationId: string;
  userId: string;
  strategy: MemoryStrategy;
  maxContextMessages?: number;
  maxContextTokens?: number;
  autoSummarize?: boolean;
  summarizeThreshold?: number;
  model?: string;
}

