/**
 * Integration Tests: ConversationManager with Services
 * Tests ConversationManager integration with ConversationService and WebSocket
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversationManager } from '../services/conversation/conversationManager.js';
import { conversationService } from '../services/conversation/conversationService.js';
import { getWebSocketService } from '../services/websocket/websocketService.js';

// Mock services
vi.mock('../services/conversation/conversationService.js', () => ({
  conversationService: {
    getConversation: vi.fn(),
    updateConversation: vi.fn(),
  },
}));

const mockWebSocketService = {
  broadcastToConversation: vi.fn(),
};

vi.mock('../services/websocket/websocketService.js', () => ({
  getWebSocketService: vi.fn(() => mockWebSocketService),
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Integration: ConversationManager with Services', () => {
  const userId = 'user-123';
  const conversationId = 'conv-123';

  beforeEach(() => {
    vi.clearAllMocks();
    conversationManager['activeConversations'].clear();
    conversationManager['userConversations'].clear();
  });

  describe('Active Conversation Management', () => {
    it('should create and track active conversations', async () => {
      const mockConversation = {
        id: conversationId,
        userId,
        title: 'Test',
        level: 'A1' as const,
        status: 'active' as const,
        metadata: null,
        memoryStrategy: 'sliding' as const,
        maxContextMessages: 20,
        maxContextTokens: 4000,
        autoSummarize: false,
        summarizeThreshold: 50,
        aiSettings: {},
        isPinned: false,
        pinnedAt: null,
        pinOrder: null,
        folderId: null,
        exportedAt: null,
        exportFormat: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: null,
        messages: [],
        messageCount: 0,
      };

      vi.mocked(conversationService.getConversation).mockResolvedValue(mockConversation);

      const active = await conversationManager.getOrCreateActiveConversation(conversationId, userId);

      expect(active).toBeDefined();
      expect(active.conversationId).toBe(conversationId);
      expect(conversationService.getConversation).toHaveBeenCalledWith(conversationId, false);
    });

    it('should register and track WebSocket clients', async () => {
      const mockConversation = {
        id: conversationId,
        userId,
        title: 'Test',
        level: 'A1' as const,
        status: 'active' as const,
        metadata: null,
        memoryStrategy: 'sliding' as const,
        maxContextMessages: 20,
        maxContextTokens: 4000,
        autoSummarize: false,
        summarizeThreshold: 50,
        aiSettings: {},
        isPinned: false,
        pinnedAt: null,
        pinOrder: null,
        folderId: null,
        exportedAt: null,
        exportFormat: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: null,
        messages: [],
        messageCount: 0,
      };

      vi.mocked(conversationService.getConversation).mockResolvedValue(mockConversation);

      await conversationManager.getOrCreateActiveConversation(conversationId, userId);
      conversationManager.registerClient(conversationId, 'client-1');
      conversationManager.registerClient(conversationId, 'client-2');

      const active = conversationManager.getActiveConversation(conversationId);
      expect(active?.connectedClients.size).toBe(2);
      expect(active?.connectedClients.has('client-1')).toBe(true);
      expect(active?.connectedClients.has('client-2')).toBe(true);
    });

    it('should track multiple conversations per user', async () => {
      const conv1 = { ...mockConversation, id: 'conv-1' };
      const conv2 = { ...mockConversation, id: 'conv-2' };

      vi.mocked(conversationService.getConversation)
        .mockResolvedValueOnce(conv1)
        .mockResolvedValueOnce(conv2);

      await conversationManager.getOrCreateActiveConversation('conv-1', userId);
      await conversationManager.getOrCreateActiveConversation('conv-2', userId);

      const userConversations = conversationManager.getUserActiveConversations(userId);
      expect(userConversations).toHaveLength(2);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', async () => {
      const mockConversation = {
        id: conversationId,
        userId,
        title: 'Test',
        level: 'A1' as const,
        status: 'active' as const,
        metadata: null,
        memoryStrategy: 'sliding' as const,
        maxContextMessages: 20,
        maxContextTokens: 4000,
        autoSummarize: false,
        summarizeThreshold: 50,
        aiSettings: {},
        isPinned: false,
        pinnedAt: null,
        pinOrder: null,
        folderId: null,
        exportedAt: null,
        exportFormat: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessageAt: null,
        messages: [],
        messageCount: 0,
      };

      vi.mocked(conversationService.getConversation).mockResolvedValue(mockConversation);

      await conversationManager.getOrCreateActiveConversation(conversationId, userId);
      conversationManager.registerClient(conversationId, 'client-1');
      conversationManager.registerClient(conversationId, 'client-2');

      const stats = conversationManager.getStats();

      expect(stats.activeConversations).toBe(1);
      expect(stats.totalClients).toBe(2);
      expect(stats.usersWithActiveConversations).toBe(1);
    });
  });

  const mockConversation = {
    id: conversationId,
    userId,
    title: 'Test',
    level: 'A1' as const,
    status: 'active' as const,
    metadata: null,
    memoryStrategy: 'sliding' as const,
    maxContextMessages: 20,
    maxContextTokens: 4000,
    autoSummarize: false,
    summarizeThreshold: 50,
    aiSettings: {},
    isPinned: false,
    pinnedAt: null,
    pinOrder: null,
    folderId: null,
    exportedAt: null,
    exportFormat: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: null,
    messages: [],
    messageCount: 0,
  };
});

