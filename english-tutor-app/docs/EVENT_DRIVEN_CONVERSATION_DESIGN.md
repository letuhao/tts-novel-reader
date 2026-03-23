# Event-Driven Conversation System - Complete Design

**Date:** 2025-12-21  
**Status:** Design Phase  
**Version:** 2.0

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Event System](#event-system)
4. [Conversation Management](#conversation-management)
5. [Component Responsibilities](#component-responsibilities)
6. [Event Flows](#event-flows)
7. [State Management](#state-management)
8. [Implementation Plan](#implementation-plan)

---

## Architecture Overview

### Core Principles

1. **Event-Driven**: All communication is event-based, no polling
2. **Separation of Concerns**: Clear boundaries between layers
3. **State Persistence**: All conversations stored in database
4. **Real-time Updates**: WebSocket for live updates
5. **Scalable**: Support for multiple conversations, users, speakers

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   UI Events  │  │ State Store  │  │ Audio Player │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         └─────────────────┼─────────────────┘          │
│                           │                             │
│                    ┌──────▼───────┐                     │
│                    │ Event Bus    │                     │
│                    └──────┬───────┘                     │
└───────────────────────────┼─────────────────────────────┘
                            │ WebSocket / HTTP
┌───────────────────────────┼─────────────────────────────┐
│                    Backend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Conversation │  │   Pipeline    │  │   Database   │  │
│  │   Manager    │  │   Service    │  │   Service    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         └─────────────────┼─────────────────┘          │
│                           │                             │
│                    ┌──────▼───────┐                     │
│                    │ Event Bus    │                     │
│                    └──────┬───────┘                     │
└───────────────────────────┼─────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────┐
│                    AI Services Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Ollama    │  │      TTS     │  │      STT     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Conversations Table

```sql
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255), -- Auto-generated or user-provided
    level VARCHAR(10) NOT NULL DEFAULT 'A1', -- CEFR level
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, paused, completed, archived
    metadata JSONB, -- Additional metadata (topic, difficulty, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_level CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'completed', 'archived'))
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
```

### Messages Table

```sql
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    sequence_number INTEGER NOT NULL, -- Order within conversation
    metadata JSONB, -- Structured chunk data, emotions, icons, etc.
    audio_file_id VARCHAR(255), -- TTS audio file ID
    audio_duration DECIMAL(10, 3), -- Duration in seconds
    stt_transcript TEXT, -- If message came from voice input
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system')),
    CONSTRAINT unique_conversation_sequence UNIQUE (conversation_id, sequence_number)
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sequence ON messages(conversation_id, sequence_number);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

### Message Chunks Table

```sql
CREATE TABLE IF NOT EXISTS message_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL, -- Order within message
    text TEXT NOT NULL,
    emotion VARCHAR(50), -- happy, encouraging, neutral, excited, calm
    icon VARCHAR(10), -- Emoji or icon identifier
    pause_after DECIMAL(5, 2), -- Pause duration in seconds
    emphasis BOOLEAN DEFAULT false,
    audio_file_id VARCHAR(255), -- TTS audio file ID for this chunk
    audio_duration DECIMAL(10, 3), -- Duration in seconds
    tts_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_emotion CHECK (emotion IN ('happy', 'encouraging', 'neutral', 'excited', 'calm', 'curious', 'supportive')),
    CONSTRAINT valid_tts_status CHECK (tts_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT unique_message_chunk UNIQUE (message_id, chunk_index)
);

CREATE INDEX idx_message_chunks_message_id ON message_chunks(message_id);
CREATE INDEX idx_message_chunks_tts_status ON message_chunks(tts_status);
```

### Conversation Events Table (Audit Log)

```sql
CREATE TABLE IF NOT EXISTS conversation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- message-sent, message-received, audio-generated, etc.
    event_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_events_conversation_id ON conversation_events(conversation_id);
CREATE INDEX idx_conversation_events_type ON conversation_events(event_type);
CREATE INDEX idx_conversation_events_created_at ON conversation_events(created_at DESC);
```

---

## Event System

### Event Types

#### Frontend → Backend Events

1. **`conversation:create`**
   ```typescript
   {
     type: 'conversation:create',
     data: {
       userId: string;
       title?: string;
       level?: string;
     }
   }
   ```

2. **`conversation:load`**
   ```typescript
   {
     type: 'conversation:load',
     data: {
       conversationId: string;
     }
   }
   ```

3. **`message:send`**
   ```typescript
   {
     type: 'message:send',
     data: {
       conversationId: string;
       content: string;
       inputMethod: 'text' | 'voice';
       audioBlob?: Blob; // If voice input
     }
   }
   ```

4. **`audio:request`**
   ```typescript
   {
     type: 'audio:request',
     data: {
       chunkId: string;
       messageId: string;
     }
   }
   ```

#### Backend → Frontend Events

1. **`conversation:created`**
   ```typescript
   {
     type: 'conversation:created',
     data: {
       conversationId: string;
       title: string;
       createdAt: string;
     }
   }
   ```

2. **`conversation:loaded`**
   ```typescript
   {
     type: 'conversation:loaded',
     data: {
       conversation: Conversation;
       messages: Message[];
     }
   }
   ```

3. **`message:received`**
   ```typescript
   {
     type: 'message:received',
     data: {
       messageId: string;
       conversationId: string;
       role: 'user' | 'assistant';
       content: string;
       chunks?: Chunk[];
       metadata?: any;
     }
   }
   ```

4. **`chunk:generated`**
   ```typescript
   {
     type: 'chunk:generated',
     data: {
       chunkId: string;
       messageId: string;
       conversationId: string;
       chunkIndex: number;
       text: string;
       emotion?: string;
       icon?: string;
       pause?: number;
       audioFileId?: string;
       audioDuration?: number;
       ttsStatus: 'pending' | 'processing' | 'completed' | 'failed';
     }
   }
   ```

5. **`chunk:audio-ready`**
   ```typescript
   {
     type: 'chunk:audio-ready',
     data: {
       chunkId: string;
       messageId: string;
       audioFileId: string;
       audioUrl: string; // Temporary URL
       duration: number;
     }
   }
   ```

6. **`conversation:error`**
   ```typescript
   {
     type: 'conversation:error',
     data: {
       conversationId: string;
       error: string;
       code: string;
     }
   }
   ```

---

## Conversation Management

### Conversation Lifecycle

```
┌─────────────┐
│   Created   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Active    │ ←──┐
└──────┬──────┘    │
       │           │
       ├───────────┘
       │
       ▼
┌─────────────┐
│   Paused    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Completed  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Archived   │
└─────────────┘
```

### Conversation Manager Responsibilities

1. **Create/Load Conversations**
   - Generate unique IDs
   - Load from database
   - Initialize conversation state

2. **Message Management**
   - Store messages in database
   - Maintain message sequence
   - Load conversation history

3. **State Synchronization**
   - Keep frontend and backend in sync
   - Handle reconnection scenarios
   - Replay missed events

4. **History Management**
   - Load conversation history
   - Pagination support
   - Search functionality

---

## Component Responsibilities

### Frontend Components

#### 1. ConversationStore (Zustand)
- **Responsibilities:**
  - Manage conversation list
  - Current conversation state
  - Message list for current conversation
  - Connection status

#### 2. EventBus (Frontend)
- **Responsibilities:**
  - Emit events to backend
  - Listen to backend events
  - Route events to appropriate handlers
  - Handle WebSocket connection

#### 3. AudioQueueManager
- **Responsibilities:**
  - Queue audio chunks for playback
  - Manage speaker queues (future: multi-speaker)
  - Handle audio pre-fetching
  - Control playback sequence

#### 4. ConversationUI
- **Responsibilities:**
  - Render conversation messages
  - Handle user input (text/voice)
  - Display status indicators
  - Manage conversation list

### Backend Components

#### 1. ConversationService
- **Responsibilities:**
  - Create/load conversations
  - Store messages in database
  - Load conversation history
  - Manage conversation state

#### 2. PipelineService
- **Responsibilities:**
  - Process Ollama responses
  - Generate TTS for chunks
  - Emit chunk events
  - Manage TTS queue

#### 3. EventBus (Backend)
- **Responsibilities:**
  - Broadcast events to connected clients
  - Route events to services
  - Handle WebSocket connections
  - Manage conversation subscriptions

#### 4. DatabaseService
- **Responsibilities:**
  - CRUD operations for conversations
  - CRUD operations for messages
  - CRUD operations for chunks
  - Event logging

---

## Event Flows

### Flow 1: Create New Conversation

```
Frontend                    Backend                    Database
   │                           │                           │
   │── conversation:create ────>│                           │
   │                           │── INSERT conversation ────>│
   │                           │<── conversation_id ────────│
   │<── conversation:created ──│                           │
   │                           │                           │
```

### Flow 2: Send Message (Text)

```
Frontend                    Backend                    Database
   │                           │                           │
   │── message:send ──────────>│                           │
   │                           │── INSERT message ────────>│
   │<── message:received ─────│                           │
   │                           │── Call Ollama ────────────>│
   │                           │<── Structured Response ───│
   │                           │── INSERT chunks ──────────>│
   │<── chunk:generated ───────│                           │
   │<── chunk:generated ───────│                           │
   │                           │── Generate TTS ──────────>│
   │<── chunk:audio-ready ─────│                           │
   │                           │                           │
```

### Flow 3: Send Message (Voice)

```
Frontend                    Backend                    Database
   │                           │                           │
   │── message:send (voice) ──>│                           │
   │                           │── STT Transcription ──────>│
   │                           │── INSERT message ─────────>│
   │<── message:received ─────│                           │
   │                           │── Call Ollama ────────────>│
   │                           │── Generate TTS ──────────>│
   │<── chunk:audio-ready ────│                           │
   │                           │                           │
```

### Flow 4: Audio Playback Queue

```
Frontend AudioQueueManager
   │
   │── chunk:audio-ready received
   │── Check speaker ID
   │── Push to speaker queue
   │── Wake up queue processor
   │
   │── Queue Processor:
   │   ├── Get next chunk
   │   ├── Check if audio ready
   │   ├── Play audio
   │   ├── Wait for pause
   │   └── Process next chunk
   │
   │── Queue empty → Sleep
```

---

## State Management

### Frontend State Structure

```typescript
interface ConversationState {
  // Conversation list
  conversations: Conversation[];
  currentConversationId: string | null;
  
  // Current conversation
  currentConversation: Conversation | null;
  messages: Message[];
  
  // Connection
  wsConnected: boolean;
  wsReconnecting: boolean;
  
  // Audio
  audioQueues: Map<string, AudioQueue>; // speakerId -> queue
  isPlaying: boolean;
  
  // UI
  isLoading: boolean;
  error: string | null;
}
```

### Backend State Structure

```typescript
interface ConversationManagerState {
  // Active conversations
  activeConversations: Map<string, ConversationState>;
  
  // WebSocket connections
  connections: Map<string, WebSocket[]>; // conversationId -> connections
  
  // Pipeline states
  pipelines: Map<string, PipelineState>; // conversationId -> pipeline
}
```

---

## Implementation Plan

### Phase 1: Database & Schema
- [ ] Create database migration for conversations
- [ ] Create database migration for messages
- [ ] Create database migration for chunks
- [ ] Create database migration for events
- [ ] Create database service layer

### Phase 2: Backend Core
- [ ] Create ConversationService
- [ ] Create ConversationManager
- [ ] Create EventBus (Backend)
- [ ] Create WebSocket handler
- [ ] Create database repositories

### Phase 3: Pipeline Integration
- [ ] Refactor PipelineService to use events
- [ ] Integrate with ConversationService
- [ ] Add chunk persistence
- [ ] Add TTS queue management

### Phase 4: Frontend Core
- [ ] Refactor ConversationStore
- [ ] Create EventBus (Frontend)
- [ ] Create WebSocket client
- [ ] Refactor ConversationUI

### Phase 5: Audio System
- [ ] Refactor AudioQueueManager
- [ ] Implement speaker queue system
- [ ] Add audio pre-fetching
- [ ] Add playback controls

### Phase 6: Testing & Polish
- [ ] End-to-end testing
- [ ] Error handling
- [ ] Reconnection logic
- [ ] Performance optimization

---

## Key Design Decisions

1. **Event-Driven Architecture**: All communication via events for loose coupling
2. **Database Persistence**: All conversations stored for history and recovery
3. **Chunk-Level Storage**: Store individual chunks for granular control
4. **Speaker Queues**: Separate queues per speaker for future multi-speaker support
5. **WebSocket for Real-time**: HTTP for initial load, WebSocket for live updates
6. **State Synchronization**: Backend is source of truth, frontend syncs via events

---

## Conversation Memory & Context Management

### Problem Statement

Ollama and other LLMs have token limits. As conversations grow, we need to:
1. Manage which messages to include in context
2. Handle token limits efficiently
3. Maintain conversation coherence
4. Support long-running conversations

### Memory Strategies

#### 1. Sliding Window (Current Messages)
- Keep last N messages in context
- Simple but may lose early context
- Good for short conversations

#### 2. Summarization
- Summarize older messages
- Keep summary + recent messages
- Good for long conversations

#### 3. Hierarchical Memory
- Recent messages (full)
- Medium-term (summarized)
- Long-term (key facts/learnings)
- Best for very long conversations

#### 4. Semantic Search
- Store embeddings of messages
- Retrieve relevant messages by similarity
- Most sophisticated, requires vector DB

### Implementation: Memory Manager

```typescript
interface MemoryManager {
  // Get messages for Ollama context
  getContextMessages(conversationId: string, options: {
    maxTokens?: number;
    strategy?: 'sliding' | 'summarization' | 'hierarchical';
    includeSystemPrompt?: boolean;
  }): Promise<OllamaMessage[]>;
  
  // Summarize conversation history
  summarizeHistory(conversationId: string, upToMessageId: string): Promise<string>;
  
  // Extract key facts/learnings
  extractKeyFacts(conversationId: string): Promise<KeyFact[]>;
  
  // Check if context exceeds token limit
  checkTokenLimit(messages: OllamaMessage[]): boolean;
}
```

### Database Schema Additions

```sql
-- Conversation Summaries Table
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    message_range_start INTEGER NOT NULL, -- First message sequence in summary
    message_range_end INTEGER NOT NULL, -- Last message sequence in summary
    token_count INTEGER, -- Token count of summarized messages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_range CHECK (message_range_start <= message_range_end)
);

CREATE INDEX idx_conversation_summaries_conversation_id ON conversation_summaries(conversation_id);

-- Conversation Key Facts Table
CREATE TABLE IF NOT EXISTS conversation_key_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    fact_type VARCHAR(50) NOT NULL, -- 'user_preference', 'learning_goal', 'weakness', 'strength', etc.
    fact_text TEXT NOT NULL,
    confidence DECIMAL(3, 2) DEFAULT 0.5, -- 0.0 to 1.0
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_confidence CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

CREATE INDEX idx_conversation_key_facts_conversation_id ON conversation_key_facts(conversation_id);
CREATE INDEX idx_conversation_key_facts_type ON conversation_key_facts(fact_type);
```

### Memory Configuration

```sql
-- Add to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS memory_strategy VARCHAR(20) DEFAULT 'sliding';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS max_context_messages INTEGER DEFAULT 20;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS max_context_tokens INTEGER DEFAULT 4000;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS auto_summarize BOOLEAN DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS summarize_threshold INTEGER DEFAULT 50; -- Messages before summarizing

ALTER TABLE conversations ADD CONSTRAINT valid_memory_strategy 
  CHECK (memory_strategy IN ('sliding', 'summarization', 'hierarchical', 'semantic'));
```

### Memory Events

```typescript
// Memory-related events
{
  type: 'memory:context-updated',
  data: {
    conversationId: string;
    messageCount: number;
    tokenCount: number;
    strategy: string;
  }
}

{
  type: 'memory:summarized',
  data: {
    conversationId: string;
    summaryId: string;
    messageRange: { start: number; end: number };
    tokenCount: number;
  }
}

{
  type: 'memory:key-facts-extracted',
  data: {
    conversationId: string;
    facts: KeyFact[];
  }
}
```

---

## Additional Features

### 1. Conversation Templates

Pre-defined conversation starters and scenarios:

```sql
CREATE TABLE IF NOT EXISTS conversation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    level VARCHAR(10) NOT NULL,
    system_prompt TEXT NOT NULL,
    initial_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_level CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'))
);

CREATE INDEX idx_conversation_templates_level ON conversation_templates(level);
```

### 2. Conversation Settings

Per-conversation AI settings:

```sql
-- Add to conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT '{}'::jsonb;

-- Example settings:
-- {
--   "temperature": 0.7,
--   "max_tokens": 2000,
--   "top_p": 0.9,
--   "frequency_penalty": 0.0,
--   "presence_penalty": 0.0,
--   "model": "gemma3:12b"
-- }
```

### 3. Conversation Analytics

Track learning progress and statistics:

```sql
CREATE TABLE IF NOT EXISTS conversation_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- 'word_count', 'time_spent', 'errors_corrected', etc.
    metric_value DECIMAL(10, 2) NOT NULL,
    metric_unit VARCHAR(20), -- 'words', 'seconds', 'count', etc.
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_conversation_metric UNIQUE (conversation_id, metric_name, recorded_at)
);

CREATE INDEX idx_conversation_analytics_conversation_id ON conversation_analytics(conversation_id);
CREATE INDEX idx_conversation_analytics_metric_name ON conversation_analytics(metric_name);
```

### 4. Conversation Tags & Categories

Organize conversations:

```sql
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_conversation_tag UNIQUE (conversation_id, tag)
);

CREATE INDEX idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX idx_conversation_tags_tag ON conversation_tags(tag);
```

### 5. Conversation Export/Import

```sql
-- Add export metadata
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS exported_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS export_format VARCHAR(20); -- 'json', 'pdf', 'txt'
```

### 6. Conversation Branching

Support multiple conversation paths:

```sql
CREATE TABLE IF NOT EXISTS conversation_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    branch_conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    branch_point_message_id UUID NOT NULL REFERENCES messages(id),
    branch_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_branch UNIQUE (parent_conversation_id, branch_conversation_id)
);

CREATE INDEX idx_conversation_branches_parent ON conversation_branches(parent_conversation_id);
CREATE INDEX idx_conversation_branches_branch ON conversation_branches(branch_conversation_id);
```

### 7. Message Reactions & Feedback

User feedback on AI responses:

```sql
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) NOT NULL, -- 'helpful', 'confusing', 'incorrect', 'too_easy', 'too_hard'
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_reaction CHECK (reaction_type IN ('helpful', 'confusing', 'incorrect', 'too_easy', 'too_hard', 'perfect'))
);

CREATE INDEX idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions(user_id);
```

### 8. Conversation Search

Full-text search capabilities:

```sql
-- Add full-text search index
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));
CREATE INDEX idx_conversations_title_search ON conversations USING gin(to_tsvector('english', title));
```

---

## Future Enhancements

1. **Multi-User Conversations**: Support for group conversations
2. **Voice Cloning**: Different voices per speaker
3. **Conversation Analytics Dashboard**: Visual learning progress
4. **Offline Support**: Queue messages when offline
5. **Message Search**: Full-text search in conversations
6. **Export Conversations**: Export to PDF/text/JSON
7. **Conversation Sharing**: Share conversations with teachers/peers
8. **AI Model Switching**: Switch models mid-conversation
9. **Conversation Versioning**: Track changes to conversations
10. **Real-time Collaboration**: Multiple users in same conversation

---

## Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE` for proper timezone handling
- JSONB used for flexible metadata storage
- Indexes optimized for common query patterns
- Cascade deletes ensure data consistency
- Event logging for audit and debugging
- **Memory management is critical for long conversations** - implement early

