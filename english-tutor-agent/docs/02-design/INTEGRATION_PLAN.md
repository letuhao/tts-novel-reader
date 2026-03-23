# Integration Plan - Integrating LangGraph with Existing System
## Kế Hoạch Tích Hợp - Tích Hợp LangGraph với Hệ Thống Hiện Tại

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Overview

Plan for integrating new LangGraph-based agent system with existing English Tutor App.

---

## 🎯 Integration Strategy

### Option 1: Separate Python Service (Recommended)

```
TypeScript Backend (Existing)
    ↓ HTTP/gRPC
Python Agent Service (New - LangGraph)
    ↓
Services (Ollama, TTS, STT - Existing)
```

**Pros:**
- ✅ No changes to existing TypeScript code
- ✅ Clear separation of concerns
- ✅ Easy to test independently
- ✅ Can deploy separately

**Cons:**
- ⚠️ Additional service to maintain
- ⚠️ Network latency between services

### Option 2: Unified Python Backend

Replace TypeScript backend with FastAPI backend.

**Pros:**
- ✅ Single codebase
- ✅ No service communication overhead

**Cons:**
- ❌ Major rewrite required
- ❌ Lose existing TypeScript code

---

## 🔌 Integration Points

### 1. API Integration

**TypeScript Backend → Python Agent Service**

```python
# Python service endpoint
@app.post("/api/agents/chat")
async def chat(request: ChatRequest):
    # Invoke LangGraph workflow
    result = workflow_app.invoke(
        initial_state,
        config={"configurable": {"thread_id": request.conversation_id}}
    )
    return result
```

### 2. Database Integration

- **Share PostgreSQL database**
- Python service reads/writes same tables
- Use SQLAlchemy or asyncpg

### 3. WebSocket Integration

**Option A:** TypeScript backend forwards WebSocket  
**Option B:** Python service handles WebSocket directly

### 4. Service Integration

- **Ollama:** HTTP API (both can call)
- **TTS/STT:** HTTP API (both can call)
- **Memory:** Shared database

---

## 📅 Migration Timeline

### Phase 1: Setup (Week 1)
- Setup Python service structure
- Basic LangGraph workflow
- Test with simple agent

### Phase 2: Integration (Week 2)
- API integration
- Database integration
- Test end-to-end

### Phase 3: Agents (Week 3-4)
- Implement all agents
- Full workflow
- Testing

### Phase 4: Production (Week 5)
- Deployment
- Monitoring
- Optimization

---

**Document Version:** 1.0  
**Status:** 🚧 Design Phase

