# Conversation Memory Management Design

**Date:** 2025-12-21  
**Status:** Design Phase

## Overview

This document details the conversation memory/context management system for maintaining AI conversation history within token limits.

## Available Libraries & Frameworks

### 1. LangChain Memory (Recommended for MVP)

**Why LangChain:**
- Most popular and well-documented
- Multiple memory types out of the box
- Easy integration with Ollama
- Active community and support

**Memory Types Available:**
- `ConversationBufferMemory` - Full history
- `ConversationBufferWindowMemory` - Last N messages
- `ConversationSummaryMemory` - Summarized history
- `ConversationSummaryBufferMemory` - Summary + recent
- `EntityMemory` - Extract and remember entities
- `VectorStoreRetrieverMemory` - Vector-based retrieval

**Installation:**
```bash
npm install langchain @langchain/core
# or
pip install langchain
```

**Example Usage:**
```typescript
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatOllama } from "@langchain/ollama";

const memory = new ConversationSummaryBufferMemory({
  llm: new ChatOllama({ model: "gemma3:12b" }),
  maxTokenLimit: 4000,
  returnMessages: true,
});

// Save context
await memory.saveContext(
  { input: "Hello, I'm learning English" },
  { output: "Great! I'm here to help you learn." }
);

// Load memory variables
const memoryVariables = await memory.loadMemoryVariables({});
```

### 2. Mem0 (Advanced Option)

**Why Mem0:**
- Graph-based memory representation
- Dynamic extraction and consolidation
- Better for long-term coherence
- Research-backed architecture

**Features:**
- Automatic fact extraction
- Relationship mapping
- Multi-session consistency
- Graph-based retrieval

**Installation:**
```bash
pip install mem0ai
```

**Example Usage:**
```python
from mem0 import Memory

memory = Memory()

# Add memories
memory.add(
    messages=[
        {"role": "user", "content": "I love learning English"},
        {"role": "assistant", "content": "That's great! What would you like to learn?"}
    ]
)

# Query memories
memories = memory.search("user interests")
```

### 3. LangSwarm Memory (Enterprise)

**Why LangSwarm:**
- Enterprise-grade features
- Multiple backends (SQLite, Redis, Vector stores)
- Auto-summarization
- High-performance async

**Installation:**
```bash
pip install langswarm-memory
```

### 4. ChatMemory (PostgreSQL-based)

**Why ChatMemory:**
- PostgreSQL integration (we already use it!)
- Vector search on summaries
- Omnichannel support
- Simple single-file implementation

**Installation:**
```bash
pip install chatmemory
```

### 5. ENGRAM (Lightweight)

**Why ENGRAM:**
- Three memory types: episodic, semantic, procedural
- Lightweight architecture
- State-of-the-art benchmarks
- Single router/retriever

