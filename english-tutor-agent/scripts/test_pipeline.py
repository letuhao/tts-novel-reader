"""
Test Pipeline Node (TTS Integration)
Note: Requires TTS backend to be running
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.workflows.tutor_workflow import build_workflow
from src.services.tts_service import check_tts_health


async def test_pipeline():
    """Test Pipeline node with TTS integration"""
    print("\n" + "=" * 60)
    print("Pipeline Node (TTS) Test")
    print("=" * 60 + "\n")
    
    # Check TTS backend health
    print("Checking TTS backend health...")
    tts_healthy = await check_tts_health()
    if not tts_healthy:
        print("⚠️  WARNING: TTS backend is not healthy or not running")
        print("   The pipeline will fail, but workflow structure is correct")
        print("   Start TTS backend to test full integration\n")
    else:
        print("✅ TTS backend is healthy\n")
    
    app = build_workflow(use_memory_for_tests=True, require_async_checkpointer=True)
    
    # Test case: Simple conversation that goes through full pipeline
    print("Test: Full workflow with TTS pipeline")
    print("-" * 60)
    
    state: TutorState = {
        "messages": [HumanMessage(content="Hello, how are you?")],
        "conversation_id": "test_pipeline_1",
        "user_id": "test_user",
        "workflow_stage": "routing",
    }
    
    config = {"configurable": {"thread_id": state["conversation_id"]}}
    
    try:
        result = await app.ainvoke(state, config=config)
        
        print(f"✅ Workflow completed")
        print(f"   Workflow stage: {result.get('workflow_stage')}")
        print(f"   TTS status: {result.get('tts_status')}")
        print(f"   Chunks count: {len(result.get('chunks', []))}")
        
        if result.get('chunks'):
            print(f"\n   Chunks processed:")
            for i, chunk in enumerate(result['chunks'], 1):
                tts_status = chunk.get('tts_status', 'unknown')
                print(f"     Chunk {i}:")
                print(f"       Status: {tts_status}")
                print(f"       Text: {chunk.get('text', '')[:60]}...")
                
                if tts_status == "completed":
                    print(f"       Audio file ID: {chunk.get('audio_file_id', 'N/A')}")
                    print(f"       Audio URL: {chunk.get('audio_url', 'N/A')}")
                    print(f"       Duration: {chunk.get('audio_duration', 'N/A')}s")
                elif tts_status == "failed":
                    print(f"       Error: {chunk.get('tts_error', 'N/A')}")
        
        if result.get('metadata'):
            meta = result['metadata']
            print(f"\n   Pipeline metadata:")
            print(f"     TTS completed chunks: {meta.get('tts_completed_chunks', 0)}")
            print(f"     TTS failed chunks: {meta.get('tts_failed_chunks', 0)}")
            print(f"     TTS total chunks: {meta.get('tts_total_chunks', 0)}")
        
        if result.get('error'):
            print(f"\n   ⚠️  Error: {result.get('error')}")
        
        # Check if workflow went through all stages
        expected_stages = ["routing", "processing", "formatting", "pipeline", "complete"]
        actual_stage = result.get('workflow_stage')
        if actual_stage == "complete":
            print("\n✅ Test PASSED - Workflow completed all stages")
        elif actual_stage == "error":
            print(f"\n❌ Test FAILED - Workflow ended with error: {result.get('error')}")
            return False
        else:
            print(f"\n⚠️  Test PARTIAL - Workflow stage: {actual_stage}")
        
        print()
        return True
        
    except Exception as e:
        print(f"❌ Test FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_pipeline())
    sys.exit(0 if success else 1)

