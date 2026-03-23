"""
Test Grammar Agent
Test the grammar agent functionality
"""

import asyncio
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.workflows.tutor_workflow import build_workflow


async def test_grammar_agent():
    """Test grammar agent"""
    print("=" * 60)
    print("Testing Grammar Agent")
    print("=" * 60)
    
    # Build workflow
    print("\n1. Building workflow...")
    # Force MemorySaver for async tests: PostgresSaver currently doesn't implement async methods (aget_tuple, etc.)
    app = build_workflow(use_memory_for_tests=True, require_async_checkpointer=True)
    print("   ✓ Workflow built")
    
    # Test cases
    test_cases = [
        ("I go to school yesterday", "grammar"),  # Tense error
        ("She don't like apples", "grammar"),  # Subject-verb agreement
        ("Hello, how are you?", "conversation"),  # No grammar check needed
    ]
    
    for i, (message, expected_intent) in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: '{message}'")
        
        initial_state: TutorState = {
            "messages": [HumanMessage(content=message)],
            "conversation_id": f"test_grammar_{i}",
            "user_id": "test_user",
            "workflow_stage": "routing",
        }
        
        config = {"configurable": {"thread_id": initial_state["conversation_id"]}}
        
        try:
            result = await app.ainvoke(initial_state, config=config)
            
            intent = result.get("intent")
            agent = result.get("current_agent")
            has_grammar_analysis = "grammar_analysis" in result
            has_response = bool(result.get("tutor_response"))
            
            print(f"   Intent: {intent}")
            print(f"   Agent: {agent}")
            print(f"   Has grammar analysis: {has_grammar_analysis}")
            print(f"   Has response: {has_response}")
            
            if has_grammar_analysis:
                analysis = result["grammar_analysis"]
                error_count = len(analysis.get("errors", []))
                score = analysis.get("overall_score", 0)
                print(f"   Errors found: {error_count}")
                print(f"   Score: {score}/100")
                
                if error_count > 0:
                    print(f"   First error: {analysis['errors'][0].get('type', 'N/A')}")
                    print(f"   Correction: {analysis['errors'][0].get('correction', 'N/A')}")
            
            if has_response:
                response_preview = result.get("tutor_response", "")[:150]
                print(f"   Response preview: {response_preview}...")
            
            print(f"   ✓ Test {i} complete")
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print("Grammar Agent Test Complete")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_grammar_agent())

