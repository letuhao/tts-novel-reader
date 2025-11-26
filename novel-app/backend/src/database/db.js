/**
 * Database Setup - SQLite
 * Thiết lập Database - SQLite
 */
import SqliteProvider from './providers/sqliteProvider.js';
import PostgresProvider from './providers/postgresProvider.js';

const PROVIDERS = {
  sqlite: 'sqlite',
  postgres: 'postgres',
  postgresql: 'postgres',
  pg: 'postgres'
};

let providerPromise = null;

function createProvider() {
  const providerKey = (process.env.DB_PROVIDER || 'sqlite').toLowerCase();
  const providerName = PROVIDERS[providerKey] || 'sqlite';
  
  if (providerName === 'postgres') {
    console.log('[Database] Using PostgreSQL provider');
    return new PostgresProvider();
  }
  
  console.log('[Database] Using SQLite provider');
  return new SqliteProvider();
}

export default class Database {
  static async getInstance() {
    if (!providerPromise) {
      providerPromise = (async () => {
        const provider = createProvider();
        await provider.initialize();
        return provider;
      })();
    }
    return providerPromise;
  }
}

export async function resetDatabaseProviderForTests() {
  if (providerPromise) {
    const instance = await providerPromise;
    if (instance && typeof instance.close === 'function') {
      await instance.close();
    }
    providerPromise = null;
  }
}


