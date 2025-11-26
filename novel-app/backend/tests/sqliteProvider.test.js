import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import SqliteProvider from '../src/database/providers/sqliteProvider.js';

async function createTempProvider() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sqlite-provider-'));
  const dbPath = path.join(tempDir, 'test.db');
  const provider = new SqliteProvider({ path: dbPath });
  await provider.initialize();
  return { provider, tempDir, dbPath };
}

async function cleanupProvider(provider, tempDir) {
  await provider.close();
  await fs.rm(tempDir, { recursive: true, force: true });
}

test('SqliteProvider initializes schema and supports CRUD', async (t) => {
  const { provider, tempDir } = await createTempProvider();
  await t.test('insert and read novel row', async () => {
    const now = new Date().toISOString();
    await provider.run(
      `INSERT INTO novels (id, title, file_path, metadata, total_chapters, total_paragraphs, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      'novel-1',
      'Test Novel',
      '/tmp/novel.txt',
      JSON.stringify({ source: 'unit-test' }),
      0,
      0,
      now,
      now
    );

    const rows = await provider.all('SELECT * FROM novels WHERE id = ?', 'novel-1');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'Test Novel');
  });

  await cleanupProvider(provider, tempDir);
});

test('SqliteProvider transactions commit and rollback correctly', async (t) => {
  const { provider, tempDir } = await createTempProvider();
  const now = new Date().toISOString();

  await provider.run(
    `INSERT INTO novels (id, title, file_path, metadata, total_chapters, total_paragraphs, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'novel-1',
    'Transaction Novel',
    '/tmp/tx.txt',
    JSON.stringify({ test: true }),
    0,
    0,
    now,
    now
  );

  await provider.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO chapters (id, novel_id, chapter_number, title, content, total_paragraphs, total_lines, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      'chapter-1',
      'novel-1',
      1,
      'Chapter One',
      null,
      0,
      0,
      now,
      now
    );
  });

  const inserted = await provider.get('SELECT COUNT(*) as count FROM chapters');
  assert.equal(inserted.count, 1);

  await assert.rejects(async () => {
    await provider.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO chapters (id, novel_id, chapter_number, title, content, total_paragraphs, total_lines, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        'chapter-1',
        'novel-1',
        1,
        'Duplicate Chapter',
        null,
        0,
        0,
        now,
        now
      );
    });
  });

  const afterRollback = await provider.get('SELECT COUNT(*) as count FROM chapters');
  assert.equal(afterRollback.count, 1);

  await cleanupProvider(provider, tempDir);
});


