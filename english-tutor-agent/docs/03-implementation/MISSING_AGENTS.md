# Missing Agents - Các Agent Còn Thiếu
## Danh Sách Agents Chưa Implement

**Date:** 2025-12-22  
**Status:** 📋 Pending Implementation

---

## 📊 Agent Status Overview

### ✅ Implemented Agents (4/7)

| # | Agent Name | Status | File | Notes |
|---|------------|--------|------|-------|
| 1 | **Router Agent** | ✅ Complete | `src/agents/router.py` | 3 modes: keyword, LLM, hybrid |
| 2 | **Tutor Agent** | ✅ Complete | `src/agents/tutor.py` | General conversation |
| 3 | **Grammar Agent** | ✅ Complete | `src/agents/grammar.py` | Grammar checking & feedback |
| 4 | **Exercise Agent** | ✅ Complete | `src/agents/exercise.py` | Exercise generation |

---

### ❌ Missing Agents (3/7)

| # | Agent Name | Priority | Estimated Time | Dependencies |
|---|------------|----------|----------------|--------------|
| 1 | **Pronunciation Agent** | 🟠 High | 2-3 days | STT service |
| 2 | **Response Formatter** | 🔴 Critical | 1-2 days | None |
| 3 | **Pipeline Node (TTS)** | 🔴 Critical | 2-3 days | TTS service |

---

## 1. ❌ Pronunciation Agent

### Purpose
Pronunciation practice and feedback for users

### Requirements
- **STT Integration:** Transcribe audio input
- **Pronunciation Analysis:** Compare user pronunciation with target
- **Feedback Generation:** Provide detailed pronunciation feedback
- **Practice Mode:** Generate pronunciation practice exercises

### Design Details
**Location:** `docs/02-design/AGENT_DESIGN.md` (Section 4.4)

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
    
    if has_audio_data(last_message):
        # User sent audio for pronunciation check
        audio_data = extract_audio(last_message)
        text = stt_service.transcribe(audio_data)
        feedback = analyze_pronunciation(text, audio_data)
        response = format_pronunciation_feedback(feedback)
    else:
        # User wants pronunciation practice
        target_text = last_message.content
        practice_plan = create_pronunciation_practice(target_text)
        response = format_practice_plan(practice_plan)
    
    return {
        **state,
        "pronunciation_feedback": feedback,
        "tutor_response": response,
        "chunks": format_pronunciation_chunks(feedback),
    }
```

**Output:**
- `state.pronunciation_feedback` - Detailed feedback
- `state.tutor_response` - Formatted response
- `state.chunks` - Structured chunks

### Dependencies
- STT service (Whisper STT backend)
- Pronunciation analysis logic
- Phoneme comparison algorithms

### Implementation Steps
1. [ ] Create `src/agents/pronunciation.py`
2. [ ] Integrate STT service
3. [ ] Implement pronunciation analysis
4. [ ] Add feedback formatting
5. [ ] Add pronunciation node to workflow
6. [ ] Update router to handle pronunciation intent
7. [ ] Test pronunciation feedback

---

## 2. ❌ Response Formatter Agent

### Purpose
Format agent responses for pipeline processing (TTS)

### Requirements
- **Parse Structured Responses:** Extract text from agent responses
- **Create Chunks:** Break responses into chunks with emotions/icons
- **Handle Fallback:** Format responses when structured parsing fails
- **Metadata Generation:** Add metadata for TTS processing

### Design Details
**Location:** `docs/02-design/AGENT_DESIGN.md` (Section 5.1)

**Input:**
- `state` - Contains agent response (from any agent)
- `state.current_agent` - Which agent generated the response

**Processing:**
```python
def response_formatter_agent(state: TutorState) -> TutorState:
    """
    Format response from agent for pipeline
    """
    # Get response from current agent
    response = get_agent_response(state)
    
    # Parse and format
    try:
        chunks = parse_structured_response(response)
    except:
        # Fallback: create single chunk
        chunks = [{"text": response, "emotion": "neutral"}]
    
    return {
        **state,
        "chunks": chunks,
        "metadata": {
            "agent": state.get("current_agent", "unknown"),
            "formatted_at": datetime.now().isoformat(),
        }
    }