**Research Paper:** [arXiv:2511.12960](https://arxiv.org/abs/2511.12960)

### 6. MFCS Memory (Vector-based)

**Why MFCS:**
- Vector storage with Qdrant
- Intelligent chunking
- Asynchronous support
- Dynamic response strategies

**Installation:**
```bash
pip install mfcs-memory
```

---

## Recommendation

### For MVP: **LangChain Memory**

**Reasons:**
1. ✅ Most mature and documented
2. ✅ Easy integration with Ollama
3. ✅ Multiple memory strategies built-in
4. ✅ TypeScript/JavaScript support
5. ✅ Active community

**Implementation Strategy:**
- Start with `ConversationSummaryBufferMemory` for MVP
- Can upgrade to more advanced strategies later
- Easy to switch between memory types

### For Advanced: **Mem0 or Custom Implementation**

**When to consider:**
- Need graph-based relationships
- Very long conversations (1000+ messages)
- Need automatic fact extraction
- Multi-session consistency critical

---

## Integration with Our System

### Option 1: Use LangChain Memory (Recommended)

```typescript
// backend/src/services/memory/langchainMemoryService.ts
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatOllama } from "@langchain/ollama";
import { OllamaService } from "../ollama/ollamaService";

export class LangChainMemoryService {
  private memory: ConversationSummaryBufferMemory;
  
  constructor(private ollamaService: OllamaService) {
    this.memory = new ConversationSummaryBufferMemory({
      llm: new ChatOllama({
        model: "gemma3:12b",
        baseUrl: "http://localhost:11434"
      }),
      maxTokenLimit: 4000,
      returnMessages: true,
    });
  }
  
  async getContextMessages(conversationId: string): Promise<OllamaMessage[]> {
    // Load from database
    const messages = await this.loadMessagesFromDB(conversationId);
    
    // Add to memory
    for (const msg of messages) {
      await this.memory.saveContext(
        { input: msg.role === 'user' ? msg.content : '' },
        { output: msg.role === 'assistant' ? msg.content : '' }
      );
    }
    
    // Get memory variables
    const memoryVariables = await this.memory.loadMemoryVariables({});
    return memoryVariables.history || [];
  }
  
  async addMessage(conversationId: string, role: string, content: string) {
    if (role === 'user') {
      await this.memory.saveContext({ input: content }, { output: '' });
    } else {
      await this.memory.saveContext({ input: '' }, { output: content });
    }
  }
}
```

### Option 2: Custom Implementation (More Control)

Keep our custom implementation but learn from these libraries:
- Use LangChain's summarization techniques
- Implement Mem0's fact extraction ideas
- Use ENGRAM's memory type organization

---

## Comparison Table

| Library | Complexity | PostgreSQL | Vector DB | Summarization | Fact Extraction | Best For |
|---------|-----------|------------|-----------|---------------|-----------------|----------|
| **LangChain** | Low | ❌ | Optional | ✅ | ✅ | MVP, Quick Start |
| **Mem0** | Medium | ❌ | ✅ | ✅ | ✅ | Advanced, Long-term |
| **LangSwarm** | Medium | ✅ | ✅ | ✅ | ❌ | Enterprise |
| **ChatMemory** | Low | ✅ | ✅ | ✅ | ❌ | PostgreSQL Users |
| **ENGRAM** | Low | ❌ | Optional | ✅ | ✅ | Research, Lightweight |
| **MFCS** | Medium | ❌ | ✅ | ✅ | ❌ | Vector-based |
| **Custom** | High | ✅ | Optional | ✅ | ✅ | Full Control |

---

## Decision: Hybrid Approach

**Recommended:** Start with LangChain for MVP, then enhance with custom features:

1. **Phase 1 (MVP)**: Use LangChain `ConversationSummaryBufferMemory`
2. **Phase 2**: Add custom fact extraction (inspired by Mem0)
3. **Phase 3**: Add vector search for semantic retrieval
4. **Phase 4**: Full custom implementation if needed

This gives us:
- ✅ Quick start with proven library
- ✅ Flexibility to customize
- ✅ Can migrate away if needed
- ✅ Best of both worlds

## Problem Statement

### Challenges

1. **Token Limits**: Ollama models have context window limits (e.g., 8K, 32K tokens)
2. **Context Window**: Need to include relevant history for coherent conversations
3. **Performance**: Sending too many messages slows down responses
4. **Cost**: More tokens = more processing time
5. **Coherence**: Must maintain conversation flow and context

### Example Scenario

```
Conversation has 100 messages
Each message ~200 tokens
Total: 20,000 tokens
Model limit: 8,000 tokens
Problem: Can't fit all messages!
```

---

## Memory Strategies

### Strategy 1: Sliding Window (Default)

**How it works:**
- Keep last N messages in context
- Drop oldest messages when limit reached
- Simple and fast

**Pros:**
- Simple implementation
- Fast (no processing needed)
- Always recent context

**Cons:**
- Loses early conversation context
- May forget important facts

**Configuration:**
```typescript
{
  strategy: 'sliding',
  maxMessages: 20,
  maxTokens: 4000
}
```

### Strategy 2: Summarization

**How it works:**
- Summarize older messages
- Keep summary + recent messages
- Best for long conversations

**Pros:**
- Preserves important context
- Handles very long conversations
- Maintains key facts

**Cons:**
- Requires summarization step
- May lose nuance
- Additional processing time

**Configuration:**
```typescript
{
  strategy: 'summarization',
  maxRecentMessages: 10,
  summarizeAfter: 20, // Summarize after 20 messages
  maxTokens: 4000
}
```

### Strategy 3: Hierarchical Memory

**How it works:**
- Recent: Full messages (last 10)
- Medium: Summarized (messages 11-50)
- Long-term: Key facts extracted (all messages)

**Pros:**
- Best context preservation
- Handles very long conversations
- Maintains both detail and overview

**Cons:**
- Complex implementation
- Requires multiple processing steps
- More storage needed

**Configuration:**
```typescript
{
  strategy: 'hierarchical',
  recentMessages: 10,
  mediumTermMessages: 40,
  extractFactsAfter: 50,
  maxTokens: 4000
}
```

### Strategy 4: Semantic Search (Future)

**How it works:**
- Store message embeddings
- Retrieve relevant messages by similarity
- Most sophisticated approach

**Pros:**
- Retrieves most relevant context
- Not limited by recency
- Best for complex queries

**Cons:**
- Requires vector database
- More complex infrastructure
- Higher latency

---

## Implementation

### Memory Manager Service

```typescript
interface MemoryManager {
  /**
   * Get messages formatted for Ollama context
   */
  getContextMessages(
    conversationId: string,
    options: MemoryOptions
  ): Promise<OllamaMessage[]>;

  /**
   * Summarize a range of messages
   */
  summarizeMessages(
    conversationId: string,
    startSequence: number,
    endSequence: number
  ): Promise<ConversationSummary>;

  /**
   * Extract key facts from conversation
   */
  extractKeyFacts(
    conversationId: string
  ): Promise<KeyFact[]>;

  /**
   * Check if context fits within token limit
   */
  checkTokenLimit(
    messages: OllamaMessage[],
    maxTokens: number
  ): boolean;

  /**
   * Estimate token count
   */
  estimateTokens(messages: OllamaMessage[]): number;
}

interface MemoryOptions {
  maxTokens?: number;
  strategy?: 'sliding' | 'summarization' | 'hierarchical';
  includeSystemPrompt?: boolean;
  includeKeyFacts?: boolean;
}
```

### Sliding Window Implementation

```typescript
async getContextMessages(
  conversationId: string,
  options: MemoryOptions
): Promise<OllamaMessage[]> {
  const maxMessages = options.maxMessages || 20;
  const maxTokens = options.maxTokens || 4000;
  
  // Get recent messages from database
  const messages = await db.getRecentMessages(
    conversationId,
    maxMessages
  );
  
  // Format for Ollama
  const ollamaMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  // Check token limit
  let tokenCount = this.estimateTokens(ollamaMessages);
  
  // Remove oldest messages until under limit
  while (tokenCount > maxTokens && ollamaMessages.length > 1) {
    ollamaMessages.shift(); // Remove oldest
    tokenCount = this.estimateTokens(ollamaMessages);
  }
  
  return ollamaMessages;
}
```

### Summarization Implementation

```typescript
async getContextMessages(
  conversationId: string,
  options: MemoryOptions
): Promise<OllamaMessage[]> {
  const recentCount = 10;
  const summarizeAfter = 20;
  
  // Get total message count
  const totalMessages = await db.getMessageCount(conversationId);
  
  // Get recent messages
  const recentMessages = await db.getRecentMessages(
    conversationId,
    recentCount
  );
  
  // Get or create summary for older messages
  let summary: ConversationSummary | null = null;
  if (totalMessages > summarizeAfter) {
    summary = await this.getOrCreateSummary(
      conversationId,
      1, // Start from beginning
      totalMessages - recentCount // Up to recent messages
    );
  }
  
  // Build context
  const context: OllamaMessage[] = [];
  
  // Add system prompt
  if (options.includeSystemPrompt) {
    context.push({
      role: 'system',
      content: this.getSystemPrompt(conversationId)
    });
  }
  
  // Add summary if exists
  if (summary) {
    context.push({
      role: 'system',
      content: `Previous conversation summary: ${summary.summaryText}`
    });
  }
  
  // Add recent messages
  context.push(...recentMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  })));
  
  return context;
}
```

### Key Facts Extraction

```typescript
interface KeyFact {
  type: 'user_preference' | 'learning_goal' | 'weakness' | 'strength' | 'interest';
  fact: string;
  confidence: number; // 0.0 to 1.0
  sourceMessageIds: string[];
}

async extractKeyFacts(conversationId: string): Promise<KeyFact[]> {
  // Get all messages
  const messages = await db.getAllMessages(conversationId);
  
  // Use Ollama to extract facts
  const prompt = `Extract key facts about the user from this conversation:
${messages.map(m => m.content).join('\n')}

Return JSON array of facts with type, fact, and confidence.`;
  
  const response = await ollama.generate(prompt);
  const facts = JSON.parse(response);
  
  // Store in database
  await db.storeKeyFacts(conversationId, facts);
  
  return facts;
}
```

---

## Database Schema

See main design document for full schema. Key tables:

1. **conversation_summaries** - Store message summaries
2. **conversation_key_facts** - Store extracted facts
3. **conversations.memory_strategy** - Strategy per conversation
4. **conversations.max_context_tokens** - Token limit per conversation

---

## Events

### memory:context-updated
```typescript
{
  type: 'memory:context-updated',
  data: {
    conversationId: string;
    messageCount: number;
    tokenCount: number;
    strategy: string;
    includedSummaries: number;
    includedFacts: number;
  }
}
```

### memory:summarized
```typescript
{
  type: 'memory:summarized',
  data: {
    conversationId: string;
    summaryId: string;
    messageRange: { start: number; end: number };
    tokenCount: number;
    summaryText: string;
  }
}
```

### memory:key-facts-extracted
```typescript
{
  type: 'memory:key-facts-extracted',
  data: {
    conversationId: string;
    facts: KeyFact[];
    count: number;
  }
}
```

---

## Configuration

### Per-Conversation Settings

```sql
-- Default memory settings
UPDATE conversations SET
  memory_strategy = 'sliding',
  max_context_messages = 20,
  max_context_tokens = 4000,
  auto_summarize = false,
  summarize_threshold = 50
WHERE id = 'conversation-id';
```

### System-Wide Settings

```sql
-- System settings for memory
INSERT INTO system_settings (key, value, type, description, category) VALUES
  ('memory.default_strategy', 'sliding', 'string', 'Default memory strategy', 'memory'),
  ('memory.default_max_messages', '20', 'number', 'Default max messages in context', 'memory'),
  ('memory.default_max_tokens', '4000', 'number', 'Default max tokens in context', 'memory'),
  ('memory.auto_summarize', 'false', 'boolean', 'Auto-summarize long conversations', 'memory'),
  ('memory.summarize_threshold', '50', 'number', 'Messages before auto-summarize', 'memory'),
  ('memory.token_estimation_method', 'approximate', 'string', 'Token estimation method', 'memory')
ON CONFLICT (key) DO NOTHING;
```

---

## Token Estimation

### Methods

1. **Approximate**: `tokens ≈ characters / 4` (fast, less accurate)
2. **Exact**: Use tokenizer (accurate, slower)
3. **Cached**: Store token count with messages (fastest, requires storage)

### Implementation

```typescript
estimateTokens(messages: OllamaMessage[]): number {
  const method = this.config.tokenEstimationMethod || 'approximate';
  
  switch (method) {
    case 'approximate':
      return messages.reduce((sum, msg) => {
        return sum + Math.ceil((msg.content.length) / 4);
      }, 0);
    
    case 'exact':
      return this.tokenizer.encode(messages).length;
    
    case 'cached':
      return messages.reduce((sum, msg) => {
        return sum + (msg.tokenCount || this.estimateSingle(msg));
      }, 0);
  }
}
```

---

## Best Practices

1. **Start Simple**: Use sliding window for MVP
2. **Monitor Token Usage**: Log token counts for analysis
3. **Progressive Enhancement**: Add summarization when needed
4. **Cache Summaries**: Don't re-summarize same messages
5. **User Control**: Let users choose memory strategy
6. **Performance**: Cache token counts, use approximate estimation
7. **Testing**: Test with various conversation lengths

---

## Migration Path

1. **Phase 1**: Implement sliding window (simple)
2. **Phase 2**: Add summarization capability
3. **Phase 3**: Add key facts extraction
4. **Phase 4**: Add hierarchical memory
5. **Phase 5**: Add semantic search (future)

---

## Example Usage

```typescript
// Get context for new message
const memoryManager = new MemoryManager();
const context = await memoryManager.getContextMessages(
  conversationId,
  {
    strategy: 'summarization',
    maxTokens: 4000,
    includeSystemPrompt: true,
    includeKeyFacts: true
  }
);

// Send to Ollama
const response = await ollama.chat({
  messages: context,
  model: 'gemma3:12b'
});
```

