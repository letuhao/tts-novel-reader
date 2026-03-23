"""
Test PostgreSQL Checkpointer
Verify PostgreSQL checkpointer is working
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.services.checkpointer import get_checkpointer
from src.workflows.tutor_workflow import build_workflow


async def test_postgres_checkpointer():
    """Test PostgreSQL checkpointer"""
    print("=" * 60)
    print("Testing PostgreSQL Checkpointer")
    print("=" * 60)
    
    # Check if PostgresSaver is available
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        print("\n✅ PostgresSaver package is installed")
    except ImportError:
        print("\n❌ PostgresSaver package not found")
        print("   Install with: pip install langgraph-checkpoint-postgres")
        return False
    
    # Get checkpointer
    print("\n1. Getting checkpointer...")
    checkpointer = get_checkpointer()
    checkpointer_type = type(checkpointer).__name__
    print(f"   Checkpointer type: {checkpointer_type}")
    
    if "Postgres" in checkpointer_type:
        print("   ✅ Using PostgreSQL checkpointer!")
    else:
        print("   ⚠️  Still using MemorySaver")
        print("   → Check DATABASE_URL in .env file")
        return False
    
    # Test workflow with PostgreSQL checkpointer
    print("\n2. Testing workflow with PostgreSQL checkpointer...")
    try:
        app = build_workflow()
        
        initial_state: TutorState = {
            "messages": [HumanMessage(content="Hello")],
            "conversation_id": "test_postgres_001",
            "user_id": "test_user",
            "workflow_stage": "routing",
        }
        
        config = {"configurable": {"thread_id": initial_state["conversation_id"]}}
        
        # Run workflow (sync). PostgresSaver currently doesn't implement async methods (aget_tuple, etc.),
        # so using ainvoke() will raise NotImplementedError.
        result = app.invoke(initial_state, config=config)
        
        if result.get("tutor_response"):
            print("   ✅ Workflow executed successfully")
            print("   ✅ State saved to PostgreSQL")
        else:
            print("   ⚠️  Workflow executed but no response")
        
        # Try to get state back (test persistence)
        print("\n3. Testing state retrieval...")
        try:
            current_state = app.get_state(config)
            if current_state:
                print("   ✅ State retrieved from PostgreSQL")
                print(f"   Values count: {len(current_state.values)}")
                return True
            else:
                print("   ⚠️  No state found")
                return False
        except Exception as e:
            print(f"   ⚠️  State retrieval failed: {e}")
            return False
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_postgres_checkpointer())
    print("\n" + "=" * 60)
    if success:
        print("✅ PostgreSQL Checkpointer Test: PASSED")
    else:
        print("❌ PostgreSQL Checkpointer Test: FAILED")
    print("=" * 60)
    sys.exit(0 if success else 1)

