# Memory Service Implementation

**Date:** 2025-12-21  
**Status:** ✅ Complete

## Overview

Memory service implemented with LangChain adapter pattern, providing conversation context management with support for multiple memory strategies.

## Components Created

### 1. Memory Types (`services/memory/types.ts`)

**Types:**
- `MemoryStrategy` - Memory management strategies
- `MemoryMessage` - Message structure for memory
- `MemoryContext` - Full memory context with messages, summary, and token count
- `MemoryService` - Interface for memory service implementations
- `MemoryServiceConfig` - Configuration for memory services

### 2. LangChain Adapter (`services/memory/langchainAdapter.ts`)

**Implementation:**
- `SimpleConversationBuffer` - In-memory conversation buffer with token management
- `LangChainMemoryAdapter` - Adapter implementing MemoryService interface

**Features:**
- Token-based trimming (removes oldest messages when over limit)
- Message storage using LangChain message types
- Summary support (placeholder for future implementation)
- Token count estimation (1 token ≈ 4 characters)

**Methods:**
- `saveContext(input, output)` - Save conversation turn
- `loadMemoryVariables()` - Load memory context
- `clear()` - Clear all memory
- `getTokenCount()` - Get current token count
- `getSummary()` - Get memory summary

### 3. Memory Service Factory (`services/memory/memoryServiceFactory.ts`)

**Functions:**
- `createMemoryService(config)` - Factory function to create memory services
- `MemoryServiceRegistry` - Registry for managing memory service instances

**Features:**
- Singleton pattern for memory services per conversation
- Easy swapping of memory providers
- Automatic cleanup

### 4. Conversation Memory Service (`services/memory/memoryService.ts`)

**Main Service:**
- `ConversationMemoryService` - High-level service for managing conversation memory

**Methods:**
- `getMemoryService(conversationId)` - Get or create memory service for conversation
- `saveContext(conversationId, input, output)` - Save conversation turn
- `getMemoryContext(conversationId)` - Get memory context
- `clearMemory(conversationId)` - Clear memory
- `getSummary(conversationId)` - Get summary
- `getTokenCount(conversationId)` - Get token count

**Features:**
- Automatic loading of conversation history from database
- Integration with conversation repository
- Per-conversation memory management

## Design Patterns

### Adapter Pattern
- `MemoryService` interface defines the contract
- `LangChainMemoryAdapter` implements the interface
- Easy to swap implementations (e.g., Mem0, custom PostgreSQL-based)

### Factory Pattern
- `createMemoryService()` creates appropriate adapter
- Registry manages service instances
- Configuration-driven creation

### Singleton Pattern
- One memory service per conversation
- Reused across requests
- Automatic cleanup

## Usage Examples

### Initialize Memory Service
```typescript
import { conversationMemoryService } from './services/memory';

// Memory service is automatically created when needed
// It loads conversation settings from database
```

### Save Conversation Turn
```typescript
await conversationMemoryService.saveContext(
  conversationId,
  "Hello, I'm learning English",
  "Great! I'm here to help you learn."
);
```

### Get Memory Context
```typescript
const context = await conversationMemoryService.getMemoryContext(conversationId);

console.log(`Messages: ${context.messages.length}`);
console.log(`Token count: ${context.tokenCount}`);
if (context.summary) {
  console.log(`Summary: ${context.summary}`);
}
```

### Use in Conversation Pipeline
```typescript
// Before sending to Ollama
const memoryContext = await conversationMemoryService.getMemoryContext(conversationId);
const messages = memoryContext.messages.map(msg => ({
  role: msg.role,
  content: msg.content,
}));

// Send to Ollama with context
const response = await ollamaService.chat({
  messages: [...messages, { role: 'user', content: userInput }],
});

// Save to memory
await conversationMemoryService.saveContext(userInput, response.content);
```

## Memory Strategies

Currently implemented:
- **Sliding Window** - Keeps last N messages (token-based)

Future strategies (can be added):
- **Summarization** - Summarizes old messages, keeps recent
- **Hierarchical** - Multi-level memory structure
- **Semantic** - Vector-based retrieval

## Configuration

Memory service configuration comes from conversation settings:
- `memoryStrategy` - Strategy to use
- `maxContextMessages` - Max messages to keep
- `maxContextTokens` - Max tokens to keep
- `autoSummarize` - Auto-summarize when threshold reached
- `summarizeThreshold` - Token count to trigger summarization

## Integration Points

### With Conversation Repository
- Loads conversation settings
- Uses conversation ID for memory isolation

### With Message Repository
- Loads existing messages into memory on initialization
- Syncs with database messages

### With Ollama Service (Future)
- Provides context for Ollama requests
- Maintains conversation history

## Token Management

- **Estimation**: 1 token ≈ 4 characters (rough estimate)
- **Trimming**: Automatically removes oldest messages when over limit
- **Tracking**: Real-time token count available

## Future Enhancements

1. **Summarization**
   - Use Ollama LLM to summarize old messages
   - Store summaries in database
   - Load summaries instead of full history

2. **Database Persistence**
   - Store memory state in PostgreSQL
   - Load from database on service creation
   - Sync memory with database

3. **Vector Search**
   - Implement semantic memory strategy
   - Use vector embeddings for retrieval
   - Better context selection

4. **Key Facts Extraction**
   - Extract important facts from conversations
   - Store in `conversation_key_facts` table
   - Use for long-term memory

## Notes

- Current implementation uses in-memory storage
- Memory is lost on server restart (will be fixed with database persistence)
- Token counting is approximate (can be improved with actual tokenizer)
- Summarization is placeholder (will be implemented with Ollama)

---

**Status:** ✅ Ready for integration with conversation pipeline

