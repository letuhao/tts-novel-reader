"""
Test Redis-backed checkpointer (RedisSaver) - minimal, no Ollama/TTS required.

Requires:
- Redis running (default: redis://localhost:6380/0)
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.services.redis_saver import RedisSaver
from langgraph.graph import StateGraph


async def main():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6380/0")
    saver = RedisSaver(redis_url, namespace="english_tutor_agent_test", ttl_seconds=3600)

    # Minimal graph: int -> add_one -> end
    g = StateGraph(int)
    g.add_node("add_one", lambda x: x + 1)
    g.set_entry_point("add_one")
    g.set_finish_point("add_one")
    app = g.compile(checkpointer=saver)

    thread_id = "redis_test_thread_1"
    config = {"configurable": {"thread_id": thread_id}}

    result = await app.ainvoke(1, config=config)
    assert result == 2

    # Verify a checkpoint exists in Redis for this thread
    ckpt = await saver.aget_tuple({"configurable": {"thread_id": thread_id}})
    assert ckpt is not None, "Expected RedisSaver to have stored a checkpoint"

    print("✅ RedisSaver test passed")
    print(f"   Latest checkpoint id: {ckpt.checkpoint['id']}")


if __name__ == "__main__":
    asyncio.run(main())


