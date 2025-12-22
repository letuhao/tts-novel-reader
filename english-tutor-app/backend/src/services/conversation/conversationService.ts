/**
 * Conversation Service
 * High-level service for managing conversations
 * Integrates repositories, memory, and pipeline
 */
import { logger } from '../../utils/logger.js';
import { conversationRepository, messageRepository, chunkRepository } from '../../repositories/index.js';
import { conversationMemoryService } from '../memory/index.js';
import type {
  Conversation,
  CreateConversationInput,
  UpdateConversationInput,
  Message,
  MessageChunk,
  PaginationOptions,
  PaginatedResult,
} from '../../repositories/types.js';

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
  messageCount: number;
}

export interface SendMessageInput {
  conversationId: string;
  userId: string;
  content: string;
  audioFileId?: string;
  audioDuration?: number;
  sttTranscript?: string;
}

export interface SendMessageResult {
  message: Message;
  chunks: MessageChunk[];
  assistantResponse: string;
}

export class ConversationService {
  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    input: Omit<CreateConversationInput, 'userId'>
  ): Promise<Conversation> {
    try {
      const conversation = await conversationRepository.create({
        ...input,
        userId,
      });

      logger.info(
        {
          conversationId: conversation.id,
          userId,
          level: conversation.level,
        },
        'Conversation created'
      );

      return conversation;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to create conversation');
      throw error;
    }
  }

  /**
   * Get conversation by ID with messages
   */
  async getConversation(
    conversationId: string,
    includeMessages = true
  ): Promise<ConversationWithMessages | null> {
    try {
      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        return null;
      }

      let messages: Message[] = [];
      if (includeMessages) {
        const messagesResult = await messageRepository.findByConversationId(conversationId, {
          limit: 1000,
          orderBy: 'sequence_number',
          orderDirection: 'ASC',
        });
        messages = messagesResult.items;
      }

      return {
        ...conversation,
        messages,
        messageCount: messages.length,
      };
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to get conversation');
      throw error;
    }
  }

  /**
   * Get conversations for a user
   */
  async getUserConversations(
    userId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Conversation>> {
    try {
      return await conversationRepository.findByUserId(userId, options);
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get user conversations');
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    input: UpdateConversationInput
  ): Promise<Conversation | null> {
    try {
      return await conversationRepository.update(conversationId, input);
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to update conversation');
      throw error;
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      // Clear memory for this conversation
      await conversationMemoryService.clearMemory(conversationId);

      // Delete conversation (cascades to messages and chunks)
      return await conversationRepository.delete(conversationId);
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to delete conversation');
      throw error;
    }
  }

  /**
   * Send a user message and get AI response
   * This is a high-level method that:
   * 1. Saves user message
   * 2. Gets memory context
   * 3. Calls Ollama (via pipeline)
   * 4. Saves assistant response
   * 5. Updates memory
   */
  async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
    try {
      const { conversationId, userId, content, audioFileId, audioDuration, sttTranscript } = input;

      // Verify conversation exists and belongs to user
      const conversation = await conversationRepository.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (conversation.userId !== userId) {
        throw new Error('Unauthorized: Conversation does not belong to user');
      }

      // Get next sequence number
      const sequenceNumber = await messageRepository.getNextSequenceNumber(conversationId);

      // Save user message
      const userMessage = await messageRepository.create({
        conversationId,
        role: 'user',
        content,
        sequenceNumber,
        ...(audioFileId && { audioFileId }),
        ...(audioDuration && { audioDuration }),
        ...(sttTranscript && { sttTranscript }),
      });

      // Update conversation last message timestamp
      await conversationRepository.updateLastMessageAt(conversationId);

      // Get memory context
      const memoryContext = await conversationMemoryService.getMemoryContext(conversationId);

      // Prepare messages for Ollama
      const messages = memoryContext?.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })) || [];

      // Add current user message
      messages.push({
        role: 'user',
        content,
      });

      // Note: Ollama call will be handled by pipeline service
      // For now, return the user message
      // The pipeline service will handle the AI response

      logger.info(
        {
          conversationId,
          messageId: userMessage.id,
          sequenceNumber,
        },
        'User message saved'
      );

      return {
        message: userMessage,
        chunks: [],
        assistantResponse: '', // Will be filled by pipeline
      };
    } catch (error) {
      logger.error({ err: error, input }, 'Failed to send message');
      throw error;
    }
  }

  /**
   * Save assistant response with chunks
   */
  async saveAssistantResponse(
    conversationId: string,
    content: string,
    chunks: Array<{
      text: string;
      emotion?: string;
      icon?: string;
      pauseAfter?: number;
      emphasis?: boolean;
    }>,
    metadata?: Record<string, unknown>
  ): Promise<{ message: Message; chunks: MessageChunk[] }> {
    try {
      // Get next sequence number
      const sequenceNumber = await messageRepository.getNextSequenceNumber(conversationId);

      // Save assistant message
      const assistantMessage = await messageRepository.create({
        conversationId,
        role: 'assistant',
        content,
        sequenceNumber,
        ...(metadata && { metadata }),
      });

      // Save chunks
      const savedChunks: MessageChunk[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]!;
        const savedChunk = await chunkRepository.create({
          messageId: assistantMessage.id,
          chunkIndex: i,
          text: chunk.text,
          ...(chunk.emotion && { emotion: chunk.emotion as any }),
          ...(chunk.icon && { icon: chunk.icon }),
          ...(chunk.pauseAfter !== undefined && { pauseAfter: chunk.pauseAfter }),
          ...(chunk.emphasis !== undefined && { emphasis: chunk.emphasis }),
        });
        savedChunks.push(savedChunk);
      }

      // Update conversation last message timestamp
      await conversationRepository.updateLastMessageAt(conversationId);

      // Update memory
      // Get the last user message to pair with this response
      const messagesResult = await messageRepository.findByConversationId(conversationId, {
        limit: 2,
        orderBy: 'sequence_number',
        orderDirection: 'DESC',
      });

      const lastUserMessage = messagesResult.items.find((m) => m.role === 'user');
      if (lastUserMessage) {
        await conversationMemoryService.saveContext(
          conversationId,
          lastUserMessage.content,
          content
        );
      }

      logger.info(
        {
          conversationId,
          messageId: assistantMessage.id,
          chunksCount: savedChunks.length,
        },
        'Assistant response saved'
      );

      return {
        message: assistantMessage,
        chunks: savedChunks,
      };
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to save assistant response');
      throw error;
    }
  }

  /**
   * Update chunk with audio file ID and status
   */
  async updateChunk(
    chunkId: string,
    updates: {
      audioFileId?: string;
      audioDuration?: number;
      ttsStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    }
  ): Promise<MessageChunk | null> {
    try {
      const updateData: {
        audioFileId?: string;
        audioDuration?: number;
        ttsStatus?: 'pending' | 'processing' | 'completed' | 'failed';
      } = {};

      if (updates.audioFileId !== undefined) {
        updateData.audioFileId = updates.audioFileId;
      }
      if (updates.audioDuration !== undefined) {
        updateData.audioDuration = updates.audioDuration;
      }
      if (updates.ttsStatus !== undefined) {
        updateData.ttsStatus = updates.ttsStatus;
      }

      return await chunkRepository.update(chunkId, updateData);
    } catch (error) {
      logger.error({ err: error, chunkId }, 'Failed to update chunk');
      return null;
    }
  }

  /**
   * Get conversation history for Ollama
   */
  async getConversationHistory(conversationId: string): Promise<Array<{ role: string; content: string }>> {
    try {
      // Get memory context (includes summary if available)
      const memoryContext = await conversationMemoryService.getMemoryContext(conversationId);

      if (memoryContext && memoryContext.messages.length > 0) {
        logger.debug({ 
          conversationId, 
          source: 'memory',
          messageCount: memoryContext.messages.length,
          messages: memoryContext.messages.map(m => ({ 
            role: m.role, 
            content: m.content.substring(0, 50),
            contentLength: m.content.length
          }))
        }, '📚 [HISTORY] Returning history from memory context');
        return memoryContext.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));
      }

      // Fallback: get messages from database
      const messagesResult = await messageRepository.findByConversationId(conversationId, {
        limit: 100,
        orderBy: 'sequence_number',
        orderDirection: 'ASC',
      });

      logger.debug({ 
        conversationId, 
        source: 'database',
        messageCount: messagesResult.items.length,
        messages: messagesResult.items.map(m => ({ 
          role: m.role, 
          sequenceNumber: m.sequenceNumber,
          content: m.content.substring(0, 50),
          contentLength: m.content.length
        }))
      }, '📚 [HISTORY] Returning history from database (memory context empty)');

      return messagesResult.items.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to get conversation history');
      return [];
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();

