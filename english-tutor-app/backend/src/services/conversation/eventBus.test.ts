/**
 * Event Bus Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from './eventBus.js';
import { getWebSocketService } from '../websocket/websocketService.js';

// Mock WebSocket service
const mockWebSocketService = {
  broadcastToConversation: vi.fn(),
};

vi.mock('../websocket/websocketService.js', () => ({
  getWebSocketService: vi.fn(() => mockWebSocketService),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('EventBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all handlers
    eventBus['handlers'].clear();
    eventBus['conversationHandlers'].clear();
  });

  describe('on/off', () => {
    it('should register and unregister global handlers', () => {
      const handler = vi.fn();

      eventBus.on('conversation:started', handler);
      expect(eventBus['handlers'].get('conversation:started')?.has(handler)).toBe(true);

      eventBus.off('conversation:started', handler);
      expect(eventBus['handlers'].get('conversation:started')?.has(handler)).toBe(false);
    });
  });

  describe('onConversation/offConversation', () => {
    it('should register and unregister conversation-specific handlers', () => {
      const handler = vi.fn();

      eventBus.onConversation('conv-123', handler);
      expect(eventBus['conversationHandlers'].get('conv-123')?.has(handler)).toBe(true);

      eventBus.offConversation('conv-123', handler);
      expect(eventBus['conversationHandlers'].get('conv-123')?.has(handler)).toBe(false);
    });
  });

  describe('emit', () => {
    it('should call global handlers', async () => {
      const handler = vi.fn();
      eventBus.on('conversation:started', handler);

      const event = {
        type: 'conversation:started' as const,
        conversationId: 'conv-123',
        data: { messageId: 'msg-123' },
        timestamp: new Date().toISOString(),
      };

      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should call conversation-specific handlers', async () => {
      const handler = vi.fn();
      eventBus.onConversation('conv-123', handler);

      const event = {
        type: 'message:sent' as const,
        conversationId: 'conv-123',
        data: { messageId: 'msg-123' },
        timestamp: new Date().toISOString(),
      };

      await eventBus.emit(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should broadcast via WebSocket', async () => {
      const event = {
        type: 'conversation:started' as const,
        conversationId: 'conv-123',
        data: { messageId: 'msg-123' },
        timestamp: new Date().toISOString(),
      };

      await eventBus.emit(event);

      expect(mockWebSocketService.broadcastToConversation).toHaveBeenCalledWith(
        'conv-123',
        expect.objectContaining({
          type: 'conversation:started',
          data: { messageId: 'msg-123' },
        })
      );
    });

    it('should handle errors in handlers gracefully', async () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();

      eventBus.on('conversation:started', errorHandler);
      eventBus.on('conversation:started', goodHandler);

      const event = {
        type: 'conversation:started' as const,
        conversationId: 'conv-123',
        data: {},
        timestamp: new Date().toISOString(),
      };

      await eventBus.emit(event);

      // Good handler should still be called
      expect(goodHandler).toHaveBeenCalled();
    });
  });

  describe('emitEvent', () => {
    it('should create and emit event', async () => {
      const handler = vi.fn();
      eventBus.on('message:sent', handler);

      await eventBus.emitEvent(
        'message:sent',
        'conv-123',
        { messageId: 'msg-123' },
        { userId: 'user-123' }
      );

      expect(handler).toHaveBeenCalled();
      expect(mockWebSocketService.broadcastToConversation).toHaveBeenCalled();
    });

    it('should handle optional userId', async () => {
      await eventBus.emitEvent(
        'message:sent',
        'conv-123',
        { messageId: 'msg-123' }
      );

      expect(mockWebSocketService.broadcastToConversation).toHaveBeenCalled();
    });
  });
});

