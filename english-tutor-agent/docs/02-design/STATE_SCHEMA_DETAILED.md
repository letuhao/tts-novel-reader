# State Schema - Detailed Design
## Chi Tiết State Schema

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Overview

Detailed specification of the state schema used in LangGraph workflows.

---

## 🏗️ Complete State Schema

```python
from typing import TypedDict, List, Optional, Literal, Dict, Any
from langchain_core.messages import BaseMessage
from datetime import datetime

class TutorState(TypedDict, total=False):
    """
    Complete state schema for English Tutor workflow
    
    Note: TypedDict with total=False means all fields are optional
    We'll validate required fields in each node
    """
    
    # ==================== Messages ====================
    messages: List[BaseMessage]
    """
    Conversation history as LangChain messages
    - HumanMessage: User messages
    - AIMessage: Assistant responses
    - SystemMessage: System prompts
    """
    
    # ==================== Conversation Info ====================
    conversation_id: str
    """Unique conversation identifier"""
    
    user_id: str
    """User identifier"""
    
    # ==================== Routing ====================
    intent: Optional[Literal[
        "conversation",
        "grammar",
        "pronunciation",
        "exercise",
        "vocabulary",
        "translation",
        "unknown"
    ]]
    """Detected user intent"""
    
    current_agent: Optional[str]
    """Current agent processing the request"""
    
    previous_agent: Optional[str]
    """Previous agent (for debugging)"""
    
    routing_confidence: Optional[float]
    """Confidence score of intent detection (0.0 - 1.0)"""
    
    # ==================== Agent Responses ====================
    tutor_response: Optional[str]
    """Full response from tutor agent"""
    
    grammar_analysis: Optional[Dict[str, Any]]
    """
    Grammar analysis result:
    {
        "errors": [...],
        "corrected_text": "...",
        "overall_score": 85,
        "feedback": "..."
    }
    """
    
    pronunciation_feedback: Optional[Dict[str, Any]]
    """
    Pronunciation feedback:
    {
        "accuracy": 0.9,
        "issues": [...],
        "feedback": "...",
        "suggestions": [...]
    }
    """
    
    exercise_data: Optional[Dict[str, Any]]
    """
    Exercise data:
    {
        "type": "multiple-choice",
        "question": "...",
        "options": [...],
        "correct_answer": "...",
        "explanation": "..."
    }
    """
    
    # ==================== Pipeline Data ====================
    chunks: List[Dict[str, Any]]
    """
    Structured response chunks:
    [
        {
            "text": "...",
            "emotion": "happy",
            "icon": "😊",
            "pause": 0.5,
            "emphasis": false,
            "audio_file_id": "...",
            "audio_duration": 3.2,
            "tts_status": "completed"
        }
    ]
    """
    
    tts_status: Optional[Literal["pending", "processing", "completed", "failed"]]
    """Overall TTS processing status"""
    
    audio_data: Optional[Dict[str, Any]]
    """
    Audio data for chunks:
    {
        "chunk_0": base64_audio_data,
        "chunk_1": base64_audio_data
    }
    """
    
    # ==================== Metadata ====================
    metadata: Dict[str, Any]
    """
    Additional metadata:
    {
        "source": "structured" | "fallback",
        "agent": "tutor",
        "intent": "conversation",
        "timestamp": "2025-01-XX...",
        "processing_time": 1.2,
        "model": "gemma3:12b",
        "temperature": 0.7
    }
    """
    
    # ==================== Error Handling ====================
    error: Optional[str]
    """Error message if processing failed"""
    
    error_stack: Optional[str]
    """Error stack trace for debugging"""
    
    error_agent: Optional[str]
    """Agent where error occurred"""
    
    retry_count: Optional[int]
    """Number of retry attempts"""
    
    # ==================== Control Flow ====================
    should_continue: Optional[bool]
    """Whether to continue workflow"""
    
    should_retry: Optional[bool]
    """Whether to retry current step"""
    
    workflow_stage: Optional[Literal[
        "routing",
        "processing",
        "formatting",
        "pipeline",
        "complete",
        "error"
    ]]
    """Current stage of workflow"""
    
    # ==================== Performance Tracking ====================
    timestamps: Optional[Dict[str, float]]
    """
    Performance timestamps:
    {
        "start": 1234567890.0,
        "routing": 1234567891.0,
        "agent_start": 1234567892.0,
        "agent_end": 1234567895.0,
        "pipeline_start": 1234567896.0,
        "pipeline_end": 1234567900.0,
        "end": 1234567901.0
    }
    """
    
    performance_metrics: Optional[Dict[str, Any]]
    """
    Performance metrics:
    {
        "total_time": 2.1,
        "routing_time": 0.1,
        "agent_time": 3.0,
        "pipeline_time": 4.0,
        "tokens_used": 500,
        "api_calls": 3
    }
    """
```

