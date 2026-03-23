"""
Test Response Formatter Agent
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.workflows.tutor_workflow import build_workflow


async def test_response_formatter():
    """Test Response Formatter agent"""
    print("\n" + "=" * 60)
    print("Response Formatter Agent Test")
    print("=" * 60 + "\n")
    
    app = build_workflow(use_memory_for_tests=True, require_async_checkpointer=True)
    
    # Test case 1: Tutor response
    print("Test 1: Formatting tutor response")
    print("-" * 60)
    
    state: TutorState = {
        "messages": [HumanMessage(content="Hello, how are you?")],
        "conversation_id": "test_formatter_1",
        "user_id": "test_user",
        "workflow_stage": "processing",
    }
    
    config = {"configurable": {"thread_id": state["conversation_id"]}}
    
    try:
        result = await app.ainvoke(state, config=config)
        
        print(f"✅ Workflow completed")
        print(f"   Current agent: {result.get('current_agent')}")
        print(f"   Workflow stage: {result.get('workflow_stage')}")
        print(f"   TTS status: {result.get('tts_status')}")
        print(f"   Chunks count: {len(result.get('chunks', []))}")
        print(f"   Has response: {bool(result.get('tutor_response'))}")
        
        if result.get('chunks'):
            print(f"\n   First chunk:")
            chunk = result['chunks'][0]
            print(f"     Text: {chunk.get('text', '')[:100]}...")
            print(f"     Emotion: {chunk.get('emotion')}")
            print(f"     Icon: {chunk.get('icon')}")
        
        if result.get('metadata'):
            print(f"\n   Metadata:")
            meta = result['metadata']
            print(f"     Agent: {meta.get('agent')}")
            print(f"     Intent: {meta.get('intent')}")
            print(f"     Chunk count: {meta.get('chunk_count')}")
            print(f"     Total length: {meta.get('total_text_length')}")
        
        print("\n✅ Test 1 PASSED\n")
        
    except Exception as e:
        print(f"❌ Test 1 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test case 2: Grammar response
    print("Test 2: Formatting grammar response")
    print("-" * 60)
    
    state2: TutorState = {
        "messages": [HumanMessage(content="Check my grammar: I go to school yesterday")],
        "conversation_id": "test_formatter_2",
        "user_id": "test_user",
        "workflow_stage": "processing",
    }
    
    config2 = {"configurable": {"thread_id": state2["conversation_id"]}}
    
    try:
        result2 = await app.ainvoke(state2, config=config2)
        
        print(f"✅ Workflow completed")
        print(f"   Current agent: {result2.get('current_agent')}")
        print(f"   Workflow stage: {result2.get('workflow_stage')}")
        print(f"   TTS status: {result2.get('tts_status')}")
        print(f"   Chunks count: {len(result2.get('chunks', []))}")
        print(f"   Has grammar analysis: {bool(result2.get('grammar_analysis'))}")
        
        if result2.get('grammar_analysis'):
            analysis = result2['grammar_analysis']
            print(f"   Errors found: {len(analysis.get('errors', []))}")
            print(f"   Score: {analysis.get('overall_score')}/100")
        
        print("\n✅ Test 2 PASSED\n")
        
    except Exception as e:
        print(f"❌ Test 2 FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print("=" * 60)
    print("✅ All Response Formatter tests passed!")
    print("=" * 60 + "\n")
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_response_formatter())
    sys.exit(0 if success else 1)

