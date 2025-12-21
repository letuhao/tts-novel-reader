/**
 * Conversation Service Unit Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { conversationService } from './conversationService.js';
import { conversationRepository, messageRepository, chunkRepository } from '../../repositories/index.js';
import { conversationMemoryService } from '../memory/index.js';

// Mock repositories
vi.mock('../../repositories/index.js', () => ({
  conversationRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateLastMessageAt: vi.fn(),
  },
  messageRepository: {
    create: vi.fn(),
    findByConversationId: vi.fn(),
    getNextSequenceNumber: vi.fn(),
  },
  chunkRepository: {
    create: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock memory service
vi.mock('../memory/index.js', () => ({
  conversationMemoryService: {
    getMemoryContext: vi.fn(),
    saveContext: vi.fn(),
    clearMemory: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'user-123',
        title: 'Test Conversation',
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
      };

      vi.mocked(conversationRepository.create).mockResolvedValue(mockConversation);

      const result = await conversationService.createConversation('user-123', {
        title: 'Test Conversation',
        level: 'A1',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('conv-123');
      expect(conversationRepository.create).toHaveBeenCalledWith({
        userId: 'user-123',
        title: 'Test Conversation',
        level: 'A1',
      });
    });
  });

  describe('getConversation', () => {
    it('should get conversation with messages', async () => {
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
      };

      const mockMessages = [
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          role: 'user' as const,
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
      ];

      vi.mocked(conversationRepository.findById).mockResolvedValue(mockConversation);
      vi.mocked(messageRepository.findByConversationId).mockResolvedValue({
        items: mockMessages,
        total: 1,
        limit: 1000,
        offset: 0,
        hasMore: false,
      });

      const result = await conversationService.getConversation('conv-123', true);

      expect(result).toBeDefined();
      expect(result?.messages).toHaveLength(1);
      expect(result?.messageCount).toBe(1);
    });

    it('should return null if conversation not found', async () => {
      vi.mocked(conversationRepository.findById).mockResolvedValue(null);

      const result = await conversationService.getConversation('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('sendMessage', () => {
    it('should send a user message', async () => {
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
      };

      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'user' as const,
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
      };

      vi.mocked(conversationRepository.findById).mockResolvedValue(mockConversation);
      vi.mocked(messageRepository.getNextSequenceNumber).mockResolvedValue(1);
      vi.mocked(messageRepository.create).mockResolvedValue(mockMessage);
      vi.mocked(conversationRepository.updateLastMessageAt).mockResolvedValue();

      const result = await conversationService.sendMessage({
        conversationId: 'conv-123',
        userId: 'user-123',
        content: 'Hello!',
      });

      expect(result).toBeDefined();
      expect(result.message.id).toBe('msg-123');
      expect(messageRepository.create).toHaveBeenCalled();
    });

    it('should throw error if conversation not found', async () => {
      vi.mocked(conversationRepository.findById).mockResolvedValue(null);

      await expect(
        conversationService.sendMessage({
          conversationId: 'non-existent',
          userId: 'user-123',
          content: 'Hello!',
        })
      ).rejects.toThrow('Conversation not found');
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
      };

      vi.mocked(conversationRepository.findById).mockResolvedValue(mockConversation);

      await expect(
        conversationService.sendMessage({
          conversationId: 'conv-123',
          userId: 'user-123',
          content: 'Hello!',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('saveAssistantResponse', () => {
    it('should save assistant response with chunks', async () => {
      const mockMessage = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'assistant' as const,
        content: 'Hello! How can I help?',
        sequenceNumber: 2,
        metadata: null,
        audioFileId: null,
        audioDuration: null,
        sttTranscript: null,
        editedAt: null,
        deletedAt: null,
        editCount: 0,
        createdAt: new Date(),
      };

      const mockChunks = [
        {
          id: 'chunk-1',
          messageId: 'msg-123',
          chunkIndex: 0,
          text: 'Hello!',
          emotion: 'happy' as const,
          icon: '😊',
          pauseAfter: null,
          emphasis: false,
          audioFileId: null,
          audioDuration: null,
          ttsStatus: 'pending' as const,
          createdAt: new Date(),
        },
      ];

      vi.mocked(messageRepository.getNextSequenceNumber).mockResolvedValue(2);
      vi.mocked(messageRepository.create).mockResolvedValue(mockMessage);
      vi.mocked(chunkRepository.create).mockResolvedValue(mockChunks[0]!);
      vi.mocked(conversationRepository.updateLastMessageAt).mockResolvedValue();
      vi.mocked(messageRepository.findByConversationId).mockResolvedValue({
        items: [
          {
            id: 'msg-user',
            conversationId: 'conv-123',
            role: 'user' as const,
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
        ],
        total: 1,
        limit: 2,
        offset: 0,
        hasMore: false,
      });
      vi.mocked(conversationMemoryService.saveContext).mockResolvedValue();

      const result = await conversationService.saveAssistantResponse(
        'conv-123',
        'Hello! How can I help?',
        [
          { text: 'Hello!', emotion: 'happy', icon: '😊' },
        ]
      );

      expect(result).toBeDefined();
      expect(result.message.id).toBe('msg-123');
      expect(result.chunks).toHaveLength(1);
      expect(chunkRepository.create).toHaveBeenCalled();
      expect(conversationMemoryService.saveContext).toHaveBeenCalled();
    });
  });

  describe('getConversationHistory', () => {
    it('should get history from memory service', async () => {
      const mockMemoryContext = {
        messages: [
          { role: 'user' as const, content: 'Hello!' },
          { role: 'assistant' as const, content: 'Hi there!' },
        ],
        tokenCount: 100,
      };

      vi.mocked(conversationMemoryService.getMemoryContext).mockResolvedValue(mockMemoryContext);

      const result = await conversationService.getConversationHistory('conv-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.role).toBe('user');
      expect(result[1]?.role).toBe('assistant');
    });

    it('should fallback to database if memory is empty', async () => {
      vi.mocked(conversationMemoryService.getMemoryContext).mockResolvedValue({
        messages: [],
        tokenCount: 0,
      });

      vi.mocked(messageRepository.findByConversationId).mockResolvedValue({
        items: [
          {
            id: 'msg-1',
            conversationId: 'conv-123',
            role: 'user' as const,
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
        ],
        total: 1,
        limit: 100,
        offset: 0,
        hasMore: false,
      });

      const result = await conversationService.getConversationHistory('conv-123');

      expect(result).toHaveLength(1);
      expect(messageRepository.findByConversationId).toHaveBeenCalled();
    });
  });

  describe('updateChunk', () => {
    it('should update chunk with audio file ID', async () => {
      const mockChunk = {
        id: 'chunk-123',
        messageId: 'msg-123',
        chunkIndex: 0,
        text: 'Hello!',
        emotion: null,
        icon: null,
        pauseAfter: null,
        emphasis: false,
        audioFileId: 'audio-123',
        audioDuration: 5.5,
        ttsStatus: 'completed' as const,
        createdAt: new Date(),
      };

      vi.mocked(chunkRepository.update).mockResolvedValue(mockChunk);

      const result = await conversationService.updateChunk('chunk-123', {
        audioFileId: 'audio-123',
        audioDuration: 5.5,
        ttsStatus: 'completed',
      });

      expect(result).toBeDefined();
      expect(result?.audioFileId).toBe('audio-123');
      expect(chunkRepository.update).toHaveBeenCalled();
    });
  });
});

