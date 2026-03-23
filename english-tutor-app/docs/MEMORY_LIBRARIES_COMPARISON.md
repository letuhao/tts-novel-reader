# Memory Management Libraries Comparison

**Quick reference for choosing a memory management library**

## Quick Decision Guide

### Choose LangChain if:
- ✅ You want to start quickly
- ✅ You need proven, well-documented solution
- ✅ You're using TypeScript/JavaScript
- ✅ You want multiple memory strategies out of the box
- ✅ You need active community support

### Choose Mem0 if:
- ✅ You need graph-based memory relationships
- ✅ You have very long conversations (1000+ messages)
- ✅ You need automatic fact extraction
- ✅ You need multi-session consistency
- ✅ You're doing research/advanced use cases

### Choose Custom if:
- ✅ You need full control
- ✅ You want PostgreSQL integration
- ✅ You have specific requirements
- ✅ You want to learn/understand internals
- ✅ You have time to build it

---

## Detailed Comparison

### LangChain Memory

**Pros:**
- Most popular (huge community)
- Excellent documentation
- Multiple memory types
- Easy Ollama integration
- TypeScript support
- Actively maintained

**Cons:**
- Can be heavy (many dependencies)
- Less control over internals
- May be overkill for simple use cases

**Best For:** MVP, Production apps, Quick development

**Code Example:**
```typescript
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatOllama } from "@langchain/ollama";

const memory = new ConversationSummaryBufferMemory({
  llm: new ChatOllama({ model: "gemma3:12b" }),
  maxTokenLimit: 4000,
});
```

---

### Mem0

**Pros:**
- Graph-based (better relationships)
- Automatic fact extraction
- Research-backed
- Good for long conversations
- Dynamic consolidation

**Cons:**
- Less documentation
- Python-focused
- More complex
- Smaller community

**Best For:** Advanced use cases, Research, Long conversations

**Code Example:**
```python
from mem0 import Memory

memory = Memory()
memory.add(messages=[...])
memories = memory.search("user interests")
```

---

### LangSwarm Memory

**Pros:**
- Enterprise features
- Multiple backends
- Auto-summarization
- High performance
- Async support

**Cons:**
- Newer (less mature)
- Smaller community
- Python only

**Best For:** Enterprise apps, High performance needs

---

### ChatMemory

**Pros:**
- PostgreSQL native
- Vector search
- Simple implementation
- Omnichannel support

**Cons:**
- Less features
- Smaller community
- Python only

**Best For:** PostgreSQL users, Simple needs

---

### ENGRAM

**Pros:**
- Lightweight
- Three memory types
- State-of-the-art results
- Research-backed

**Cons:**
- Research project (may not be production-ready)
- Less documentation
- Smaller community

**Best For:** Research, Learning, Lightweight needs

---

### MFCS Memory

**Pros:**
- Vector-based
- Intelligent chunking
- Async support
- Dynamic strategies

**Cons:**
- Requires Qdrant
- Less documentation
- Smaller community

**Best For:** Vector-based retrieval, Semantic search

---

## Integration Examples

### LangChain Integration (TypeScript)

```typescript
// backend/src/services/memory/langchainMemoryService.ts
import { ConversationSummaryBufferMemory } from "langchain/memory";
import { ChatOllama } from "@langchain/ollama";
import type { OllamaMessage } from "../../types";

export class LangChainMemoryService {
  private memories = new Map<string, ConversationSummaryBufferMemory>();
  
  constructor(private ollamaUrl: string) {}
  
  private getMemory(conversationId: string): ConversationSummaryBufferMemory {
    if (!this.memories.has(conversationId)) {
      this.memories.set(
        conversationId,
        new ConversationSummaryBufferMemory({
          llm: new ChatOllama({
            model: "gemma3:12b",
            baseUrl: this.ollamaUrl
          }),
          maxTokenLimit: 4000,
          returnMessages: true,
        })
      );
    }
    return this.memories.get(conversationId)!;
  }
  
  async getContextMessages(conversationId: string): Promise<OllamaMessage[]> {
    const memory = this.getMemory(conversationId);
    const variables = await memory.loadMemoryVariables({});
    return variables.history || [];
  }
  
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ) {
    const memory = this.getMemory(conversationId);
    
    if (role === 'user') {
      await memory.saveContext({ input: content }, { output: '' });
    } else {
      await memory.saveContext({ input: '' }, { output: content });
    }
  }
}
```

### Custom Implementation (Inspired by Libraries)

```typescript
// backend/src/services/memory/customMemoryService.ts
export class CustomMemoryService {
  // Implement sliding window (like LangChain BufferWindowMemory)
  async getSlidingWindow(conversationId: string, maxMessages: number) {
    // Get last N messages from database
  }
  
  // Implement summarization (like LangChain SummaryMemory)
  async getSummarized(conversationId: string) {
    // Get summary + recent messages
  }
  
  // Implement fact extraction (like Mem0)
  async extractFacts(conversationId: string) {
    // Extract key facts using Ollama
  }
}
```

---

## Performance Comparison

| Library | Memory Usage | Speed | Scalability | Complexity |
|---------|-------------|-------|-------------|------------|
| LangChain | Medium | Fast | Good | Low |
| Mem0 | High | Medium | Excellent | Medium |
| LangSwarm | Medium | Very Fast | Excellent | Medium |
| ChatMemory | Low | Fast | Good | Low |
| ENGRAM | Low | Fast | Good | Low |
| MFCS | Medium | Medium | Good | Medium |
| Custom | Low | Fast | Excellent | High |

---

## Final Recommendation

**For English Tutor App:**

1. **Start with LangChain** (`ConversationSummaryBufferMemory`)
   - Quick to implement
   - Proven to work
   - Good documentation
   - Easy Ollama integration

2. **Enhance with custom features:**
   - Add fact extraction (user preferences, learning goals)
   - Add PostgreSQL persistence
   - Add vector search for semantic retrieval

3. **Migrate to custom if needed:**
   - Only if LangChain doesn't meet specific needs
   - Or for learning/understanding purposes

---

## Resources

- **LangChain Memory Docs**: https://js.langchain.com/docs/modules/memory/
- **Mem0 GitHub**: https://github.com/mem0ai/mem0
- **ENGRAM Paper**: https://arxiv.org/abs/2511.12960
- **Mem0 Paper**: https://arxiv.org/abs/2504.19413

