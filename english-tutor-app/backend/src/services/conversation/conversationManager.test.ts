/**
 * Conversation Manager Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversationManager } from './conversationManager.js';
import { conversationService } from './conversationService.js';
import { getWebSocketService } from '../websocket/websocketService.js';

// Mock services
vi.mock('./conversationService.js', () => ({
  conversationService: {
    getConversation: vi.fn(),
    updateConversation: vi.fn(),
  },
}));

vi.mock('../websocket/websocketService.js', () => ({
  getWebSocketService: vi.fn(),
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConversationManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear active conversations
    conversationManager['activeConversations'].clear();
    conversationManager['userConversations'].clear();
  });

  describe('getOrCreateActiveConversation', () => {
    it('should create active conversation from database', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'user-123',
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

      const result = await conversationManager.getOrCreateActiveConversation('conv-123', 'user-123');

      expect(result).toBeDefined();
      expect(result.conversationId).toBe('conv-123');
      expect(result.userId).toBe('user-123');
      expect(result.connectedClients.size).toBe(0);
    });

    it('should return existing active conversation', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'user-123',
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

      // Create first time
      const first = await conversationManager.getOrCreateActiveConversation('conv-123', 'user-123');
      
      // Get second time (should return same instance)
      const second = await conversationManager.getOrCreateActiveConversation('conv-123', 'user-123');

      expect(first).toBe(second);
      expect(conversationService.getConversation).toHaveBeenCalledTimes(1);
    });

    it('should throw error if conversation not found', async () => {
      vi.mocked(conversationService.getConversation).mockResolvedValue(null);

      await expect(
        conversationManager.getOrCreateActiveConversation('non-existent', 'user-123')
      ).rejects.toThrow();
    });

    it('should throw error if conversation does not belong to user', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'other-user',
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

      await expect(
        conversationManager.getOrCreateActiveConversation('conv-123', 'user-123')
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('registerClient', () => {
    it('should register WebSocket client', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'user-123',
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

      await conversationManager.getOrCreateActiveConversation('conv-123', 'user-123');
      conversationManager.registerClient('conv-123', 'client-1');

      const active = conversationManager.getActiveConversation('conv-123');
      expect(active?.connectedClients.has('client-1')).toBe(true);
    });
  });

  describe('unregisterClient', () => {
    it('should unregister WebSocket client', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'user-123',
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

      await conversationManager.getOrCreateActiveConversation('conv-123', 'user-123');
      conversationManager.registerClient('conv-123', 'client-1');
      conversationManager.unregisterClient('conv-123', 'client-1');

      const active = conversationManager.getActiveConversation('conv-123');
      expect(active?.connectedClients.has('client-1')).toBe(false);
    });
  });

  describe('getUserActiveConversations', () => {
    it('should get all active conversations for user', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'user-123',
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

      await conversationManager.getOrCreateActiveConversation('conv-123', 'user-123');

      const result = conversationManager.getUserActiveConversations('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]?.conversationId).toBe('conv-123');
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'user-123',
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

      await conversationManager.getOrCreateActiveConversation('conv-123', 'user-123');
      conversationManager.registerClient('conv-123', 'client-1');
      conversationManager.registerClient('conv-123', 'client-2');

      const stats = conversationManager.getStats();

      expect(stats.activeConversations).toBe(1);
      expect(stats.totalClients).toBe(2);
      expect(stats.usersWithActiveConversations).toBe(1);
    });
  });
});

