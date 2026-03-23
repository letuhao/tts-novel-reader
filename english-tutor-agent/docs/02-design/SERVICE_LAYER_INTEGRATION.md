# Service Layer Integration - Detailed Design
## Tích Hợp Service Layer - Thiết Kế Chi Tiết

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Overview

How agents interact with service layer (Ollama, TTS, STT, Memory, Database).

---

## 🏗️ Service Layer Architecture

### Service Layer Structure

```
Agent Node
    ↓
Service Interface (Abstraction)
    ↓
┌──────┴──────┬─────────────┬──────────┬──────────┐
│             │             │          │          │
Ollama     TTS Service   STT Service  Memory    Database
Service                                  Service  Service
    ↓             ↓           ↓         ↓         ↓
External APIs / Backends
```

### Service Interface Pattern

```python
from abc import ABC, abstractmethod

class OllamaServiceInterface(ABC):
    """Interface for Ollama service"""
    
    @abstractmethod
    def chat(self, messages: List[Message], **kwargs) -> str:
        """Chat with Ollama"""
        pass
    
    @abstractmethod
    def analyze_grammar(self, text: str) -> dict:
        """Analyze grammar"""
        pass

class OllamaService(OllamaServiceInterface):
    """Implementation"""
    def chat(self, messages, **kwargs):
        # Actual implementation
        pass
```

---

## 🔌 Service Integration Details

### 1. Ollama Service Integration

**Service Interface:**
```python
class OllamaService:
    def __init__(self, base_url: str, model: str):
        self.base_url = base_url
        self.model = model
    
    def chat(
        self,
        messages: List[Message],
        temperature: float = 0.7,
        **kwargs
    ) -> str:
        """Chat with Ollama"""
        # Implementation
    
    def tutor_conversation(
        self,
        messages: List[Message],
        structured: bool = True
    ) -> str:
        """Tutor conversation with structured output"""
        # Implementation
    
    def analyze_grammar(self, text: str) -> dict:
        """Analyze grammar"""
        # Implementation
```

**Agent Usage:**
```python
def tutor_agent(state: TutorState) -> TutorState:
    """Tutor agent using Ollama service"""
    ollama_service = get_ollama_service()
    
    # Prepare messages
    messages = state["messages"]
    
    # Call service
    response = ollama_service.tutor_conversation(
        messages=messages,
        structured=True
    )
    
    # Update state
    return {
        **state,
        "tutor_response": response,
    }
```

---

### 2. TTS Service Integration

**Service Interface:**
```python
class TTSService:
    def synthesize(
        self,
        text: str,
        voice: str = "default",
        **kwargs
    ) -> dict:
        """Synthesize speech"""
        return {
            "success": True,
            "file_id": "file_123",
            "duration": 3.2,
            "audio_data": bytes,  # Optional
        }
    
    def get_audio(self, file_id: str) -> bytes:
        """Get audio file"""
        pass
```

**Pipeline Node Usage:**
```python
def pipeline_node(state: TutorState) -> TutorState:
    """Pipeline node using TTS service"""
    tts_service = get_tts_service()
    chunks = state["chunks"]
    
    processed_chunks = []
    for chunk in chunks:
        try:
            # Generate TTS
            result = tts_service.synthesize(
                text=chunk["text"],
                voice=chunk.get("voice", "default")
            )
            
            # Update chunk
            processed_chunk = {
                **chunk,
                "audio_file_id": result["file_id"],
                "audio_duration": result["duration"],
                "tts_status": "completed",
            }
            
            processed_chunks.append(processed_chunk)
        except Exception as e:
            # Handle error
            processed_chunk = {
                **chunk,
                "tts_status": "failed",
                "error": str(e),
            }
            processed_chunks.append(processed_chunk)
    
    return {
        **state,
        "chunks": processed_chunks,
        "tts_status": "completed" if all(
            c.get("tts_status") == "completed" 
            for c in processed_chunks
        ) else "failed",
    }
```

