#!/usr/bin/env node
/**
 * Migrate data from SQLite (novels.db) to PostgreSQL
 * Di chuyển dữ liệu từ SQLite sang PostgreSQL
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import DatabaseLib from 'better-sqlite3';
import pg from 'pg';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SQLITE_PATH = path.join(__dirname, '../database/novels.db');
const { Pool } = pg;

const TABLES = [
  'novels',
  'chapters',
  'paragraphs',
  'generation_progress',
  'progress',
  'audio_cache'
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    sqlitePath: DEFAULT_SQLITE_PATH,
    batchSize: 500,
    dryRun: false,
    truncate: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--sqlite-path':
        options.sqlitePath = args[++i];
        break;
      case '--pg-url':
        options.pgConnectionString = args[++i];
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i], 10) || 500;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-truncate':
        options.truncate = false;
        break;
      default:
        console.warn(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function migrate() {
  const options = parseArgs();
  console.log('=== SQLite → PostgreSQL Migration ===');
  console.log(`SQLite file: ${options.sqlitePath}`);
  console.log(`Batch size: ${options.batchSize}`);
  console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);

  const sqlite = new DatabaseLib(options.sqlitePath, { readonly: true });

  const pool = new Pool(
    options.pgConnectionString
      ? { connectionString: options.pgConnectionString }
      : undefined
  );

  try {
    const client = await pool.connect();
    try {
      for (const table of TABLES) {
        console.log(`\n--- Table: ${table} ---`);
        const sqliteCount = sqlite
          .prepare(`SELECT COUNT(*) as count FROM ${table}`)
          .get().count;
        console.log(`SQLite count: ${sqliteCount}`);

        if (options.dryRun) {
          const pgCount = (
            await client.query(`SELECT COUNT(*) as count FROM ${table}`)
          ).rows[0].count;
          console.log(`Postgres count: ${pgCount}`);
          continue;
        }

        if (options.truncate) {
          console.log('Truncating target table...');
          await client.query(`TRUNCATE TABLE ${table} CASCADE`);
        }

        const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
        if (rows.length === 0) {
          console.log('No rows to migrate.');
          continue;
        }

        const columns = Object.keys(rows[0]);
        const columnList = columns.map((c) => `"${c}"`).join(', ');

        const insertRow = async (rowValues) => {
          const placeholders = rowValues.map((_, idx) => `$${idx + 1}`).join(', ');
          const query = `INSERT INTO ${table} (${columnList}) VALUES (${placeholders})`;
          await client.query(query, rowValues);
        };

        console.log(`Migrating ${rows.length} rows...`);
        await client.query('BEGIN');
        try {
          for (const batch of chunkArray(rows, options.batchSize)) {
            for (const row of batch) {
              const values = columns.map((col) => row[col]);
              await insertRow(values);
            }
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }

        const pgCount = (
          await client.query(`SELECT COUNT(*) as count FROM ${table}`)
        ).rows[0].count;
        console.log(`Postgres count after insert: ${pgCount}`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
    sqlite.close();
  }

  console.log('\nMigration complete!');
}

migrate();


