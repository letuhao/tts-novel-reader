/**
 * Event Bus Service
 * Centralized event system for conversation events
 * Handles event routing, broadcasting, and logging
 */
import { logger } from '../../utils/logger.js';
import { getWebSocketService } from '../websocket/websocketService.js';

export type EventType =
  | 'conversation:started'
  | 'conversation:updated'
  | 'conversation:ended'
  | 'message:sent'
  | 'message:received'
  | 'chunk:created'
  | 'chunk:tts-started'
  | 'chunk:tts-completed'
  | 'chunk:tts-failed'
  | 'audio:ready'
  | 'audio:played'
  | 'memory:updated'
  | 'error:occurred';

export interface ConversationEvent {
  type: EventType;
  conversationId: string;
  userId?: string;
  data: Record<string, unknown>;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type EventHandler = (event: ConversationEvent) => void | Promise<void>;

export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  private conversationHandlers: Map<string, Set<EventHandler>> = new Map(); // conversationId -> handlers

  /**
   * Register a global event handler
   */
  on(eventType: EventType, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    logger.debug({ eventType }, 'Event handler registered');
  }

  /**
   * Unregister a global event handler
   */
  off(eventType: EventType, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Register a conversation-specific event handler
   */
  onConversation(conversationId: string, handler: EventHandler): void {
    if (!this.conversationHandlers.has(conversationId)) {
      this.conversationHandlers.set(conversationId, new Set());
    }
    this.conversationHandlers.get(conversationId)!.add(handler);
  }

  /**
   * Unregister a conversation-specific event handler
   */
  offConversation(conversationId: string, handler: EventHandler): void {
    const handlers = this.conversationHandlers.get(conversationId);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event
   */
  async emit(event: ConversationEvent): Promise<void> {
    try {
      // Log event
      logger.debug(
        {
          type: event.type,
          conversationId: event.conversationId,
          userId: event.userId,
        },
        'Event emitted'
      );

      // Call global handlers
      const globalHandlers = this.handlers.get(event.type);
      if (globalHandlers) {
        for (const handler of globalHandlers) {
          try {
            await handler(event);
          } catch (error) {
            logger.error(
              { err: error, eventType: event.type },
              'Error in event handler'
            );
          }
        }
      }

      // Call conversation-specific handlers
      const conversationHandlers = this.conversationHandlers.get(event.conversationId);
      if (conversationHandlers) {
        for (const handler of conversationHandlers) {
          try {
            await handler(event);
          } catch (error) {
            logger.error(
              { err: error, eventType: event.type, conversationId: event.conversationId },
              'Error in conversation event handler'
            );
          }
        }
      }

      // Broadcast via WebSocket
      const wsService = getWebSocketService();
      wsService.broadcastToConversation(event.conversationId, {
        type: event.type,
        data: {
          ...event.data,
          ...(event.metadata && { _metadata: event.metadata }),
        },
        timestamp: event.timestamp,
      });

      // Save event to database (async, don't wait)
      this.saveEventToDatabase(event).catch((error) => {
        logger.error({ err: error, eventType: event.type }, 'Failed to save event to database');
      });
    } catch (error) {
      logger.error({ err: error, event }, 'Failed to emit event');
    }
  }

  /**
   * Save event to database
   */
  private async saveEventToDatabase(event: ConversationEvent): Promise<void> {
    try {
      // This will be implemented when we have the conversation_events table
      // For now, just log
      logger.debug(
        {
          conversationId: event.conversationId,
          eventType: event.type,
        },
        'Event would be saved to database'
      );

      // TODO: Implement when conversation_events repository is ready
      // await conversationEventsRepository.create({
      //   conversationId: event.conversationId,
      //   userId: event.userId,
      //   eventType: event.type,
      //   payload: event.data,
      //   timestamp: new Date(event.timestamp),
      // });
    } catch (error) {
      logger.error({ err: error }, 'Failed to save event to database');
    }
  }

  /**
   * Create and emit an event
   */
  async emitEvent(
    type: EventType,
    conversationId: string,
    data: Record<string, unknown>,
    options?: {
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const event: ConversationEvent = {
      type,
      conversationId,
      data,
      timestamp: new Date().toISOString(),
      ...(options?.userId && { userId: options.userId }),
      ...(options?.metadata && { metadata: options.metadata }),
    };

    await this.emit(event);
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Register default handlers
eventBus.on('error:occurred', async (event) => {
  logger.error(
    {
      conversationId: event.conversationId,
      error: event.data.error,
    },
    'Error event occurred'
  );
});

eventBus.on('conversation:started', async (event) => {
  logger.info(
    {
      conversationId: event.conversationId,
      userId: event.userId,
    },
    'Conversation started'
  );
});

eventBus.on('conversation:ended', async (event) => {
  logger.info(
    {
      conversationId: event.conversationId,
      userId: event.userId,
    },
    'Conversation ended'
  );
});

