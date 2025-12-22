# Redis Checkpointer Design (Custom) - “MemorySaver but Redis”

**Purpose:** Replace volatile `MemorySaver` with a Redis-backed saver that supports async (`ainvoke/astream`) and works in multi-instance deployments.

---

## Goals

- **Async-safe**: implements `aget_tuple/aput/aput_writes/...` (unlike current PostgresSaver version in our environment).
- **Same semantics as `InMemorySaver`**: checkpoints + blobs + intermediate writes.
- **Enterprise-friendly**:
  - Survives process restarts
  - Works with multiple replicas (stateless API instances)
  - Optional **TTL** to control retention/cost

---

## Non-Goals (for v1)

- Strong transactional guarantees across multiple Redis keys (we use best-effort atomicity per operation).
- Advanced querying of checkpoints (we provide “best-effort list” for debugging).
- Full “workflow resume across long-running jobs” orchestration (that’s a separate “job runner” concern).

---

## Interface Contract (LangGraph)

LangGraph expects a `BaseCheckpointSaver` implementation:
- **Sync**: `get_tuple`, `put`, `put_writes`, `list`, `delete_thread`
- **Async**: `aget_tuple`, `aput`, `aput_writes`, `alist`, `adelete_thread`
- Versioning: `get_next_version`

Implementation file:
- `src/services/redis_saver.py` (`RedisSaver`)

Selection:
- `src/services/checkpointer.py` picks Redis when:
  - `CHECKPOINTER_BACKEND=redis` OR
  - `CHECKPOINTER_BACKEND=auto` and `REDIS_URL` is present

---

## Data Model in Redis

We mirror `InMemorySaver`’s internal model:

- **Checkpoint record** (without `channel_values`):
  - stored as `serde.dumps_typed(checkpoint_without_values)`
- **Metadata**:
  - stored as `serde.dumps_typed(get_checkpoint_metadata(config, metadata))`
- **Blobs** (channel snapshot values) keyed by `(thread_id, ns, channel, version)`
- **Writes** keyed by `(thread_id, ns, checkpoint_id)` storing per-task pending writes

### Key schema (per thread)

Prefix:
- `lg:{namespace}:thread:{thread_id_escaped}`

Keys:
- `...:ns_set` (SET) — namespaces used by this thread
- `...:ns:{ns}:seq` (STRING) — monotonic counter for ordering (via `INCR`)
- `...:ns:{ns}:index` (ZSET) — `checkpoint_id -> seq score` (latest = highest score)
- `...:ns:{ns}:data` (HASH) — `checkpoint_id -> pickled( (checkpoint_b, metadata_b, parent_id) )`
- `...:ns:{ns}:ckpt:{checkpoint_id}:writes` (HASH) — `field "{task_id}:{idx}" -> pickled(...)`
- `...:ns:{ns}:blob:{channel}:{version}` (STRING) — `pickled(serde_typed_tuple)`

Why `ZSET` ordering?
- `checkpoint_id` is usually monotonic, but `seq` makes ordering explicit and efficient.

---

## Retention (TTL)

`RedisSaver(ttl_seconds=...)` will set expiry on keys it writes.

Default behavior:
- `ttl_seconds=None` → no expiry (keep history indefinitely)

Recommended for production:
- Start with **7–30 days TTL** (depending on traffic + compliance needs).

---

## Concurrency Notes

- `put()` uses `INCR` for ordering, then `ZADD` for index.
- `put_writes()` uses `HEXISTS` to avoid overwriting regular writes.
- Operations are “best-effort atomic” (per Redis command). If we need stronger guarantees, we can upgrade to pipelines/Lua.

---

## Deployment (Docker Compose)

Compose additions:
- `redis` service (AOF enabled)
- `agent-service` gets:
  - `CHECKPOINTER_BACKEND=redis`
  - `REDIS_URL=redis://redis:6380/0`

File:
- `docker-compose.yml`

---

## Testing

- Script:
  - `scripts/test_redis_checkpointer.py`
  - Runs a full `ainvoke()` workflow with `RedisSaver`
  - Verifies a checkpoint exists afterwards via `saver.aget_tuple(...)`

---

## Future Enhancements (Enterprise)

- Add **namespaced migrations** / versioning for key format changes
- Add **pipelines** for multi-key atomic writes
- Add **metrics** (checkpoint counts, key sizes, TTL effectiveness)
- Add **admin tooling** (purge by thread, export checkpoints for audit)


