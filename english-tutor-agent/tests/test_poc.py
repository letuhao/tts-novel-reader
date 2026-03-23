"""
POC Tests - Basic workflow tests
"""

import pytest
from langchain_core.messages import HumanMessage
from src.models.state import TutorState
from src.workflows.tutor_workflow import build_workflow


@pytest.mark.asyncio
async def test_workflow_builds():
    """Test that workflow builds successfully"""
    app = build_workflow()
    assert app is not None


@pytest.mark.asyncio
async def test_router_agent():
    """Test router agent"""
    from src.agents.router import router_agent
    
    state: TutorState = {
        "messages": [HumanMessage(content="I want to check my grammar")],
        "conversation_id": "test_conv",
        "user_id": "test_user",
    }
    
    result = router_agent(state)
    
    assert "intent" in result
    assert "current_agent" in result
    assert result["intent"] in ["conversation", "grammar", "pronunciation", "exercise", "vocabulary", "translation", "unknown"]
    assert result["current_agent"] == "tutor"  # All route to tutor in POC


@pytest.mark.skip(reason="Requires Ollama to be running")
@pytest.mark.asyncio
async def test_minimal_workflow():
    """Test minimal workflow execution (requires Ollama)"""
    app = build_workflow()
    
    initial_state: TutorState = {
        "messages": [HumanMessage(content="Hello, I want to learn English")],
        "conversation_id": "test_conv",
        "user_id": "test_user",
    }
    
    config = {"configurable": {"thread_id": "test_conv"}}
    result = app.invoke(initial_state, config=config)
    
    assert "tutor_response" in result or "error" in result
    assert "chunks" in result
    assert len(result.get("chunks", [])) > 0

