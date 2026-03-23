"""
Tutor Workflow - Main LangGraph Workflow
Minimal POC workflow: Router → Tutor → End
"""

"""
Tutor Workflow - Main LangGraph Workflow
Minimal POC workflow: Router → Tutor → End
"""

import logging
from langgraph.graph import StateGraph, END
from src.models.state import TutorState
from src.agents.router import router_agent
from src.agents.router_llm import router_agent_llm
from src.agents.router_hybrid import router_agent_hybrid
from src.agents.tutor import tutor_agent
from src.agents.grammar import grammar_agent
from src.agents.exercise import exercise_agent
from src.agents.pronunciation import pronunciation_agent
from src.agents.vocabulary import vocabulary_agent
from src.agents.translation import translation_agent
from src.agents.response_formatter import response_formatter_agent
from src.agents.pipeline import pipeline_agent
from src.services.checkpointer import get_checkpointer
from src.config import get_settings

logger = logging.getLogger(__name__)


def build_workflow(
    checkpointer=None,
    router_mode: str = None,
    use_memory_for_tests: bool = False,
    require_async_checkpointer: bool = False,
):
    """
    Build the tutor workflow
    
    Args:
        checkpointer: Optional checkpointer for state persistence.
                     If None, uses checkpointer from settings.
        router_mode: Router mode ("keyword", "llm", "hybrid"). 
                     If None, uses from settings.
        use_memory_for_tests: Force use MemorySaver for tests
        require_async_checkpointer: Require async-capable checkpointer (for ainvoke/astream)
        
    Returns:
        Compiled LangGraph workflow
    """
    # Get router mode from settings if not provided
    if router_mode is None:
        settings = get_settings()
        router_mode = settings.router_mode
    
    # Select router function based on mode
    if router_mode == "llm":
        router_func = router_agent_llm
        logger.info("Using LLM-based router")
    elif router_mode == "hybrid":
        router_func = router_agent_hybrid
        logger.info("Using hybrid router (keyword + LLM)")
    else:
        router_func = router_agent
        logger.info("Using keyword-based router")
    
    # Create workflow graph
    workflow = StateGraph(TutorState)
    
    # Add nodes
    # Note: LangGraph can handle both sync and async nodes
    workflow.add_node("router", router_func)
    workflow.add_node("tutor", tutor_agent)
    workflow.add_node("grammar", grammar_agent)
    workflow.add_node("exercise", exercise_agent)
    workflow.add_node("pronunciation", pronunciation_agent)
    workflow.add_node("vocabulary", vocabulary_agent)
    workflow.add_node("translation", translation_agent)
    workflow.add_node("response_formatter", response_formatter_agent)
    workflow.add_node("pipeline", pipeline_agent)
    
    # Set entry point
    workflow.set_entry_point("router")
    
    # Conditional routing based on intent
    def route_after_router(state: TutorState) -> str:
        """Route to appropriate agent based on intent"""
        intent = state.get("intent", "conversation")
        
        if intent == "grammar":
            return "grammar"
        elif intent == "exercise":
            return "exercise"
        elif intent == "pronunciation":
            return "pronunciation"
        elif intent == "vocabulary":
            return "vocabulary"
        elif intent == "translation":
            return "translation"
        else:
            return "tutor"
    
    # Add conditional edges from router
    workflow.add_conditional_edges(
        "router",
        route_after_router,
        {
            "grammar": "grammar",
            "exercise": "exercise",
            "pronunciation": "pronunciation",
            "vocabulary": "vocabulary",
            "translation": "translation",
            "tutor": "tutor",
        }
    )
    
    # Add edges: all agents → response_formatter → pipeline → end
    # All agent responses go through formatter and TTS pipeline
    workflow.add_edge("grammar", "response_formatter")
    workflow.add_edge("exercise", "response_formatter")
    workflow.add_edge("pronunciation", "response_formatter")
    workflow.add_edge("vocabulary", "response_formatter")
    workflow.add_edge("translation", "response_formatter")
    workflow.add_edge("tutor", "response_formatter")
    workflow.add_edge("response_formatter", "pipeline")
    workflow.add_edge("pipeline", END)
    
    # Get checkpointer if not provided
    if checkpointer is None:
        # If callers intend to use app.ainvoke()/astream(), require an async-capable checkpointer.
        # PostgresSaver in current versions may not implement async methods.
        checkpointer = get_checkpointer(
            force_memory=use_memory_for_tests,
            require_async=require_async_checkpointer,
        )
    
    # Pass checkpointer through directly.
    # Note: PostgresSaver.from_conn_string returns a context manager; LangGraph can handle
    # context managers passed into compile() and will enter/exit them appropriately.
    app = workflow.compile(checkpointer=checkpointer)
    
    logger.info(f"Tutor workflow built successfully with {type(checkpointer).__name__}")
    
    return app


# Create default app instance (for testing)
# Use MemorySaver by default to avoid PostgresSaver async issues in tests
app = build_workflow(use_memory_for_tests=True)

