/**
 * Message Repository Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { messageRepository } from './messageRepository.js';
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

describe('MessageRepository', () => {
  const mockPool = {
    connect: vi.fn(),
    query: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPool).mockReturnValue(mockPool as any);
  });

  describe('create', () => {
    it('should create a new message', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      const mockMessage = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        role: 'user',
        content: 'Hello!',
        sequence_number: 1,
        metadata: null,
        audio_file_id: null,
        audio_duration: null,
        stt_transcript: null,
        edited_at: null,
        deleted_at: null,
        edit_count: 0,
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockMessage],
      });

      const result = await messageRepository.create({
        conversationId: 'conv-123',
        role: 'user',
        content: 'Hello!',
        sequenceNumber: 1,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('msg-123');
      expect(result.conversationId).toBe('conv-123');
      expect(result.content).toBe('Hello!');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getNextSequenceNumber', () => {
    it('should return 1 for first message', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ max: null }],
      });

      const result = await messageRepository.getNextSequenceNumber('conv-123');

      expect(result).toBe(1);
    });

    it('should return next sequence number', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ max: 5 }],
      });

      const result = await messageRepository.getNextSequenceNumber('conv-123');

      expect(result).toBe(6);
    });
  });

  describe('findByConversationId', () => {
    it('should find messages by conversation ID', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: 'conv-123',
          role: 'user',
          content: 'Hello!',
          sequence_number: 1,
          metadata: null,
          audio_file_id: null,
          audio_duration: null,
          stt_transcript: null,
          edited_at: null,
          deleted_at: null,
          edit_count: 0,
          created_at: new Date(),
        },
      ];

      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      // Mock messages query
      mockPool.query.mockResolvedValueOnce({
        rows: mockMessages,
      });

      const result = await messageRepository.findByConversationId('conv-123');

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('update', () => {
    it('should update message content', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      // Mock: find existing message
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 'msg-123',
          conversation_id: 'conv-123',
          role: 'user',
          content: 'Hello!',
          sequence_number: 1,
          metadata: null,
          audio_file_id: null,
          audio_duration: null,
          stt_transcript: null,
          edited_at: null,
          deleted_at: null,
          edit_count: 0,
          created_at: new Date(),
        }],
      });

      const updatedMessage = {
        id: 'msg-123',
        conversation_id: 'conv-123',
        role: 'user',
        content: 'Updated content',
        sequence_number: 1,
        metadata: null,
        audio_file_id: null,
        audio_duration: null,
        stt_transcript: null,
        edited_at: new Date(),
        deleted_at: null,
        edit_count: 1,
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [updatedMessage],
      });

      // Mock: edit history insert
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await messageRepository.update('msg-123', {
        content: 'Updated content',
      });

      expect(result).toBeDefined();
      expect(result?.content).toBe('Updated content');
      expect(result?.editCount).toBe(1);
    });
  });
});

