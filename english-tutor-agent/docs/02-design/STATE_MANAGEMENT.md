# State Management - LangGraph State & Checkpointing
## Quản Lý State - LangGraph State & Checkpointing

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Overview

LangGraph uses **stateful workflows** where state is passed between nodes and persisted via checkpointing.

---

## 🏗️ State Schema

```python
from typing import TypedDict, List, Optional, Literal
from langchain_core.messages import BaseMessage

class TutorState(TypedDict):
    """
    Main state schema for tutor workflow
    """
    # Messages
    messages: List[BaseMessage]
    
    # Conversation Info
    conversation_id: str
    user_id: str
    
    # Routing
    intent: Optional[Literal[
        "conversation",
        "grammar",
        "pronunciation",
        "exercise",
        "vocabulary",
        "unknown"
    ]]
    current_agent: Optional[str]
    
    # Agent Responses
    tutor_response: Optional[str]
    grammar_analysis: Optional[dict]
    pronunciation_feedback: Optional[dict]
    exercise_data: Optional[dict]
    
    # Pipeline Data
    chunks: List[dict]
    tts_status: Literal["pending", "processing", "completed", "failed"]
    
    # Metadata
    metadata: dict
    error: Optional[str]
```

---

## 💾 Checkpointing

### Checkpointer Types

1. **Memory Checkpointer** - For development/testing
2. **PostgreSQL Checkpointer** - For production
3. **Redis Checkpointer** - For high-volume

### Implementation

```python
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.memory import MemorySaver

# Production: PostgreSQL
checkpointer = PostgresSaver.from_conn_string(DATABASE_URL)

# Development: Memory
checkpointer = MemorySaver()

# Compile with checkpointer
app = workflow.compile(checkpointer=checkpointer)
```

---

## 🔄 State Updates

State is **immutable** - each node returns a **new state**:

```python
def agent_node(state: TutorState) -> TutorState:
    # Create new state (don't mutate)
    return {
        **state,  # Copy existing state
        "new_field": "new_value",  # Add/update fields
    }
```

---

**Document Version:** 1.0  
**Status:** 🚧 Design Phase

