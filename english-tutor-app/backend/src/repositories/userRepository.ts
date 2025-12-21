/**
 * User Repository
 * Handles all database operations for users
 */
import { getPool } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import type {
  User,
  CreateUserInput,
  UpdateUserInput,
  CEFRLevel,
} from './types.js';

export class UserRepository {
  /**
   * Create a new user
   */
  async create(input: CreateUserInput): Promise<User> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const result = await client.query<{
        id: string;
        email: string;
        name: string;
        level: string;
        email_verified: boolean;
        created_at: Date;
        updated_at: Date;
        last_login_at: Date | null;
      }>(
        `INSERT INTO users (email, name, password_hash, level, email_verified)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, name, level, email_verified, created_at, updated_at, last_login_at`,
        [
          input.email.toLowerCase(),
          input.name,
          input.passwordHash,
          input.level || 'A1',
          input.emailVerified || false,
        ]
      );

      return this.mapRowToUser(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, email: input.email }, 'Failed to create user');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | null> {
    const pool = getPool();

    try {
      const result = await pool.query<{
        id: string;
        email: string;
        name: string;
        level: string;
        email_verified: boolean;
        created_at: Date;
        updated_at: Date;
        last_login_at: Date | null;
      }>(
        'SELECT id, email, name, level, email_verified, created_at, updated_at, last_login_at FROM users WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to find user by ID');
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const pool = getPool();

    try {
      const result = await pool.query<{
        id: string;
        email: string;
        name: string;
        level: string;
        email_verified: boolean;
        created_at: Date;
        updated_at: Date;
        last_login_at: Date | null;
      }>(
        'SELECT id, email, name, level, email_verified, created_at, updated_at, last_login_at FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, email }, 'Failed to find user by email');
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.level !== undefined) {
        updates.push(`level = $${paramIndex++}`);
        values.push(input.level);
      }
      if (input.emailVerified !== undefined) {
        updates.push(`email_verified = $${paramIndex++}`);
        values.push(input.emailVerified);
        if (input.emailVerified) {
          updates.push(`email_verified_at = CURRENT_TIMESTAMP`);
        }
      }
      if (input.lastLoginAt !== undefined) {
        updates.push(`last_login_at = $${paramIndex++}`);
        values.push(input.lastLoginAt);
      }

      if (updates.length === 0) {
        return this.findById(id);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await client.query<{
        id: string;
        email: string;
        name: string;
        level: string;
        email_verified: boolean;
        created_at: Date;
        updated_at: Date;
        last_login_at: Date | null;
      }>(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, level, email_verified, created_at, updated_at, last_login_at`,
        values
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]!);
    } catch (error) {
      logger.error({ err: error, id, input }, 'Failed to update user');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete user (soft delete - sets status to deleted)
   */
  async delete(id: string): Promise<boolean> {
    const pool = getPool();

    try {
      // Note: We don't actually delete users, we might want to set a status field
      // For now, this is a placeholder
      const result = await pool.query(
        'UPDATE users SET status = $1 WHERE id = $2 RETURNING id',
        ['deleted', id]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error({ err: error, id }, 'Failed to delete user');
      throw error;
    }
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: {
    id: string;
    email: string;
    name: string;
    level: string;
    email_verified: boolean;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
  }): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      level: row.level as CEFRLevel,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLoginAt: row.last_login_at,
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepository();

