# Memory Debugging Guide

## Problem
AI is incorrectly saying user said "hello" 3 times when user only said it once.

## Debug Points

### 1. Memory Service Loading
- **Location**: `backend/src/services/memory/memoryService.ts::loadHistoryIntoMemory()`
- **What to check**: 
  - How many messages are loaded from database
  - How many user-assistant pairs are created
  - If any messages are duplicated

### 2. Memory Context Retrieval
- **Location**: `backend/src/services/conversation/conversationService.ts::getConversationHistory()`
- **What to check**:
  - Whether memory context has messages
  - If fallback to database is used
  - Message count and content

### 3. History Sent to Ollama
- **Location**: `backend/src/routes/ollama.ts::POST /chat`
- **What to check**:
  - Final history array length
  - Each message role and content
  - If current user message is added correctly

## Debug Logs Added

### Memory Service
- `📚 [MEMORY] User message without matching assistant` - When user message has no assistant response yet
- `📚 [MEMORY] Loaded conversation history into memory` - Shows loaded pairs

### Conversation Service
- `📚 [HISTORY] Returning history from memory context` - When using memory
- `📚 [HISTORY] Returning history from database` - When using database fallback

### Ollama Route
- `📚 [MEMORY] Using provided conversation history` - When history provided in request
- `📚 [MEMORY] Loaded conversation history from memory` - When loaded from memory
- `📚 [MEMORY] Final history sent to Ollama` - Complete history array before sending

## How to Debug

1. **Check backend logs** for `📚 [MEMORY]` and `📚 [HISTORY]` entries
2. **Verify message count**: Should match actual conversation messages
3. **Check for duplicates**: Look for same message appearing multiple times
4. **Verify sequence**: Messages should be in correct order (user → assistant → user → assistant)

## Common Issues

### Issue 1: Memory Service Created Multiple Times
- **Symptom**: "Creating memory service" logged multiple times
- **Cause**: Memory service not properly cached
- **Fix**: Check `memoryServiceFactory.ts` caching logic

### Issue 2: History Duplication
- **Symptom**: Same message appears multiple times in history
- **Cause**: `loadHistoryIntoMemory` called multiple times or messages saved incorrectly
- **Fix**: Ensure memory service is singleton per conversation

### Issue 3: Wrong Message Count
- **Symptom**: History has more messages than actual conversation
- **Cause**: Old messages not cleared or wrong conversation ID
- **Fix**: Verify conversation ID is correct and memory is cleared on new conversation

## Testing

1. Start a new conversation
2. Send "hello"
3. Check logs for:
   - Memory service creation
   - History loading
   - Final history sent to Ollama
4. Verify history contains only:
   - System message (from Ollama service)
   - Current user message ("hello")
   - No previous messages (for new conversation)

