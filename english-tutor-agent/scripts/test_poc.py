"""
Test POC Workflow
Simple script to test the minimal workflow
"""

import asyncio
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.workflows.tutor_workflow import build_workflow


async def test_poc():
    """Test POC workflow"""
    print("=" * 50)
    print("Testing POC Workflow")
    print("=" * 50)
    
    # Build workflow
    print("\n1. Building workflow...")
    app = build_workflow()
    print("   ✓ Workflow built successfully")
    
    # Create initial state
    print("\n2. Creating initial state...")
    initial_state: TutorState = {
        "messages": [HumanMessage(content="Hello, I want to learn English grammar")],
        "conversation_id": "test_conv_001",
        "user_id": "test_user",
        "workflow_stage": "routing",
    }
    print(f"   ✓ State created: conversation_id={initial_state['conversation_id']}")
    
    # Test router only
    print("\n3. Testing router agent...")
    from src.agents.router import router_agent
    router_result = router_agent(initial_state)
    print(f"   ✓ Router result:")
    print(f"     - Intent: {router_result.get('intent')}")
    print(f"     - Agent: {router_result.get('current_agent')}")
    print(f"     - Confidence: {router_result.get('routing_confidence')}")
    
    # Check if Ollama is available
    print("\n4. Checking Ollama availability...")
    import httpx
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{ollama_url}/api/tags")
            if response.status_code == 200:
                print(f"   ✓ Ollama is available at {ollama_url}")
                run_full_workflow = True
            else:
                print(f"   ✗ Ollama returned status {response.status_code}")
                run_full_workflow = False
    except Exception as e:
        print(f"   ✗ Cannot connect to Ollama: {e}")
        print(f"   → Skipping full workflow test")
        run_full_workflow = False
    
    # Test full workflow (if Ollama is available)
    if run_full_workflow:
        print("\n5. Testing full workflow...")
        try:
            config = {"configurable": {"thread_id": initial_state["conversation_id"]}}
            result = app.invoke(initial_state, config=config)
            
            print(f"   ✓ Workflow completed:")
            print(f"     - Intent: {result.get('intent')}")
            print(f"     - Agent: {result.get('current_agent')}")
            print(f"     - Has response: {bool(result.get('tutor_response'))}")
            print(f"     - Chunks: {len(result.get('chunks', []))}")
            
            if result.get('error'):
                print(f"     - Error: {result.get('error')}")
            else:
                response_preview = result.get('tutor_response', '')[:100]
                print(f"     - Response preview: {response_preview}...")
        except Exception as e:
            print(f"   ✗ Workflow error: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("\n5. Skipping full workflow test (Ollama not available)")
        print("   → To test full workflow, ensure Ollama is running:")
        print("     ollama serve")
        print("     ollama pull gemma3:12b")
    
    print("\n" + "=" * 50)
    print("POC Test Complete")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(test_poc())

