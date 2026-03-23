# Quick Start Guide - Bắt Đầu Nhanh
## Hướng Dẫn Bắt Đầu Implementation

**Date:** 2025-01-XX  
**Status:** 🚀 Ready

---

## 📋 Overview

Quick guide to get started with implementation right away.

---

## 🚀 Step 1: Setup Project Structure

```bash
# Navigate to project root
cd D:\Works\source\novel-reader\english-tutor-agent

# Create project structure
mkdir -p src/agents src/workflows src/services src/models src/utils
mkdir -p tests tests/unit tests/integration tests/e2e
mkdir -p scripts config logs

# Create files
touch src/__init__.py
touch src/agents/__init__.py
touch src/workflows/__init__.py
touch src/services/__init__.py
touch src/models/__init__.py
touch tests/__init__.py
```

---

## 📦 Step 2: Create Requirements File

Create `requirements.txt`:

```txt
# LangGraph & LangChain
langgraph>=0.2.0
langchain>=0.3.0
langchain-core>=0.3.0

# API Framework
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
websockets>=13.0

# Database
asyncpg>=0.30.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0

# HTTP Client
httpx>=0.27.0
aiohttp>=3.10.0

# Configuration
pydantic>=2.9.0
pydantic-settings>=2.5.0
python-dotenv>=1.0.0

# Testing
pytest>=8.3.0
pytest-asyncio>=0.24.0
pytest-cov>=6.0.0

# Logging
structlog>=24.2.0

# Utilities
python-json-logger>=2.0.0
```

---

## 🔧 Step 3: Setup Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 🎯 Step 4: Create Minimal POC

### 4.1 Create State Schema

Create `src/models/state.py`:

```python
from typing import TypedDict, List, Optional, Literal
from langchain_core.messages import BaseMessage

class TutorState(TypedDict, total=False):
    """Minimal state schema for POC"""
    messages: List[BaseMessage]
    conversation_id: str
    user_id: str
    intent: Optional[str]
    tutor_response: Optional[str]
```

### 4.2 Create Simple Router

Create `src/agents/router.py`:

```python
def router_agent(state: TutorState) -> TutorState:
    """Simple keyword-based router"""
    last_message = state["messages"][-1].content.lower()
    
    if any(word in last_message for word in ["grammar", "grammatical", "error"]):
        intent = "grammar"
    elif any(word in last_message for word in ["pronunciation", "pronounce"]):
        intent = "pronunciation"
    elif any(word in last_message for word in ["exercise", "practice", "question"]):
        intent = "exercise"
    else:
        intent = "conversation"
    
    return {
        **state,
        "intent": intent,
    }
```

### 4.3 Create Simple Tutor Agent

Create `src/agents/tutor.py`:

```python
import httpx

async def tutor_agent(state: TutorState) -> TutorState:
    """Simple tutor agent calling Ollama"""
    messages = state["messages"]
    
    # Call Ollama
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:11434/api/chat",
            json={
                "model": "gemma3:12b",
                "messages": [
                    {"role": "user", "content": msg.content}
                    for msg in messages
                ],
            },
            timeout=60.0,
        )
        result = response.json()
        response_text = result["message"]["content"]
    
    return {
        **state,
        "tutor_response": response_text,
    }
```

### 4.4 Create Minimal Workflow

Create `src/workflows/tutor_workflow.py`:

```python
from langgraph.graph import StateGraph, END
from src.models.state import TutorState
from src.agents.router import router_agent
from src.agents.tutor import tutor_agent

def build_workflow():
    """Build minimal tutor workflow"""
    workflow = StateGraph(TutorState)
    
    # Add nodes
    workflow.add_node("router", router_agent)
    workflow.add_node("tutor", tutor_agent)
    
    # Set entry point
    workflow.set_entry_point("router")
    
    # Add edges
    workflow.add_edge("router", "tutor")
    workflow.add_edge("tutor", END)
    
    return workflow.compile()

# Create app instance
app = build_workflow()
```

### 4.5 Test POC

Create `tests/test_poc.py`:

```python
import pytest
from langchain_core.messages import HumanMessage
from src.workflows.tutor_workflow import app
from src.models.state import TutorState

@pytest.mark.asyncio
async def test_minimal_workflow():
    """Test minimal workflow"""
    initial_state: TutorState = {
        "messages": [HumanMessage(content="Hello")],
        "conversation_id": "test_conv",
        "user_id": "test_user",
    }
    
    config = {"configurable": {"thread_id": "test_conv"}}
    result = app.invoke(initial_state, config=config)
    
    assert "tutor_response" in result
    assert result["tutor_response"] is not None
```

Run test:
```bash
pytest tests/test_poc.py -v
```

---

## 🧪 Step 5: Run POC

Create `scripts/run_poc.py`:

```python
import asyncio
from langchain_core.messages import HumanMessage
from src.workflows.tutor_workflow import app
from src.models.state import TutorState

async def main():
    """Run POC"""
    initial_state: TutorState = {
        "messages": [HumanMessage(content="Hello, I want to practice English")],
        "conversation_id": "poc_conv",
        "user_id": "poc_user",
    }
    
    config = {"configurable": {"thread_id": "poc_conv"}}
    result = app.invoke(initial_state, config=config)
    
    print("Intent:", result.get("intent"))
    print("Response:", result.get("tutor_response"))

if __name__ == "__main__":
    asyncio.run(main())
```

Run:
```bash
python scripts/run_poc.py
```

---

## ✅ Success Criteria

You've successfully completed quick start if:
- ✅ Project structure created
- ✅ Dependencies installed
- ✅ POC workflow runs
- ✅ Router works
- ✅ Tutor agent responds
- ✅ Test passes

---

## 🔄 Next Steps

After POC works:
1. → Expand state schema (STATE_SCHEMA_DETAILED.md)
2. → Add checkpointer (DATABASE_SCHEMA.md)
3. → Add more agents (AGENT_DESIGN.md)
4. → Implement full workflow (WORKFLOW_DESIGN.md)

See [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for full roadmap.

---

**Document Version:** 1.0  
**Status:** ✅ Ready to Use

