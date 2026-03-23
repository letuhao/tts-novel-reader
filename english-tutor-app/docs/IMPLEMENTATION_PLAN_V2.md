# Implementation Plan v2.0

**Date:** 2025-12-21  
**Status:** Ready to Start  
**Based on:** Requirements Clarification

## Decisions Made

### ✅ User Authentication
- **Decision:** Add user authentication for multiple users
- **Approach:** JWT tokens, session management
- **Phase:** Phase 1 (Core)

### ✅ Memory Management
- **Decision:** Use LangChain `ConversationSummaryBufferMemory` for MVP
- **Approach:** Design with adapter pattern for easy swapping
- **Phase:** Phase 1 (Core)

### ✅ MVP Scope
- **Decision:** Full features implementation
- **Approach:** All features from design documents
- **Phase:** Phased implementation, but all features included

### ✅ Database Approach
- **Decision:** Add logic to migration script (incremental with proper migration system)
- **Approach:** Versioned migrations with rollback support
- **Phase:** Phase 1 (Foundation)

### ✅ Performance
- **Decision:** Not a concern for now (single user)
- **Approach:** Optimize later if needed
- **Note:** Design for scalability but don't over-optimize

---

## Implementation Phases

### Phase 1: Foundation & Core Infrastructure

**Goal:** Set up database, authentication, and core conversation system

#### 1.1 Database Migrations
- [ ] Create migration system with versioning
- [ ] Migration: Users & Authentication tables
- [ ] Migration: Conversations table
- [ ] Migration: Messages table
- [ ] Migration: Message Chunks table
- [ ] Migration: Conversation Events table
- [ ] Migration: Conversation Summaries table
- [ ] Migration: Conversation Key Facts table
- [ ] Migration: Grammar Corrections table
- [ ] Migration: Vocabulary Words table
- [ ] Migration: Daily Progress table
- [ ] Migration: Message Bookmarks table
- [ ] Migration: Conversation Folders table
- [ ] Migration: Conversation Notes table
- [ ] Migration: Conversation Tags table
- [ ] Migration: Conversation Shares table
- [ ] Migration: User Sessions table
- [ ] Migration: User Notifications table
- [ ] Migration: User Achievements table
- [ ] Migration: Conversation Templates table
- [ ] Migration: Message Edit History table
- [ ] Migration: Message Reactions table
- [ ] Add indexes and constraints
- [ ] Add migration rollback support

#### 1.2 Authentication System
- [ ] Create UserService
- [ ] Implement JWT token generation
- [ ] Implement password hashing (bcrypt)
- [ ] Create auth middleware
- [ ] Create login/register endpoints
- [ ] Create session management
- [ ] Add password reset (optional for MVP)

#### 1.3 Database Repositories
- [ ] ConversationRepository
- [ ] MessageRepository
- [ ] ChunkRepository
- [ ] UserRepository
- [ ] GrammarCorrectionRepository
- [ ] VocabularyRepository
- [ ] ProgressRepository

#### 1.4 Memory Service (LangChain with Adapter)
- [ ] Create MemoryService interface
- [ ] Implement LangChainMemoryService (adapter)
- [ ] Design for easy swapping
- [ ] Add configuration support
- [ ] Integrate with ConversationService

---

### Phase 2: Core Conversation System

**Goal:** Event-driven conversation system with persistence

#### 2.1 Conversation Service
- [ ] Create ConversationService
- [ ] Implement CRUD operations
- [ ] Implement conversation state management
- [ ] Add conversation history loading
- [ ] Add conversation search

#### 2.2 Conversation Manager
- [ ] Create ConversationManager
- [ ] Implement active conversation tracking
- [ ] Implement WebSocket connection management
- [ ] Add conversation state synchronization

#### 2.3 Event Bus (Backend)
- [ ] Create EventBus service
- [ ] Implement WebSocket event routing
- [ ] Add event broadcasting
- [ ] Add conversation subscriptions
- [ ] Implement event logging

#### 2.4 Pipeline Service Refactor
- [ ] Refactor to use new event system
- [ ] Integrate with ConversationService
- [ ] Add chunk persistence
- [ ] Update to emit new event types

---

### Phase 3: Frontend Core

**Goal:** Event-driven frontend with new state management

#### 3.1 Frontend Event Bus
- [ ] Create WebSocket client service
- [ ] Implement event routing
- [ ] Add reconnection logic
- [ ] Add event queuing for offline

#### 3.2 Conversation Store Refactor
- [ ] Refactor to new state structure
- [ ] Add conversation list management
- [ ] Add current conversation state
- [ ] Add message management
- [ ] Add connection status

#### 3.3 Audio Queue Manager
- [ ] Refactor to speaker queue system
- [ ] Implement queue processor
- [ ] Add audio pre-fetching
- [ ] Add playback controls

#### 3.4 Conversation UI
- [ ] Refactor Conversation component
- [ ] Add conversation list sidebar
- [ ] Add conversation settings
- [ ] Add message rendering
- [ ] Add status indicators

---

### Phase 4: Memory Management Integration

**Goal:** Integrate LangChain memory with conversation system

