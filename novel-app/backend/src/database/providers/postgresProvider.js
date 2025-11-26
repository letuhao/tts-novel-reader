import pg from 'pg';

const { Pool } = pg;

const DEFAULT_CONFIG = {
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'novel_reader',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined
};

export default class PostgresProvider {
  constructor(options = {}) {
    this.config = { ...DEFAULT_CONFIG, ...options };
    if (options.connectionString) {
      this.pool = new Pool({
        connectionString: options.connectionString,
        ssl: DEFAULT_CONFIG.ssl
      });
    } else {
      this.pool = new Pool(this.config);
    }
  }

  async initialize() {
    await this.#initializeSchema();
  }

  async #initializeSchema() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        CREATE TABLE IF NOT EXISTS novels (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          file_path TEXT NOT NULL,
          metadata TEXT,
          total_chapters INTEGER DEFAULT 0,
          total_paragraphs INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_novels_updated_at ON novels(updated_at);
        CREATE INDEX IF NOT EXISTS idx_novels_title ON novels(title);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS chapters (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
          chapter_number INTEGER NOT NULL,
          title TEXT,
          content TEXT,
          total_paragraphs INTEGER DEFAULT 0,
          total_lines INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          UNIQUE(novel_id, chapter_number)
        );
        CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id);
        CREATE INDEX IF NOT EXISTS idx_chapters_number ON chapters(novel_id, chapter_number);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS paragraphs (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
          chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
          chapter_number INTEGER NOT NULL,
          paragraph_number INTEGER NOT NULL,
          text TEXT NOT NULL,
          lines TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          role TEXT,
          voice_id TEXT,
          UNIQUE(novel_id, chapter_id, paragraph_number)
        );
        CREATE INDEX IF NOT EXISTS idx_paragraphs_novel ON paragraphs(novel_id);
        CREATE INDEX IF NOT EXISTS idx_paragraphs_chapter ON paragraphs(chapter_id);
        CREATE INDEX IF NOT EXISTS idx_paragraphs_number ON paragraphs(novel_id, chapter_number, paragraph_number);
        CREATE INDEX IF NOT EXISTS idx_paragraphs_role ON paragraphs(role);
        CREATE INDEX IF NOT EXISTS idx_paragraphs_voice ON paragraphs(voice_id);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS generation_progress (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
          chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
          chapter_number INTEGER,
          paragraph_id TEXT REFERENCES paragraphs(id) ON DELETE CASCADE,
          paragraph_number INTEGER,
          status TEXT NOT NULL DEFAULT 'pending',
          speaker_id TEXT,
          model TEXT,
          progress_percent DOUBLE PRECISION DEFAULT 0,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_gen_progress_novel ON generation_progress(novel_id);
        CREATE INDEX IF NOT EXISTS idx_gen_progress_chapter ON generation_progress(chapter_id);
        CREATE INDEX IF NOT EXISTS idx_gen_progress_paragraph ON generation_progress(paragraph_id);
        CREATE INDEX IF NOT EXISTS idx_gen_progress_status ON generation_progress(status);
        CREATE INDEX IF NOT EXISTS idx_gen_progress_chapter_status ON generation_progress(novel_id, chapter_number, status);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS progress (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
          chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
          chapter_number INTEGER,
          paragraph_id TEXT REFERENCES paragraphs(id) ON DELETE CASCADE,
          paragraph_number INTEGER,
          position DOUBLE PRECISION DEFAULT 0,
          completed BOOLEAN DEFAULT FALSE,
          last_read_at TIMESTAMPTZ NOT NULL,
          reading_time_seconds INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_progress_novel ON progress(novel_id);
        CREATE INDEX IF NOT EXISTS idx_progress_last_read ON progress(last_read_at);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS audio_cache (
          id TEXT PRIMARY KEY,
          novel_id TEXT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
          chapter_id TEXT REFERENCES chapters(id) ON DELETE CASCADE,
          chapter_number INTEGER,
          paragraph_id TEXT REFERENCES paragraphs(id) ON DELETE CASCADE,
          paragraph_number INTEGER,
          tts_file_id TEXT NOT NULL,
          speaker_id TEXT,
          model TEXT,
          local_audio_path TEXT,
          audio_duration DOUBLE PRECISION,
          audio_file_size BIGINT,
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audio_novel ON audio_cache(novel_id);
        CREATE INDEX IF NOT EXISTS idx_audio_chapter ON audio_cache(chapter_id);
        CREATE INDEX IF NOT EXISTS idx_audio_paragraph ON audio_cache(paragraph_id);
        CREATE INDEX IF NOT EXISTS idx_audio_para_num ON audio_cache(chapter_number, paragraph_number);
        CREATE INDEX IF NOT EXISTS idx_audio_expires ON audio_cache(expires_at);
      `);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[Database][Postgres] Schema init error:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  #normalizeParams(params) {
    if (params.length === 0) return [];
    if (params.length === 1 && Array.isArray(params[0])) {
      return params[0];
    }
    return params;
  }

  #convertPlaceholders(sql, paramsCount) {
    if (paramsCount === 0) return sql;
    let index = 0;
    return sql.replace(/\?/g, () => {
      index += 1;
      return `$${index}`;
    });
  }

  #prepare(sql, params) {
    const normalizedParams = this.#normalizeParams(params);
    const text = this.#convertPlaceholders(sql, normalizedParams.length);
    return { text, values: normalizedParams };
  }

  async all(sql, ...params) {
    const { text, values } = this.#prepare(sql, params);
    const result = await this.pool.query(text, values);
    return result.rows;
  }

  async get(sql, ...params) {
    const rows = await this.all(sql, ...params);
    return rows[0] || null;
  }

  async run(sql, ...params) {
    const { text, values } = this.#prepare(sql, params);
    const result = await this.pool.query(text, values);
    return { rowCount: result.rowCount };
  }

  async exec(sql) {
    await this.pool.query(sql);
  }

  async transaction(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txRunner = {
        all: async (sql, ...params) => {
          const { text, values } = this.#prepare(sql, params);
          const result = await client.query(text, values);
          return result.rows;
        },
        get: async (sql, ...params) => {
          const rows = await txRunner.all(sql, ...params);
          return rows[0] || null;
        },
        run: async (sql, ...params) => {
          const { text, values } = this.#prepare(sql, params);
          const result = await client.query(text, values);
          return { rowCount: result.rowCount };
        },
        exec: async (sql) => client.query(sql)
      };

      const result = await fn(txRunner);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}


