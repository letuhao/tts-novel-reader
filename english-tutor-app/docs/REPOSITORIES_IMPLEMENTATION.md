# Database Repositories Implementation

**Date:** 2025-12-21  
**Status:** ✅ Complete

## Overview

Complete database repository layer implemented with TypeScript, providing type-safe database operations for all core entities.

## Repositories Created

### 1. ConversationRepository (`repositories/conversationRepository.ts`)

**Methods:**
- `create(input)` - Create new conversation
- `findById(id)` - Get conversation by ID
- `findByUserId(userId, options?)` - Get conversations by user (paginated)
- `update(id, input)` - Update conversation
- `delete(id)` - Delete conversation
- `updateLastMessageAt(id)` - Update last message timestamp

**Features:**
- Full CRUD operations
- Pagination support
- JSON metadata handling
- Automatic timestamp updates
- Pin/unpin support
- Folder organization

### 2. MessageRepository (`repositories/messageRepository.ts`)

**Methods:**
- `create(input)` - Create new message
- `findById(id)` - Get message by ID
- `findByConversationId(conversationId, options?)` - Get messages by conversation (paginated)
- `getNextSequenceNumber(conversationId)` - Get next sequence number
- `update(id, input)` - Update message (with edit history)
- `delete(id)` - Soft delete message

**Features:**
- Sequence number management
- Edit history tracking
- Soft deletes
- Audio file tracking
- STT transcript storage
- Pagination support

### 3. ChunkRepository (`repositories/chunkRepository.ts`)

**Methods:**
- `create(input)` - Create new chunk
- `createMany(inputs)` - Create multiple chunks (transactional)
- `findById(id)` - Get chunk by ID
- `findByMessageId(messageId)` - Get all chunks for a message
- `update(id, input)` - Update chunk
- `delete(id)` - Delete chunk
- `deleteByMessageId(messageId)` - Delete all chunks for a message

**Features:**
- Batch creation support
- TTS status tracking
- Emotion and icon metadata
- Pause duration tracking
- Emphasis flags

### 4. UserRepository (`repositories/userRepository.ts`)

**Methods:**
- `create(input)` - Create new user
- `findById(id)` - Get user by ID
- `findByEmail(email)` - Get user by email
- `update(id, input)` - Update user
- `delete(id)` - Soft delete user

**Features:**
- Email normalization (lowercase)
- Email verification tracking
- Last login tracking
- CEFR level management

## Types (`repositories/types.ts`)

**Type Definitions:**
- `CEFRLevel` - Language proficiency levels
- `ConversationStatus` - Conversation states
- `MemoryStrategy` - Memory management strategies
- `MessageRole` - Message sender roles
- `TTSStatus` - TTS processing states
- `Emotion` - Emotional tone types

**Interfaces:**
- `Conversation` - Full conversation object
- `CreateConversationInput` - Conversation creation input
- `UpdateConversationInput` - Conversation update input
- `Message` - Full message object
- `CreateMessageInput` - Message creation input
- `UpdateMessageInput` - Message update input
- `MessageChunk` - Full chunk object
- `CreateChunkInput` - Chunk creation input
- `UpdateChunkInput` - Chunk update input
- `User` - Full user object
- `CreateUserInput` - User creation input
- `UpdateUserInput` - User update input
- `PaginationOptions` - Pagination parameters
- `PaginatedResult<T>` - Paginated response

## Design Patterns

### Singleton Pattern
Each repository is exported as a singleton instance:
```typescript
export const conversationRepository = new ConversationRepository();
```

### Repository Pattern
- Separation of concerns (data access vs business logic)
- Type-safe database operations
- Consistent error handling
- Centralized logging

### Transaction Support
- Uses connection pooling
- Transaction management for batch operations
- Automatic rollback on errors

## Usage Examples

### Create Conversation
```typescript
import { conversationRepository } from './repositories';

const conversation = await conversationRepository.create({
  userId: 'user-123',
  title: 'Daily Practice',
  level: 'A1',
  memoryStrategy: 'sliding',
});
```

### Create Message with Chunks
```typescript
import { messageRepository, chunkRepository } from './repositories';

// Get next sequence number
const seqNum = await messageRepository.getNextSequenceNumber(conversationId);

// Create message
const message = await messageRepository.create({
  conversationId,
  role: 'assistant',
  content: 'Hello! How can I help you?',
  sequenceNumber: seqNum,
});

// Create chunks
const chunks = await chunkRepository.createMany([
  {
    messageId: message.id,
    chunkIndex: 0,
    text: 'Hello!',
    emotion: 'happy',
    icon: '😊',
  },
  {
    messageId: message.id,
    chunkIndex: 1,
    text: 'How can I help you?',
    emotion: 'curious',
  },
]);
```

### Get Paginated Conversations
```typescript
const result = await conversationRepository.findByUserId(userId, {
  limit: 20,
  offset: 0,
  orderBy: 'updated_at',
  orderDirection: 'DESC',
});

console.log(`Found ${result.total} conversations`);
console.log(`Showing ${result.items.length} items`);
console.log(`Has more: ${result.hasMore}`);
```

### Update Message with Edit History
```typescript
const updated = await messageRepository.update(messageId, {
  content: 'Updated content',
});

// Edit history is automatically saved
```

## Error Handling

All repositories:
- Log errors with context
- Throw errors for caller to handle
- Use try/catch with proper cleanup
- Release database connections

## Database Features Used

1. **JSONB** - For flexible metadata storage
2. **UUID** - For primary keys
3. **Timestamps** - Automatic created_at/updated_at
4. **Soft Deletes** - Using deleted_at timestamps
5. **Indexes** - Optimized queries
6. **Foreign Keys** - Referential integrity
7. **Constraints** - Data validation

## Integration Points

### With Auth Service
- UserRepository can be used by authService
- Consistent user data access

### With Conversation Pipeline
- MessageRepository for storing messages
- ChunkRepository for storing chunks
- ConversationRepository for conversation management

### With Memory Service (Future)
- ConversationRepository for memory settings
- MessageRepository for context retrieval

## Next Steps

1. **Add Query Methods**
   - Search conversations by title
   - Filter by status/level
   - Get recent conversations

2. **Add Aggregation Methods**
   - Count messages per conversation
   - Get conversation statistics
   - Calculate average response time

3. **Add Caching**
   - Cache frequently accessed conversations
   - Cache user data
   - Invalidate on updates

4. **Add Validation**
   - Input validation before database operations
   - Business rule enforcement

---

**Status:** ✅ Ready for use