---

### 3. STT Service Integration

**Service Interface:**
```python
class STTService:
    def transcribe(
        self,
        audio_data: bytes,
        language: str = "en",
        **kwargs
    ) -> dict:
        """Transcribe audio"""
        return {
            "text": "Transcribed text",
            "confidence": 0.95,
            "segments": [...],
        }
```

**Pronunciation Agent Usage:**
```python
def pronunciation_agent(state: TutorState) -> TutorState:
    """Pronunciation agent using STT service"""
    stt_service = get_stt_service()
    last_message = state["messages"][-1]
    
    # Check if audio available
    if has_audio_data(last_message):
        audio_data = extract_audio(last_message)
        
        # Transcribe
        transcription = stt_service.transcribe(audio_data)
        
        # Analyze pronunciation
        feedback = analyze_pronunciation(
            expected=last_message.content,
            actual=transcription["text"]
        )
        
        return {
            **state,
            "pronunciation_feedback": feedback,
        }
    
    # No audio - create practice plan
    return create_practice_plan(state)
```

---

### 4. Memory Service Integration

**Service Interface:**
```python
class MemoryService:
    def get_context(self, conversation_id: str) -> dict:
        """Get conversation context"""
        return {
            "messages": [...],
            "summary": "...",
            "key_points": [...],
        }
    
    def save_context(
        self,
        conversation_id: str,
        user_message: str,
        assistant_message: str
    ):
        """Save conversation context"""
        pass
```

**Agent Usage:**
```python
def tutor_agent(state: TutorState) -> TutorState:
    """Tutor agent using memory service"""
    memory_service = get_memory_service()
    conversation_id = state["conversation_id"]
    
    # Get context
    context = memory_service.get_context(conversation_id)
    
    # Prepare messages with context
    messages = prepare_messages_with_context(
        state["messages"],
        context
    )
    
    # Process...
    
    # Save context after response
    memory_service.save_context(
        conversation_id,
        state["messages"][-1].content,
        response
    )
    
    return update_state(state, {"tutor_response": response})
```

---

### 5. Database Service Integration

**Service Interface:**
```python
class DatabaseService:
    def save_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        **kwargs
    ) -> str:
        """Save message to database"""
        return "message_id"
    
    def save_chunks(
        self,
        message_id: str,
        chunks: List[dict]
    ):
        """Save chunks to database"""
        pass
    
    def get_conversation_history(
        self,
        conversation_id: str
    ) -> List[dict]:
        """Get conversation history"""
        pass
```

**Workflow Usage:**
```python
def save_to_database_node(state: TutorState) -> TutorState:
    """Save workflow results to database"""
    db_service = get_database_service()
    conversation_id = state["conversation_id"]
    
    # Save assistant message
    message_id = db_service.save_message(
        conversation_id=conversation_id,
        role="assistant",
        content=state["tutor_response"],
    )
    
    # Save chunks
    if state.get("chunks"):
        db_service.save_chunks(message_id, state["chunks"])
    
    return state
```

---

## 🔄 Service Call Patterns

### 1. Synchronous Calls

```python
def agent_node(state: TutorState) -> TutorState:
    """Synchronous service call"""
    service = get_service()
    result = service.call(data)  # Blocking
    return update_state(state, {"result": result})
```

### 2. Asynchronous Calls

```python
async def agent_node(state: TutorState) -> TutorState:
    """Asynchronous service call"""
    service = get_service()
    result = await service.call_async(data)  # Non-blocking
    return update_state(state, {"result": result})
```

### 3. Timeout Handling

```python
import asyncio

async def agent_node_with_timeout(state: TutorState) -> TutorState:
    """Service call with timeout"""
    service = get_service()
    
    try:
        result = await asyncio.wait_for(
            service.call_async(data),
            timeout=30.0
        )
        return update_state(state, {"result": result})
    except asyncio.TimeoutError:
        return handle_timeout(state)
```

### 4. Retry Pattern