```

**Output:**
- `state.chunks` - Structured chunks for TTS
- `state.metadata` - Formatting metadata

### Dependencies
- None (works with existing agent responses)

### Implementation Steps
1. [ ] Create `src/agents/response_formatter.py`
2. [ ] Implement structured response parsing
3. [ ] Add chunk creation logic
4. [ ] Implement fallback formatting
5. [ ] Add formatter node to workflow
6. [ ] Update workflow edges (all agents → formatter)
7. [ ] Test formatting logic

---

## 3. ❌ Pipeline Node (TTS Processing)

### Purpose
Process formatted chunks through TTS service and save audio files

### Requirements
- **TTS Integration:** Connect to TTS backend service
- **Chunk Processing:** Process each chunk through TTS
- **Audio File Management:** Save and manage audio files
- **Error Handling:** Handle TTS errors gracefully
- **Status Updates:** Update state with TTS status

### Design Details
**Location:** `docs/02-design/AGENT_DESIGN.md` (Section 5.2)

**Input:**
- `state.chunks` - Formatted chunks from Response Formatter
- `state.metadata` - Metadata for TTS configuration

**Processing:**
```python
def pipeline_node(state: TutorState) -> TutorState:
    """
    Process chunks through TTS pipeline
    """
    chunks = state.get("chunks", [])
    audio_files = []
    
    try:
        for chunk in chunks:
            # Generate audio for chunk
            audio_metadata = tts_service.generate_audio(
                text=chunk["text"],
                emotion=chunk.get("emotion", "neutral"),
                options=chunk.get("tts_options", {})
            )
            audio_files.append(audio_metadata)
        
        return {
            **state,
            "audio_files": audio_files,
            "tts_status": "completed",
            "metadata": {
                **state.get("metadata", {}),
                "audio_generated_at": datetime.now().isoformat(),
            }
        }
    except Exception as e:
        logger.error(f"TTS pipeline error: {e}")
        return {
            **state,
            "tts_status": "failed",
            "error": str(e)
        }
```

**Output:**
- `state.audio_files` - List of audio file metadata
- `state.tts_status` - TTS processing status
- `state.error` - Error message if failed

### Dependencies
- TTS service (Coqui TTS or VieNeu TTS backend)
- Audio file storage service
- Chunk processing logic

### Implementation Steps
1. [ ] Create `src/agents/pipeline.py` or `src/services/pipeline_service.py`
2. [ ] Integrate TTS service client
3. [ ] Implement chunk processing logic
4. [ ] Add audio file management
5. [ ] Implement error handling
6. [ ] Add pipeline node to workflow
7. [ ] Update workflow edges (formatter → pipeline → end)
8. [ ] Test TTS pipeline end-to-end

---

## 📋 Implementation Priority

### Critical Path (For End-to-End Flow)

1. **Response Formatter** 🔴
   - **Why:** Needed to prepare responses for TTS
   - **Time:** 1-2 days
   - **Blocks:** Pipeline Node

2. **Pipeline Node (TTS)** 🔴
   - **Why:** Needed for audio output
   - **Time:** 2-3 days
   - **Blocks:** Complete workflow

### High Priority (Feature Completion)

3. **Pronunciation Agent** 🟠
   - **Why:** Completes specialized agents set
   - **Time:** 2-3 days
   - **Blocks:** None

---

## 🔄 Workflow Integration

### Current Workflow
```
Router → [Tutor/Grammar/Exercise] → End
```

### Target Workflow (After Implementation)
```
Router → [Tutor/Grammar/Exercise/Pronunciation] → Response Formatter → Pipeline (TTS) → End
```

### Required Changes
1. Add `pronunciation` node
2. Add `response_formatter` node
3. Add `pipeline` node
4. Update router to handle `pronunciation` intent
5. Update conditional edges:
   - All agents → `response_formatter`
   - `response_formatter` → `pipeline`
   - `pipeline` → `END`

---

## 📝 Notes

- **Response Formatter** và **Pipeline Node** là critical để có complete workflow
- **Pronunciation Agent** là feature addition, không block workflow hiện tại
- Tất cả agents đều follow cùng pattern (xem `AGENT_DESIGN.md`)
- Cần integrate với existing services (STT, TTS backends)

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-22  
**Status:** 📋 Ready for Implementation

