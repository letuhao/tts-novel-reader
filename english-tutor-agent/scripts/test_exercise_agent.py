"""
Test Exercise Agent
Quick test for exercise generation
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.workflows.tutor_workflow import build_workflow


async def test_exercise():
    """Test exercise agent"""
    print("Testing Exercise Agent\n")
    
    # Force MemorySaver for async tests: PostgresSaver currently doesn't implement async methods (aget_tuple, etc.)
    app = build_workflow(use_memory_for_tests=True, require_async_checkpointer=True)
    
    state: TutorState = {
        "messages": [HumanMessage(content="Give me a grammar exercise")],
        "conversation_id": "test_exercise",
        "user_id": "test",
    }
    
    config = {"configurable": {"thread_id": "test_exercise"}}
    result = await app.ainvoke(state, config=config)
    
    print(f"Intent: {result.get('intent')}")
    print(f"Agent: {result.get('current_agent')}")
    print(f"Has exercise data: {'exercise_data' in result}")
    
    if "exercise_data" in result:
        exercise = result["exercise_data"]
        print(f"\nExercise Type: {exercise.get('type')}")
        print(f"Topic: {exercise.get('topic')}")
        print(f"Level: {exercise.get('level')}")
        print(f"Question: {exercise.get('question')}")
        print(f"Options: {exercise.get('options')}")
        print(f"Correct Answer: {exercise.get('correct_answer')}")
        print("\n✓ Exercise agent working!")
    else:
        print("\n✗ Exercise data not found")


if __name__ == "__main__":
    asyncio.run(test_exercise())

