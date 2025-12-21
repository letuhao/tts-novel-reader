# WebSocket Implementation for Real-time Conversation

**Date:** 2024-12-21  
**Status:** ✅ Backend Complete, Frontend In Progress

---

## 🎯 Goal

Transform the conversation pipeline from a monolithic HTTP request/response pattern to an **event-driven, real-time architecture** using WebSocket. This enables:

- **Immediate chunk delivery** as they're parsed (not waiting for all TTS)
- **Progressive TTS updates** as audio is generated
- **Real-time status updates** (pending → processing → completed)
- **Seamless communication** between frontend and backend

---

## 🏗️ Architecture

### Before (HTTP/1.1 - Monolithic)
```
Frontend → HTTP POST → Backend
  ↓
Backend waits for:
  1. Ollama response (~5s)
  2. Parse response (~2ms)
  3. ALL TTS complete (~10-15s)
  ↓
Return ALL chunks at once
```

### After (WebSocket - Event-Driven)
```
Frontend ←→ WebSocket ←→ Backend
  ↓
Backend emits events:
  1. conversation-start (chunks parsed, TTS pending)
  2. chunk-update (TTS started for chunk N)
  3. chunk-complete (TTS ready for chunk N)
  4. chunk-failed (TTS error for chunk N)
  ↓
Frontend receives events in real-time
```

---

## 📦 Backend Implementation

### 1. WebSocket Service (`backend/src/services/websocket/websocketService.ts`)

**Features:**
- Connection management per conversation
- Event broadcasting to conversation participants
- Automatic reconnection handling
- Message routing

**Key Methods:**
- `initialize(server)` - Setup WebSocket server
- `broadcastToConversation(conversationId, message)` - Send to all connections in conversation
- `sendToConnection(connectionId, message)` - Send to specific connection

### 2. Pipeline Service Updates (`backend/src/services/conversation/pipelineService.ts`)

**Event-Driven Changes:**
- Added `emitEvent()` method to broadcast chunk updates
- Events emitted:
  - `chunk-update` - Status changed (pending → processing → completed)
  - `chunk-complete` - TTS ready with audio file ID
  - `chunk-failed` - TTS generation failed

**Event Flow:**
```typescript
processChunkTTS() {
  chunk.ttsStatus = 'processing';
  emitEvent('chunk-update', index, chunk); // → WebSocket
  
  // ... TTS generation ...
  
  chunk.ttsStatus = 'completed';
  emitEvent('chunk-complete', index, chunk); // → WebSocket
}
```

### 3. Server Integration (`backend/src/server.ts`)

**Changes:**
- Created HTTP server (required for WebSocket)
- Initialize WebSocket service on server startup
- WebSocket available at `ws://host:port/ws`

### 4. Chat Endpoint (`backend/src/routes/ollama.ts`)

**New Features:**
- `conversationId` parameter - Track conversation for WebSocket events
- `useWebSocket` parameter - Enable WebSocket mode (optional, backward compatible)
- When `useWebSocket: true`:
  - Returns minimal response with `conversationId`
  - Sends initial chunks via WebSocket
  - All updates sent via WebSocket events

---

## 🎨 Frontend Implementation

### 1. WebSocket Service (`frontend/src/services/websocketService.ts`)

**Features:**
- Connection management
- Event handler registration
- Automatic reconnection
- Message sending/receiving

**Usage:**
```typescript
const ws = new WebSocketService(API_URL, conversationId);
await ws.connect();

ws.on('chunk-update', (message) => {
  // Handle chunk update
});

ws.on('chunk-complete', (message) => {
  // Handle chunk ready
});
```

### 2. Conversation Component Updates (`frontend/src/pages/Conversation.tsx`)

**Changes:**
- Connect to WebSocket when conversation starts
- Listen for `chunk-update` events
- Update message TTS status in real-time
- Play audio as chunks become ready

---

## 📡 WebSocket Message Format

### Client → Server
```json
{
  "type": "ping",
  "data": {}
}
```

### Server → Client

#### 1. Connection Established
```json
{
  "type": "connected",
  "data": {
    "connectionId": "conn_123...",
    "conversationId": "conv_456...",
    "timestamp": "2024-12-21T..."
  },
  "timestamp": "2024-12-21T...",
  "conversationId": "conv_456..."
}
```

#### 2. Conversation Start
```json
{
  "type": "conversation-start",
  "data": {
    "conversationId": "conv_456...",
    "chunks": [
      {
        "id": "chunk_1",
        "text": "Hello!",
        "emotion": "happy",
        "icon": "😊",
        "pause": 0,
        "emphasis": false,
        "ttsStatus": "pending"
      }
    ],
    "metadata": { ... },
    "source": "structured"
  }
}
```

#### 3. Chunk Update
```json
{
  "type": "chunk-update",
  "data": {
    "chunkIndex": 0,
    "chunk": {
      "id": "chunk_1",
      "text": "Hello!",
      "emotion": "happy",
      "icon": "😊",
      "pause": 0,
      "emphasis": false,
      "audioFileId": "file_123...",
      "duration": 2.5,
      "ttsStatus": "completed",
      "ttsError": null
    }
  }
}
```

#### 4. Chunk Complete
```json
{
  "type": "chunk-complete",
  "data": {
    "chunkIndex": 0,
    "chunk": { ... }
  }
}
```

#### 5. Chunk Failed
```json
{
  "type": "chunk-failed",
  "data": {
    "chunkIndex": 0,
    "chunk": {
      "ttsStatus": "failed",
      "ttsError": "TTS timeout"
    }
  }
}
```

---

## 🚀 Usage

### Backend (Automatic)
- WebSocket server starts automatically with backend
- Available at `ws://localhost:11200/ws`
- Events emitted automatically as pipeline processes chunks

### Frontend (Optional)
```typescript
// Option 1: Use WebSocket mode
const response = await chatWithTutor({
  message: "Hello",
  useWebSocket: true, // Enable WebSocket
  conversationId: "my-conversation-id"
});

// Option 2: Use HTTP mode (backward compatible)
const response = await chatWithTutor({
  message: "Hello",
  useWebSocket: false // Use HTTP
});
```

---

## ✅ Benefits

1. **Real-time Updates**: Chunks appear immediately, TTS status updates as audio is generated
2. **Better UX**: No waiting for all TTS to complete
3. **Scalable**: Event-driven architecture supports future features (typing indicators, etc.)
4. **Backward Compatible**: HTTP mode still works
5. **Progressive Enhancement**: Frontend can choose HTTP or WebSocket

---

## 🔄 Migration Path

1. ✅ Backend WebSocket server implemented
2. ✅ Pipeline emits events
3. ✅ Chat endpoint supports WebSocket mode
4. ⏳ Frontend WebSocket service created
5. ⏳ Conversation component updated to use WebSocket
6. ⏳ Testing and refinement

---

## 📝 Next Steps

1. Update `Conversation.tsx` to:
   - Connect to WebSocket when sending message
   - Listen for chunk-update events
   - Update message TTS status in real-time
   - Play audio as chunks become ready

2. Add error handling:
   - WebSocket connection failures
   - Reconnection logic
   - Fallback to HTTP if WebSocket unavailable

3. Add UI indicators:
   - WebSocket connection status
   - Real-time TTS progress
   - Connection quality indicator

---

**Status:** Backend complete, frontend integration in progress