---

## 🔍 Field Details

### Messages Field

```python
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

# Example state messages
state = {
    "messages": [
        SystemMessage(content="You are an English tutor..."),
        HumanMessage(content="Hello, I want to practice grammar"),
        AIMessage(content="Great! Let's practice grammar..."),
        HumanMessage(content="Check this: I go to school yesterday"),
    ]
}
```

**Usage:**
- Agents read from `messages` to get context
- Agents append to `messages` when responding
- LangChain memory can use `messages` directly

---

### Intent Field

```python
# Valid intents
intent: Literal[
    "conversation",    # General conversation
    "grammar",         # Grammar checking
    "pronunciation",   # Pronunciation practice
    "exercise",        # Exercise generation
    "vocabulary",      # Vocabulary questions
    "translation",     # Translation requests
    "unknown"          # Unknown intent (fallback)
]
```

**Routing Logic:**
```python
def route_to_agent(state: TutorState) -> str:
    intent = state.get("intent", "unknown")
    
    routing_map = {
        "conversation": "tutor",
        "grammar": "grammar",
        "pronunciation": "pronunciation",
        "exercise": "exercise",
        "vocabulary": "tutor",  # Handled by tutor
        "translation": "tutor",  # Handled by tutor
        "unknown": "tutor",  # Default fallback
    }
    
    return routing_map.get(intent, "tutor")
```

---

### Chunks Field

```python
chunks: List[Dict[str, Any]] = [
    {
        # Required fields
        "text": "Hello, how are you?",
        "emotion": "happy",  # happy, encouraging, neutral, excited, calm
        "icon": "😊",
        "pause": 0.5,  # Pause duration in seconds (0.0 - 2.0)
        "emphasis": False,
        
        # TTS fields (added by pipeline)
        "audio_file_id": "file_123",
        "audio_duration": 3.2,  # Duration in seconds
        "tts_status": "completed",  # pending, processing, completed, failed
        "audio_data": "base64_encoded_audio",  # Optional, for WebSocket
        
        # Metadata
        "chunk_index": 0,
        "timestamp": "2025-01-XXT...",
    }
]
```

**Chunk Structure:**
- **text:** The actual text content
- **emotion:** Emotional tone
- **icon:** Emoji for UI
- **pause:** Pause after this chunk
- **emphasis:** Whether to emphasize
- **audio_***:** Audio-related fields (added by pipeline)

---

### Metadata Field

```python
metadata: Dict[str, Any] = {
    # Response source
    "source": "structured",  # structured, fallback
    
    # Agent info
    "agent": "tutor",
    "intent": "conversation",
    
    # Processing info
    "timestamp": "2025-01-XXT10:30:00Z",
    "processing_time": 1.2,
    "model": "gemma3:12b",
    "temperature": 0.7,
    
    # Response info
    "total_chunks": 3,
    "estimated_duration": 10.5,
    "tone": "friendly",
    "language": "en",
    
    # Additional context
    "conversation_length": 10,
    "user_level": "B1",
}
```

---

## 🔄 State Transitions

### State Lifecycle

```
1. Initial State
   {
       messages: [user_message],
       conversation_id: "conv_123",
       user_id: "user_456",
       workflow_stage: "routing"
   }
   ↓
2. After Router
   {
       ...initial_state,
       intent: "grammar",
       current_agent: "grammar",
       routing_confidence: 0.95,
       workflow_stage: "processing"
   }
   ↓
3. After Agent
   {
       ...state,
       grammar_analysis: {...},
       tutor_response: "...",
       chunks: [...],
       workflow_stage: "formatting"
   }
   ↓
4. After Formatter
   {
       ...state,
       chunks: [...],  # Formatted
       metadata: {...},  # Updated
       workflow_stage: "pipeline"
   }
   ↓
5. After Pipeline
   {
       ...state,
       chunks: [...],  # With TTS data
       tts_status: "completed",
       workflow_stage: "complete"
   }
```

---

## ✅ State Validation

### Required Fields by Stage

**Initial State (required):**
- `messages` (at least 1 message)
- `conversation_id`
- `user_id`

**After Router (required):**
- `intent`
- `current_agent`

**After Agent (required):**
- `tutor_response` OR agent-specific response
- `chunks`

**After Pipeline (required):**
- `tts_status`
- `chunks` (with TTS data)

### Validation Functions

