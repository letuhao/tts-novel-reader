/**
 * Integration Tests: EventBus with Services
 * Tests EventBus integration with ConversationService, PipelineService, and WebSocket
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '../services/conversation/eventBus.js';
import { conversationService } from '../services/conversation/conversationService.js';
import { getPipelineService } from '../services/conversation/pipelineService.js';
import { getWebSocketService } from '../services/websocket/websocketService.js';

// Mock WebSocket service
const mockWebSocketService = {
  broadcastToConversation: vi.fn(),
};

vi.mock('../services/websocket/websocketService.js', () => ({
  getWebSocketService: vi.fn(() => mockWebSocketService),
}));

// Mock other services
vi.mock('../services/conversation/conversationService.js', () => ({
  conversationService: {
    saveAssistantResponse: vi.fn(),
    updateChunk: vi.fn(),
  },
}));

vi.mock('../services/tts/ttsService.js', () => ({
  getTTSService: vi.fn(() => ({
    synthesize: vi.fn(),
  })),
}));

vi.mock('../repositories/index.js', () => ({
  conversationRepository: {
    findById: vi.fn(),
  },
  messageRepository: {
    create: vi.fn(),
    getNextSequenceNumber: vi.fn(),
  },
  chunkRepository: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../services/memory/index.js', () => ({
  conversationMemoryService: {
    getMemoryContext: vi.fn(),
    saveContext: vi.fn(),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('Integration: EventBus with Services', () => {
  const conversationId = 'conv-123';
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    eventBus['handlers'].clear();
    eventBus['conversationHandlers'].clear();
  });

  describe('Event Emission and Broadcasting', () => {
    it('should broadcast events to WebSocket when emitted', async () => {
      await eventBus.emitEvent(
        'conversation:started',
        conversationId,
        { messageId: 'msg-123', chunksCount: 2 },
        { userId }
      );

      expect(mockWebSocketService.broadcastToConversation).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          type: 'conversation:started',
          data: expect.objectContaining({
            messageId: 'msg-123',
            chunksCount: 2,
          }),
        })
      );
    });

    it('should call registered handlers when events are emitted', async () => {
      const handler = vi.fn();
      eventBus.on('message:sent', handler);

      await eventBus.emitEvent(
        'message:sent',
        conversationId,
        { messageId: 'msg-123' },
        { userId }
      );

      expect(handler).toHaveBeenCalled();
    });

    it('should call conversation-specific handlers', async () => {
      const handler = vi.fn();
      eventBus.onConversation(conversationId, handler);

      await eventBus.emitEvent(
        'message:received',
        conversationId,
        { chunksCount: 1 },
        { userId }
      );

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Event Flow: Conversation Lifecycle', () => {
    it('should emit events in correct order during conversation', async () => {
      const events: string[] = [];

      eventBus.on('message:sent', () => events.push('message:sent'));
      eventBus.on('conversation:started', () => events.push('conversation:started'));
      eventBus.on('chunk:tts-started', () => events.push('chunk:tts-started'));
      eventBus.on('chunk:tts-completed', () => events.push('chunk:tts-completed'));

      // Simulate conversation flow
      await eventBus.emitEvent('message:sent', conversationId, { messageId: 'msg-1' }, { userId });
      await eventBus.emitEvent('conversation:started', conversationId, { messageId: 'msg-1' }, { userId });
      await eventBus.emitEvent('chunk:tts-started', conversationId, { chunkIndex: 0 }, { userId });
      await eventBus.emitEvent('chunk:tts-completed', conversationId, { chunkIndex: 0 }, { userId });

      expect(events).toEqual([
        'message:sent',
        'conversation:started',
        'chunk:tts-started',
        'chunk:tts-completed',
      ]);
    });
  });

  describe('EventBus with PipelineService', () => {
    it('should emit events when pipeline processes response', async () => {
      const mockOllamaResponse = `\`\`\`json
{
  "chunks": [
    { "text": "Hello!", "emotion": "happy" }
  ],
  "metadata": { "totalChunks": 1 }
}
\`\`\``;

      vi.mocked(conversationService.saveAssistantResponse).mockResolvedValue({
        message: {
          id: 'msg-1',
          conversationId,
          role: 'assistant',
          content: 'Hello!',
          sequenceNumber: 1,
          metadata: null,
          audioFileId: null,
          audioDuration: null,
          sttTranscript: null,
          editedAt: null,
          deletedAt: null,
          editCount: 0,
          createdAt: new Date(),
        },
        chunks: [{
          id: 'chunk-1',
          messageId: 'msg-1',
          chunkIndex: 0,
          text: 'Hello!',
          emotion: 'happy' as const,
          icon: null,
          pauseAfter: null,
          emphasis: false,
          audioFileId: null,
          audioDuration: null,
          ttsStatus: 'pending' as const,
          createdAt: new Date(),
        }],
      });

      const pipeline = getPipelineService();
      await pipeline.processResponse(
        mockOllamaResponse,
        'Ana Florence',
        conversationId,
        userId
      );

      // Verify conversation:started event was emitted
      expect(mockWebSocketService.broadcastToConversation).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          type: 'conversation:started',
        })
      );
    });
  });

  describe('Error Handling in Event Flow', () => {
    it('should continue processing even if one handler fails', async () => {
      const goodHandler = vi.fn();
      const badHandler = vi.fn(() => {
        throw new Error('Handler error');
      });

      eventBus.on('test:event', badHandler);
      eventBus.on('test:event', goodHandler);

      await eventBus.emitEvent('test:event', conversationId, {}, { userId });

      // Good handler should still be called
      expect(goodHandler).toHaveBeenCalled();
    });
  });
});

