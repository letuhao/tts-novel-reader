# Testing Strategy - Detailed Design
## Chiến Lược Testing - Thiết Kế Chi Tiết

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Overview

Comprehensive testing strategy for LangGraph multi-agent system.

---

## 🧪 Testing Levels

### 1. Unit Tests

**Test individual agents:**
```python
def test_router_agent():
    state = create_test_state()
    result = router_agent(state)
    assert "intent" in result
    assert result["intent"] in ["conversation", "grammar", ...]

def test_tutor_agent():
    state = create_test_state()
    with patch('ollama_service.chat') as mock_chat:
        mock_chat.return_value = "Test response"
        result = tutor_agent(state)
        assert "tutor_response" in result
```

### 2. Integration Tests

**Test workflow execution:**
```python
def test_workflow_execution():
    workflow = build_tutor_workflow()
    app = workflow.compile()
    
    initial_state = {
        "messages": [HumanMessage(content="Hello")],
        "conversation_id": "test_conv",
        "user_id": "test_user",
    }
    
    result = app.invoke(initial_state)
    assert "chunks" in result
    assert len(result["chunks"]) > 0
```

### 3. End-to-End Tests

**Test full system:**
```python
def test_e2e_chat():
    # Test API endpoint
    response = client.post("/api/agents/chat", json={
        "message": "Hello",
        "conversation_id": "conv_123",
        "user_id": "user_456",
    })
    
    assert response.status_code == 200
    assert "chunks" in response.json()["data"]
```

---

## ✅ Testing Checklist

- [ ] Unit tests for each agent
- [ ] Integration tests for workflows
- [ ] E2E tests for API
- [ ] Error handling tests
- [ ] State validation tests
- [ ] Performance tests

---

**Document Version:** 1.0  
**Status:** 🚧 Design Phase