```python
def validate_initial_state(state: TutorState) -> bool:
    """Validate initial state"""
    required = ["messages", "conversation_id", "user_id"]
    return all(key in state and state[key] for key in required)

def validate_after_router(state: TutorState) -> bool:
    """Validate state after router"""
    return "intent" in state and "current_agent" in state

def validate_after_agent(state: TutorState) -> bool:
    """Validate state after agent"""
    return "chunks" in state and len(state["chunks"]) > 0

def validate_after_pipeline(state: TutorState) -> bool:
    """Validate state after pipeline"""
    return "tts_status" in state and state["tts_status"] in [
        "pending", "processing", "completed", "failed"
    ]
```

---

## 🔒 State Immutability

### Best Practice: Immutable Updates

```python
# ✅ Good: Create new state
def agent_node(state: TutorState) -> TutorState:
    return {
        **state,  # Copy all fields
        "new_field": "value",  # Add/update field
    }

# ❌ Bad: Mutate state
def agent_node(state: TutorState) -> TutorState:
    state["new_field"] = "value"  # DON'T DO THIS
    return state
```

### Helper Functions

```python
def update_state(state: TutorState, updates: Dict[str, Any]) -> TutorState:
    """Helper to update state immutably"""
    return {**state, **updates}

def add_message(state: TutorState, message: BaseMessage) -> TutorState:
    """Add message to state"""
    return {
        **state,
        "messages": state["messages"] + [message]
    }

def add_chunk(state: TutorState, chunk: Dict[str, Any]) -> TutorState:
    """Add chunk to state"""
    return {
        **state,
        "chunks": state.get("chunks", []) + [chunk]
    }
```

---

## 💾 State Persistence

### Checkpointing Schema

LangGraph uses checkpointer to persist state. The state is serialized and stored:

```python
# State is automatically serialized by LangGraph
# Stored in PostgreSQL (or other checkpointer backend)

# Load state
config = {"configurable": {"thread_id": conversation_id}}
current_state = app.get_state(config)

# State includes:
# - All state fields
# - Metadata (checkpoint version, timestamp)
# - Parent checkpoint reference
```

### State Serialization

- **JSON serializable** fields are stored as-is
- **BaseMessage** objects are serialized by LangChain
- **Complex objects** should be JSON-serializable

---

## 📊 State Examples

### Example 1: Grammar Check Request

```python
initial_state = {
    "messages": [
        HumanMessage(content="Check my grammar: I go to school yesterday")
    ],
    "conversation_id": "conv_123",
    "user_id": "user_456",
}

# After router
state_after_router = {
    **initial_state,
    "intent": "grammar",
    "current_agent": "grammar",
    "routing_confidence": 0.98,
    "workflow_stage": "processing",
}

# After grammar agent
state_after_agent = {
    **state_after_router,
    "grammar_analysis": {
        "errors": [
            {
                "type": "tense",
                "position": 15,
                "correction": "went",
                "explanation": "Past tense required"
            }
        ],
        "corrected_text": "I went to school yesterday",
        "overall_score": 75,
        "feedback": "You need to use past tense 'went' instead of 'go'"
    },
    "tutor_response": "I found a grammar error...",
    "chunks": [
        {
            "text": "I found a grammar error in your sentence.",
            "emotion": "encouraging",
            "icon": "📝",
            "pause": 0.5,
            "emphasis": False
        }
    ],
    "workflow_stage": "formatting",
}
```

### Example 2: Conversation Request

```python
initial_state = {
    "messages": [
        HumanMessage(content="Tell me about English grammar")
    ],
    "conversation_id": "conv_456",
    "user_id": "user_789",
}

# After router
state_after_router = {
    **initial_state,
    "intent": "conversation",
    "current_agent": "tutor",
    "routing_confidence": 0.85,
}

# After tutor agent
state_after_agent = {
    **state_after_router,
    "tutor_response": "English grammar is the structure of the English language...",
    "chunks": [
        {
            "text": "English grammar is the structure of the English language.",
            "emotion": "neutral",
            "icon": "📚",
            "pause": 0.5,
        },
        {
            "text": "It includes rules for forming sentences...",
            "emotion": "encouraging",
            "icon": "✨",
            "pause": 0.3,
        }
    ],
}
```

---

## 🎯 State Design Principles

### 1. **Immutability**
- Always return new state
- Never mutate existing state
- Use spread operator (`**state`)

### 2. **Type Safety**
- Use TypedDict for structure
- Validate types in nodes
- Use type hints

### 3. **Minimal Required Fields**
- Only require fields needed for next step
- Make optional fields truly optional
- Validate required fields in nodes

### 4. **Clear Structure**
- Group related fields
- Use descriptive names
- Document field purposes

### 5. **Extensibility**
- Use Dict[str, Any] for extensibility
- Don't lock in schema too early
- Allow metadata for custom data

---

## ✅ Next Steps

1. ✅ State schema defined (this document)
2. ⏳ Implement state validation
3. ⏳ Test state transitions
4. ⏳ Document state examples

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** ✅ Design Complete

