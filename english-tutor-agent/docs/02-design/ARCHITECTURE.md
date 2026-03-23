# System Architecture - LangGraph Multi-Agent System
## Kiến Trúc Hệ Thống - Hệ Thống Multi-Agent LangGraph

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase  
**Framework:** LangGraph (Python)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Architecture](#component-architecture)
4. [LangGraph Workflow Design](#langgraph-workflow-design)
5. [Data Flow](#data-flow)
6. [Technology Stack](#technology-stack)
7. [File Structure](#file-structure)

---

## 🎯 Overview

### Current System Issues

**Existing System (english-tutor-app):**
- ✅ Single agent (Ollama Tutor) handles everything
- ❌ Hard to add new agents
- ❌ No workflow orchestration
- ❌ Manual state management
- ❌ Tight coupling

### New System Goals

**With LangGraph:**
- ✅ Multiple specialized agents
- ✅ Workflow orchestration
- ✅ Built-in state management
- ✅ Loose coupling
- ✅ Easy to extend

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/TS)                      │
│  - WebSocket client                                          │
│  - Real-time UI updates                                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/WebSocket
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              API Gateway (FastAPI/Python)                   │
│  - REST API endpoints                                        │
│  - WebSocket server                                          │
│  - Authentication                                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌─────▼────────┐
│ LangGraph    │ │  Services   │ │  Database    │
│ Workflow     │ │  Layer      │ │  (PostgreSQL)│
│ Engine       │ │             │ │              │
│              │ │ - Ollama    │ │ - Conversations│
│ - Router     │ │ - TTS       │ │ - Messages   │
│ - Tutor      │ │ - STT       │ │ - Chunks     │
│ - Grammar    │ │ - Memory    │ │ - Users      │
│ - Pronun.    │ │             │ │              │
│ - Exercise   │ │             │ │              │
└───────┬──────┘ └─────────────┘ └──────────────┘
        │
        │ State Management
        │
┌───────▼───────────────────────────────────────┐
│         LangGraph State & Checkpointer        │
│  - State persistence                           │
│  - Checkpointing                               │
│  - Resume workflows                            │
└───────────────────────────────────────────────┘
```

---

## 🧩 Component Architecture

### 1. LangGraph Workflow Layer

```
┌──────────────────────────────────────────────────┐
│           LangGraph Workflow Engine              │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐                                │
│  │ Entry Point  │                                │
│  └──────┬───────┘                                │
│         │                                         │
│  ┌──────▼────────┐                               │
│  │ Router Agent  │  (Intent Analysis)            │
│  └──────┬────────┘                               │
│         │                                         │
│    ┌────┴─────┬──────────┬──────────┬─────────┐ │
│    │          │          │          │         │ │
│ ┌──▼──┐  ┌───▼───┐  ┌───▼───┐  ┌──▼──┐  ┌──▼──┐│
│ │Tutor│  │Grammar│  │Pronun.│  │Exer-│  │Other││
│ │Agent│  │ Agent │  │ Agent │  │cise │  │Agent││
│ └──┬──┘  └───┬───┘  └───┬───┘  └──┬──┘  └──┬──┘│
│    │         │          │         │        │   │
│    └─────────┴──────────┴─────────┴────────┘   │
│                │                                 │
│         ┌──────▼───────┐                        │
│         │ Response     │                        │
│         │ Formatter    │                        │
│         └──────┬───────┘                        │
│                │                                 │
│         ┌──────▼───────┐                        │
│         │ Pipeline     │                        │
│         │ (TTS/STT)    │                        │
│         └──────┬───────┘                        │
│                │                                 │
│         ┌──────▼───────┐                        │
│         │ End Node     │                        │
│         └──────────────┘                        │
└──────────────────────────────────────────────────┘
```

### 2. Agent Components

Each agent is a **LangGraph Node** with:
- **Input:** State from previous node
- **Processing:** Agent-specific logic
- **Output:** Updated state

**Agent Structure:**
```python
def agent_node(state: TutorState) -> TutorState:
    """
    Process state and return updated state
    """
    # 1. Extract needed data from state
    # 2. Call service layer (Ollama, etc.)
    # 3. Process response
    # 4. Update state
    # 5. Return updated state
    return updated_state
```

### 3. Service Layer

Services remain **separate from agents**:
- **Ollama Service:** LLM calls
- **TTS Service:** Text-to-speech
- **STT Service:** Speech-to-text
- **Memory Service:** Conversation history
- **Database Service:** Data persistence

**Agent → Service Pattern:**
```
Agent Node → Service Call → Update State → Return
```

---

## 🔄 LangGraph Workflow Design

### State Schema

```python
from typing import TypedDict, List, Optional, Literal
from langchain_core.messages import BaseMessage

class TutorState(TypedDict):
    # Messages
    messages: List[BaseMessage]  # Conversation history
    
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
    chunks: List[dict]  # Structured response chunks
    tts_status: Literal["pending", "processing", "completed", "failed"]
    
    # Metadata
    metadata: dict
    error: Optional[str]
```

### Workflow Graph

```python
from langgraph.graph import StateGraph, END

# Create graph
workflow = StateGraph(TutorState)

# Add nodes (agents)
workflow.add_node("router", router_agent)
workflow.add_node("tutor", tutor_agent)
workflow.add_node("grammar", grammar_agent)
workflow.add_node("pronunciation", pronunciation_agent)
workflow.add_node("exercise", exercise_agent)
workflow.add_node("response_formatter", response_formatter_node)
workflow.add_node("pipeline", pipeline_node)

# Add edges
workflow.set_entry_point("router")

# Conditional routing
workflow.add_conditional_edges(
    "router",
    route_to_agent,  # Routing function
    {
        "conversation": "tutor",
        "grammar": "grammar",
        "pronunciation": "pronunciation",
        "exercise": "exercise",
        "unknown": "tutor",  # Default fallback
    }
)

# All agents go to response formatter
workflow.add_edge("tutor", "response_formatter")
workflow.add_edge("grammar", "response_formatter")
workflow.add_edge("pronunciation", "response_formatter")
workflow.add_edge("exercise", "response_formatter")

# Formatter goes to pipeline
workflow.add_edge("response_formatter", "pipeline")

# Pipeline ends
workflow.add_edge("pipeline", END)

# Compile with checkpointer
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver.from_conn_string(DB_URL)
app = workflow.compile(checkpointer=checkpointer)
```

### Routing Logic

```python
def route_to_agent(state: TutorState) -> str:
    """
    Route to appropriate agent based on intent
    """
    intent = state.get("intent")
    
    if not intent or intent == "unknown":
        # Analyze last message to determine intent
        last_message = state["messages"][-1].content
        intent = analyze_intent(last_message)
        state["intent"] = intent
    
    return intent
```

---

## 📊 Data Flow

### Request Flow

```
1. User sends message
   ↓
2. API Gateway receives request
   ↓
3. Save user message to database
   ↓
4. Create/load state
   {
     messages: [user_message],
     conversation_id: "conv_123",
     user_id: "user_456"
   }
   ↓
5. Invoke LangGraph workflow
   app.invoke(state, config={"configurable": {"thread_id": "conv_123"}})
   ↓
6. Router Agent analyzes intent
   ↓
7. Route to appropriate agent
   ↓
8. Agent processes (calls Ollama, services, etc.)
   ↓
9. Update state with response
   ↓
10. Response Formatter formats output
    ↓
11. Pipeline processes (TTS, etc.)
    ↓
12. Save to database
    ↓
13. Emit WebSocket events
    ↓
14. Return response to API Gateway
    ↓
15. Send to frontend
```

### State Flow

```
Initial State
  ↓
Router Node (adds intent)
  ↓
Agent Node (adds response)
  ↓
Response Formatter (adds chunks)
  ↓
Pipeline Node (adds TTS data)
  ↓
Final State → Database → WebSocket
```

---

## 🛠️ Technology Stack

### Core Framework
- **LangGraph** - Multi-agent orchestration
- **LangChain** - LLM integration, tools, memory
- **Python 3.11+** - Main language

### Backend Framework
- **FastAPI** - API framework (or keep Express)
- **WebSocket** - Real-time communication
- **PostgreSQL** - Database
- **SQLAlchemy** - ORM (optional)

### LLM & Services
- **Ollama** - LLM backend (gemma3:12b)
- **Coqui TTS** - Text-to-speech
- **Whisper** - Speech-to-text

### State Management
- **LangGraph Checkpointer** - State persistence
  - Options: Memory, PostgreSQL, Redis

### Development Tools
- **Poetry** or **pip** - Package management
- **pytest** - Testing
- **black** - Code formatting
- **mypy** - Type checking

---

## 📁 File Structure

### Proposed Structure

```
english-tutor-agent/
├── docs/
│   ├── 01-research/
│   ├── 02-design/
│   └── 03-implementation/
│
├── src/
│   ├── agents/              # LangGraph agents
│   │   ├── __init__.py
│   │   ├── router/
│   │   │   ├── __init__.py
│   │   │   └── router_agent.py
│   │   ├── tutor/
│   │   │   ├── __init__.py
│   │   │   └── tutor_agent.py
│   │   ├── grammar/
│   │   │   ├── __init__.py
│   │   │   └── grammar_agent.py
│   │   ├── pronunciation/
│   │   │   ├── __init__.py
│   │   │   └── pronunciation_agent.py
│   │   ├── exercise/
│   │   │   ├── __init__.py
│   │   │   └── exercise_agent.py
│   │   └── nodes/
│   │       ├── response_formatter.py
│   │       └── pipeline_node.py
│   │
│   ├── workflows/           # LangGraph workflows
│   │   ├── __init__.py
│   │   ├── tutor_workflow.py  # Main workflow
│   │   └── state.py           # State schema
│   │
│   ├── services/            # Service layer
│   │   ├── __init__.py
│   │   ├── ollama_service.py
│   │   ├── tts_service.py
│   │   ├── stt_service.py
│   │   ├── memory_service.py
│   │   └── database_service.py
│   │
│   ├── api/                 # API layer
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── conversations.py
│   │   │   └── agents.py
│   │   ├── websocket.py
│   │   └── main.py
│   │
│   ├── models/              # Data models
│   │   ├── __init__.py
│   │   ├── conversation.py
│   │   └── message.py
│   │
│   ├── utils/               # Utilities
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   └── config.py
│   │
│   └── config/              # Configuration
│       ├── __init__.py
│       └── settings.py
│
├── tests/
│   ├── agents/
│   ├── workflows/
│   └── services/
│
├── scripts/
│   └── setup.py
│
├── requirements.txt
├── pyproject.toml
└── README.md
```

### Integration với Existing System

```
english-tutor-app/
├── backend/          # Existing TypeScript backend
│   └── ...           # Keep for API gateway, auth, etc.
│
└── agent-service/    # NEW Python LangGraph service
    └── src/          # Structure above
```

**Communication:**
- TypeScript backend → Python agent service via HTTP/gRPC
- Or: Replace backend with Python FastAPI

---

## 🔌 Integration Points

### 1. API Integration

**Option A: Separate Service (Recommended)**
```
TypeScript Backend (API Gateway)
    ↓ HTTP/gRPC
Python Agent Service (LangGraph)
    ↓
Services (Ollama, TTS, etc.)
```

**Option B: Unified Backend**
```
FastAPI Backend
    ├── API Routes (TypeScript compatible)
    ├── LangGraph Workflows
    └── Services
```

### 2. Database Integration

- **Share PostgreSQL database**
- Python service reads/writes same tables
- Use SQLAlchemy or raw SQL

### 3. WebSocket Integration

- **Option A:** TypeScript backend forwards WebSocket
- **Option B:** Python service handles WebSocket directly

### 4. Service Integration

- **Ollama:** HTTP API (both can call)
- **TTS/STT:** HTTP API (both can call)
- **Memory:** Shared database or LangChain memory

---

## 🎯 Key Design Decisions

### 1. State Management
- **Decision:** Use LangGraph's built-in state management
- **Rationale:** Automatic checkpointing, resume capability
- **Implementation:** PostgreSQL checkpointer for production

### 2. Agent Isolation
- **Decision:** Each agent is a separate node
- **Rationale:** Easy to test, maintain, extend
- **Implementation:** Agents don't call each other directly

### 3. Service Layer Separation
- **Decision:** Keep services separate from agents
- **Rationale:** Reusability, testability
- **Implementation:** Agents call services, services don't know about agents

### 4. Workflow Compilation
- **Decision:** Compile workflow once, reuse
- **Rationale:** Performance, consistency
- **Implementation:** Compile in startup, cache compiled workflow

### 5. Error Handling
- **Decision:** Handle errors at node level
- **Rationale:** Isolated failures, easy debugging
- **Implementation:** Try-catch in each agent node, update state with errors

---

## 📈 Scalability Considerations

### 1. State Storage
- **Development:** Memory checkpointer
- **Production:** PostgreSQL checkpointer
- **Scale:** Can use Redis for high-volume

### 2. Agent Execution
- **Current:** Sequential execution (sufficient for now)
- **Future:** Parallel agent execution if needed

### 3. Workflow Instances
- **Current:** One workflow instance per conversation
- **Scale:** Stateless agents, state in checkpointer

### 4. Service Calls
- **Ollama:** Already handles concurrent requests
- **TTS/STT:** Queue-based processing (existing)

---

## ✅ Next Steps

1. ✅ Architecture design (this document)
2. ⏳ Agent design ([AGENT_DESIGN.md](./AGENT_DESIGN.md))
3. ⏳ Workflow design ([WORKFLOW_DESIGN.md](./WORKFLOW_DESIGN.md))
4. ⏳ Implementation guide ([../03-implementation/IMPLEMENTATION_GUIDE.md](../03-implementation/IMPLEMENTATION_GUIDE.md))

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** 🚧 Design Phase

