# Conversation Pipeline Design

**Date:** 2024-12-21  
**Status:** Design Phase

## Problem Statement

Current issues:
1. **Single large response** - Ollama returns one big text block
2. **Parallel TTS spam** - Multiple TTS calls happen simultaneously (5+ calls)
3. **Long wait time** - User waits for all audio to be generated before hearing anything
4. **No pipeline control** - No structured flow for processing chunks

**Example:**
```
Response: "Absolutely! That's exactly... [long text]"
  ↓
Frontend splits into 5 sentences
  ↓
5 parallel TTS calls → Backend overloaded
  ↓
Wait 10-15 seconds for all audio
  ↓
Play audio sequentially
```

---

## Pipeline Architecture

### Overview

```
Ollama Response
    ↓
[Pipeline Stage 1: Text Processing]
    ↓
[Pipeline Stage 2: Chunking Strategy]
    ↓
[Pipeline Stage 3: TTS Generation Queue]
    ↓
[Pipeline Stage 4: Audio Playback Queue]
    ↓
User Experience
```

---

## Pipeline Stages

### Stage 0: Structured Response from Ollama (Primary)

**Input:** User message  
**Output:** Structured JSON response with chunks and metadata

**Approach:** Use Ollama's structured output capabilities to enforce JSON format

**Response Format:**
```typescript
interface StructuredOllamaResponse {
  chunks: Array<{
    text: string;
    emotion?: 'happy' | 'encouraging' | 'neutral' | 'excited' | 'calm';
    icon?: string; // Emoji or icon identifier
    pause?: number; // Pause duration after this chunk (seconds)
    emphasis?: boolean; // Should this chunk be emphasized?
  }>;
  metadata: {
    totalChunks: number;
    estimatedDuration: number; // seconds
    tone: string; // Overall tone of response
    language: string;
  };
  fallback?: string; // Full text if parsing fails
}
```

**System Prompt Enhancement:**
```typescript
const systemPrompt = `You are a friendly English tutor. 
When responding, ALWAYS format your response as JSON with this structure:
{
  "chunks": [
    {
      "text": "Sentence or phrase",
      "emotion": "happy|encouraging|neutral|excited|calm",
      "icon": "😊",
      "pause": 0.5,
      "emphasis": false
    }
  ],
  "metadata": {
    "totalChunks": 3,
    "estimatedDuration": 8.5,
    "tone": "friendly and encouraging",
    "language": "en"
  }
}

Rules:
- Split your response into natural chunks (sentences or phrases)
- Each chunk should be 1-3 sentences, max 200 characters
- Add appropriate emotions and icons
- Set pause duration between chunks (0.3-1.0 seconds)
- Mark important chunks with emphasis: true
- Return ONLY valid JSON, no other text`;
```

**Fallback Strategy:**
- If JSON parsing fails → Use text splitting (Stage 1)
- If response is plain text → Parse and structure it

---

### Stage 1: Text Processing (Fallback)

**Input:** Raw text from Ollama (when structured output fails)  
**Output:** Cleaned, structured text

**Responsibilities:**
- Clean text (remove extra whitespace, normalize)
- Detect language
- Identify sentence boundaries
- Extract metadata (length, complexity)
- **Only used when structured output fails**

**Processing:**
```typescript
interface ProcessedText {
  raw: string;
  cleaned: string;
  sentences: string[];
  metadata: {
    totalLength: number;
    sentenceCount: number;
    estimatedDuration: number; // seconds
  };
}
```

---

### Stage 2: Chunking Strategy (Fallback Only)

**Input:** Processed text (only if structured output failed)  
**Output:** Optimized chunks for TTS

**Note:** This stage is only used as fallback when Ollama doesn't return structured JSON.

**Strategies:**

#### Strategy A: Sentence-Based
- Split by sentences
- Simple but may create too many small chunks

#### Strategy B: Smart Chunking (Recommended Fallback)
- Group short sentences together (max 200 chars)
- Split long sentences if needed
- Balance between chunk count and size

**Processing:**
```typescript
interface Chunk {
  id: string;
  text: string;
  index: number;
  estimatedDuration: number; // seconds
  priority: 'high' | 'medium' | 'low'; // First chunk = high
  emotion?: string; // Inferred from text
  icon?: string; // Default icon
}

interface ChunkingResult {
  chunks: Chunk[];
  totalChunks: number;
  estimatedTotalDuration: number;
}
```

---

### Stage 3: TTS Generation Queue

**Input:** Chunks  
**Output:** Audio files/blobs

**Queue Management:**
- **Priority Queue:** First chunk gets highest priority
- **Concurrency Control:** Limit parallel TTS requests (e.g., max 2-3)
- **Rate Limiting:** Prevent backend overload
- **Error Handling:** Retry failed chunks

