/**
 * Conversation Repository
 * Handles all database operations for conversations
 */
import { getPool } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import type {
  Conversation,
  CreateConversationInput,
  UpdateConversationInput,
  PaginationOptions,
  PaginatedResult,
  CEFRLevel,
  ConversationStatus,
  MemoryStrategy,
} from './types.js';

export class ConversationRepository {
  /**
   * Create a new conversation
   */
  async create(input: CreateConversationInput): Promise<Conversation> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query<{
        id: string;
        user_id: string;
        title: string | null;
        level: string;
        status: string;
        metadata: Record<string, unknown> | null;
        memory_strategy: string;
        max_context_messages: number;
        max_context_tokens: number;
        auto_summarize: boolean;
        summarize_threshold: number;
        ai_settings: Record<string, unknown>;
        is_pinned: boolean;
        pinned_at: Date | null;
        pin_order: number | null;
        folder_id: string | null;
        exported_at: Date | null;
        export_format: string | null;
        created_at: Date;
        updated_at: Date;
        last_message_at: Date | null;
      }>(
        `INSERT INTO conversations (
          user_id, title, level, status, metadata, memory_strategy,
          max_context_messages, max_context_tokens, auto_summarize,
          summarize_threshold, ai_settings, folder_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          input.userId,
          input.title || null,
          input.level || 'A1',
          input.status || 'active',
          input.metadata ? JSON.stringify(input.metadata) : null,
          input.memoryStrategy || 'sliding',
          input.maxContextMessages || 20,
          input.maxContextTokens || 4000,
          input.autoSummarize || false,
          input.summarizeThreshold || 50,
          input.aiSettings ? JSON.stringify(input.aiSettings) : '{}',
          input.folderId || null,
        ]
      );

      return this.mapRowToConversation(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, input }, 'Failed to create conversation');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get conversation by ID
   */
  async findById(id: string): Promise<Conversation | null> {
    const pool = getPool();

    try {
      const result = await pool.query<{
        id: string;
        user_id: string;
        title: string | null;
        level: string;
        status: string;
        metadata: Record<string, unknown> | null;
        memory_strategy: string;
        max_context_messages: number;
        max_context_tokens: number;
        auto_summarize: boolean;
        summarize_threshold: number;
        ai_settings: Record<string, unknown>;
        is_pinned: boolean;
        pinned_at: Date | null;
        pin_order: number | null;
        folder_id: string | null;
        exported_at: Date | null;
        export_format: string | null;
        created_at: Date;
        updated_at: Date;
        last_message_at: Date | null;
      }>('SELECT * FROM conversations WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToConversation(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to find conversation by ID');
      throw error;
    }
  }

  /**
   * Get conversations by user ID
   */
  async findByUserId(
    userId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Conversation>> {
    const pool = getPool();

    try {
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const orderBy = options?.orderBy || 'updated_at';
      const orderDirection = options?.orderDirection || 'DESC';

      // Get total count
      const countResult = await pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM conversations WHERE user_id = $1',
        [userId]
      );
      const total = parseInt(countResult.rows[0]!.count, 10);

      // Get conversations
      const result = await pool.query<{
        id: string;
        user_id: string;
        title: string | null;
        level: string;
        status: string;
        metadata: Record<string, unknown> | null;
        memory_strategy: string;
        max_context_messages: number;
        max_context_tokens: number;
        auto_summarize: boolean;
        summarize_threshold: number;
        ai_settings: Record<string, unknown>;
        is_pinned: boolean;
        pinned_at: Date | null;
        pin_order: number | null;
        folder_id: string | null;
        exported_at: Date | null;
        export_format: string | null;
        created_at: Date;
        updated_at: Date;
        last_message_at: Date | null;
      }>(
        `SELECT * FROM conversations 
         WHERE user_id = $1 
         ORDER BY ${orderBy} ${orderDirection}
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return {
        items: result.rows.map((row) => this.mapRowToConversation(row)),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to find conversations by user ID');
      throw error;
    }
  }

