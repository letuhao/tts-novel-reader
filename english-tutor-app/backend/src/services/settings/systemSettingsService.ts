/**
 * System Settings Service
 * Manages application-wide settings stored in database for hot reload
 */
import { getPool } from '../../database/connection.js';
import { createChildLogger } from '../../utils/logger.js';

const serviceLogger = createChildLogger({ service: 'system-settings' });

export type SettingType = 'string' | 'number' | 'boolean' | 'json' | 'array' | 'object';
export type SettingCategory = 'general' | 'ollama' | 'tts' | 'stt' | 'curriculum' | string;

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: SettingType;
  description?: string | undefined;
  category?: SettingCategory | undefined;
  updatedAt: Date;
  updatedBy?: string | undefined;
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
 * System Settings Service Class
 */
export class SystemSettingsService {
  private cache: Map<string, SystemSetting> = new Map();
  private cacheTimestamp: number = 0;
  private readonly cacheTTL: number = 5000; // 5 seconds cache

  /**
   * Get all system settings (with caching)
   */
  async getAllSettings(useCache: boolean = true): Promise<SystemSetting[]> {
    const now = Date.now();
    if (useCache && this.cache.size > 0 && (now - this.cacheTimestamp) < this.cacheTTL) {
      return Array.from(this.cache.values());
    }

    const pool = getPool();
    const result = await pool.query<{
      id: string;
      key: string;
      value: string;
      type: SettingType;
      description: string | null;
      category: string | null;
      updated_at: Date;
      updated_by: string | null;
    }>('SELECT * FROM system_settings ORDER BY category, key');

    const settings: SystemSetting[] = result.rows.map((row) => ({
      id: row.id,
      key: row.key,
      value: row.value,
      type: row.type,
      description: row.description ?? undefined,
      category: (row.category ?? undefined) as SettingCategory | undefined,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by ?? undefined,
    }));

    // Update cache
    this.cache.clear();
    settings.forEach((setting) => {
      this.cache.set(setting.key, setting);
    });
    this.cacheTimestamp = now;

    return settings;
  }

  /**
   * Get a system setting by key
   */
  async getSetting(key: string, useCache: boolean = true): Promise<SystemSetting | null> {
    // Check cache first
    if (useCache && this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (cached !== undefined) {
        return cached;
      }
    }

    const pool = getPool();
    const result = await pool.query<{
      id: string;
      key: string;
      value: string;
      type: SettingType;
      description: string | null;
      category: string | null;
      updated_at: Date;
      updated_by: string | null;
    }>('SELECT * FROM system_settings WHERE key = $1', [key]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    
    const setting: SystemSetting = {
      id: row.id,
      key: row.key,
      value: row.value,
      type: row.type,
      description: row.description ?? undefined,
      category: (row.category ?? undefined) as SettingCategory | undefined,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by ?? undefined,
    };

    // Update cache
    this.cache.set(key, setting);

    return setting;
  }

  /**
   * Get setting value (typed)
   */
  async getValue<T = unknown>(key: string, defaultValue?: T): Promise<T> {
    const setting = await this.getSetting(key);
    if (setting === null) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Setting not found: ${key}`);
    }

    return parseValue(setting.value, setting.type) as T;
  }

  /**
   * Set a system setting
   */
  async setSetting(
    key: string,
    value: unknown,
    type: SettingType,
    description?: string,
    category?: SettingCategory,
    updatedBy?: string
  ): Promise<SystemSetting> {
    const stringValue = stringifyValue(value, type);

    const pool = getPool();
    const result = await pool.query<{
      id: string;
      key: string;
      value: string;
      type: SettingType;
      description: string | null;
      category: string | null;
      updated_at: Date;
      updated_by: string | null;
    }>(
      `INSERT INTO system_settings (key, value, type, description, category, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE
       SET value = $2, type = $3, description = $4, category = $5, updated_by = $6, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, stringValue, type, description ?? null, category ?? null, updatedBy ?? null]
    );

    const row = result.rows[0];
    if (row === undefined) {
      throw new Error('Failed to insert/update setting');
    }
    
    const setting: SystemSetting = {
      id: row.id,
      key: row.key,
      value: row.value,
      type: row.type,
      description: row.description ?? undefined,
      category: (row.category ?? undefined) as SettingCategory | undefined,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by ?? undefined,
    };

    // Update cache
    this.cache.set(key, setting);
    this.cacheTimestamp = Date.now();

    serviceLogger.info({ key, type, category }, 'System setting updated');
    return setting;
  }

  /**
   * Delete a system setting
   */
  async deleteSetting(key: string): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM system_settings WHERE key = $1', [key]);

    // Remove from cache
    this.cache.delete(key);

    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
      serviceLogger.info({ key }, 'System setting deleted');
    }
    return deleted;
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: SettingCategory): Promise<SystemSetting[]> {
    const allSettings = await this.getAllSettings();
    return allSettings.filter((setting) => setting.category === category);
  }

  /**
   * Clear cache (force reload on next get)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamp = 0;
  }
}

// Singleton instance
let systemSettingsServiceInstance: SystemSettingsService | null = null;

/**
 * Get system settings service singleton
 */
export function getSystemSettingsService(): SystemSettingsService {
  if (systemSettingsServiceInstance === null) {
    systemSettingsServiceInstance = new SystemSettingsService();
  }
  return systemSettingsServiceInstance;
}

