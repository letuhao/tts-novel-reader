# Error Handling Strategy - Detailed Design
## Chiến Lược Xử Lý Lỗi - Thiết Kế Chi Tiết

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Overview

Comprehensive error handling strategy for LangGraph multi-agent system.

---

## 🎯 Error Handling Principles

### 1. **Fail Gracefully**
- Don't crash entire workflow
- Provide user-friendly error messages
- Log errors for debugging

### 2. **Error Context**
- Track where error occurred (agent, node)
- Include relevant state information
- Preserve error stack traces

### 3. **Recovery Strategies**
- Retry transient errors
- Fallback to default agent
- Continue workflow if possible

### 4. **User Experience**
- Don't expose technical errors to users
- Provide actionable feedback
- Maintain conversation flow

---

## 🏗️ Error Handling Architecture

### Error Flow

```
Agent Node
    ↓
Try Processing
    ↓
Success? → Update State → Continue
    ↓ No
Catch Exception
    ↓
Classify Error
    ↓
┌──────┴──────┬─────────────┬──────────┐
│             │             │          │
Transient   Permanent    Timeout    Validation
Error       Error        Error      Error
    ↓             ↓           ↓         ↓
Retry        Fallback    Timeout   Validation
             Handler     Handler   Handler
    ↓             ↓           ↓         ↓
Update State with Error Info
    ↓
Continue or Stop Workflow
```

---

## ⚠️ Error Types

### 1. Transient Errors

**Definition:** Temporary errors that might succeed on retry

**Examples:**
- Network timeouts
- Rate limiting
- Temporary service unavailability
- Database connection issues

**Handling:**
```python
def agent_node(state: TutorState) -> TutorState:
    max_retries = 3
    retry_count = state.get("retry_count", 0)
    
    try:
        result = process(state)
        return update_state(state, {"result": result, "retry_count": 0})
    except TransientError as e:
        if retry_count < max_retries:
            logger.warn(f"Transient error, retrying ({retry_count + 1}/{max_retries})")
            return {
                **state,
                "error": None,  # Clear previous error
                "retry_count": retry_count + 1,
                "should_retry": True,
            }
        else:
            return handle_permanent_error(state, e)
```

### 2. Permanent Errors

**Definition:** Errors that won't succeed on retry

**Examples:**
- Invalid input
- Authentication failures
- Invalid API keys
- Malformed data

**Handling:**
```python
def agent_node(state: TutorState) -> TutorState:
    try:
        result = process(state)
        return update_state(state, {"result": result})
    except PermanentError as e:
        logger.error(f"Permanent error in {agent_name}: {e}")
        return {
            **state,
            "error": str(e),
            "error_agent": agent_name,
            "workflow_stage": "error",
            "should_continue": False,
        }
```

### 3. Timeout Errors

**Definition:** Operations that take too long

**Examples:**
- LLM API timeout
- TTS generation timeout
- Database query timeout

**Handling:**
```python
import asyncio

async def agent_node_with_timeout(state: TutorState, timeout: int = 30) -> TutorState:
    try:
        result = await asyncio.wait_for(
            process_async(state),
            timeout=timeout
        )
        return update_state(state, {"result": result})
    except asyncio.TimeoutError:
        logger.error(f"Timeout in {agent_name}")
        return {
            **state,
            "error": f"Operation timed out after {timeout}s",
            "error_agent": agent_name,
            "workflow_stage": "error",
        }
```

### 4. Validation Errors

**Definition:** Invalid state or input

**Examples:**
- Missing required fields
- Invalid data types
- Out of range values

**Handling:**
```python
def agent_node(state: TutorState) -> TutorState:
    # Validate input
    if not validate_state(state):
        error_msg = "Invalid state: missing required fields"
        logger.error(f"Validation error: {error_msg}")
        return {
            **state,
            "error": error_msg,
            "error_agent": agent_name,
            "workflow_stage": "error",
        }
    
    try:
        result = process(state)
        return update_state(state, {"result": result})
    except Exception as e:
        return handle_error(state, e)
```

---

## 🛠️ Error Handling Implementation

### Error Handler Node

```python
def error_handler_node(state: TutorState) -> TutorState:
    """
    Centralized error handler node
    """
    error = state.get("error")
    error_agent = state.get("error_agent", "unknown")
    
    if not error:
        return state  # No error to handle
    
    logger.error(f"Error in {error_agent}: {error}")
    
    # Create user-friendly error message
    user_message = create_user_friendly_error(error, error_agent)
    
    # Update state with error response
    return {
        **state,
        "tutor_response": user_message,
        "chunks": [
            {
                "text": user_message,
                "emotion": "apologetic",
                "icon": "😔",
                "pause": 0.5,
                "emphasis": False,
            }
        ],
        "tts_status": "failed",
        "workflow_stage": "complete",  # Complete with error
    }

def create_user_friendly_error(error: str, agent: str) -> str:
    """Create user-friendly error message"""
    # Map technical errors to user messages
    error_messages = {
        "timeout": "I apologize, but the request took too long. Please try again.",
        "network": "I'm having trouble connecting. Please check your internet and try again.",
        "invalid_input": "I didn't understand that. Could you please rephrase?",
        "service_unavailable": "The service is temporarily unavailable. Please try again later.",
        "default": "I apologize, but I encountered an error. Please try again or rephrase your question.",
    }
    
    # Try to match error type
    error_lower = error.lower()
    for key, message in error_messages.items():
        if key in error_lower:
            return message
    
    return error_messages["default"]
```

