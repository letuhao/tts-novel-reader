## PostgreSQL Migration – Detailed Design

This document expands on the high-level plan with concrete technical details, component diagrams, and testing requirements to ensure the migration is predictable and reversible.

---

### 1. Architecture Overview

```
 ┌──────────────┐        ┌────────────────┐
 │  Models /    │        │  Database      │
 │  Services    │        │  Provider API  │
 └─────┬────────┘        └──────┬─────────┘
       │ Database.getInstance()        │
       ▼                              ▼
 ┌──────────────┐        ┌────────────────┐
 │ SqliteProvider│        │PostgresProvider│
 └──────────────┘        └────────────────┘
       │                              │
       ▼                              ▼
 ┌──────────────┐        ┌────────────────┐
 │ better-sqlite│        │pg Pool         │
 └──────────────┘        └────────────────┘
```

All data access goes through the provider interface (`all`, `get`, `run`, `transaction`, `exec`). Providers adapt to driver-specific behavior (sync vs async, positional params, transactions).

---

### 2. Provider Interface

```ts
interface DatabaseProvider {
  initialize(): Promise<void>;
  all(sql: string, ...params: any[]): Promise<any[]>;
  get(sql: string, ...params: any[]): Promise<any | null>;
  run(sql: string, ...params: any[]): Promise<{ rowCount?: number; changes?: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: DatabaseProvider) => Promise<T>): Promise<T>;
}
```

Implementation notes:
- **SQLite**: wrap existing `better-sqlite3` calls; `run()` returns `{ changes: result.changes }`.
- **Postgres**: use `pg` Pool. `run()` returns `{ rowCount }`. Parameter placeholders are converted from `?` to `$1`, `$2`, etc. Transactions borrow a client from the pool.

Environment selection:
- `DB_PROVIDER=sqlite|postgres`. Default remains `sqlite`.
- Postgres connection options via `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSL=true/false`.

---

### 3. Model Refactor Plan

| File | Changes |
| --- | --- |
| `models/Novel.js` | Make every method `await Database.getInstance()`. Replace `.prepare().all/get/run` with provider helpers. Remove in-memory fallback for `update`. |
| `models/Chapter.js`, `models/Paragraph.js` | Same as above. Update batch insert to use provider transactions. |
| `models/GenerationProgress.js`, `Progress.js`, `AudioCache.js` | Replace direct sqlite usage. Ensure row-count checks use `rowCount` fallback. |
| `services/roleDetectionWorker.js` and scripts | Any raw SQL usage replaced with provider helper. |

All refactors should preserve behavior in SQLite mode (regression tests run before Postgres migration).

---

### 4. PostgreSQL Schema

Key decisions:
- Use `TEXT` for IDs (matches current UUID strings).
- `TIMESTAMPTZ` for all date columns; insert ISO strings from app.
- Numeric columns: `INTEGER` for counts, `DOUBLE PRECISION` for durations/progress, `BIGINT` for file sizes.
- Foreign keys with `ON DELETE CASCADE`.

Schema artifacts:
- `database/schema.postgres.sql`: DDL script.
- `database/schema.sqlite.sql`: optional snapshot to keep parity.

Indexes replicate current SQLite indices; additional indexes may be added for hot queries (e.g., `paragraphs(novel_id, role)` if needed later).

---

### 5. Migration Script (`scripts/migrate_sqlite_to_postgres.js`)

**Purpose:** Copy data from `novel-app/backend/database/novels.db` into a Postgres database.

Steps:
1. Connect to SQLite (read-only) and Postgres simultaneously.
2. Wrap migration in Postgres transaction (or per-table transactions to keep memory low).
3. Migration order (respecting FK constraints):
   1. `novels`
   2. `chapters`
   3. `paragraphs`
   4. `generation_progress`
   5. `progress`
   6. `audio_cache`
4. For each table:
   - Stream rows using `better-sqlite3` `.iterate()` to avoid loading entire table.
   - Insert into Postgres with parametrized batches (500 rows per batch by default).
   - Commit every batch to reduce risk of long-running transactions.