**Processing Flow:**
```
Chunk 1 (Priority: High) → TTS → Audio 1
Chunk 2 (Priority: Medium) → [Wait if queue full] → TTS → Audio 2
Chunk 3 (Priority: Medium) → [Wait if queue full] → TTS → Audio 3
...
```

**Queue Configuration:**
```typescript
interface TTSQueueConfig {
  maxConcurrent: number; // Max parallel TTS requests (default: 2)
  priorityOrder: 'fifo' | 'priority'; // First chunk first
  retryAttempts: number; // Retry failed chunks
  timeout: number; // Per-chunk timeout
}
```

---

### Stage 4: Audio Playback Queue

**Input:** Audio files/blobs  
**Output:** Played audio

**Queue Management:**
- **Sequential Playback:** Play chunks in order
- **Preloading:** Load next audio while current plays
- **Smooth Transitions:** Minimal gap between chunks
- **Error Recovery:** Skip failed chunks, continue

**Processing Flow:**
```
Audio 1 → Play (immediately when ready)
Audio 2 → Preload → Play (when Audio 1 ends)
Audio 3 → Preload → Play (when Audio 2 ends)
...
```

---

## Pipeline Implementation Options

### Option 1: Backend Pipeline (Recommended)

**Architecture:**
```
Frontend Request
    ↓
Backend: Process response through pipeline
    ↓
Backend: Generate all TTS in controlled queue
    ↓
Backend: Return chunks with audio URLs/fileIds
    ↓
Frontend: Play audio sequentially
```

**Pros:**
- Better control over TTS generation
- Can optimize chunking on server
- Reduces frontend complexity
- Better error handling

**Cons:**
- Backend handles more processing
- Still need to wait for first chunk

---

### Option 2: Hybrid Pipeline (Best UX)

**Architecture:**
```
Frontend Request
    ↓
Backend: Return text + chunking info immediately
    ↓
Frontend: Display first chunk immediately
    ↓
Backend: Generate TTS for chunks in queue (controlled)
    ↓
Frontend: Stream audio chunks as ready
    ↓
Frontend: Play audio sequentially
```

**Pros:**
- Fastest initial response
- Controlled TTS generation
- Progressive audio delivery
- Best user experience

**Cons:**
- More complex implementation
- Requires streaming/SSE or polling

---

### Option 3: Frontend Pipeline (Current - Needs Fix)

**Architecture:**
```
Frontend Request
    ↓
Backend: Return full response + chunks
    ↓
Frontend: Process chunks through pipeline
    ↓
Frontend: Generate TTS with controlled queue
    ↓
Frontend: Play audio sequentially
```

**Pros:**
- Simple backend
- Frontend has full control

**Cons:**
- Current implementation has no queue control
- Parallel TTS spam
- Frontend complexity

---

## Recommended Solution: Structured Response Pipeline

### Phase 1: Structured Ollama Response (Primary)

1. **Backend sends request to Ollama with structured output prompt**
2. **Ollama returns JSON with:**
   - Pre-chunked text
   - Emotion metadata
   - Icons/emojis
   - Pause durations
   - Emphasis markers
3. **Backend validates and processes structured response:**
   - Parse JSON
   - Validate structure
   - Extract chunks with metadata
4. **If structured response fails:**
   - Fallback to text splitting (Stage 1-2)
   - Log warning
   - Continue with fallback processing

### Phase 2: TTS Generation Queue

1. **Backend processes chunks through TTS queue:**
   - First chunk: High priority, immediate processing
   - Remaining chunks: Controlled concurrency (max 2-3)
2. **Backend returns:**
   - First chunk text + audio (immediate)
   - Remaining chunks with audio fileIds (as ready)
   - Or: Stream chunks as TTS completes

### Phase 3: Frontend Integration

1. **Frontend receives structured response:**
   - First chunk with text + audio
   - Remaining chunks with metadata
2. **Frontend displays:**
   - Text with icons/emojis
   - Emotion indicators (optional)
   - Progressive loading
3. **Frontend plays audio:**
   - Respect pause durations
   - Emphasize marked chunks
   - Sequential playback

---

## Pipeline Components

### 1. Structured Response Parser (Primary)

```typescript
class StructuredResponseParser {
  parse(ollamaResponse: string): StructuredOllamaResponse | null {
    // Try to parse as JSON
    // Validate structure
    // Extract chunks with metadata
    // Return null if parsing fails (triggers fallback)
  }
  
  validate(structure: unknown): boolean {
    // Validate JSON structure
    // Check required fields
    // Validate chunk format
  }
}
```

### 2. Text Processor (Fallback)

```typescript
class TextProcessor {
  process(rawText: string): ProcessedText {
    // Clean text
    // Split sentences
    // Extract metadata
    // Only used when structured parsing fails
  }
}
```

### 3. Chunking Strategy (Fallback)

