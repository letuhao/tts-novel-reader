/**
 * Memory Service Factory
 * Creates memory service instances based on configuration
 */
import { logger } from '../../utils/logger.js';
import type { MemoryService, MemoryServiceConfig } from './types.js';
import { LangChainMemoryAdapter } from './langchainAdapter.js';

/**
 * Create a memory service instance based on configuration
 */
export function createMemoryService(config: MemoryServiceConfig): MemoryService {
  logger.info(
    {
      conversationId: config.conversationId,
      strategy: config.strategy,
      provider: 'langchain',
    },
    'Creating memory service'
  );

  // For now, we only support LangChain
  // In the future, we can add other providers here
  switch (config.strategy) {
    case 'sliding':
    case 'summarization':
    case 'hierarchical':
    case 'semantic':
      // All strategies use LangChain for now
      // Different strategies can be implemented by configuring LangChain differently
      return new LangChainMemoryAdapter(config);

    default:
      logger.warn(
        { strategy: config.strategy },
        'Unknown memory strategy, defaulting to LangChain'
      );
      return new LangChainMemoryAdapter(config);
  }
}

/**
 * Memory service registry
 * Stores memory service instances per conversation
 */
class MemoryServiceRegistry {
  private services: Map<string, MemoryService> = new Map();

  /**
   * Get or create memory service for a conversation
   */
  getOrCreate(config: MemoryServiceConfig): MemoryService {
    const key = `${config.conversationId}`;

    if (!this.services.has(key)) {
      const service = createMemoryService(config);
      this.services.set(key, service);
      logger.debug({ conversationId: config.conversationId, totalServices: this.services.size }, 'Created new memory service');
    } else {
      logger.debug({ conversationId: config.conversationId, totalServices: this.services.size }, 'Reusing existing memory service');
    }

    return this.services.get(key)!;
  }

  /**
   * Get existing memory service
   */
  get(conversationId: string): MemoryService | null {
    return this.services.get(conversationId) || null;
  }

  /**
   * Remove memory service (cleanup)
   */
  remove(conversationId: string): void {
    this.services.delete(conversationId);
    logger.debug({ conversationId }, 'Removed memory service');
  }

  /**
   * Clear all memory services
   */
  clear(): void {
    this.services.clear();
    logger.info('Cleared all memory services');
  }

  /**
   * Get all conversation IDs with active memory services
   */
  getActiveConversations(): string[] {
    return Array.from(this.services.keys());
  }
}

// Export singleton instance
export const memoryServiceRegistry = new MemoryServiceRegistry();

