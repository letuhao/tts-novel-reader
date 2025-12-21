/**
 * LangChain Memory Adapter
 * Implements MemoryService using LangChain memory management
 * 
 * Note: Using a simplified in-memory approach for now
 * In production, you might want to use LangChain's full memory system
 * or implement a custom solution with PostgreSQL
 */
// ChatOllama can be imported later when summarization is implemented
// import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { logger } from '../../utils/logger.js';
import type {
  MemoryService,
  MemoryContext,
  MemoryServiceConfig,
  MemoryMessage,
} from './types.js';

/**
 * Simple in-memory conversation buffer
 * Stores messages and provides basic memory management
 */
class SimpleConversationBuffer {
  private messages: BaseMessage[] = [];
  private summary: string | null = null;
  private maxTokens: number;

  constructor(maxTokens: number) {
    this.maxTokens = maxTokens;
  }

  addMessage(message: BaseMessage): void {
    this.messages.push(message);
    this.trimIfNeeded();
  }

  getMessages(): BaseMessage[] {
    return [...this.messages];
  }

  setSummary(summary: string): void {
    this.summary = summary;
  }

  getSummary(): string | null {
    return this.summary;
  }

  clear(): void {
    this.messages = [];
    this.summary = null;
  }

  private trimIfNeeded(): void {
    // Rough estimate: 1 token ≈ 4 characters
    let totalChars = this.messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : String(msg.content);
      return sum + content.length;
    }, 0);

    const maxChars = this.maxTokens * 4;

    // Remove oldest messages if over limit
    while (totalChars > maxChars && this.messages.length > 0) {
      const removed = this.messages.shift();
      if (removed) {
        const content = typeof removed.content === 'string' ? removed.content : String(removed.content);
        totalChars -= content.length;
      }
    }
  }

  getTokenCount(): number {
    const totalChars = this.messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : String(msg.content);
      return sum + content.length;
    }, 0);
    return Math.ceil(totalChars / 4);
  }
}

export class LangChainMemoryAdapter implements MemoryService {
  private buffer: SimpleConversationBuffer;
  private config: MemoryServiceConfig;
  // Note: LLM can be added later for summarization features

  constructor(config: MemoryServiceConfig) {
    this.config = config;

    // Initialize simple buffer
    this.buffer = new SimpleConversationBuffer(config.maxContextTokens || 4000);

    logger.info(
      {
        conversationId: config.conversationId,
        strategy: config.strategy,
        maxTokens: config.maxContextTokens || 4000,
      },
      'LangChain memory adapter initialized'
    );
  }

  /**
   * Save a conversation turn
   */
  async saveContext(input: string, output: string): Promise<void> {
    try {
      const humanMsg = new HumanMessage(input);
      const aiMsg = new AIMessage(output);

      this.buffer.addMessage(humanMsg);
      this.buffer.addMessage(aiMsg);

      logger.debug(
        {
          conversationId: this.config.conversationId,
          inputLength: input.length,
          outputLength: output.length,
        },
        'Saved context to memory'
      );
    } catch (error) {
      logger.error({ err: error, conversationId: this.config.conversationId }, 'Failed to save context');
      throw error;
    }
  }

  /**
   * Load memory context
   */
  async loadMemoryVariables(): Promise<MemoryContext> {
    try {
      const history = this.buffer.getMessages();
      const messages: MemoryMessage[] = history.map((msg) => {
        let content = '';
        let role: 'user' | 'assistant' | 'system' = 'user';

        if (msg instanceof HumanMessage) {
          role = 'user';
          content = typeof msg.content === 'string' ? msg.content : String(msg.content);
        } else if (msg instanceof AIMessage) {
          role = 'assistant';
          content = typeof msg.content === 'string' ? msg.content : String(msg.content);
        } else if (msg instanceof SystemMessage) {
          role = 'system';
          content = typeof msg.content === 'string' ? msg.content : String(msg.content);
        } else {
          // Fallback
          role = 'user';
          content = String((msg as { content?: unknown }).content || '');
        }

        return {
          role,
          content,
        };
      });

      // Get summary if available
      const summary = this.buffer.getSummary();

      // Get token count
      const tokenCount = this.buffer.getTokenCount();

      const result: MemoryContext = {
        messages,
        tokenCount,
      };

      if (summary) {
        result.summary = summary;
      }

      return result;
    } catch (error) {
      logger.error({ err: error, conversationId: this.config.conversationId }, 'Failed to load memory variables');
      throw error;
    }
  }

  /**
   * Clear all memory
   */
  async clear(): Promise<void> {
    try {
      this.buffer.clear();
      logger.info({ conversationId: this.config.conversationId }, 'Memory cleared');
    } catch (error) {
      logger.error({ err: error, conversationId: this.config.conversationId }, 'Failed to clear memory');
      throw error;
    }
  }

  /**
   * Get current token count
   */
  async getTokenCount(): Promise<number> {
    try {
      return this.buffer.getTokenCount();
    } catch (error) {
      logger.error({ err: error, conversationId: this.config.conversationId }, 'Failed to get token count');
      return 0;
    }
  }

  /**
   * Get memory summary
   */
  async getSummary(): Promise<string | null> {
    try {
      return this.buffer.getSummary();
    } catch (error) {
      logger.error({ err: error, conversationId: this.config.conversationId }, 'Failed to get summary');
      return null;
    }
  }
}