```typescript
class ChunkingStrategy {
  chunk(processedText: ProcessedText, strategy: 'sentence' | 'smart'): ChunkingResult {
    // Apply chunking strategy
    // Optimize chunk sizes
    // Assign priorities
    // Infer emotions/icons from text
    // Only used when structured parsing fails
  }
}
```

### 3. TTS Queue Manager

```typescript
class TTSQueueManager {
  private queue: Chunk[];
  private active: Set<string>; // Active TTS requests
  private maxConcurrent: number;
  
  async enqueue(chunk: Chunk): Promise<AudioBlob> {
    // Add to queue
    // Process when slot available
    // Return audio
  }
  
  private async processQueue(): Promise<void> {
    // Process chunks with concurrency control
  }
}
```

### 4. Audio Playback Manager

```typescript
class AudioPlaybackManager {
  private queue: AudioBlob[];
  private isPlaying: boolean;
  
  async enqueue(audio: AudioBlob): Promise<void> {
    // Add to playback queue
    // Play when ready
  }
  
  private async playNext(): Promise<void> {
    // Play next audio in queue
    // Preload next audio
  }
}
```

---

## Implementation Plan

### Step 1: Enhanced System Prompt

Update `tutorConversation` method to:
- Add structured output prompt
- Request JSON format with chunks
- Include emotion/icon instructions
- Set temperature for consistent JSON

### Step 2: Structured Response Parser

Create `backend/src/services/conversation/structuredResponseParser.ts`:
- Parse JSON from Ollama
- Validate structure
- Extract chunks with metadata
- Handle parsing errors gracefully

### Step 3: Backend Pipeline Service

Create `backend/src/services/conversation/pipelineService.ts`:
- StructuredResponseParser (primary)
- TextProcessor (fallback)
- ChunkingStrategy (fallback)
- TTSQueueManager (backend-side)

### Step 4: Update Chat Endpoint

Modify `/api/ollama/chat` to:
- Use enhanced system prompt
- Parse structured response
- Fallback to text splitting if needed
- Return structured chunks with metadata

### Step 5: Frontend Pipeline Integration

Update frontend to:
- Handle structured response with metadata
- Display icons/emojis
- Show emotion indicators (optional)
- Respect pause durations
- Manage audio playback queue

### Step 6: Testing & Optimization

- Test structured response parsing
- Test fallback mechanism
- Optimize system prompt
- Tune concurrency limits
- Measure performance

---

## Configuration

### Pipeline Config

```typescript
interface PipelineConfig {
  structuredOutput: {
    enabled: boolean; // Use structured output (default: true)
    format: 'json'; // Response format
    enforceStrict: boolean; // Require structured output or fail
    fallbackEnabled: boolean; // Allow fallback to text splitting
  };
  chunking: {
    strategy: 'sentence' | 'smart'; // Fallback strategy
    maxChunkLength: number; // characters (default: 200)
    minChunkLength: number; // characters (default: 50)
    targetDuration: number; // seconds per chunk (default: 3-5)
  };
  tts: {
    maxConcurrent: number; // Max parallel TTS requests (default: 2)
    priorityOrder: 'fifo' | 'priority'; // default: 'priority'
    retryAttempts: number; // default: 2
    timeout: number; // milliseconds (default: 30000)
  };
  audio: {
    preloadNext: boolean; // Preload next audio (default: true)
    gapBetweenChunks: number; // milliseconds (default: 300)
    respectPause: boolean; // Use pause from structured response (default: true)
    skipOnError: boolean; // Skip failed chunks (default: true)
  };
  metadata: {
    showEmotions: boolean; // Display emotion indicators (default: false)
    showIcons: boolean; // Display icons/emojis (default: true)
    showPause: boolean; // Show pause indicators (default: false)
  };
}
```

---

## Performance Targets

- **First chunk display:** < 3 seconds
- **First audio playback:** < 5 seconds
- **TTS generation:** < 3 seconds per chunk
- **Total response time:** < 20 seconds (for 5 chunks)
- **Concurrent TTS requests:** Max 2-3 (prevent overload)

---

## Error Handling

### Pipeline Errors

1. **Text Processing Error:**
   - Fallback to simple splitting
   - Log error, continue

2. **TTS Generation Error:**
   - Retry (up to N attempts)
   - Skip chunk if retries fail
   - Continue with next chunk

3. **Audio Playback Error:**
   - Skip failed audio
   - Continue with next chunk
   - Show error notification

---

## Next Steps

1. ✅ **Design complete** - This document
2. ⏳ **Implement backend pipeline** - Text processing + chunking
3. ⏳ **Implement TTS queue** - Controlled concurrency
4. ⏳ **Update chat endpoint** - Use pipeline
5. ⏳ **Update frontend** - Handle structured response
6. ⏳ **Test & optimize** - Performance tuning

---

**Status:** Design Complete - Ready for Implementation

