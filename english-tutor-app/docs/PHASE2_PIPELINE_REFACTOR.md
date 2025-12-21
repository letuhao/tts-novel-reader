# Phase 2.4: Pipeline Service Refactor

**Date:** 2025-12-21  
**Status:** ✅ Complete

## Overview

Refactored PipelineService to integrate with the new event-driven architecture, using EventBus, ConversationService, and database persistence.

## Changes Made

### 1. PipelineService Integration

**Before:**
- Direct WebSocket broadcasting
- No database persistence
- No event system integration

**After:**
- EventBus integration for all events
- ConversationService for message/chunk persistence
- Database updates for chunk audio file IDs
- Proper event types (`chunk:created`, `chunk:tts-completed`, etc.)

### 2. Key Updates

#### Event Emission
- **Before**: Direct WebSocket calls
- **After**: EventBus with proper event types
- Events: `chunk:created`, `chunk:tts-started`, `chunk:tts-completed`, `chunk:tts-failed`, `audio:ready`

#### Database Persistence
- **Before**: No persistence
- **After**: 
  - Saves assistant message via `ConversationService.saveAssistantResponse()`
  - Saves chunks to database
  - Updates chunks with audio file IDs when TTS completes
  - Updates chunk TTS status

#### User Context
- **Before**: No user tracking
- **After**: 
  - Accepts `userId` parameter
  - Passes userId to events
  - Enables user-specific event tracking

### 3. Updated Methods

#### `processResponse()`
**Signature Change:**
```typescript
// Before
async processResponse(
  ollamaResponse: string,
  voice?: string,
  conversationId?: string
): Promise<PipelineResult>

// After
async processResponse(
  ollamaResponse: string,
  voice?: string,
  conversationId?: string,
  userId?: string
): Promise<PipelineResult>
```

**New Behavior:**
- Saves assistant message and chunks to database immediately after parsing
- Maps saved chunk IDs to processed chunks
- Emits `conversation:started` event via EventBus
- Continues TTS processing in background

#### `processChunkTTS()`
**New Behavior:**
- Updates chunk in database with audio file ID when TTS completes
- Updates chunk TTS status in database
- Emits proper events via EventBus:
  - `chunk:tts-started` when processing begins
  - `chunk:tts-completed` when audio ready
  - `audio:ready` when audio file available
  - `chunk:tts-failed` on errors

### 4. Ollama Route Integration

**Updated `/api/ollama/chat` route:**
- Requires authentication (`authenticate` middleware)
- Creates conversation if not provided
- Saves user message via `ConversationService.sendMessage()`
- Gets conversation history from memory service
- Passes `userId` to pipeline
- Emits `message:sent` and `message:received` events

## Event Flow

```
User sends message
  ↓
Save user message (ConversationService)
  ↓
Emit message:sent event
  ↓
Get conversation history (from memory)
  ↓
Call Ollama
  ↓
Parse response
  ↓
Save assistant message + chunks (ConversationService)
  ↓
Emit conversation:started event
  ↓
Start TTS processing (background)
  ↓
For each chunk:
  - Emit chunk:tts-started
  - Generate TTS
  - Update chunk in database (audioFileId, status)
  - Emit chunk:tts-completed
  - Emit audio:ready
```

## Database Integration

### Messages
- User messages saved immediately
- Assistant messages saved after parsing
- Full conversation history in database

### Chunks
- Chunks saved with initial data (text, emotion, icon, etc.)
- Audio file IDs updated when TTS completes
- TTS status tracked (pending → processing → completed/failed)

### Memory
- Conversation history loaded from memory service
- Memory updated after assistant response
- Automatic context management

## Benefits

1. **Persistence**: All conversations saved to database
2. **Event-Driven**: Proper event system with EventBus
3. **Real-time**: WebSocket updates via EventBus
4. **Traceability**: All events logged and saved
5. **User Context**: User tracking for multi-user support
6. **Memory Integration**: Automatic memory management

## Migration Notes

### Breaking Changes
- `processResponse()` now requires `userId` parameter (optional for backward compatibility)
- Events now use EventBus instead of direct WebSocket
- Chunks are persisted to database

### Backward Compatibility
- `userId` is optional (for now)
- Old event callbacks still work
- HTTP mode still returns all chunks

## Testing

To test the refactored pipeline:

1. **With Authentication:**
```bash
# Register user
curl -X POST http://localhost:11200/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test","password":"test123456"}'

# Login
curl -X POST http://localhost:11200/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# Chat (with token)
curl -X POST http://localhost:11200/api/ollama/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Hello!"}'
```

2. **Check Database:**
- Verify messages saved in `messages` table
- Verify chunks saved in `message_chunks` table
- Verify audio file IDs updated when TTS completes

3. **Check Events:**
- Monitor WebSocket for real-time events
- Check logs for event emissions
- Verify EventBus handlers are called

## Next Steps

1. **Frontend Integration**
   - Update frontend to use new event types
   - Connect to EventBus events
   - Handle new event structure

2. **Error Handling**
   - Better error recovery
   - Retry logic for failed TTS
   - Graceful degradation

3. **Performance**
   - Optimize database queries
   - Cache conversation history
   - Batch chunk updates

---

**Status:** ✅ Complete, ready for frontend integration

