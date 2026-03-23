/**
 * Database Connection
 * PostgreSQL connection pool manager
 */
import { Pool, type PoolConfig } from 'pg';
import { logger } from '../utils/logger.js';

let pool: Pool | null = null;

export interface DatabaseConfig extends PoolConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

/**
 * Get database connection pool
 */
export function getPool(config?: DatabaseConfig): Pool {
  if (pool !== null) {
    return pool;
  }

  // Parse DATABASE_URL if available, otherwise use individual config
  const databaseUrl = process.env.DATABASE_URL;
  let poolConfig: PoolConfig;

  if (databaseUrl !== undefined) {
    poolConfig = {
      connectionString: databaseUrl,
      max: config?.max ?? 20,
      idleTimeoutMillis: config?.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config?.connectionTimeoutMillis ?? 10000,
    };
  } else {
    poolConfig = {
      host: config?.host ?? process.env.DB_HOST ?? 'localhost',
      port: config?.port ?? Number.parseInt(process.env.DB_PORT ?? '5432', 10),
      database: config?.database ?? process.env.DB_NAME ?? 'english_tutor',
      user: config?.user ?? process.env.DB_USER ?? 'english_tutor',
      password: config?.password ?? process.env.DB_PASSWORD ?? 'english_tutor_password',
      max: config?.max ?? 20,
      idleTimeoutMillis: config?.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config?.connectionTimeoutMillis ?? 10000,
    };
  }

  pool = new Pool(poolConfig);

  // Handle pool errors
  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected error on idle database client');
  });

  // Log connection events
  pool.on('connect', () => {
    logger.debug('New database client connected');
  });

  logger.info({ 
    host: poolConfig.host ?? (typeof poolConfig.connectionString === 'string' ? 'from DATABASE_URL' : 'unknown'),
    database: poolConfig.database ?? 'from DATABASE_URL',
  }, 'Database connection pool created');

  return pool;
}

/**
 * Close database connection pool
 */
export async function closePool(): Promise<void> {
  if (pool !== null) {
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const testPool = getPool();
    const client = await testPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Database connection test failed');
    return false;
  }
}

