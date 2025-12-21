# Event Reference Guide

**Quick reference for all events in the event-driven conversation system**

## Event Categories

### Conversation Events
- `conversation:create` - Create new conversation
- `conversation:created` - Conversation created (response)
- `conversation:load` - Load existing conversation
- `conversation:loaded` - Conversation loaded (response)
- `conversation:update` - Update conversation metadata
- `conversation:updated` - Conversation updated (response)
- `conversation:delete` - Delete conversation
- `conversation:deleted` - Conversation deleted (response)
- `conversation:error` - Conversation error occurred

### Message Events
- `message:send` - Send message (text or voice)
- `message:received` - Message received (acknowledgment)
- `message:sent` - Message sent successfully
- `message:error` - Message error occurred

### Chunk Events
- `chunk:generated` - Chunk generated from Ollama
- `chunk:processing` - Chunk TTS generation started
- `chunk:audio-ready` - Chunk audio ready for playback
- `chunk:failed` - Chunk processing failed
- `chunk:complete` - Chunk processing complete

### Audio Events
- `audio:request` - Request audio file
- `audio:ready` - Audio file ready
- `audio:playing` - Audio started playing
- `audio:played` - Audio finished playing
- `audio:error` - Audio playback error

### Connection Events
- `connection:open` - WebSocket connected
- `connection:close` - WebSocket disconnected
- `connection:error` - Connection error
- `connection:reconnecting` - Reconnecting to server

---

## Event Payloads

### conversation:create
```typescript
{
  type: 'conversation:create',
  data: {
    userId: string;
    title?: string;
    level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    metadata?: Record<string, any>;
  }
}
```

### message:send
```typescript
{
  type: 'message:send',
  data: {
    conversationId: string;
    content: string;
    inputMethod: 'text' | 'voice';
    audioBlob?: Blob; // Base64 encoded if voice
    metadata?: Record<string, any>;
  }
}
```

### chunk:generated
```typescript
{
  type: 'chunk:generated',
  data: {
    chunkId: string;
    messageId: string;
    conversationId: string;
    chunkIndex: number;
    text: string;
    emotion?: 'happy' | 'encouraging' | 'neutral' | 'excited' | 'calm';
    icon?: string;
    pause?: number;
    emphasis?: boolean;
    ttsStatus: 'pending' | 'processing' | 'completed' | 'failed';
  }
}
```

### chunk:audio-ready
```typescript
{
  type: 'chunk:audio-ready',
  data: {
    chunkId: string;
    messageId: string;
    conversationId: string;
    audioFileId: string;
    audioUrl: string; // Temporary URL
    duration: number; // seconds
    speakerId?: string;
  }
}
```

---

## Event Flow Diagrams

### Send Message Flow
```
User Input
    ↓
message:send
    ↓
Backend: Store message
    ↓
message:received (ack)
    ↓
Backend: Call Ollama
    ↓
chunk:generated (xN)
    ↓
Backend: Generate TTS
    ↓
chunk:audio-ready (xN)
    ↓
Frontend: Queue audio
    ↓
audio:playing
    ↓
audio:played
```

### Load Conversation Flow
```
conversation:load
    ↓
Backend: Load from DB
    ↓
conversation:loaded
    ↓
Frontend: Load messages
    ↓
Frontend: Load chunks
    ↓
Frontend: Ready
```

---

## Error Handling

All events can include error information:

```typescript
{
  type: 'conversation:error',
  data: {
    conversationId: string;
    error: string;
    code: string;
    details?: Record<string, any>;
  }
}
```

Error codes:
- `CONVERSATION_NOT_FOUND`
- `MESSAGE_SEND_FAILED`
- `TTS_GENERATION_FAILED`
- `AUDIO_PLAYBACK_FAILED`
- `CONNECTION_LOST`
- `DATABASE_ERROR`

