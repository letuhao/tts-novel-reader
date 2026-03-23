# Database Schema - LangGraph Integration
## Database Schema - Tích Hợp LangGraph

**Date:** 2025-01-XX  
**Status:** 🚧 Design Phase

---

## 📋 Overview

Database schema for LangGraph checkpointing and integration with existing database.

---

## 🗄️ LangGraph Checkpointing Tables

### 1. Checkpoints Table (LangGraph)

LangGraph creates these tables automatically:

```sql
-- Created by LangGraph PostgresSaver
CREATE TABLE checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE INDEX checkpoints_thread_id_idx ON checkpoints(thread_id);
CREATE INDEX checkpoints_parent_checkpoint_id_idx ON checkpoints(parent_checkpoint_id);
```

**Usage:**
- `thread_id` = `conversation_id`
- Stores workflow state at each checkpoint
- Enables state resumption

---

## 🔗 Integration with Existing Schema

### Existing Tables (from english-tutor-app)

- `conversations` - Conversation metadata
- `messages` - Messages
- `message_chunks` - Chunks with TTS data
- `users` - User data

### Integration Points

1. **Checkpoint `thread_id` = `conversation_id`**
   - Use same conversation IDs
   - Link checkpoints to conversations

2. **Save workflow results to existing tables**
   - Save messages to `messages` table
   - Save chunks to `message_chunks` table

3. **Query existing data**
   - Load conversation history from `messages`
   - Use for workflow initialization

---

## 📊 Data Flow

```
Workflow Execution
    ↓
State Checkpointed → checkpoints table (LangGraph)
    ↓
Save Results → messages, message_chunks tables (Existing)
    ↓
Query History → messages table → Workflow State
```

---

## ✅ Next Steps

1. ✅ Database schema defined (this document)
2. ⏳ Setup checkpointer
3. ⏳ Test checkpointing
4. ⏳ Integrate with existing tables

---

**Document Version:** 1.0  
**Status:** 🚧 Design Phase

