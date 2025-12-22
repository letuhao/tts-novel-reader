# Agent Design - LangGraph Agents
## Thiết Kế Agents - LangGraph Agents

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Table of Contents

1. [Agent Overview](#agent-overview)
2. [Agent Architecture](#agent-architecture)
3. [Individual Agent Designs](#individual-agent-designs)
4. [Agent Communication](#agent-communication)
5. [Error Handling](#error-handling)

---

## 🎯 Agent Overview

### Agent Types

1. **Router Agent** - Intent analysis and routing
2. **Tutor Agent** - General conversation
3. **Grammar Agent** - Grammar checking and correction
4. **Pronunciation Agent** - Pronunciation practice and feedback
5. **Exercise Agent** - Exercise generation
6. **Response Formatter** - Format responses for pipeline
7. **Pipeline Node** - TTS/STT processing

---

## 🏗️ Agent Architecture

### Common Agent Pattern

All agents follow this pattern:

```python
from typing import TypedDict
from langgraph.graph import StateGraph

def agent_node(state: TutorState) -> TutorState:
    """
    Standard agent node pattern
    """
    try:
        # 1. Extract input from state
        input_data = extract_input(state)
        
        # 2. Validate input
        if not validate_input(input_data):
            return add_error(state, "Invalid input")
        
        # 3. Call service layer
        result = service_layer.process(input_data)
        
        # 4. Process result
        processed = process_result(result)
        
        # 5. Update state
        updated_state = update_state(state, processed)
        
        # 6. Log
        logger.info(f"Agent {agent_name} completed")
        
        return updated_state
        
    except Exception as e:
        logger.error(f"Agent {agent_name} error: {e}")
        return add_error(state, str(e))

def add_error(state: TutorState, error: str) -> TutorState:
    """Add error to state"""
    return {
        **state,
        "error": error,
        "tts_status": "failed"
    }
```

---

## 🤖 Individual Agent Designs

### 1. Router Agent

**Purpose:** Analyze user intent and route to appropriate agent

**Input:**
- `state.messages` - Last user message
- `state.conversation_id` - Conversation context

**Processing:**
```python
def router_agent(state: TutorState) -> TutorState:
    """
    Analyze intent and set routing information
    """
    last_message = state["messages"][-1].content
    
    # Analyze intent using Ollama
    intent = analyze_intent(last_message)
    
    # Determine agent
    agent_map = {
        "conversation": "tutor",
        "grammar": "grammar",
        "pronunciation": "pronunciation",
        "exercise": "exercise",
        "vocabulary": "vocabulary",
    }
    
    current_agent = agent_map.get(intent, "tutor")  # Default to tutor
    
    return {
        **state,
        "intent": intent,
        "current_agent": current_agent,
    }

def analyze_intent(message: str) -> str:
    """
    Use Ollama to analyze user intent
    """
    prompt = f"""Analyze the user's message and determine their intent.

Message: "{message}"

Respond with ONE of these intents:
- conversation: General English conversation, questions, casual chat
- grammar: Grammar questions, error checking, grammar explanations
- pronunciation: Pronunciation practice, pronunciation questions
- exercise: Request for exercises, practice questions
- vocabulary: Vocabulary questions, word definitions

Intent:"""
    
    response = ollama_service.chat([{"role": "user", "content": prompt}])
    intent = extract_intent_from_response(response)
    
    return intent or "conversation"  # Default fallback
```

**Output:**
- `state.intent` - Detected intent
- `state.current_agent` - Target agent name

---

### 2. Tutor Agent

**Purpose:** General English conversation and tutoring

**Input:**
- `state.messages` - Full conversation history
- `state.conversation_id` - For memory retrieval

**Processing:**
```python
def tutor_agent(state: TutorState) -> TutorState:
    """
    Handle general English conversation
    """
    # Get conversation history
    messages = state["messages"]
    conversation_id = state["conversation_id"]
    
    # Get memory context (from LangChain memory)
    memory_context = memory_service.get_context(conversation_id)
    
    # Prepare messages for Ollama
    ollama_messages = prepare_ollama_messages(messages, memory_context)
    
    # Call Ollama with structured output
    response = ollama_service.tutor_conversation(
        messages=ollama_messages,
        structured=True  # Get JSON chunks
    )
    
    # Parse structured response
    parsed = parse_structured_response(response)
    
    return {
        **state,
        "tutor_response": response,
        "chunks": parsed["chunks"],
        "metadata": parsed["metadata"],
    }

def parse_structured_response(response: str) -> dict:
    """
    Parse structured JSON response from Ollama
    """
    try:
        # Try to parse JSON
        import json
        parsed = json.loads(response)
        return parsed
    except:
        # Fallback: create single chunk
        return {
            "chunks": [{"text": response, "emotion": "neutral"}],
            "metadata": {}
        }
```

**Output:**
- `state.tutor_response` - Full response text
- `state.chunks` - Structured chunks
- `state.metadata` - Response metadata

---

### 3. Grammar Agent

**Purpose:** Grammar checking and correction

**Input:**
- `state.messages` - Last user message (to check grammar)

**Processing:**
```python
def grammar_agent(state: TutorState) -> TutorState:
    """
    Analyze grammar in user's message
    """
    last_message = state["messages"][-1].content
    
    # Analyze grammar using Ollama
    analysis = ollama_service.analyze_grammar(last_message)
    
    # Format response
    formatted_response = format_grammar_response(analysis)
    
    return {
        **state,
        "grammar_analysis": analysis,
        "tutor_response": formatted_response,
        "chunks": format_grammar_chunks(analysis),
    }

def format_grammar_response(analysis: dict) -> str:
    """
    Format grammar analysis into user-friendly response
    """
    if not analysis.get("errors"):
        return "Great! Your grammar looks correct. Keep practicing! 😊"
    
    response = "I found a few grammar points to improve:\n\n"
    
    for error in analysis["errors"]:
        response += f"• {error['explanation']}\n"
        response += f"  Corrected: {error['correction']}\n\n"
    
    return response
```

**Output:**
- `state.grammar_analysis` - Detailed analysis
- `state.tutor_response` - Formatted response
- `state.chunks` - Structured chunks

---

### 4. Pronunciation Agent

**Purpose:** Pronunciation practice and feedback

**Input:**
- `state.messages` - User message (text or audio)
- Audio data (if available)

**Processing:**
```python
def pronunciation_agent(state: TutorState) -> TutorState:
    """
    Handle pronunciation practice
    """
    last_message = state["messages"][-1]
    
    # Check if audio is available
    if has_audio_data(last_message):
        # User sent audio for pronunciation check
        audio_data = extract_audio(last_message)
        text = stt_service.transcribe(audio_data)
        
        # Analyze pronunciation
        feedback = analyze_pronunciation(text, audio_data)
        
        response = format_pronunciation_feedback(feedback)
    else:
        # User wants pronunciation practice
        target_text = last_message.content
        practice_plan = create_pronunciation_practice(target_text)
        response = format_practice_plan(practice_plan)
    
    return {
        **state,
        "pronunciation_feedback": feedback if has_audio_data(last_message) else None,
        "tutor_response": response,
        "chunks": format_pronunciation_chunks(response),
    }
```

**Output:**
- `state.pronunciation_feedback` - Feedback (if audio provided)
- `state.tutor_response` - Practice plan or feedback
- `state.chunks` - Structured chunks

---

### 5. Exercise Agent

**Purpose:** Generate exercises for practice

**Input:**
- `state.messages` - Exercise request

**Processing:**
```python
def exercise_agent(state: TutorState) -> TutorState:
    """
    Generate exercises based on user request
    """
    last_message = state["messages"][-1].content
    
    # Extract exercise requirements
    requirements = extract_exercise_requirements(last_message)
    
    # Generate exercise using Ollama
    exercise = ollama_service.generate_exercise(
        topic=requirements["topic"],
        level=requirements["level"],
        exercise_type=requirements["type"]
    )
    
    # Format response
    response = format_exercise_response(exercise)
    
    return {
        **state,
        "exercise_data": exercise,
        "tutor_response": response,
        "chunks": format_exercise_chunks(exercise),
    }
```

**Output:**
- `state.exercise_data` - Exercise data
- `state.tutor_response` - Formatted exercise
- `state.chunks` - Structured chunks

---

### 6. Response Formatter Node

**Purpose:** Format agent responses for pipeline processing

**Input:**
- `state` - Contains agent response

**Processing:**
```python
def response_formatter_node(state: TutorState) -> TutorState:
    """
    Format response from agent for pipeline
    """
    # Get response from current agent
    response = get_agent_response(state)
    
    # Ensure chunks are properly formatted
    chunks = state.get("chunks", [])
    
    if not chunks:
        # Create chunks from response text
        chunks = create_chunks_from_text(response)
    
    # Add metadata
    metadata = {
        "agent": state.get("current_agent", "unknown"),
        "intent": state.get("intent"),
        "timestamp": datetime.now().isoformat(),
    }
    
    return {
        **state,
        "chunks": chunks,
        "metadata": {**state.get("metadata", {}), **metadata},
    }

def get_agent_response(state: TutorState) -> str:
    """Get response from appropriate agent"""
    agent = state.get("current_agent", "tutor")
    
    if agent == "tutor":
        return state.get("tutor_response", "")
    elif agent == "grammar":
        return state.get("tutor_response", "")
    # ... other agents
    
    return ""
```

**Output:**
- `state.chunks` - Formatted chunks
- `state.metadata` - Updated metadata

---

### 7. Pipeline Node

**Purpose:** Process chunks through TTS pipeline

**Input:**
- `state.chunks` - Chunks to process

**Processing:**
```python
def pipeline_node(state: TutorState) -> TutorState:
    """
    Process chunks through TTS pipeline
    """
    chunks = state.get("chunks", [])
    conversation_id = state["conversation_id"]
    
    # Process each chunk through TTS
    processed_chunks = []
    
    for chunk in chunks:
        try:
            # Generate TTS
            tts_result = tts_service.synthesize(
                text=chunk["text"],
                voice=chunk.get("voice", "default")
            )
            
            # Update chunk with audio data
            processed_chunk = {
                **chunk,
                "audio_file_id": tts_result["file_id"],
                "audio_duration": tts_result["duration"],
                "tts_status": "completed",
            }
            
            processed_chunks.append(processed_chunk)
            
            # Save to database
            save_chunk_to_db(conversation_id, processed_chunk)
            
        except Exception as e:
            logger.error(f"TTS error for chunk: {e}")
            processed_chunk = {
                **chunk,
                "tts_status": "failed",
                "error": str(e),
            }
            processed_chunks.append(processed_chunk)
    
    return {
        **state,
        "chunks": processed_chunks,
        "tts_status": "completed" if all(c.get("tts_status") == "completed" for c in processed_chunks) else "failed",
    }
```

**Output:**
- `state.chunks` - Chunks with TTS data
- `state.tts_status` - Overall TTS status

---

## 🔗 Agent Communication

### State-Based Communication

Agents **don't call each other directly**. They communicate via state:

```
Agent A → Updates State → Agent B reads State → Updates State → Agent C
```

**Benefits:**
- ✅ Loose coupling
- ✅ Easy to test
- ✅ Easy to add/remove agents
- ✅ State is explicit and traceable

### State Updates

Each agent:
1. Reads from state
2. Processes
3. Updates state
4. Returns updated state

**Example:**
```python
# Router sets intent
state = {"intent": "grammar"}

# Grammar agent reads intent and processes
if state["intent"] == "grammar":
    state = grammar_agent(state)
```

---

## ⚠️ Error Handling

### Error Handling Strategy

1. **Try-catch in each agent**
2. **Add error to state**
3. **Continue workflow** (or route to error handler)

```python
def agent_node(state: TutorState) -> TutorState:
    try:
        # Process
        result = process(state)
        return update_state(state, result)
    except Exception as e:
        logger.error(f"Agent error: {e}")
        return {
            **state,
            "error": str(e),
            "tts_status": "failed"
        }
```

### Error Recovery

- **Retry logic:** Can be added at service layer
- **Fallback:** Route to default agent (tutor)
- **User notification:** Include error in response

---

## 📝 Agent Interface

All agents implement this interface:

```python
from typing import Protocol
from langgraph.graph import StateGraph

class Agent(Protocol):
    """Agent interface"""
    
    def __call__(self, state: TutorState) -> TutorState:
        """Process state and return updated state"""
        ...
    
    def validate(self, state: TutorState) -> bool:
        """Validate state before processing"""
        ...
```

---

## ✅ Next Steps

1. ✅ Agent design (this document)
2. ⏳ Implement Router Agent
3. ⏳ Implement Tutor Agent
4. ⏳ Implement other agents
5. ⏳ Testing

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-XX  
**Status:** 🚧 Design Phase

