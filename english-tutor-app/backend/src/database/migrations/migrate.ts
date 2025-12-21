/**
 * Database Migration Runner
 * Runs SQL migrations to set up the database schema
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../connection.js';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run all migrations
 */
export async function runMigrations(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get applied migrations
    const appliedResult = await client.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const appliedVersions = new Set(appliedResult.rows.map((row) => row.version));

    // Find migration files
    // Use src directory for SQL files since they're not compiled to dist
    const isProduction = process.env.NODE_ENV === 'production';
    const migrationsDir = isProduction 
      ? join(__dirname, '.') // In production, assume SQL files are copied to dist
      : join(process.cwd(), 'src', 'database', 'migrations'); // In dev, use src directory
    
    const migrationFiles = [
      { version: 1, name: '001_initial_schema.sql' },
      { version: 2, name: '002_users_auth.sql' },
      { version: 3, name: '003_conversations.sql' },
      { version: 4, name: '004_messages.sql' },
      { version: 5, name: '005_message_chunks.sql' },
      { version: 6, name: '006_conversation_events.sql' },
      { version: 7, name: '007_memory_tables.sql' },
      { version: 8, name: '008_learning_features.sql' },
      { version: 9, name: '009_organization_features.sql' },
      { version: 10, name: '010_sharing_features.sql' },
      { version: 11, name: '011_user_features.sql' },
      // Add more migrations here as version number increases
    ];

    for (const migration of migrationFiles) {
      if (appliedVersions.has(migration.version)) {
        logger.debug({ version: migration.version, name: migration.name }, 'Migration already applied, skipping');
        continue;
      }

      logger.info({ version: migration.version, name: migration.name }, 'Running migration');

      const migrationPath = join(migrationsDir, migration.name);
      const migrationSQL = readFileSync(migrationPath, 'utf-8');

      // Run migration
      await client.query(migrationSQL);

      // Record migration
      await client.query(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );

      logger.info({ version: migration.version, name: migration.name }, 'Migration completed');
    }

    await client.query('COMMIT');
    logger.info('All migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Migration failed');
    throw error;
  } finally {
    client.release();
  }
}