### Error Classification

```python
class ErrorClassifier:
    """Classify errors into categories"""
    
    @staticmethod
    def classify(error: Exception) -> str:
        """Classify error type"""
        error_name = type(error).__name__
        error_msg = str(error).lower()
        
        # Transient errors
        if any(keyword in error_msg for keyword in [
            "timeout", "connection", "temporary", "rate limit", "retry"
        ]):
            return "transient"
        
        # Permanent errors
        if any(keyword in error_msg for keyword in [
            "invalid", "authentication", "authorization", "not found", "malformed"
        ]):
            return "permanent"
        
        # Validation errors
        if "validation" in error_msg or "required" in error_msg:
            return "validation"
        
        # Default to permanent
        return "permanent"

def handle_error(state: TutorState, error: Exception) -> TutorState:
    """Handle error based on classification"""
    error_type = ErrorClassifier.classify(error)
    
    error_info = {
        "error": str(error),
        "error_type": error_type,
        "error_agent": state.get("current_agent", "unknown"),
        "error_stack": traceback.format_exc(),
    }
    
    if error_type == "transient":
        return handle_transient_error(state, error_info)
    elif error_type == "permanent":
        return handle_permanent_error(state, error_info)
    else:
        return handle_unknown_error(state, error_info)
```

---

## 🔄 Error Recovery Strategies

### 1. Retry Strategy

```python
def agent_node_with_retry(state: TutorState, max_retries: int = 3) -> TutorState:
    """Agent node with automatic retry"""
    retry_count = state.get("retry_count", 0)
    
    if retry_count >= max_retries:
        return handle_permanent_error(state, "Max retries exceeded")
    
    try:
        result = process(state)
        # Success - clear retry count
        return update_state(state, {
            "result": result,
            "retry_count": 0,
            "error": None,
        })
    except TransientError as e:
        # Retry
        wait_time = calculate_backoff(retry_count)
        logger.info(f"Retrying after {wait_time}s (attempt {retry_count + 1}/{max_retries})")
        
        return {
            **state,
            "error": str(e),
            "retry_count": retry_count + 1,
            "should_retry": True,
            "retry_after": wait_time,
        }

def calculate_backoff(retry_count: int, base_delay: float = 1.0) -> float:
    """Exponential backoff"""
    return base_delay * (2 ** retry_count)
```

### 2. Fallback Strategy

```python
def agent_node_with_fallback(state: TutorState) -> TutorState:
    """Agent node with fallback to default agent"""
    try:
        result = process(state)
        return update_state(state, {"result": result})
    except Exception as e:
        logger.error(f"Error in {agent_name}, falling back to tutor agent")
        
        # Fallback to tutor agent
        return {
            **state,
            "error": str(e),
            "current_agent": "tutor",  # Fallback
            "intent": "conversation",  # Default intent
            "should_continue": True,  # Continue with fallback
        }
```

### 3. Circuit Breaker Pattern

```python
class CircuitBreaker:
    """Circuit breaker for service calls"""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half-open
    
    def call(self, func, *args, **kwargs):
        """Call function with circuit breaker"""
        if self.state == "open":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "half-open"
            else:
                raise CircuitBreakerOpenError("Circuit breaker is open")
        
        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise
    
    def on_success(self):
        """Reset on success"""
        self.failure_count = 0
        self.state = "closed"
    
    def on_failure(self):
        """Track failure"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"

# Usage
circuit_breaker = CircuitBreaker()

def agent_node(state: TutorState) -> TutorState:
    try:
        result = circuit_breaker.call(ollama_service.chat, messages)
        return update_state(state, {"result": result})
    except CircuitBreakerOpenError:
        return handle_service_unavailable(state)
```

---

## 📊 Error State Updates

### Error State Schema

```python
# Error state fields
{
    "error": "Error message",
    "error_type": "transient" | "permanent" | "timeout" | "validation",
    "error_agent": "agent_name",
    "error_stack": "Stack trace",
    "retry_count": 0,
    "should_retry": False,
    "should_continue": True,
    "workflow_stage": "error",
    "tts_status": "failed",
}
```

### Updating State with Errors

