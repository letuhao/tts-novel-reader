/**
 * Chunk Repository
 * Handles all database operations for message chunks
 */
import { getPool } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import type {
  MessageChunk,
  CreateChunkInput,
  UpdateChunkInput,
  Emotion,
  TTSStatus,
} from './types.js';

export class ChunkRepository {
  /**
   * Create a new chunk
   */
  async create(input: CreateChunkInput): Promise<MessageChunk> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query<{
        id: string;
        message_id: string;
        chunk_index: number;
        text: string;
        emotion: string | null;
        icon: string | null;
        pause_after: number | null;
        emphasis: boolean;
        audio_file_id: string | null;
        audio_duration: number | null;
        tts_status: string;
        created_at: Date;
      }>(
        `INSERT INTO message_chunks (
          message_id, chunk_index, text, emotion, icon, pause_after,
          emphasis, audio_file_id, audio_duration, tts_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          input.messageId,
          input.chunkIndex,
          input.text,
          input.emotion || null,
          input.icon || null,
          input.pauseAfter || null,
          input.emphasis || false,
          input.audioFileId || null,
          input.audioDuration || null,
          input.ttsStatus || 'pending',
        ]
      );

      return this.mapRowToChunk(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, input }, 'Failed to create chunk');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create multiple chunks
   */
  async createMany(inputs: CreateChunkInput[]): Promise<MessageChunk[]> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const chunks: MessageChunk[] = [];
      for (const input of inputs) {
        const chunk = await this.create(input);
        chunks.push(chunk);
      }

      await client.query('COMMIT');
      return chunks;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ err: error, count: inputs.length }, 'Failed to create chunks');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get chunk by ID
   */
  async findById(id: string): Promise<MessageChunk | null> {
    const pool = getPool();

    try {
      const result = await pool.query<{
        id: string;
        message_id: string;
        chunk_index: number;
        text: string;
        emotion: string | null;
        icon: string | null;
        pause_after: number | null;
        emphasis: boolean;
        audio_file_id: string | null;
        audio_duration: number | null;
        tts_status: string;
        created_at: Date;
      }>('SELECT * FROM message_chunks WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToChunk(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to find chunk by ID');
      throw error;
    }
  }

  /**
   * Get chunks by message ID
   */
  async findByMessageId(messageId: string): Promise<MessageChunk[]> {
    const pool = getPool();

    try {
      const result = await pool.query<{
        id: string;
        message_id: string;
        chunk_index: number;
        text: string;
        emotion: string | null;
        icon: string | null;
        pause_after: number | null;
        emphasis: boolean;
        audio_file_id: string | null;
        audio_duration: number | null;
        tts_status: string;
        created_at: Date;
      }>(
        'SELECT * FROM message_chunks WHERE message_id = $1 ORDER BY chunk_index ASC',
        [messageId]
      );

      return result.rows.map((row) => this.mapRowToChunk(row));
    } catch (error) {
      logger.error({ err: error, messageId }, 'Failed to find chunks by message ID');
      throw error;
    }
  }

  /**
   * Update chunk
   */
  async update(id: string, input: UpdateChunkInput): Promise<MessageChunk | null> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (input.text !== undefined) {
        updates.push(`text = $${paramIndex++}`);
        values.push(input.text);
      }
      if (input.emotion !== undefined) {
        updates.push(`emotion = $${paramIndex++}`);
        values.push(input.emotion);
      }
      if (input.icon !== undefined) {
        updates.push(`icon = $${paramIndex++}`);
        values.push(input.icon);
      }
      if (input.pauseAfter !== undefined) {
        updates.push(`pause_after = $${paramIndex++}`);
        values.push(input.pauseAfter);
      }
      if (input.emphasis !== undefined) {
        updates.push(`emphasis = $${paramIndex++}`);
        values.push(input.emphasis);
      }
      if (input.audioFileId !== undefined) {
        updates.push(`audio_file_id = $${paramIndex++}`);
        values.push(input.audioFileId);
      }
      if (input.audioDuration !== undefined) {
        updates.push(`audio_duration = $${paramIndex++}`);
        values.push(input.audioDuration);
      }
      if (input.ttsStatus !== undefined) {
        updates.push(`tts_status = $${paramIndex++}`);
        values.push(input.ttsStatus);
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      values.push(id);

      const result = await client.query<{
        id: string;
        message_id: string;
        chunk_index: number;
        text: string;
        emotion: string | null;
        icon: string | null;
        pause_after: number | null;
        emphasis: boolean;
        audio_file_id: string | null;
        audio_duration: number | null;
        tts_status: string;
        created_at: Date;
      }>(
        `UPDATE message_chunks SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToChunk(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, id, input }, 'Failed to update chunk');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete chunk
   */
  async delete(id: string): Promise<boolean> {
    const pool = getPool();

    try {
      const result = await pool.query('DELETE FROM message_chunks WHERE id = $1 RETURNING id', [id]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to delete chunk');
      throw error;
    }
  }

  /**
   * Delete chunks by message ID
   */
  async deleteByMessageId(messageId: string): Promise<number> {
    const pool = getPool();

    try {
      const result = await pool.query(
        'DELETE FROM message_chunks WHERE message_id = $1 RETURNING id',
        [messageId]
      );
      return result.rows.length;
    } catch (error) {
      logger.error({ err: error, messageId }, 'Failed to delete chunks by message ID');
      throw error;
    }
  }

  /**
   * Map database row to MessageChunk object
   */
  private mapRowToChunk(row: {
    id: string;
    message_id: string;
    chunk_index: number;
    text: string;
    emotion: string | null;
    icon: string | null;
    pause_after: number | null;
    emphasis: boolean;
    audio_file_id: string | null;
    audio_duration: number | null;
    tts_status: string;
    created_at: Date;
  }): MessageChunk {
    return {
      id: row.id,
      messageId: row.message_id,
      chunkIndex: row.chunk_index,
      text: row.text,
      emotion: row.emotion as Emotion | null,
      icon: row.icon,
      pauseAfter: row.pause_after,
      emphasis: row.emphasis,
      audioFileId: row.audio_file_id,
      audioDuration: row.audio_duration,
      ttsStatus: row.tts_status as TTSStatus,
      createdAt: row.created_at,
    };
  }
}

// Export singleton instance
export const chunkRepository = new ChunkRepository();

