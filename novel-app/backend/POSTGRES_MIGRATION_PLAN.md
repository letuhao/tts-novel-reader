## PostgreSQL Migration Plan

This document captures the end-to-end plan for moving the backend from the embedded SQLite database (`novel-app/backend/database/novels.db`) to a dedicated PostgreSQL instance without losing data or breaking existing features.

---

### 1. Why migrate?
- SQLite is fast for single-process workloads, but the synchronous `better-sqlite3` access pattern blocks the event loop during long reads (e.g., role-detection over 1.6k chapters).
- Only one writer at a time; background workers + API compete for the same file handle.
- No built-in connection pooling or monitoring for future scaling.
- PostgreSQL gives concurrent writers, async clients, replication/backup options, and better observability.

---

### 2. Current State (baseline)
| Area | Notes |
| --- | --- |
| DB file | `novel-app/backend/database/novels.db` |
| Access layer | Direct `better-sqlite3` calls (`db.prepare().all/get/run`) inside every model |
| Schema | Tables: `novels`, `chapters`, `paragraphs`, `generation_progress`, `progress`, `audio_cache` |
| Batch writes | Manual SQLite transaction for paragraph batch insert; everything else runs row-by-row |
| Migrations | Inline `CREATE TABLE IF NOT EXISTS` + ad-hoc PRAGMA checks at startup |

---

### 3. Migration Strategy Overview
1. **Abstract the database provider**
   - Build a provider interface with `all`, `get`, `run`, `transaction`, `exec`.
   - Implement `sqliteProvider` (wraps current logic) and `postgresProvider` (using `pg`).
   - Allow selection via `DB_PROVIDER=sqlite|postgres`.

2. **Refactor models/services to async provider API**
   - Replace all `db.prepare()` usages with provider helpers.
   - Ensure every call site awaits `Database.getInstance()`.
   - Update batch helpers (paragraph inserts, generation progress, etc.) to use provider transactions.

3. **Define PostgreSQL schema + env config**
   - Mirror all tables/indices in DDL scripts (TIMESTAMPTZ, BIGINT for file sizes, etc.).
   - Document required env vars: `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, optional `PGSSLMODE`.
   - Add dependency (`pg`) to backend `package.json`.

4. **Data migration tooling**
   - Write a migration script (e.g., `scripts/migrate_sqlite_to_postgres.js`):
     - Opens SQLite read-only.
     - Streams data table-by-table in dependency order: novels → chapters → paragraphs → generation_progress → progress → audio_cache.
     - Uses COPY or batched INSERTs with transactions for speed.
     - Verifies row counts before finalizing.
   - Provide dry-run option and log progress for large datasets.

5. **Cutover procedure**
   1. Backup current SQLite file.
   2. Provision Postgres DB (local docker or managed instance).
   3. Run migration script; verify row counts & sample queries.
   4. Set env `DB_PROVIDER=postgres` + PG creds for backend + workers.
   5. Restart services; run smoke tests (novel list, chapter load, TTS generation, role detection).

6. **Rollback plan**
   - Keep original SQLite file untouched until Postgres proves stable.
   - If issues arise, set `DB_PROVIDER=sqlite` and restart services to revert instantly.
   - Migration script is idempotent; re-run after fixes.

7. **Validation checklist**
   - [ ] `/api/novels`, `/api/novels/:id` return same data as pre-migration.
   - [ ] Role detection worker can read/write progress rows.
   - [ ] Audio cache creation + retrieval works (file IDs, metadata).
   - [ ] Background jobs do not log DB locking errors.
   - [ ] Performance sampling shows reduced worker wait time.

---

### 4. Detailed Tasks

| Phase | Tasks |
| --- | --- |
| Provider abstraction | Create `DatabaseProvider` interface, add SQLite + Postgres implementations, expose via `Database.getInstance()` singleton. |
| Model refactor | Update `NovelModel`, `ChapterModel`, `ParagraphModel`, `AudioCacheModel`, `GenerationProgressModel`, `ProgressModel`, and any scripts/services touching DB. Add automated tests where possible. |
| Config & dependencies | Add `pg` package, extend `.env.example` (if present), update docs (`README`, `POSTGRES_MIGRATION_PLAN.md`). |
| Migration script | Implement `migrate_sqlite_to_postgres.js` with progress logging, row verification, and failure handling (partial retries). |
| Testing | Unit tests for provider utilities, integration tests for migration script (small fixture DB). Manual QA for main flows post-cutover. |

---

### 5. Operational Notes
- **Transaction size:** For large paragraph tables, batch INSERTs (500–1,000 rows per transaction) to avoid memory pressure.
- **Timestamps:** SQLite stores ISO strings; Postgres should accept them via TIMESTAMPTZ. No conversion needed, but confirm UTC.
- **UUIDs:** Existing IDs are strings; keep as TEXT in Postgres to avoid mass re-generation.
- **Foreign keys:** Ensure Postgres schema uses `ON DELETE CASCADE` like SQLite.
- **Monitoring:** After switch, enable Postgres logs or pg_stat_statements to verify query performance.

---

### 6. Timeline (suggested)
1. **Day 1** – Provider abstraction + config scaffolding.
2. **Day 2** – Refactor models/services; run unit tests.
3. **Day 3** – Build migration script + run against local Postgres.
4. **Day 4** – QA, fix regressions, document cutover procedure.
5. **Day 5** – Production migration (during maintenance window), monitor.

Timeline is adjustable based on team bandwidth and QA needs.

---

### 7. Next Steps
1. Approve this plan.
2. Create tasks/tickets per phase.
3. Implement provider abstraction and migration script.
4. Schedule cutover window once testing passes.

Reach out if you need help setting up PostgreSQL locally (Docker compose template is easy to add). Once the provider abstraction lands, we can ship both DB options in parallel until you’re ready to migrate. 