#### 4.1 LangChain Integration
- [ ] Install LangChain packages
- [ ] Configure LangChain with Ollama
- [ ] Implement ConversationSummaryBufferMemory
- [ ] Add token limit management
- [ ] Add summarization triggers

#### 4.2 Memory Service Integration
- [ ] Integrate with ConversationService
- [ ] Add context building for Ollama
- [ ] Add memory persistence
- [ ] Add memory configuration

#### 4.3 Key Facts Extraction
- [ ] Implement fact extraction service
- [ ] Add fact storage
- [ ] Add fact retrieval
- [ ] Integrate with memory service

---

### Phase 5: Learning Features

**Goal:** Grammar correction, vocabulary tracking, progress

#### 5.1 Grammar Correction
- [ ] Create GrammarService
- [ ] Implement error detection (using Ollama or library)
- [ ] Add correction storage
- [ ] Add correction display
- [ ] Add correction statistics

#### 5.2 Vocabulary Tracking
- [ ] Create VocabularyService
- [ ] Implement word extraction
- [ ] Add word storage
- [ ] Add vocabulary quiz system
- [ ] Add spaced repetition

#### 5.3 Progress Tracking
- [ ] Create ProgressService
- [ ] Implement daily progress tracking
- [ ] Add progress analytics
- [ ] Add progress charts
- [ ] Add learning streaks

---

### Phase 6: Additional Features

**Goal:** Sharing, bookmarks, folders, notes, etc.

#### 6.1 Message Management
- [ ] Implement message editing
- [ ] Implement message deletion
- [ ] Add edit history
- [ ] Add soft delete

#### 6.2 Conversation Organization
- [ ] Implement conversation folders
- [ ] Implement conversation tags
- [ ] Implement conversation pinning
- [ ] Add conversation search

#### 6.3 Sharing & Collaboration
- [ ] Implement conversation sharing
- [ ] Add shareable links
- [ ] Add password protection
- [ ] Add view-only access

#### 6.4 User Experience
- [ ] Add typing indicators
- [ ] Add conversation bookmarks
- [ ] Add conversation notes
- [ ] Add UI themes
- [ ] Add keyboard shortcuts

---

### Phase 7: Polish & Optimization

**Goal:** Testing, performance, documentation

#### 7.1 Testing
- [ ] Unit tests for services
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests

#### 7.2 Documentation
- [ ] API documentation
- [ ] Architecture documentation
- [ ] User guides
- [ ] Developer guides

#### 7.3 Optimization
- [ ] Database query optimization
- [ ] Caching implementation
- [ ] Frontend performance
- [ ] Bundle size optimization

---

## Technical Architecture Decisions

### Memory Service Design (Swappable)

```typescript
// Interface for memory service
interface IMemoryService {
  getContextMessages(
    conversationId: string,
    options: MemoryOptions
  ): Promise<OllamaMessage[]>;
  
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void>;
  
  clearMemory(conversationId: string): Promise<void>;
}

// LangChain implementation
class LangChainMemoryService implements IMemoryService {
  // Implementation using LangChain
}

// Custom implementation (future)
class CustomMemoryService implements IMemoryService {
  // Custom implementation
}

// Factory for easy swapping
class MemoryServiceFactory {
  static create(type: 'langchain' | 'custom'): IMemoryService {
    switch (type) {
      case 'langchain':
        return new LangChainMemoryService();
      case 'custom':
        return new CustomMemoryService();
    }
  }
}
```

### Migration System Design

```typescript
// Migration structure
interface Migration {
  version: number;
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

// Migration runner
class MigrationRunner {
  async runMigrations(): Promise<void> {
    // Check current version
    // Run pending migrations
    // Update version
  }
  
  async rollback(version: number): Promise<void> {
    // Rollback to specific version
  }
}
```

---

## File Structure

```
backend/
├── src/
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_users_auth.sql
│   │   │   ├── 002_conversations.sql
│   │   │   ├── 003_messages.sql
│   │   │   ├── 004_chunks.sql
│   │   │   ├── 005_memory.sql
│   │   │   ├── 006_learning.sql
│   │   │   └── ...
│   │   ├── migrationRunner.ts
│   │   └── connection.ts
│   ├── services/
│   │   ├── auth/
│   │   │   └── authService.ts
│   │   ├── conversation/
│   │   │   ├── conversationService.ts
│   │   │   ├── conversationManager.ts
│   │   │   └── pipelineService.ts
│   │   ├── memory/
│   │   │   ├── memoryService.interface.ts
│   │   │   ├── langchainMemoryService.ts
│   │   │   └── memoryServiceFactory.ts
│   │   ├── grammar/
│   │   │   └── grammarService.ts
│   │   ├── vocabulary/
│   │   │   └── vocabularyService.ts
│   │   └── progress/
│   │       └── progressService.ts
│   ├── repositories/
│   │   ├── conversationRepository.ts
│   │   ├── messageRepository.ts
│   │   └── ...
│   └── routes/
│       ├── auth.ts
│       ├── conversations.ts
│       └── ...
```

---

## Next Steps

1. **Start with Phase 1.1**: Create migration system and all database tables
2. **Then Phase 1.2**: Implement authentication
3. **Then Phase 1.3**: Create repositories
4. **Then Phase 1.4**: Implement memory service with adapter pattern

Ready to start! 🚀

