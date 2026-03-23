# Workflow Design - LangGraph Workflows
## Thiết Kế Workflow - LangGraph Workflows

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Table of Contents

1. [Workflow Overview](#workflow-overview)
2. [Main Workflow](#main-workflow)
3. [Routing Logic](#routing-logic)
4. [State Transitions](#state-transitions)
5. [Checkpointing](#checkpointing)
6. [Error Handling](#error-handling)

---

## 🎯 Workflow Overview

### Workflow Types

1. **Main Tutor Workflow** - Primary conversation flow
2. **Grammar Check Workflow** - Grammar-focused flow
3. **Pronunciation Workflow** - Pronunciation practice flow
4. **Exercise Workflow** - Exercise generation flow

For now, we'll focus on the **Main Tutor Workflow** which handles routing.

---

## 🔄 Main Workflow

### Graph Structure

```
                    ┌─────────────┐
                    │ Entry Point │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Router    │
                    │    Agent    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐        ┌───▼────┐       ┌────▼────┐
   │  Tutor  │        │ Grammar│       │Pronun.  │
   │  Agent  │        │ Agent  │       │ Agent   │
   └────┬────┘        └───┬────┘       └────┬────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                  ┌────────▼────────┐
                  │ Response        │
                  │ Formatter       │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │ Pipeline Node   │
                  │ (TTS/STT)       │
                  └────────┬────────┘
                           │
                    ┌──────▼──────┐
                    │     END     │
                    └─────────────┘
```

### Code Implementation

```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver

# Import agents
from src.agents.router import router_agent
from src.agents.tutor import tutor_agent
from src.agents.grammar import grammar_agent
from src.agents.pronunciation import pronunciation_agent
from src.agents.exercise import exercise_agent
from src.agents.nodes.response_formatter import response_formatter_node
from src.agents.nodes.pipeline_node import pipeline_node

# Import state
from src.workflows.state import TutorState

def build_tutor_workflow() -> StateGraph:
    """
    Build the main tutor workflow
    """
    workflow = StateGraph(TutorState)
    
    # Add nodes
    workflow.add_node("router", router_agent)
    workflow.add_node("tutor", tutor_agent)
    workflow.add_node("grammar", grammar_agent)
    workflow.add_node("pronunciation", pronunciation_agent)
    workflow.add_node("exercise", exercise_agent)
    workflow.add_node("response_formatter", response_formatter_node)
    workflow.add_node("pipeline", pipeline_node)
    
    # Set entry point
    workflow.set_entry_point("router")
    
    # Add conditional edges from router
    workflow.add_conditional_edges(
        "router",
        route_to_agent,
        {
            "conversation": "tutor",
            "grammar": "grammar",
            "pronunciation": "pronunciation",
            "exercise": "exercise",
            "unknown": "tutor",  # Default fallback
        }
    )
    
    # All agents route to response formatter
    workflow.add_edge("tutor", "response_formatter")
    workflow.add_edge("grammar", "response_formatter")
    workflow.add_edge("pronunciation", "response_formatter")
    workflow.add_edge("exercise", "response_formatter")
    
    # Response formatter routes to pipeline
    workflow.add_edge("response_formatter", "pipeline")
    
    # Pipeline ends
    workflow.add_edge("pipeline", END)
    
    return workflow

def route_to_agent(state: TutorState) -> str:
    """
    Route to appropriate agent based on intent
    """
    intent = state.get("intent")
    
    # Validate intent
    valid_intents = ["conversation", "grammar", "pronunciation", "exercise"]
    
    if intent in valid_intents:
        return intent
    
    # Default fallback
    return "conversation"

# Compile workflow
def create_app():
    """
    Create compiled workflow application
    """
    workflow = build_tutor_workflow()
    
    # Setup checkpointer
    checkpointer = PostgresSaver.from_conn_string(
        os.getenv("DATABASE_URL")
    )
    
    # Compile
    app = workflow.compile(checkpointer=checkpointer)
    
    return app
```

---

## 🔀 Routing Logic

### Intent Detection

```python
def route_to_agent(state: TutorState) -> str:
    """
    Route based on detected intent
    """
    intent = state.get("intent")
    
    # If intent already set by router, use it
    if intent:
        return intent
    
    # Otherwise, analyze message
    last_message = state["messages"][-1].content
    intent = analyze_intent_fast(last_message)
    
    return intent or "conversation"

def analyze_intent_fast(message: str) -> str:
    """
    Fast intent analysis using keywords
    """
    message_lower = message.lower()
    
    # Grammar keywords
    if any(kw in message_lower for kw in ["grammar", "error", "correct", "wrong"]):
        return "grammar"
    
    # Pronunciation keywords
    if any(kw in message_lower for kw in ["pronunciation", "pronounce", "sound"]):
        return "pronunciation"
    
    # Exercise keywords
    if any(kw in message_lower for kw in ["exercise", "practice", "question"]):
        return "exercise"
    
    # Default to conversation
    return "conversation"
```

### Advanced Routing (LLM-based)

```python
def analyze_intent_llm(message: str) -> str:
    """
    Use LLM to analyze intent (more accurate)
    """
    prompt = f"""Analyze the user's message and determine intent.

Message: "{message}"

Respond with ONE word: conversation, grammar, pronunciation, or exercise.
"""
    
    response = ollama_service.chat([{"role": "user", "content": prompt}])
    intent = response.strip().lower()
    
    return intent if intent in ["conversation", "grammar", "pronunciation", "exercise"] else "conversation"
```

---

## 🔄 State Transitions

### State Flow Example

```python
# Initial state
state_0 = {
    "messages": [{"role": "user", "content": "Check my grammar"}],
    "conversation_id": "conv_123",
    "user_id": "user_456",
    "intent": None,
    "current_agent": None,
}

# After router
state_1 = {
    **state_0,
    "intent": "grammar",
    "current_agent": "grammar",
}

# After grammar agent
state_2 = {
    **state_1,
    "grammar_analysis": {...},
    "tutor_response": "I found...",
    "chunks": [...],
}

# After response formatter
state_3 = {
    **state_2,
    "chunks": [...],  # Formatted
    "metadata": {...},  # Updated
}

# After pipeline
state_4 = {
    **state_3,
    "chunks": [...],  # With TTS data
    "tts_status": "completed",
}
```

---

## 💾 Checkpointing

### Checkpoint Configuration

```python
from langgraph.checkpoint.postgres import PostgresSaver

# Create checkpointer
checkpointer = PostgresSaver.from_conn_string(
    os.getenv("DATABASE_URL")
)

# Compile with checkpointer
app = workflow.compile(checkpointer=checkpointer)

# Use with thread_id (conversation_id)
config = {
    "configurable": {
        "thread_id": conversation_id
    }
}

# Invoke (state is automatically saved)
result = app.invoke(initial_state, config=config)

# Resume later
next_state = app.invoke(next_input, config=config)  # Continues from checkpoint
```

### Checkpoint Benefits

1. **Resume workflows** - Continue interrupted conversations
2. **Debugging** - Inspect state at any point
3. **Recovery** - Recover from failures
4. **Audit** - Track state changes

---

## ⚠️ Error Handling

### Error Handling Strategy

```python
# In workflow definition
workflow.add_node("error_handler", error_handler_node)

# Add error edge
workflow.add_edge("error_handler", END)

# In each agent
def agent_node(state: TutorState) -> TutorState:
    try:
        # Process
        return process_state(state)
    except Exception as e:
        # Route to error handler
        return {
            **state,
            "error": str(e),
            "should_handle_error": True,
        }

# Conditional edge for errors
def should_handle_error(state: TutorState) -> str:
    if state.get("should_handle_error"):
        return "error_handler"
    return "continue"
```

### Error Handler Node

```python
def error_handler_node(state: TutorState) -> TutorState:
    """
    Handle errors gracefully
    """
    error = state.get("error", "Unknown error")
    
    # Log error
    logger.error(f"Workflow error: {error}")
    
    # Create user-friendly error message
    error_message = "I apologize, but I encountered an error. Please try again."
    
    return {
        **state,
        "tutor_response": error_message,
        "chunks": [{"text": error_message, "emotion": "apologetic"}],
        "tts_status": "failed",
        "error": error,
    }
```

---

## 📊 Workflow Execution

### Invocation

```python
# Initial invocation
initial_state = {
    "messages": [user_message],
    "conversation_id": "conv_123",
    "user_id": "user_456",
}

config = {"configurable": {"thread_id": "conv_123"}}

# Invoke workflow
result = app.invoke(initial_state, config=config)

# Get final state
final_chunks = result["chunks"]
final_response = result["tutor_response"]
```

### Streaming (Optional)

```python
# Stream workflow execution
for event in app.stream(initial_state, config=config):
    node_name = list(event.keys())[0]
    node_output = event[node_name]
    
    # Process intermediate states
    if node_name == "tutor":
        print(f"Tutor response: {node_output['tutor_response']}")
```

---

## 🔄 Workflow Variants

### 1. Simple Conversation Flow

For simple cases, skip routing:

```
Entry → Tutor → Response Formatter → Pipeline → End
```

### 2. Grammar-Focused Flow

Direct grammar path:

```
Entry → Grammar → Response Formatter → Pipeline → End
```

### 3. Parallel Processing (Future)

Process multiple agents in parallel:

```python
workflow.add_node("parallel_processing", parallel_agent_processor)

def parallel_agent_processor(state: TutorState) -> TutorState:
    """
    Run multiple agents in parallel
    """
    # Process grammar and pronunciation simultaneously
    grammar_result = grammar_agent(state)
    pronunciation_result = pronunciation_agent(state)
    
    # Combine results
    return combine_results(state, grammar_result, pronunciation_result)
```

---

## 📝 Workflow Configuration

### Configuration Options

```python
class WorkflowConfig:
    """Workflow configuration"""
    
    # Checkpointing
    enable_checkpointing: bool = True
    checkpoint_storage: str = "postgres"  # postgres, memory, redis
    
    # Routing
    use_llm_routing: bool = True  # Use LLM or keyword-based
    default_agent: str = "tutor"
    
    # Timeouts
    agent_timeout: int = 30  # seconds
    workflow_timeout: int = 120  # seconds
    
    # Error handling
    retry_on_error: bool = True
    max_retries: int = 2
```

---

## ✅ Next Steps

1. ✅ Workflow design (this document)
2. ⏳ Implement workflow builder
3. ⏳ Test workflow execution
4. ⏳ Add checkpointing
5. ⏳ Add error handling

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** 🚧 Design Phase

