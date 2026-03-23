/**
 * Conversation Routes
 * Handles conversation CRUD operations
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { conversationService } from '../services/conversation/index.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { logger } from '../utils/logger.js';
import type { ConversationStatus } from '../repositories/types.js';

const router = Router();

// Validation schemas
const CreateConversationSchema = z.object({
  title: z.string().optional(),
  template_id: z.string().uuid().optional(),
  ai_settings: z.record(z.unknown()).optional(),
  level: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
});

const UpdateConversationSchema = z.object({
  title: z.string().optional(),
  ai_settings: z.record(z.unknown()).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
});

/**
 * GET /api/conversations
 * Get all conversations for current user
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as ConversationStatus | undefined;
    const orderBy = (req.query.orderBy as string) || 'updated_at';
    const orderDirection = ((req.query.order as 'asc' | 'desc') || 'desc').toUpperCase() as 'ASC' | 'DESC';

    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    const result = await conversationService.getUserConversations(userId, {
      limit,
      offset,
      orderBy: orderBy as 'created_at' | 'updated_at' | 'title',
      orderDirection,
    });

    // Filter by status if provided (client-side filtering for now)
    const filteredConversations = status
      ? result.items.filter((conv) => conv.status === status)
      : result.items;

    res.json({
      success: true,
      data: {
        conversations: filteredConversations,
        total: status ? filteredConversations.length : result.total,
        page,
        pageSize,
        hasMore: result.hasMore,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error getting conversations');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get conversations',
    });
  }
});

/**
 * GET /api/conversations/:id
 * Get conversation by ID with messages
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    if (!conversationId) {
      res.status(400).json({ success: false, error: 'Conversation ID is required' });
      return;
    }
    const includeMessages = req.query.messages === 'true';

    const conversation = await conversationService.getConversation(conversationId, includeMessages);

    // Verify user owns this conversation
    if (!conversation || conversation.userId !== userId) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error getting conversation');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get conversation',
    });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Get messages for a conversation
 */
router.get('/:id/messages', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    if (!conversationId) {
      res.status(400).json({ success: false, error: 'Conversation ID is required' });
      return;
    }

    // Verify user owns this conversation
    const conversation = await conversationService.getConversation(conversationId, false);
    if (!conversation || conversation.userId !== userId) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    // Get messages with chunks
    const conversationWithMessages = await conversationService.getConversation(conversationId, true);
    
    if (!conversationWithMessages) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    // Get chunks for each message
    const { chunkRepository } = await import('../repositories/index.js');
    const messagesWithChunks = await Promise.all(
      conversationWithMessages.messages.map(async (message) => {
        const chunks = await chunkRepository.findByMessageId(message.id);
        return {
          ...message,
          chunks,
        };
      })
    );

    res.json({
      success: true,
      data: {
        messages: messagesWithChunks,
        total: messagesWithChunks.length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error getting messages');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get messages',
    });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const validationResult = CreateConversationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const conversation = await conversationService.createConversation(userId, {
      ...(validationResult.data.title !== undefined && { title: validationResult.data.title }),
      ...(validationResult.data.level !== undefined && { level: validationResult.data.level }),
      ...(validationResult.data.ai_settings !== undefined && { aiSettings: validationResult.data.ai_settings }),
    });

    res.status(201).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating conversation');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create conversation',
    });
  }
});

/**
 * PUT /api/conversations/:id
 * Update conversation
 */
router.put('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    if (!conversationId) {
      res.status(400).json({ success: false, error: 'Conversation ID is required' });
      return;
    }

    // Verify user owns this conversation
    const existing = await conversationService.getConversation(conversationId);
    if (!existing || existing.userId !== userId) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const validationResult = UpdateConversationSchema.safeParse(req.body);
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.errors,
      });
      return;
    }

    const conversation = await conversationService.updateConversation(conversationId, {
      ...(validationResult.data.title !== undefined && { title: validationResult.data.title }),
      ...(validationResult.data.ai_settings !== undefined && { aiSettings: validationResult.data.ai_settings }),
      ...(validationResult.data.status !== undefined && { status: validationResult.data.status }),
    });

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error updating conversation');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update conversation',
    });
  }
});

/**
 * DELETE /api/conversations/:id
 * Delete conversation
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const conversationId = req.params.id;
    if (!conversationId) {
      res.status(400).json({ success: false, error: 'Conversation ID is required' });
      return;
    }

    // Verify user owns this conversation
    const existing = await conversationService.getConversation(conversationId, false);
    if (!existing || existing.userId !== userId) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    await conversationService.deleteConversation(conversationId);

    res.json({
      success: true,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting conversation');
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete conversation',
    });
  }
});

export default router;