5. Row count verification:
   - After each table, compare `COUNT(*)` between SQLite and Postgres.
   - Abort if mismatch is detected (log offending table).
6. Optional checksum: simple aggregate (e.g., SHA256 of concatenated IDs) to detect subtle mismatches.
7. Progress logging: every N rows emit `[migrate] paragraphs: 500/200000`.

CLI options:
```
node scripts/migrate_sqlite_to_postgres.js \
  --sqlite-path ./novel-app/backend/database/novels.db \
  --pg-url postgres://user:pass@host/db \
  --batch-size 1000 \
  --dry-run
```

`--dry-run` performs counts only, without inserting data.

---

### 6. Testing & Validation

**Unit Tests**
- Provider placeholder conversion (SQLite vs Postgres).
- Transaction helper ensures COMMIT/ROLLBACK.

**Integration Tests**
- Spin up Postgres via Docker (document `docker-compose` snippet).
- Run migration on a small fixture DB (few novels) and assert counts.
- Run existing API tests with `DB_PROVIDER=postgres`.

**Manual QA Checklist**
1. Import a known novel; ensure `totalChapters` auto-fix still works.
2. Generate audio for a paragraph; confirm `audio_cache` entry persisted.
3. Trigger role detection (single chapter and entire novel).
4. Verify progress endpoints (bookmark/resume) behave identically.
5. Monitor Postgres logs for errors/slow queries.

**Performance Validation**
- Capture timing of role-detection worker before/after migration to confirm reduced blocking.
- Ensure Postgres connections are returned to pool (no leak).

---

### 7. Deployment / Cutover Checklist

1. **Prep**
   - Provision Postgres instance; apply `schema.postgres.sql`.
   - Update `.env` with PG credentials (but keep `DB_PROVIDER=sqlite` until ready).
   - Backup current SQLite DB (`cp novels.db novels_backup_YYYYMMDD.db`).

2. **Dry Run**
   - `node scripts/migrate_sqlite_to_postgres.js --dry-run`.
   - Fix any schema or data inconsistencies.

3. **Production Migration**
   - Stop workers to avoid writes during migration.
   - Run migration script (non-dry-run). Verify row counts.
   - Set `DB_PROVIDER=postgres` in backend and worker startup scripts (PowerShell + Python wrappers).
   - Restart services.

4. **Smoke Test**
   - Hit `/health`, `/api/novels`, load paragraphs in UI.
   - Kick off “detect all roles” job; watch logs for DB errors.

5. **Monitoring**
   - Keep SQLite file as fallback for at least one release cycle.
   - Enable Postgres metrics (connections, locks, slow queries).

6. **Rollback**
   - If any critical issues appear, stop services, revert `DB_PROVIDER=sqlite`, restart (since SQLite file remains unchanged).

---

### 8. Documentation & Communication

Artifacts to update once work is complete:
- `README.md`: new environment variables, migration instructions.
- `POSTGRES_MIGRATION_PLAN.md`: add “Completed” section.
- `POSTGRES_MIGRATION_DETAIL_DESIGN.md`: mark checkboxes for finished sections.
- Release notes explaining that both DB providers are supported but Postgres is recommended for production.

Internal communication:
- Send announcement with cutover window, rollback steps, and contact point.
- Encourage team to install Postgres locally (provide Docker command).

---

### 9. Open Questions / Risks

| Topic | Notes |
| --- | --- |
| Concurrent writes during migration | Need downtime or traffic freeze to avoid missing writes. |
| Large audio_cache table | If huge, consider migrating only recent entries or trimming before run. |
| SQLite custom functions | Not currently used; confirm no hidden dependencies. |
| Future schema changes | After abstraction, add migration tooling (e.g., knex, drizzle, or custom) to keep SQLite/Postgres in sync if dual support is needed long-term. |

---

### 10. Next Steps
1. Implement provider abstraction + Postgres provider scaffold.
2. Refactor models/services to async provider API.
3. Add DDL files + migration script with logging/count verification.
4. Write automated tests (unit + integration).
5. Dry-run migration and plan production cutover.

Once these steps are complete, the backend can run on PostgreSQL seamlessly, with SQLite still available for lightweight/local workflows.