  /**
   * Update conversation
   */
  async update(id: string, input: UpdateConversationInput): Promise<Conversation | null> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (input.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(input.title);
      }
      if (input.level !== undefined) {
        updates.push(`level = $${paramIndex++}`);
        values.push(input.level);
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);
      }
      if (input.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(input.metadata ? JSON.stringify(input.metadata) : null);
      }
      if (input.memoryStrategy !== undefined) {
        updates.push(`memory_strategy = $${paramIndex++}`);
        values.push(input.memoryStrategy);
      }
      if (input.maxContextMessages !== undefined) {
        updates.push(`max_context_messages = $${paramIndex++}`);
        values.push(input.maxContextMessages);
      }
      if (input.maxContextTokens !== undefined) {
        updates.push(`max_context_tokens = $${paramIndex++}`);
        values.push(input.maxContextTokens);
      }
      if (input.autoSummarize !== undefined) {
        updates.push(`auto_summarize = $${paramIndex++}`);
        values.push(input.autoSummarize);
      }
      if (input.summarizeThreshold !== undefined) {
        updates.push(`summarize_threshold = $${paramIndex++}`);
        values.push(input.summarizeThreshold);
      }
      if (input.aiSettings !== undefined) {
        updates.push(`ai_settings = $${paramIndex++}`);
        values.push(input.aiSettings ? JSON.stringify(input.aiSettings) : '{}');
      }
      if (input.isPinned !== undefined) {
        updates.push(`is_pinned = $${paramIndex++}`);
        values.push(input.isPinned);
        if (input.isPinned && input.pinnedAt === undefined) {
          updates.push(`pinned_at = CURRENT_TIMESTAMP`);
        }
      }
      if (input.pinnedAt !== undefined) {
        updates.push(`pinned_at = $${paramIndex++}`);
        values.push(input.pinnedAt);
      }
      if (input.pinOrder !== undefined) {
        updates.push(`pin_order = $${paramIndex++}`);
        values.push(input.pinOrder);
      }
      if (input.folderId !== undefined) {
        updates.push(`folder_id = $${paramIndex++}`);
        values.push(input.folderId);
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await client.query<{
        id: string;
        user_id: string;
        title: string | null;
        level: string;
        status: string;
        metadata: Record<string, unknown> | null;
        memory_strategy: string;
        max_context_messages: number;
        max_context_tokens: number;
        auto_summarize: boolean;
        summarize_threshold: number;
        ai_settings: Record<string, unknown>;
        is_pinned: boolean;
        pinned_at: Date | null;
        pin_order: number | null;
        folder_id: string | null;
        exported_at: Date | null;
        export_format: string | null;
        created_at: Date;
        updated_at: Date;
        last_message_at: Date | null;
      }>(
        `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToConversation(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, id, input }, 'Failed to update conversation');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete conversation
   */
  async delete(id: string): Promise<boolean> {
    const pool = getPool();

    try {
      const result = await pool.query('DELETE FROM conversations WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to delete conversation');
      throw error;
    }
  }

  /**
   * Update last message timestamp
   */
  async updateLastMessageAt(id: string): Promise<void> {
    const pool = getPool();

    try {
      await pool.query(
        'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to update last message timestamp');
      throw error;
    }
  }

  /**
   * Map database row to Conversation object
   */
  private mapRowToConversation(row: {
    id: string;
    user_id: string;
    title: string | null;
    level: string;
    status: string;
    metadata: Record<string, unknown> | null;
    memory_strategy: string;
    max_context_messages: number;
    max_context_tokens: number;
    auto_summarize: boolean;
    summarize_threshold: number;
    ai_settings: Record<string, unknown>;
    is_pinned: boolean;
    pinned_at: Date | null;
    pin_order: number | null;
    folder_id: string | null;
    exported_at: Date | null;
    export_format: string | null;
    created_at: Date;
    updated_at: Date;
    last_message_at: Date | null;
  }): Conversation {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      level: row.level as CEFRLevel,
      status: row.status as ConversationStatus,
      metadata: row.metadata,
      memoryStrategy: row.memory_strategy as MemoryStrategy,
      maxContextMessages: row.max_context_messages,
      maxContextTokens: row.max_context_tokens,
      autoSummarize: row.auto_summarize,
      summarizeThreshold: row.summarize_threshold,
      aiSettings: row.ai_settings,
      isPinned: row.is_pinned,
      pinnedAt: row.pinned_at,
      pinOrder: row.pin_order,
      folderId: row.folder_id,
      exportedAt: row.exported_at,
      exportFormat: row.export_format,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastMessageAt: row.last_message_at,
    };
  }
}

// Export singleton instance
export const conversationRepository = new ConversationRepository();

