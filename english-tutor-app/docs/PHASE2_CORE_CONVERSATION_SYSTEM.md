# Phase 2: Core Conversation System Implementation

**Date:** 2025-12-21  
**Status:** ✅ Phase 2.1-2.3 Complete

## Overview

Core conversation system implemented with event-driven architecture, integrating repositories, memory service, and WebSocket communication.

## Components Created

### 1. Conversation Service (`services/conversation/conversationService.ts`)

**Purpose:** High-level service for managing conversations, integrating repositories and memory.

**Key Methods:**
- `createConversation()` - Create new conversation
- `getConversation()` - Get conversation with messages
- `getUserConversations()` - Get user's conversations (paginated)
- `updateConversation()` - Update conversation
- `deleteConversation()` - Delete conversation (with memory cleanup)
- `sendMessage()` - Send user message and prepare for AI response
- `saveAssistantResponse()` - Save AI response with chunks
- `getConversationHistory()` - Get history for Ollama (from memory or DB)

**Features:**
- Full CRUD operations
- Memory integration
- Message and chunk persistence
- Automatic memory updates
- Conversation history management

### 2. Conversation Manager (`services/conversation/conversationManager.ts`)

**Purpose:** Manages active conversations, WebSocket connections, and state synchronization.

**Key Methods:**
- `getOrCreateActiveConversation()` - Get or create active conversation
- `registerClient()` - Register WebSocket client
- `unregisterClient()` - Unregister WebSocket client
- `getActiveConversation()` - Get active conversation
- `getUserActiveConversations()` - Get user's active conversations
- `updateConversationState()` - Update and broadcast state changes
- `cleanupIdleConversations()` - Cleanup idle conversations
- `getStats()` - Get manager statistics

**Features:**
- Active conversation tracking
- WebSocket client management
- State synchronization
- Automatic cleanup (idle conversations after 30 minutes)
- Statistics tracking

### 3. Event Bus (`services/conversation/eventBus.ts`)

**Purpose:** Centralized event system for conversation events.

**Event Types:**
- `conversation:started`
- `conversation:updated`
- `conversation:ended`
- `message:sent`
- `message:received`
- `chunk:created`
- `chunk:tts-started`
- `chunk:tts-completed`
- `chunk:tts-failed`
- `audio:ready`
- `audio:played`
- `memory:updated`
- `error:occurred`

**Key Methods:**
- `on()` - Register global event handler
- `off()` - Unregister global event handler
- `onConversation()` - Register conversation-specific handler
- `offConversation()` - Unregister conversation-specific handler
- `emit()` - Emit event
- `emitEvent()` - Create and emit event

**Features:**
- Global and conversation-specific handlers
- WebSocket broadcasting
- Event logging to database (placeholder)
- Error handling in handlers
- Default error handler

## Architecture

```
┌─────────────────────────────────────────┐
│         Conversation Service            │
│  - CRUD operations                      │
│  - Memory integration                   │
│  - Message persistence                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Conversation Manager               │
│  - Active conversation tracking         │
│  - WebSocket client management          │
│  - State synchronization                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           Event Bus                     │
│  - Event routing                        │
│  - WebSocket broadcasting              │
│  - Event logging                        │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│        WebSocket Service                │
│  - Real-time communication              │
└─────────────────────────────────────────┘
```

## Integration Points

### With Repositories
- `ConversationRepository` - Conversation CRUD
- `MessageRepository` - Message persistence
- `ChunkRepository` - Chunk persistence

### With Memory Service
- Loads conversation history into memory
- Updates memory after each message
- Uses memory context for Ollama requests

### With WebSocket Service
- Broadcasts events to connected clients
- Manages client connections per conversation
- Real-time state synchronization

### With Pipeline Service (Future)
- Will integrate with pipeline for AI responses
- Will emit pipeline events via EventBus

## Usage Examples

### Create Conversation
```typescript
import { conversationService } from './services/conversation';

const conversation = await conversationService.createConversation(userId, {
  title: 'Daily Practice',
  level: 'A1',
  memoryStrategy: 'sliding',
});
```

### Send Message
```typescript
const result = await conversationService.sendMessage({
  conversationId: 'conv-123',
  userId: 'user-123',
  content: 'Hello!',
});

// Result includes user message
// AI response will be handled by pipeline
```

### Save Assistant Response
```typescript
const { message, chunks } = await conversationService.saveAssistantResponse(
  conversationId,
  'Hello! How can I help you?',
  [
    { text: 'Hello!', emotion: 'happy', icon: '😊' },
    { text: 'How can I help you?', emotion: 'curious' },
  ]
);
```

### Register Active Conversation
```typescript
import { conversationManager } from './services/conversation';

const active = await conversationManager.getOrCreateActiveConversation(
  conversationId,
  userId
);

conversationManager.registerClient(conversationId, clientId);
```

### Emit Event
```typescript
import { eventBus } from './services/conversation';

await eventBus.emitEvent(
  'message:sent',
  conversationId,
  {
    messageId: 'msg-123',
    content: 'Hello!',
  },
  { userId: 'user-123' }
);
```

## Next Steps

### Phase 2.4: Pipeline Service Refactor
- [ ] Integrate pipeline with ConversationService
- [ ] Use EventBus for pipeline events
- [ ] Persist chunks via ChunkRepository
- [ ] Update memory after AI responses

### Phase 3: Frontend Integration
- [ ] Update frontend to use new event system
- [ ] Integrate with ConversationManager
- [ ] Update state management
- [ ] Real-time updates via WebSocket

## Notes

- All services use singleton pattern
- EventBus has default error handler
- ConversationManager auto-cleans idle conversations
- Memory service loads history on conversation activation
- All events are logged (database logging placeholder)

---

**Status:** ✅ Phase 2.1-2.3 Complete, ready for Phase 2.4

