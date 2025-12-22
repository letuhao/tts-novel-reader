"""
Redis-backed LangGraph Checkpointer ("MemorySaver but persisted in Redis")

Design goals:
- API compatible with LangGraph's BaseCheckpointSaver
- Supports async workflows (ainvoke/astream) without PostgresSaver limitations
- Mirrors InMemorySaver semantics closely (checkpoints + blobs + writes)
"""

from __future__ import annotations

import pickle
import random
from typing import Any, AsyncIterator, Iterator, Optional, Sequence
from urllib.parse import quote

from langchain_core.runnables import RunnableConfig

from langgraph.checkpoint.base import (
    WRITES_IDX_MAP,
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
    SerializerProtocol,
    get_checkpoint_id,
    get_checkpoint_metadata,
)


def _esc(value: str) -> str:
    # Keep keys readable + safe across separators
    return quote(value, safe="")


class RedisSaver(BaseCheckpointSaver[str]):
    """
    Redis-backed checkpoint saver.

    Key structure (per thread_id):
      lg:{namespace}:thread:{thread}:ns_set                          (SET)   => namespaces used
      lg:{namespace}:thread:{thread}:ns:{ns}:seq                     (STRING)=> monotonic seq for ordering
      lg:{namespace}:thread:{thread}:ns:{ns}:index                   (ZSET)  => checkpoint_id -> seq score
      lg:{namespace}:thread:{thread}:ns:{ns}:data                    (HASH)  => checkpoint_id -> pickled(payload)
      lg:{namespace}:thread:{thread}:ns:{ns}:ckpt:{id}:writes        (HASH)  => field "{task_id}:{idx}" -> pickled(tuple)
      lg:{namespace}:thread:{thread}:ns:{ns}:blob:{channel}:{ver}    (STRING)=> pickled(serde_typed_tuple)
    """

    def __init__(
        self,
        redis_url: str,
        *,
        namespace: str = "english_tutor_agent",
        ttl_seconds: int | None = None,
        serde: SerializerProtocol | None = None,
    ) -> None:
        super().__init__(serde=serde)
        import redis  # type: ignore
        import redis.asyncio as aredis  # type: ignore

        self.redis_url = redis_url
        self.namespace = namespace
        self.ttl_seconds = ttl_seconds

        # Keep bytes (decode_responses=False) because serde uses bytes payloads
        self._r = redis.Redis.from_url(redis_url, decode_responses=False)
        self._ar = aredis.Redis.from_url(redis_url, decode_responses=False)

    # -------------------------
    # Key helpers
    # -------------------------
    def _thread_prefix(self, thread_id: str) -> str:
        return f"lg:{self.namespace}:thread:{_esc(thread_id)}"

    def _ns_set_key(self, thread_id: str) -> str:
        return f"{self._thread_prefix(thread_id)}:ns_set"

    def _seq_key(self, thread_id: str, checkpoint_ns: str) -> str:
        return f"{self._thread_prefix(thread_id)}:ns:{_esc(checkpoint_ns)}:seq"

    def _index_key(self, thread_id: str, checkpoint_ns: str) -> str:
        return f"{self._thread_prefix(thread_id)}:ns:{_esc(checkpoint_ns)}:index"

    def _data_key(self, thread_id: str, checkpoint_ns: str) -> str:
        return f"{self._thread_prefix(thread_id)}:ns:{_esc(checkpoint_ns)}:data"

    def _writes_key(self, thread_id: str, checkpoint_ns: str, checkpoint_id: str) -> str:
        return f"{self._thread_prefix(thread_id)}:ns:{_esc(checkpoint_ns)}:ckpt:{_esc(checkpoint_id)}:writes"

    def _blob_key(self, thread_id: str, checkpoint_ns: str, channel: str, version: str | int | float) -> str:
        return (
            f"{self._thread_prefix(thread_id)}:ns:{_esc(checkpoint_ns)}:"
            f"blob:{_esc(channel)}:{_esc(str(version))}"
        )

    def _maybe_expire(self, *keys: str) -> None:
        if not self.ttl_seconds:
            return
        for k in keys:
            # best-effort expiry
            try:
                self._r.expire(k, self.ttl_seconds)
            except Exception:
                pass

    async def _amaybe_expire(self, *keys: str) -> None:
        if not self.ttl_seconds:
            return
        for k in keys:
            try:
                await self._ar.expire(k, self.ttl_seconds)
            except Exception:
                pass

    # -------------------------
    # Core behavior
    # -------------------------
    def _load_blobs(self, thread_id: str, checkpoint_ns: str, versions: ChannelVersions) -> dict[str, Any]:
        channel_values: dict[str, Any] = {}
        for k, v in versions.items():
            blob_key = self._blob_key(thread_id, checkpoint_ns, k, v)
            raw = self._r.get(blob_key)
            if not raw:
                continue
            typed_tuple = pickle.loads(raw)
            if typed_tuple[0] != "empty":
                channel_values[k] = self.serde.loads_typed(typed_tuple)
        return channel_values

    async def _aload_blobs(self, thread_id: str, checkpoint_ns: str, versions: ChannelVersions) -> dict[str, Any]:
        channel_values: dict[str, Any] = {}
        for k, v in versions.items():
            blob_key = self._blob_key(thread_id, checkpoint_ns, k, v)
            raw = await self._ar.get(blob_key)
            if not raw:
                continue
            typed_tuple = pickle.loads(raw)
            if typed_tuple[0] != "empty":
                channel_values[k] = self.serde.loads_typed(typed_tuple)
        return channel_values

    def get_tuple(self, config: RunnableConfig) -> CheckpointTuple | None:
        thread_id: str = config["configurable"]["thread_id"]
        checkpoint_ns: str = config["configurable"].get("checkpoint_ns", "")

        data_key = self._data_key(thread_id, checkpoint_ns)
        index_key = self._index_key(thread_id, checkpoint_ns)

        checkpoint_id = get_checkpoint_id(config)
        if not checkpoint_id:
            latest = self._r.zrevrange(index_key, 0, 0)
            if not latest:
                return None
            checkpoint_id = latest[0].decode("utf-8") if isinstance(latest[0], (bytes, bytearray)) else str(latest[0])

        payload_raw = self._r.hget(data_key, checkpoint_id)
        if not payload_raw:
            return None
        checkpoint_b, metadata_b, parent_checkpoint_id = pickle.loads(payload_raw)

        checkpoint_: Checkpoint = self.serde.loads_typed(checkpoint_b)

        writes_key = self._writes_key(thread_id, checkpoint_ns, checkpoint_id)
        writes_vals = self._r.hvals(writes_key)
        pending_writes = []
        for w in writes_vals:
            task_id, channel, typed_value, task_path = pickle.loads(w)
            pending_writes.append((task_id, channel, self.serde.loads_typed(typed_value)))

        return CheckpointTuple(
            config={
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                }
            },
            checkpoint={
                **checkpoint_,
                "channel_values": self._load_blobs(thread_id, checkpoint_ns, checkpoint_["channel_versions"]),
            },
            metadata=self.serde.loads_typed(metadata_b),
            pending_writes=pending_writes,
            parent_config=(
                {
                    "configurable": {
                        "thread_id": thread_id,
                        "checkpoint_ns": checkpoint_ns,
                        "checkpoint_id": parent_checkpoint_id,
                    }
                }
                if parent_checkpoint_id
                else None
            ),
        )

    def list(
        self,
        config: RunnableConfig | None,
        *,
        filter: dict[str, Any] | None = None,
        before: RunnableConfig | None = None,
        limit: int | None = None,
    ) -> Iterator[CheckpointTuple]:
        # Best-effort implementation (mainly for debugging/admin)
        thread_ids = (config["configurable"]["thread_id"],) if config else ()
        if not thread_ids:
            return iter(())  # type: ignore[return-value]

        for thread_id in thread_ids:
            ns_set_key = self._ns_set_key(thread_id)
            namespaces = self._r.smembers(ns_set_key)
            for ns_b in namespaces:
                checkpoint_ns = ns_b.decode("utf-8") if isinstance(ns_b, (bytes, bytearray)) else str(ns_b)
                index_key = self._index_key(thread_id, checkpoint_ns)
                data_key = self._data_key(thread_id, checkpoint_ns)

                max_score: str | int | float = "+inf"
                if before and (before_id := get_checkpoint_id(before)):
                    score = self._r.zscore(index_key, before_id)
                    if score is not None:
                        max_score = float(score) - 1

                ids = self._r.zrevrangebyscore(index_key, max_score, "-inf")
                for cid_b in ids:
                    if limit is not None and limit <= 0:
                        break
                    checkpoint_id = cid_b.decode("utf-8") if isinstance(cid_b, (bytes, bytearray)) else str(cid_b)

                    payload_raw = self._r.hget(data_key, checkpoint_id)
                    if not payload_raw:
                        continue
                    checkpoint_b, metadata_b, parent_checkpoint_id = pickle.loads(payload_raw)
                    metadata = self.serde.loads_typed(metadata_b)
                    if filter and not all(metadata.get(k) == v for k, v in filter.items()):
                        continue

                    writes_key = self._writes_key(thread_id, checkpoint_ns, checkpoint_id)
                    writes_vals = self._r.hvals(writes_key)
                    pending_writes = []
                    for w in writes_vals:
                        task_id, channel, typed_value, task_path = pickle.loads(w)
                        pending_writes.append((task_id, channel, self.serde.loads_typed(typed_value)))

                    checkpoint_: Checkpoint = self.serde.loads_typed(checkpoint_b)
                    yield CheckpointTuple(
                        config={
                            "configurable": {
                                "thread_id": thread_id,
                                "checkpoint_ns": checkpoint_ns,
                                "checkpoint_id": checkpoint_id,
                            }
                        },
                        checkpoint={
                            **checkpoint_,
                            "channel_values": self._load_blobs(thread_id, checkpoint_ns, checkpoint_["channel_versions"]),
                        },
                        metadata=metadata,
                        parent_config=(
                            {
                                "configurable": {
                                    "thread_id": thread_id,
                                    "checkpoint_ns": checkpoint_ns,
                                    "checkpoint_id": parent_checkpoint_id,
                                }
                            }
                            if parent_checkpoint_id
                            else None
                        ),
                        pending_writes=pending_writes,
                    )
                    if limit is not None:
                        limit -= 1

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        c = checkpoint.copy()
        thread_id: str = config["configurable"]["thread_id"]
        checkpoint_ns: str = config["configurable"].get("checkpoint_ns", "")
        parent_checkpoint_id: str | None = config["configurable"].get("checkpoint_id")

        # Track namespaces for list()
        ns_set_key = self._ns_set_key(thread_id)
        self._r.sadd(ns_set_key, checkpoint_ns.encode("utf-8"))

        values: dict[str, Any] = c.pop("channel_values")  # type: ignore[misc]
        for k, v in new_versions.items():
            blob_key = self._blob_key(thread_id, checkpoint_ns, k, v)
            typed_tuple = self.serde.dumps_typed(values[k]) if k in values else ("empty", b"")
            self._r.set(blob_key, pickle.dumps(typed_tuple, protocol=pickle.HIGHEST_PROTOCOL))
            self._maybe_expire(blob_key)

        data_key = self._data_key(thread_id, checkpoint_ns)
        index_key = self._index_key(thread_id, checkpoint_ns)
        seq_key = self._seq_key(thread_id, checkpoint_ns)

        payload = (
            self.serde.dumps_typed(c),
            self.serde.dumps_typed(get_checkpoint_metadata(config, metadata)),
            parent_checkpoint_id,
        )
        self._r.hset(data_key, checkpoint["id"], pickle.dumps(payload, protocol=pickle.HIGHEST_PROTOCOL))
        seq = int(self._r.incr(seq_key))
        self._r.zadd(index_key, {checkpoint["id"]: seq})

        self._maybe_expire(ns_set_key, data_key, index_key, seq_key)

        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint["id"],
            }
        }

    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        thread_id: str = config["configurable"]["thread_id"]
        checkpoint_ns: str = config["configurable"].get("checkpoint_ns", "")
        checkpoint_id: str = config["configurable"]["checkpoint_id"]

        writes_key = self._writes_key(thread_id, checkpoint_ns, checkpoint_id)

        for idx, (channel, value) in enumerate(writes):
            mapped_idx = WRITES_IDX_MAP.get(channel, idx)
            field = f"{task_id}:{mapped_idx}"

            # For regular writes (idx>=0), don't overwrite if already present
            if mapped_idx >= 0:
                if self._r.hexists(writes_key, field):
                    continue

            payload = (task_id, channel, self.serde.dumps_typed(value), task_path)
            self._r.hset(writes_key, field, pickle.dumps(payload, protocol=pickle.HIGHEST_PROTOCOL))

        self._maybe_expire(writes_key)

    def delete_thread(self, thread_id: str) -> None:
        prefix = f"{self._thread_prefix(thread_id)}:"
        for k in self._r.scan_iter(match=f"{prefix}*"):
            try:
                self._r.delete(k)
            except Exception:
                pass

    # -------------------------
    # Async API (required for ainvoke/astream)
    # -------------------------
    async def aget_tuple(self, config: RunnableConfig) -> CheckpointTuple | None:
        thread_id: str = config["configurable"]["thread_id"]
        checkpoint_ns: str = config["configurable"].get("checkpoint_ns", "")

        data_key = self._data_key(thread_id, checkpoint_ns)
        index_key = self._index_key(thread_id, checkpoint_ns)

        checkpoint_id = get_checkpoint_id(config)
        if not checkpoint_id:
            latest = await self._ar.zrevrange(index_key, 0, 0)
            if not latest:
                return None
            checkpoint_id = latest[0].decode("utf-8") if isinstance(latest[0], (bytes, bytearray)) else str(latest[0])

        payload_raw = await self._ar.hget(data_key, checkpoint_id)
        if not payload_raw:
            return None
        checkpoint_b, metadata_b, parent_checkpoint_id = pickle.loads(payload_raw)
        checkpoint_: Checkpoint = self.serde.loads_typed(checkpoint_b)

        writes_key = self._writes_key(thread_id, checkpoint_ns, checkpoint_id)
        writes_vals = await self._ar.hvals(writes_key)
        pending_writes = []
        for w in writes_vals:
            task_id, channel, typed_value, task_path = pickle.loads(w)
            pending_writes.append((task_id, channel, self.serde.loads_typed(typed_value)))

        return CheckpointTuple(
            config={
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                }
            },
            checkpoint={
                **checkpoint_,
                "channel_values": await self._aload_blobs(thread_id, checkpoint_ns, checkpoint_["channel_versions"]),
            },
            metadata=self.serde.loads_typed(metadata_b),
            pending_writes=pending_writes,
            parent_config=(
                {
                    "configurable": {
                        "thread_id": thread_id,
                        "checkpoint_ns": checkpoint_ns,
                        "checkpoint_id": parent_checkpoint_id,
                    }
                }
                if parent_checkpoint_id
                else None
            ),
        )

    async def alist(
        self,
        config: RunnableConfig | None,
        *,
        filter: dict[str, Any] | None = None,
        before: RunnableConfig | None = None,
        limit: int | None = None,
    ) -> AsyncIterator[CheckpointTuple]:
        # Best-effort implementation
        if not config:
            return
            yield  # pragma: no cover

        thread_id = config["configurable"]["thread_id"]
        ns_set_key = self._ns_set_key(thread_id)
        namespaces = await self._ar.smembers(ns_set_key)
        for ns_b in namespaces:
            checkpoint_ns = ns_b.decode("utf-8") if isinstance(ns_b, (bytes, bytearray)) else str(ns_b)
            index_key = self._index_key(thread_id, checkpoint_ns)
            data_key = self._data_key(thread_id, checkpoint_ns)

            max_score: str | int | float = "+inf"
            if before and (before_id := get_checkpoint_id(before)):
                score = await self._ar.zscore(index_key, before_id)
                if score is not None:
                    max_score = float(score) - 1

            ids = await self._ar.zrevrangebyscore(index_key, max_score, "-inf")
            for cid_b in ids:
                if limit is not None and limit <= 0:
                    break
                checkpoint_id = cid_b.decode("utf-8") if isinstance(cid_b, (bytes, bytearray)) else str(cid_b)
                payload_raw = await self._ar.hget(data_key, checkpoint_id)
                if not payload_raw:
                    continue
                checkpoint_b, metadata_b, parent_checkpoint_id = pickle.loads(payload_raw)
                metadata = self.serde.loads_typed(metadata_b)
                if filter and not all(metadata.get(k) == v for k, v in filter.items()):
                    continue

                writes_key = self._writes_key(thread_id, checkpoint_ns, checkpoint_id)
                writes_vals = await self._ar.hvals(writes_key)
                pending_writes = []
                for w in writes_vals:
                    task_id, channel, typed_value, task_path = pickle.loads(w)
                    pending_writes.append((task_id, channel, self.serde.loads_typed(typed_value)))

                checkpoint_: Checkpoint = self.serde.loads_typed(checkpoint_b)
                yield CheckpointTuple(
                    config={
                        "configurable": {
                            "thread_id": thread_id,
                            "checkpoint_ns": checkpoint_ns,
                            "checkpoint_id": checkpoint_id,
                        }
                    },
                    checkpoint={
                        **checkpoint_,
                        "channel_values": await self._aload_blobs(thread_id, checkpoint_ns, checkpoint_["channel_versions"]),
                    },
                    metadata=metadata,
                    parent_config=(
                        {
                            "configurable": {
                                "thread_id": thread_id,
                                "checkpoint_ns": checkpoint_ns,
                                "checkpoint_id": parent_checkpoint_id,
                            }
                        }
                        if parent_checkpoint_id
                        else None
                    ),
                    pending_writes=pending_writes,
                )
                if limit is not None:
                    limit -= 1

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        c = checkpoint.copy()
        thread_id: str = config["configurable"]["thread_id"]
        checkpoint_ns: str = config["configurable"].get("checkpoint_ns", "")
        parent_checkpoint_id: str | None = config["configurable"].get("checkpoint_id")

        ns_set_key = self._ns_set_key(thread_id)
        await self._ar.sadd(ns_set_key, checkpoint_ns.encode("utf-8"))

        values: dict[str, Any] = c.pop("channel_values")  # type: ignore[misc]
        for k, v in new_versions.items():
            blob_key = self._blob_key(thread_id, checkpoint_ns, k, v)
            typed_tuple = self.serde.dumps_typed(values[k]) if k in values else ("empty", b"")
            await self._ar.set(blob_key, pickle.dumps(typed_tuple, protocol=pickle.HIGHEST_PROTOCOL))
            await self._amaybe_expire(blob_key)

        data_key = self._data_key(thread_id, checkpoint_ns)
        index_key = self._index_key(thread_id, checkpoint_ns)
        seq_key = self._seq_key(thread_id, checkpoint_ns)

        payload = (
            self.serde.dumps_typed(c),
            self.serde.dumps_typed(get_checkpoint_metadata(config, metadata)),
            parent_checkpoint_id,
        )
        await self._ar.hset(data_key, checkpoint["id"], pickle.dumps(payload, protocol=pickle.HIGHEST_PROTOCOL))
        seq = int(await self._ar.incr(seq_key))
        await self._ar.zadd(index_key, {checkpoint["id"]: seq})

        await self._amaybe_expire(ns_set_key, data_key, index_key, seq_key)

        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint["id"],
            }
        }

    async def aput_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        thread_id: str = config["configurable"]["thread_id"]
        checkpoint_ns: str = config["configurable"].get("checkpoint_ns", "")
        checkpoint_id: str = config["configurable"]["checkpoint_id"]

        writes_key = self._writes_key(thread_id, checkpoint_ns, checkpoint_id)

        for idx, (channel, value) in enumerate(writes):
            mapped_idx = WRITES_IDX_MAP.get(channel, idx)
            field = f"{task_id}:{mapped_idx}"

            if mapped_idx >= 0:
                if await self._ar.hexists(writes_key, field):
                    continue

            payload = (task_id, channel, self.serde.dumps_typed(value), task_path)
            await self._ar.hset(writes_key, field, pickle.dumps(payload, protocol=pickle.HIGHEST_PROTOCOL))

        await self._amaybe_expire(writes_key)

    async def adelete_thread(self, thread_id: str) -> None:
        prefix = f"{self._thread_prefix(thread_id)}:"
        async for k in self._ar.scan_iter(match=f"{prefix}*"):
            try:
                await self._ar.delete(k)
            except Exception:
                pass

    # -------------------------
    # Versioning (match InMemorySaver behavior)
    # -------------------------
    def get_next_version(self, current: str | None, channel: None) -> str:
        if current is None:
            current_v = 0
        elif isinstance(current, int):
            current_v = current
        else:
            current_v = int(current.split(".")[0])
        next_v = current_v + 1
        next_h = random.random()
        return f"{next_v:032}.{next_h:016}"


