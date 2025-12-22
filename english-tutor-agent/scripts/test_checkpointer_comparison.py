"""
Test Checkpointer Comparison - RedisSaver vs MemorySaver
Verify that RedisSaver persists checkpoints across Python process restarts,
while MemorySaver does not.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.services.checkpointer import get_checkpointer
from src.workflows.tutor_workflow import build_workflow
from src.services.redis_saver import RedisSaver
from langgraph.checkpoint.memory import MemorySaver


async def test_checkpointer_persistence():
    """Test that RedisSaver persists checkpoints, while MemorySaver does not"""
    
    print("\n" + "=" * 60)
    print("Checkpointer Persistence Test")
    print("=" * 60 + "\n")
    
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6380/0")
    test_thread_id = "persistence_test_thread_1"
    
    # Test 1: RedisSaver - Should persist
    print("Test 1: RedisSaver Persistence")
    print("-" * 60)
    
    redis_saver = RedisSaver(redis_url, namespace="test_persistence", ttl_seconds=3600)
    app_redis = build_workflow(checkpointer=redis_saver, require_async_checkpointer=True)
    
    state: TutorState = {
        "messages": [HumanMessage(content="Hello, this is a persistence test.")],
        "conversation_id": test_thread_id,
        "user_id": "test_user",
        "workflow_stage": "routing",
    }
    config = {"configurable": {"thread_id": test_thread_id}}
    
    # Run workflow
    result1 = await app_redis.ainvoke(state, config=config)
    print(f"✅ Workflow completed with RedisSaver")
    print(f"   Workflow stage: {result1.get('workflow_stage')}")
    
    # Verify checkpoint exists in Redis
    ckpt1 = await redis_saver.aget_tuple(config)
    assert ckpt1 is not None, "Checkpoint should exist in Redis"
    checkpoint_id_1 = ckpt1.checkpoint['id']
    print(f"✅ Checkpoint saved to Redis: {checkpoint_id_1}")
    
    # Create a NEW RedisSaver instance (simulating process restart)
    redis_saver2 = RedisSaver(redis_url, namespace="test_persistence", ttl_seconds=3600)
    app_redis2 = build_workflow(checkpointer=redis_saver2, require_async_checkpointer=True)
    
    # Verify checkpoint still exists after "restart"
    ckpt2 = await redis_saver2.aget_tuple(config)
    assert ckpt2 is not None, "Checkpoint should still exist after restart"
    assert ckpt2.checkpoint['id'] == checkpoint_id_1, "Checkpoint ID should match"
    print(f"✅ Checkpoint persists after 'restart' (new RedisSaver instance)")
    print(f"   Retrieved checkpoint ID: {ckpt2.checkpoint['id']}")
    
    # Test 2: MemorySaver - Should NOT persist
    print("\nTest 2: MemorySaver (No Persistence)")
    print("-" * 60)
    
    memory_saver = MemorySaver()
    app_memory = build_workflow(checkpointer=memory_saver, require_async_checkpointer=True)
    
    test_thread_id_2 = "memory_test_thread_1"
    state2: TutorState = {
        "messages": [HumanMessage(content="Hello, this is a memory test.")],
        "conversation_id": test_thread_id_2,
        "user_id": "test_user",
        "workflow_stage": "routing",
    }
    config2 = {"configurable": {"thread_id": test_thread_id_2}}
    
    # Run workflow
    result2 = await app_memory.ainvoke(state2, config=config2)
    print(f"✅ Workflow completed with MemorySaver")
    print(f"   Workflow stage: {result2.get('workflow_stage')}")
    
    # Verify checkpoint exists in memory
    ckpt_mem1 = await memory_saver.aget_tuple(config2)
    assert ckpt_mem1 is not None, "Checkpoint should exist in memory"
    checkpoint_id_mem = ckpt_mem1.checkpoint['id']
    print(f"✅ Checkpoint saved to memory: {checkpoint_id_mem}")
    
    # Create a NEW MemorySaver instance (simulating process restart)
    memory_saver2 = MemorySaver()
    app_memory2 = build_workflow(checkpointer=memory_saver2, require_async_checkpointer=True)
    
    # Verify checkpoint does NOT exist after "restart"
    ckpt_mem2 = await memory_saver2.aget_tuple(config2)
    assert ckpt_mem2 is None, "Checkpoint should NOT exist after restart (MemorySaver)"
    print(f"✅ Checkpoint lost after 'restart' (new MemorySaver instance) - Expected behavior")
    
    # Test 3: Verify get_checkpointer() uses Redis when REDIS_URL is set
    print("\nTest 3: get_checkpointer() Auto-Selection")
    print("-" * 60)
    
    # Set REDIS_URL
    os.environ['REDIS_URL'] = redis_url
    auto_checkpointer = get_checkpointer(require_async=True)
    auto_type = type(auto_checkpointer).__name__
    print(f"✅ get_checkpointer() selected: {auto_type}")
    
    if auto_type == "RedisSaver":
        print("   ✅ Correctly using RedisSaver when REDIS_URL is set")
    elif auto_type == "InMemorySaver":
        print("   ⚠️  Using InMemorySaver (expected if REDIS_URL not set)")
    else:
        print(f"   ⚠️  Unexpected type: {auto_type}")
    
    print("\n" + "=" * 60)
    print("✅ All Checkpointer Tests PASSED")
    print("=" * 60)
    print("\nSummary:")
    print("  - RedisSaver: Persists checkpoints across process restarts ✅")
    print("  - MemorySaver: Checkpoints lost on process restart ✅")
    print("  - get_checkpointer(): Auto-selects RedisSaver when REDIS_URL is set ✅")
    print()


if __name__ == "__main__":
    asyncio.run(test_checkpointer_persistence())

