/**
 * Conversation Repository Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversationRepository } from './conversationRepository.js';
import { getPool } from '../database/connection.js';

// Mock database connection
vi.mock('../database/connection.js', () => ({
  getPool: vi.fn(),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConversationRepository', () => {
  const mockPool = {
    connect: vi.fn(),
    query: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPool).mockReturnValue(mockPool as any);
  });

  describe('create', () => {
    it('should create a new conversation', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      const mockConversation = {
        id: 'conv-123',
        user_id: 'user-123',
        title: 'Test Conversation',
        level: 'A1',
        status: 'active',
        metadata: null,
        memory_strategy: 'sliding',
        max_context_messages: 20,
        max_context_tokens: 4000,
        auto_summarize: false,
        summarize_threshold: 50,
        ai_settings: {},
        is_pinned: false,
        pinned_at: null,
        pin_order: null,
        folder_id: null,
        exported_at: null,
        export_format: null,
        created_at: new Date(),
        updated_at: new Date(),
        last_message_at: null,
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockConversation],
      });

      const result = await conversationRepository.create({
        userId: 'user-123',
        title: 'Test Conversation',
        level: 'A1',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('conv-123');
      expect(result.userId).toBe('user-123');
      expect(result.title).toBe('Test Conversation');
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find conversation by ID', async () => {
      const mockConversation = {
        id: 'conv-123',
        user_id: 'user-123',
        title: 'Test Conversation',
        level: 'A1',
        status: 'active',
        metadata: null,
        memory_strategy: 'sliding',
        max_context_messages: 20,
        max_context_tokens: 4000,
        auto_summarize: false,
        summarize_threshold: 50,
        ai_settings: {},
        is_pinned: false,
        pinned_at: null,
        pin_order: null,
        folder_id: null,
        exported_at: null,
        export_format: null,
        created_at: new Date(),
        updated_at: new Date(),
        last_message_at: null,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockConversation],
      });

      const result = await conversationRepository.findById('conv-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('conv-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM conversations WHERE id = $1',
        ['conv-123']
      );
    });

    it('should return null if conversation not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await conversationRepository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find conversations by user ID with pagination', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          user_id: 'user-123',
          title: 'Conversation 1',
          level: 'A1',
          status: 'active',
          metadata: null,
          memory_strategy: 'sliding',
          max_context_messages: 20,
          max_context_tokens: 4000,
          auto_summarize: false,
          summarize_threshold: 50,
          ai_settings: {},
          is_pinned: false,
          pinned_at: null,
          pin_order: null,
          folder_id: null,
          exported_at: null,
          export_format: null,
          created_at: new Date(),
          updated_at: new Date(),
          last_message_at: null,
        },
      ];

      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      // Mock conversations query
      mockPool.query.mockResolvedValueOnce({
        rows: mockConversations,
      });

      const result = await conversationRepository.findByUserId('user-123', {
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('update', () => {
    it('should update conversation', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      const updatedConversation = {
        id: 'conv-123',
        user_id: 'user-123',
        title: 'Updated Title',
        level: 'A2',
        status: 'active',
        metadata: null,
        memory_strategy: 'sliding',
        max_context_messages: 20,
        max_context_tokens: 4000,
        auto_summarize: false,
        summarize_threshold: 50,
        ai_settings: {},
        is_pinned: false,
        pinned_at: null,
        pin_order: null,
        folder_id: null,
        exported_at: null,
        export_format: null,
        created_at: new Date(),
        updated_at: new Date(),
        last_message_at: null,
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [updatedConversation],
      });

      const result = await conversationRepository.update('conv-123', {
        title: 'Updated Title',
        level: 'A2',
      });

      expect(result).toBeDefined();
      expect(result?.title).toBe('Updated Title');
      expect(result?.level).toBe('A2');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete conversation', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'conv-123' }],
      });

      const result = await conversationRepository.delete('conv-123');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM conversations WHERE id = $1 RETURNING id',
        ['conv-123']
      );
    });

    it('should return false if conversation not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await conversationRepository.delete('non-existent');

      expect(result).toBe(false);
    });
  });
});