```python
def agent_node_with_retry(state: TutorState) -> TutorState:
    """Service call with retry"""
    service = get_service()
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            result = service.call(data)
            return update_state(state, {"result": result})
        except TransientError as e:
            if attempt == max_retries - 1:
                return handle_error(state, e)
            time.sleep(2 ** attempt)  # Exponential backoff
```

---

## 🔌 Service Configuration

### Service Configuration Schema

```python
class ServiceConfig:
    """Service configuration"""
    
    ollama: OllamaConfig
    tts: TTSConfig
    stt: STTConfig
    memory: MemoryConfig
    database: DatabaseConfig

class OllamaConfig:
    base_url: str = "http://localhost:11434"
    model: str = "gemma3:12b"
    timeout: int = 60
    temperature: float = 0.7

class TTSConfig:
    backend_url: str = "http://localhost:11111"
    default_voice: str = "default"
    timeout: int = 30
```

### Service Factory

```python
class ServiceFactory:
    """Factory for creating services"""
    
    _ollama_service: Optional[OllamaService] = None
    _tts_service: Optional[TTSService] = None
    _stt_service: Optional[STTService] = None
    
    @classmethod
    def get_ollama_service(cls) -> OllamaService:
        """Get or create Ollama service"""
        if cls._ollama_service is None:
            config = get_config().ollama
            cls._ollama_service = OllamaService(
                base_url=config.base_url,
                model=config.model
            )
        return cls._ollama_service
    
    @classmethod
    def get_tts_service(cls) -> TTSService:
        """Get or create TTS service"""
        if cls._tts_service is None:
            config = get_config().tts
            cls._tts_service = TTSService(
                backend_url=config.backend_url
            )
        return cls._tts_service
```

---

## 🔒 Service Error Handling

### Service-Level Error Handling

```python
class ServiceError(Exception):
    """Base service error"""
    pass

class OllamaServiceError(ServiceError):
    """Ollama service error"""
    pass

class TTSServiceError(ServiceError):
    """TTS service error"""
    pass

def ollama_service_with_error_handling(state: TutorState) -> TutorState:
    """Service call with error handling"""
    try:
        service = get_ollama_service()
        result = service.chat(messages)
        return update_state(state, {"result": result})
    except OllamaServiceError as e:
        logger.error(f"Ollama service error: {e}")
        return {
            **state,
            "error": f"Ollama service error: {str(e)}",
            "error_agent": "tutor",
        }
```

---

## 📊 Service Monitoring

### Service Metrics

```python
class ServiceMetrics:
    """Track service performance"""
    
    def __init__(self):
        self.calls = 0
        self.successes = 0
        self.failures = 0
        self.total_time = 0.0
    
    def record_call(self, success: bool, duration: float):
        """Record service call"""
        self.calls += 1
        if success:
            self.successes += 1
        else:
            self.failures += 1
        self.total_time += duration
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        if self.calls == 0:
            return 0.0
        return self.successes / self.calls
    
    @property
    def avg_time(self) -> float:
        """Calculate average time"""
        if self.calls == 0:
            return 0.0
        return self.total_time / self.calls
```

---

## ✅ Service Integration Best Practices

### 1. **Service Abstraction**
- Use interfaces/abstract classes
- Don't depend on concrete implementations
- Easy to swap implementations

### 2. **Error Handling**
- Handle service errors at agent level
- Provide fallback strategies
- Log service errors

### 3. **Configuration**
- Externalize service configuration
- Use environment variables
- Support different environments

### 4. **Monitoring**
- Track service calls
- Monitor performance
- Alert on failures

### 5. **Testing**
- Mock services in tests
- Test error cases
- Test timeout scenarios

---

## ✅ Next Steps

1. ✅ Service integration design (this document)
2. ⏳ Implement service interfaces
3. ⏳ Implement service factories
4. ⏳ Add service error handling
5. ⏳ Add service monitoring
6. ⏳ Test service integration

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** ✅ Design Complete