```python
def add_error_to_state(
    state: TutorState,
    error: Exception,
    agent_name: str,
    error_type: str = "permanent"
) -> TutorState:
    """Add error information to state"""
    return {
        **state,
        "error": str(error),
        "error_type": error_type,
        "error_agent": agent_name,
        "error_stack": traceback.format_exc(),
        "workflow_stage": "error",
        "tts_status": "failed",
    }
```

---

## 🔍 Error Monitoring

### Error Logging

```python
import logging

logger = logging.getLogger(__name__)

def log_error(state: TutorState, error: Exception, context: dict = None):
    """Log error with context"""
    logger.error(
        {
            "error": str(error),
            "error_type": type(error).__name__,
            "agent": state.get("error_agent"),
            "conversation_id": state.get("conversation_id"),
            "user_id": state.get("user_id"),
            "workflow_stage": state.get("workflow_stage"),
            "context": context or {},
        },
        exc_info=error
    )
```

### Error Metrics

```python
# Track error metrics
error_metrics = {
    "total_errors": 0,
    "errors_by_agent": {},
    "errors_by_type": {},
    "error_rate": 0.0,
}

def track_error(state: TutorState, error: Exception):
    """Track error metrics"""
    agent = state.get("error_agent", "unknown")
    error_type = ErrorClassifier.classify(error)
    
    error_metrics["total_errors"] += 1
    error_metrics["errors_by_agent"][agent] = error_metrics["errors_by_agent"].get(agent, 0) + 1
    error_metrics["errors_by_type"][error_type] = error_metrics["errors_by_type"].get(error_type, 0) + 1
```

---

## 🔄 Workflow Error Handling

### Conditional Error Routing

```python
# In workflow definition
workflow.add_node("error_handler", error_handler_node)

# Conditional edge for errors
def should_handle_error(state: TutorState) -> str:
    """Determine if error should be handled"""
    if state.get("error") and state.get("workflow_stage") == "error":
        return "error_handler"
    return "continue"

workflow.add_conditional_edges(
    "any_node",
    should_handle_error,
    {
        "error_handler": "error_handler",
        "continue": "next_node",
    }
)
```

### Error Propagation

```python
def agent_node(state: TutorState) -> TutorState:
    """Agent node with error handling"""
    try:
        result = process(state)
        return update_state(state, {"result": result})
    except Exception as e:
        # Log error
        log_error(state, e)
        
        # Update state with error
        error_state = add_error_to_state(state, e, "agent_name")
        
        # Decide whether to continue
        if should_continue_on_error(error_state, e):
            # Continue with error info
            return {
                **error_state,
                "should_continue": True,
            }
        else:
            # Stop workflow
            return {
                **error_state,
                "should_continue": False,
                "workflow_stage": "error",
            }

def should_continue_on_error(state: TutorState, error: Exception) -> bool:
    """Determine if workflow should continue after error"""
    error_type = ErrorClassifier.classify(error)
    
    # Continue on transient errors (will retry)
    if error_type == "transient":
        return True
    
    # Stop on permanent errors
    return False
```

---

## ✅ Error Handling Best Practices

### 1. **Always Handle Exceptions**
```python
# ✅ Good
try:
    result = risky_operation()
except Exception as e:
    return handle_error(state, e)

# ❌ Bad
result = risky_operation()  # Can crash workflow
```

### 2. **Provide Context**
```python
# ✅ Good
return {
    **state,
    "error": str(e),
    "error_agent": agent_name,
    "error_context": {"input": state.get("messages")[-1]},
}

# ❌ Bad
return {"error": "Error"}  # No context
```

### 3. **User-Friendly Messages**
```python
# ✅ Good
user_message = "I apologize, but I encountered an error. Please try again."

# ❌ Bad
user_message = f"Error: {traceback.format_exc()}"  # Too technical
```

### 4. **Log for Debugging**
```python
# ✅ Good
logger.error(f"Error in {agent_name}", exc_info=e, extra={
    "state": state,
    "context": context,
})

# ❌ Bad
print(f"Error: {e}")  # Not logged properly
```

### 5. **Test Error Cases**
```python
# Test error handling
def test_agent_error_handling():
    state = create_test_state()
    
    # Simulate error
    with patch('agent.process', side_effect=Exception("Test error")):
        result = agent_node(state)
        
        assert "error" in result
        assert result["workflow_stage"] == "error"
```

---

## 📋 Error Handling Checklist

- [ ] All agent nodes have try-catch blocks
- [ ] Errors are classified (transient/permanent)
- [ ] User-friendly error messages
- [ ] Error logging with context
- [ ] Error metrics tracking
- [ ] Retry logic for transient errors
- [ ] Fallback strategies
- [ ] Error state validation
- [ ] Error recovery testing
- [ ] Error documentation

---

## ✅ Next Steps

1. ✅ Error handling strategy defined (this document)
2. ⏳ Implement error handlers
3. ⏳ Add error classification
4. ⏳ Implement retry logic
5. ⏳ Add error monitoring
6. ⏳ Test error scenarios

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** ✅ Design Complete

