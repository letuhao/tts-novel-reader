/**
 * Memory Service
 * Main service for managing conversation memory
 * Uses factory pattern to create appropriate memory adapter
 */
import { logger } from '../../utils/logger.js';
import { conversationRepository } from '../../repositories/index.js';
import { messageRepository } from '../../repositories/index.js';
import { memoryServiceRegistry, createMemoryService } from './memoryServiceFactory.js';
import type { MemoryService, MemoryServiceConfig, MemoryContext } from './types.js';

export class ConversationMemoryService {
  /**
   * Get or create memory service for a conversation
   */
  async getMemoryService(conversationId: string): Promise<MemoryService | null> {
    try {
      // Get conversation from database
      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        logger.warn({ conversationId }, 'Conversation not found');
        return null;
      }

      // Check if service already exists
      let service = memoryServiceRegistry.get(conversationId);
      if (service) {
        logger.debug({ conversationId, source: 'cache' }, '📚 [MEMORY] Using existing memory service');
        return service;
      }

      // Create new service with conversation settings
      const config: MemoryServiceConfig = {
        conversationId: conversation.id,
        userId: conversation.userId,
        strategy: conversation.memoryStrategy,
        maxContextMessages: conversation.maxContextMessages,
        maxContextTokens: conversation.maxContextTokens,
        autoSummarize: conversation.autoSummarize,
        summarizeThreshold: conversation.summarizeThreshold,
        model: process.env.OLLAMA_MODEL || 'gemma3:12b',
      };

      logger.debug({ conversationId, strategy: config.strategy }, '📚 [MEMORY] Creating new memory service');
      service = memoryServiceRegistry.getOrCreate(config);

      // Load existing messages into memory
      await this.loadHistoryIntoMemory(conversationId, service);

      return service;
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to get memory service');
      return null;
    }
  }

  /**
   * Load conversation history into memory
   */
  private async loadHistoryIntoMemory(
    conversationId: string,
    service: MemoryService
  ): Promise<void> {
    try {
      // Get all messages for conversation
      const result = await messageRepository.findByConversationId(conversationId, {
        limit: 1000, // Get all messages
        orderBy: 'sequence_number',
        orderDirection: 'ASC',
      });

      // Load messages into memory
      const loadedPairs: Array<{ user: string; assistant: string }> = [];
      for (const message of result.items) {
        if (message.role === 'user') {
          // Find the next assistant message
          const nextMessage = result.items.find(
            (m) => m.sequenceNumber > message.sequenceNumber && m.role === 'assistant'
          );

          if (nextMessage) {
            await service.saveContext(message.content, nextMessage.content);
            loadedPairs.push({
              user: message.content.substring(0, 50),
              assistant: nextMessage.content.substring(0, 50),
            });
          } else {
            logger.debug({ 
              conversationId, 
              sequenceNumber: message.sequenceNumber,
              userMessage: message.content.substring(0, 50)
            }, '📚 [MEMORY] User message without matching assistant (will be saved after response)');
          }
        }
      }

      logger.info(
        {
          conversationId,
          messageCount: result.items.length,
          loadedPairs: loadedPairs.length,
          pairs: loadedPairs,
        },
        'Loaded conversation history into memory'
      );
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to load history into memory');
      throw error;
    }
  }

  /**
   * Save a conversation turn to memory
   */
  async saveContext(conversationId: string, input: string, output: string): Promise<void> {
    try {
      const service = await this.getMemoryService(conversationId);
      if (!service) {
        logger.warn({ conversationId }, 'Memory service not available');
        return;
      }

      await service.saveContext(input, output);
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to save context');
      throw error;
    }
  }

  /**
   * Get memory context for conversation
   */
  async getMemoryContext(conversationId: string): Promise<MemoryContext | null> {
    try {
      const service = await this.getMemoryService(conversationId);
      if (!service) {
        return null;
      }

      return await service.loadMemoryVariables();
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to get memory context');
      return null;
    }
  }

  /**
   * Clear memory for a conversation
   */
  async clearMemory(conversationId: string): Promise<void> {
    try {
      const service = await this.getMemoryService(conversationId);
      if (service) {
        await service.clear();
      }

      memoryServiceRegistry.remove(conversationId);
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to clear memory');
      throw error;
    }
  }

  /**
   * Get memory summary
   */
  async getSummary(conversationId: string): Promise<string | null> {
    try {
      const service = await this.getMemoryService(conversationId);
      if (!service) {
        return null;
      }

      return await service.getSummary();
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to get summary');
      return null;
    }
  }

  /**
   * Get token count
   */
  async getTokenCount(conversationId: string): Promise<number> {
    try {
      const service = await this.getMemoryService(conversationId);
      if (!service) {
        return 0;
      }

      return await service.getTokenCount();
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to get token count');
      return 0;
    }
  }
}

// Export singleton instance
export const conversationMemoryService = new ConversationMemoryService();

