# API Design - Detailed Design
## Thiết Kế API - Thiết Kế Chi Tiết

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Overview

API design for LangGraph agent service integration with existing system.

---

## 🔌 API Endpoints

### 1. Chat Endpoint

**POST** `/api/agents/chat`

**Request:**
```json
{
  "message": "Check my grammar: I go to school yesterday",
  "conversation_id": "conv_123",
  "user_id": "user_456",
  "options": {
    "voice": "default",
    "use_websocket": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation_id": "conv_123",
    "chunks": [
      {
        "text": "I found a grammar error...",
        "emotion": "encouraging",
        "icon": "📝",
        "pause": 0.5,
        "audio_file_id": "file_123",
        "tts_status": "completed"
      }
    ],
    "metadata": {
      "agent": "grammar",
      "intent": "grammar",
      "processing_time": 1.2
    }
  }
}
```

**Implementation:**
```python
@app.post("/api/agents/chat")
async def chat(request: ChatRequest):
    """Chat endpoint"""
    # Create initial state
    initial_state = {
        "messages": [HumanMessage(content=request.message)],
        "conversation_id": request.conversation_id,
        "user_id": request.user_id,
    }
    
    # Invoke workflow
    config = {"configurable": {"thread_id": request.conversation_id}}
    result = workflow_app.invoke(initial_state, config=config)
    
    # Return response
    return {
        "success": True,
        "data": {
            "conversation_id": request.conversation_id,
            "chunks": result["chunks"],
            "metadata": result["metadata"],
        }
    }
```

---

### 2. Stream Endpoint (WebSocket)

**WebSocket** `/api/agents/stream`

**Message Format:**
```json
{
  "type": "chunk:update",
  "data": {
    "chunk_index": 0,
    "chunk": {
      "text": "...",
      "tts_status": "completed",
      "audio_file_id": "file_123"
    }
  }
}
```

---

## 📊 API Models

```python
from pydantic import BaseModel
from typing import Optional, Dict, Any

class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: str
    options: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None
```

---

## ✅ Next Steps

1. ✅ API design (this document)
2. ⏳ Implement API endpoints
3. ⏳ Add validation
4. ⏳ Add error handling
5. ⏳ Test API

---

**Document Version:** 1.0  
**Status:** 🚧 Design Phase

