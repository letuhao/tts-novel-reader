/**
 * Message Repository
 * Handles all database operations for messages
 */
import { getPool } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import type {
  Message,
  CreateMessageInput,
  UpdateMessageInput,
  PaginationOptions,
  PaginatedResult,
} from './types.js';

export class MessageRepository {
  /**
   * Create a new message
   */
  async create(input: CreateMessageInput): Promise<Message> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query<{
        id: string;
        conversation_id: string;
        role: string;
        content: string;
        sequence_number: number;
        metadata: Record<string, unknown> | null;
        audio_file_id: string | null;
        audio_duration: number | null;
        stt_transcript: string | null;
        edited_at: Date | null;
        deleted_at: Date | null;
        edit_count: number;
        created_at: Date;
      }>(
        `INSERT INTO messages (
          conversation_id, role, content, sequence_number, metadata,
          audio_file_id, audio_duration, stt_transcript
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          input.conversationId,
          input.role,
          input.content,
          input.sequenceNumber,
          input.metadata ? JSON.stringify(input.metadata) : null,
          input.audioFileId || null,
          input.audioDuration || null,
          input.sttTranscript || null,
        ]
      );

      return this.mapRowToMessage(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, input }, 'Failed to create message');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get message by ID
   */
  async findById(id: string): Promise<Message | null> {
    const pool = getPool();

    try {
      const result = await pool.query<{
        id: string;
        conversation_id: string;
        role: string;
        content: string;
        sequence_number: number;
        metadata: Record<string, unknown> | null;
        audio_file_id: string | null;
        audio_duration: number | null;
        stt_transcript: string | null;
        edited_at: Date | null;
        deleted_at: Date | null;
        edit_count: number;
        created_at: Date;
      }>('SELECT * FROM messages WHERE id = $1 AND deleted_at IS NULL', [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToMessage(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to find message by ID');
      throw error;
    }
  }

  /**
   * Get messages by conversation ID
   */
  async findByConversationId(
    conversationId: string,
    options?: PaginationOptions
  ): Promise<PaginatedResult<Message>> {
    const pool = getPool();

    try {
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;
      const orderBy = options?.orderBy || 'sequence_number';
      const orderDirection = options?.orderDirection || 'ASC';

      // Get total count
      const countResult = await pool.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1 AND deleted_at IS NULL',
        [conversationId]
      );
      const total = parseInt(countResult.rows[0]!.count, 10);

      // Get messages
      const result = await pool.query<{
        id: string;
        conversation_id: string;
        role: string;
        content: string;
        sequence_number: number;
        metadata: Record<string, unknown> | null;
        audio_file_id: string | null;
        audio_duration: number | null;
        stt_transcript: string | null;
        edited_at: Date | null;
        deleted_at: Date | null;
        edit_count: number;
        created_at: Date;
      }>(
        `SELECT * FROM messages 
         WHERE conversation_id = $1 AND deleted_at IS NULL
         ORDER BY ${orderBy} ${orderDirection}
         LIMIT $2 OFFSET $3`,
        [conversationId, limit, offset]
      );

      return {
        items: result.rows.map((row) => this.mapRowToMessage(row)),
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to find messages by conversation ID');
      throw error;
    }
  }

  /**
   * Get next sequence number for a conversation
   */
  async getNextSequenceNumber(conversationId: string): Promise<number> {
    const pool = getPool();

    try {
      const result = await pool.query<{ max: number | null }>(
        'SELECT MAX(sequence_number) as max FROM messages WHERE conversation_id = $1',
        [conversationId]
      );

      const max = result.rows[0]?.max;
      return max !== null && max !== undefined ? max + 1 : 1;
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Failed to get next sequence number');
      throw error;
    }
  }

  /**
   * Update message
   */
  async update(id: string, input: UpdateMessageInput): Promise<Message | null> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (input.content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(input.content);
        updates.push(`edited_at = CURRENT_TIMESTAMP`);
        updates.push(`edit_count = edit_count + 1`);
      }
      if (input.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(input.metadata ? JSON.stringify(input.metadata) : null);
      }
      if (input.audioFileId !== undefined) {
        updates.push(`audio_file_id = $${paramIndex++}`);
        values.push(input.audioFileId);
      }
      if (input.audioDuration !== undefined) {
        updates.push(`audio_duration = $${paramIndex++}`);
        values.push(input.audioDuration);
      }
      if (input.sttTranscript !== undefined) {
        updates.push(`stt_transcript = $${paramIndex++}`);
        values.push(input.sttTranscript);
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      values.push(id);

      const result = await client.query<{
        id: string;
        conversation_id: string;
        role: string;
        content: string;
        sequence_number: number;
        metadata: Record<string, unknown> | null;
        audio_file_id: string | null;
        audio_duration: number | null;
        stt_transcript: string | null;
        edited_at: Date | null;
        deleted_at: Date | null;
        edit_count: number;
        created_at: Date;
      }>(
        `UPDATE messages SET ${updates.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Save edit history if content changed
      if (input.content !== undefined) {
        const oldMessage = await this.findById(id);
        if (oldMessage && oldMessage.content !== input.content) {
          await client.query(
            `INSERT INTO message_edit_history (message_id, previous_content, new_content)
             VALUES ($1, $2, $3)`,
            [id, oldMessage.content, input.content]
          );
        }
      }

      return this.mapRowToMessage(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, id, input }, 'Failed to update message');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft delete message
   */
  async delete(id: string): Promise<boolean> {
    const pool = getPool();

    try {
      const result = await pool.query(
        'UPDATE messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING id',
        [id]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to delete message');
      throw error;
    }
  }

  /**
   * Map database row to Message object
   */
  private mapRowToMessage(row: {
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    sequence_number: number;
    metadata: Record<string, unknown> | null;
    audio_file_id: string | null;
    audio_duration: number | null;
    stt_transcript: string | null;
    edited_at: Date | null;
    deleted_at: Date | null;
    edit_count: number;
    created_at: Date;
  }): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      sequenceNumber: row.sequence_number,
      metadata: row.metadata,
      audioFileId: row.audio_file_id,
      audioDuration: row.audio_duration,
      sttTranscript: row.stt_transcript,
      editedAt: row.edited_at,
      deletedAt: row.deleted_at,
      editCount: row.edit_count,
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const messageRepository = new MessageRepository();

