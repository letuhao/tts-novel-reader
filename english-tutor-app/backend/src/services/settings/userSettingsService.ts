/**
 * User Settings Service
 * Manages user-specific settings stored in database
 */
import { getPool } from '../../database/connection.js';
import { createChildLogger } from '../../utils/logger.js';

const serviceLogger = createChildLogger({ service: 'user-settings' });

export type SettingType = 'string' | 'number' | 'boolean' | 'json' | 'array' | 'object';

export interface UserSetting {
  id: string;
  userId: string;
  key: string;
  value: string;
  type: SettingType;
  updatedAt: Date;
}

/**
 * Parse setting value based on type
 */
function parseValue(value: string, type: SettingType): unknown {
  switch (type) {
    case 'number':
      return Number.parseFloat(value);
    case 'boolean':
      return value === 'true' || value === '1';
    case 'json':
    case 'object':
    case 'array':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    default:
      return value;
  }
}

/**
 * Stringify setting value for storage
 */
function stringifyValue(value: unknown, type: SettingType): string {
  if (type === 'json' || type === 'object' || type === 'array') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * User Settings Service Class
 */
export class UserSettingsService {
  /**
   * Get all settings for a user
   */
  async getUserSettings(userId: string): Promise<UserSetting[]> {
    const pool = getPool();
    const result = await pool.query<{
      id: string;
      user_id: string;
      key: string;
      value: string;
      type: SettingType;
      updated_at: Date;
    }>('SELECT * FROM user_settings WHERE user_id = $1 ORDER BY key', [userId]);

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      key: row.key,
      value: row.value,
      type: row.type,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Get a user setting by key
   */
  async getUserSetting(userId: string, key: string): Promise<UserSetting | null> {
    const pool = getPool();
    const result = await pool.query<{
      id: string;
      user_id: string;
      key: string;
      value: string;
      type: SettingType;
      updated_at: Date;
    }>('SELECT * FROM user_settings WHERE user_id = $1 AND key = $2', [userId, key]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    
    return {
      id: row.id,
      userId: row.user_id,
      key: row.key,
      value: row.value,
      type: row.type,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get user setting value (typed)
   */
  async getUserValue<T = unknown>(userId: string, key: string, defaultValue?: T): Promise<T> {
    const setting = await this.getUserSetting(userId, key);
    if (setting === null) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`User setting not found: ${key}`);
    }

    return parseValue(setting.value, setting.type) as T;
  }

  /**
   * Set a user setting
   */
  async setUserSetting(
    userId: string,
    key: string,
    value: unknown,
    type: SettingType
  ): Promise<UserSetting> {
    const stringValue = stringifyValue(value, type);

    const pool = getPool();
    const result = await pool.query<{
      id: string;
      user_id: string;
      key: string;
      value: string;
      type: SettingType;
      updated_at: Date;
    }>(
      `INSERT INTO user_settings (user_id, key, value, type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, key) DO UPDATE
       SET value = $3, type = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, key, stringValue, type]
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new Error('Failed to insert/update user setting');
    }
    
    const setting: UserSetting = {
      id: row.id,
      userId: row.user_id,
      key: row.key,
      value: row.value,
      type: row.type,
      updatedAt: row.updated_at,
    };

    serviceLogger.info({ userId, key, type }, 'User setting updated');
    return setting;
  }

  /**
   * Delete a user setting
   */
  async deleteUserSetting(userId: string, key: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query(
      'DELETE FROM user_settings WHERE user_id = $1 AND key = $2',
      [userId, key]
    );

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      serviceLogger.info({ userId, key }, 'User setting deleted');
    }
    return deleted;
  }

  /**
   * Delete all settings for a user
   */
  async deleteAllUserSettings(userId: string): Promise<number> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM user_settings WHERE user_id = $1', [userId]);

    const count = result.rowCount ?? 0;
    if (count > 0) {
      serviceLogger.info({ userId, count }, 'All user settings deleted');
    }
    return count;
  }
}

// Singleton instance
let userSettingsServiceInstance: UserSettingsService | null = null;

/**
 * Get user settings service singleton
 */
export function getUserSettingsService(): UserSettingsService {
  if (userSettingsServiceInstance === null) {
    userSettingsServiceInstance = new UserSettingsService();
  }
  return userSettingsServiceInstance;
}

