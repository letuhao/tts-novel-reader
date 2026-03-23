# Debug Logging Guide

**Date:** 2024-12-21  
**Purpose:** Guide for debugging conversation pipeline performance

## 🔍 Logging Overview

Comprehensive logging has been added throughout the pipeline to help identify performance bottlenecks.

### Log Levels

- **🚀 [PIPELINE]** - Pipeline processing stages
- **📝 [PARSER]** - Response parsing and validation
- **🎵 [TTS-QUEUE]** - TTS queue management
- **🎤 [TTS]** - Individual TTS generation
- **🎤 [TTS-SERVICE]** - TTS service layer
- **🤖 [OLLAMA]** - Ollama API requests
- **✅ [CHAT]** - Chat endpoint processing
- **⏱️** - Performance timings

---

## 📊 What Gets Logged

### 1. Ollama Response

**Location:** `routes/ollama.ts`

**Logs:**
- Request start time
- Full Ollama response (debug level)
- Response preview (first 500 chars)
- Response length and timing
- Characters per second

**Example:**
```
🤖 [OLLAMA] Starting Ollama request
📥 [OLLAMA] Full Ollama response: {...}
✅ [OLLAMA] Ollama response received (timeMs: 3500, charsPerSecond: 45)
```

### 2. Response Parsing

**Location:** `structuredResponseParser.ts`

**Logs:**
- Raw response preview
- JSON extraction
- JSON parsing (success/failure)
- Structure validation
- Parsed chunks summary
- Fallback activation (if needed)

**Example:**
```
🔍 [PARSER] Starting structured response parsing
📥 [PARSER] Response preview (first 300 chars)
📦 [PARSER] Extracted JSON preview
✅ [PARSER] JSON parsed successfully
✅ [PARSER] Structure validation passed
📦 [PARSER] Parsed chunks summary
✅ [PARSER] Structured response parsed successfully
```

### 3. TTS Generation

**Location:** `pipelineService.ts` and `ttsService.ts`

**Logs:**
- TTS request start
- Text preview
- TTS backend request time
- Metadata retrieval time
- Audio size
- Total TTS time
- Characters per second

**Example:**
```
🎤 [TTS] Starting TTS generation for chunk
📡 [TTS-SERVICE] Sending request to TTS backend...
📥 [TTS-SERVICE] TTS backend response received (timeMs: 2500)
✅ [TTS] TTS generated successfully (totalTimeMs: 3200, charsPerSecond: 15)
```

### 4. TTS Queue

**Location:** `pipelineService.ts`

**Logs:**
- Queue start
- Chunk processing start
- Slot waiting (when queue full)
- Chunk completion
- Queue statistics

**Example:**
```
🎵 [TTS-QUEUE] Starting TTS queue processing
🎵 [TTS-QUEUE] Starting TTS for chunk (activeCount: 1)
⏳ [TTS-QUEUE] Waiting for TTS slot...
✅ [TTS-QUEUE] Chunk completed, slot freed
🏁 [TTS-QUEUE] TTS queue processing complete
```

### 5. Performance Timings

**Location:** `routes/ollama.ts`

**Logs:**
- Breakdown of time spent in each stage
- Percentage of total time
- Total request time

**Example:**
```
⏱️ Performance timings:
  - Request Start: 0ms (0.0%)
  - Before Ollama: 2ms (0.1%)
  - After Ollama: 3500ms (70.0%)
  - Before First Chunk: 3502ms (70.0%)
  - After First Chunk: 6800ms (100.0%)
  - TOTAL: 6800ms (100.0%)
```

---

## 🎯 Key Metrics to Watch

### 1. Ollama Response Time
- **Target:** < 5 seconds
- **Log:** `✅ [OLLAMA] Ollama response received`
- **Check:** `timeMs` and `charsPerSecond`

### 2. TTS Generation Time
- **Target:** < 3 seconds per chunk
- **Log:** `✅ [TTS] TTS generated successfully`
- **Check:** `totalTimeMs` and `charsPerSecond`

### 3. First Chunk Time
- **Target:** < 8 seconds total
- **Log:** `✅ [CHAT] First chunk ready`
- **Check:** `totalTimeMs` breakdown

### 4. Queue Processing
- **Target:** Max 2-3 concurrent TTS
- **Log:** `🎵 [TTS-QUEUE] Starting TTS for chunk`
- **Check:** `activeCount` should never exceed `maxConcurrent`

---

## 🔧 Enabling Debug Logging

### Environment Variables

```bash
# Set log level to debug
LOG_LEVEL=debug

# Enable verbose logging
VERBOSE_LOGGING=true
```

### In Code

The logger automatically uses `debug` level in development mode.

---

## 📈 Performance Analysis

### Example Log Analysis

```
🤖 [OLLAMA] Starting Ollama request
✅ [OLLAMA] Ollama response received (timeMs: 3500)  ← Ollama took 3.5s
🚀 [FIRST-CHUNK] Starting first chunk processing
✅ [PARSER] Structured response parsed successfully (chunkCount: 3)  ← 3 chunks
🎤 [TTS] Starting TTS generation for chunk
✅ [TTS] TTS generated successfully (totalTimeMs: 2800)  ← TTS took 2.8s
✅ [CHAT] First chunk ready (totalTimeMs: 6300)  ← Total: 6.3s
```

**Analysis:**
- Ollama: 3.5s (55% of total)
- TTS: 2.8s (44% of total)
- Parsing: < 0.1s (negligible)
- **Total: 6.3s** ✅ Good!

### Bottleneck Identification

1. **If Ollama > 5s:** Ollama is slow (model/GPU issue)
2. **If TTS > 3s per chunk:** TTS backend is slow
3. **If queue waiting:** Too many concurrent requests
4. **If parsing fails:** Ollama not returning JSON correctly

---

## 🐛 Common Issues

### Issue 1: Only 1 Chunk Returned

**Symptoms:**
- Response shows only first chunk
- No remaining chunks processed

**Debug:**
- Check `📥 [OLLAMA] Full Ollama response` log
- Verify Ollama returned multiple chunks in JSON
- Check `📦 [PARSER] Parsed chunks summary`

**Solution:**
- Verify Ollama is returning structured JSON
- Check if parsing is failing (fallback activated)

### Issue 2: Slow TTS Generation

**Symptoms:**
- TTS takes > 5 seconds per chunk
- Low `charsPerSecond` value

**Debug:**
- Check `🎤 [TTS-SERVICE]` logs
- Look for `apiRequestTimeMs` (TTS backend time)
- Check `metadataTimeMs` (metadata retrieval time)

**Solution:**
- TTS backend may be overloaded
- Check TTS backend logs
- Consider reducing `maxConcurrent`

### Issue 3: Queue Blocking

**Symptoms:**
- Many "Waiting for TTS slot" messages
- Chunks processed sequentially instead of parallel

**Debug:**
- Check `🎵 [TTS-QUEUE]` logs
- Look for `activeCount` values
- Check if chunks are completing slowly

**Solution:**
- Increase `maxConcurrent` (if TTS backend can handle it)
- Or reduce chunk count (better chunking strategy)

---

## 📝 Log Format

### Structured Logs

All logs use structured format:
```json
{
  "level": "INFO",
  "time": "2024-12-21T14:30:00.000Z",
  "service": "conversation-pipeline",
  "chunkIndex": 0,
  "textLength": 50,
  "timeMs": 2500,
  "msg": "✅ [TTS] TTS generated successfully"
}
```

### Pretty Logs (Development)

In development, logs are pretty-printed:
```
[14:30:00.000] INFO (conversation-pipeline): ✅ [TTS] TTS generated successfully
  chunkIndex: 0
  textLength: 50
  timeMs: 2500
```

---

## 🎯 Quick Debug Checklist

1. ✅ Check Ollama response time
2. ✅ Verify structured JSON parsing
3. ✅ Check chunk count
4. ✅ Monitor TTS generation times
5. ✅ Verify queue concurrency
6. ✅ Check for errors/warnings
7. ✅ Review performance timings

---

## 📊 Performance Targets

| Stage | Target | Warning | Critical |
|-------|--------|---------|----------|
| Ollama Response | < 5s | 5-8s | > 8s |
| TTS Generation | < 3s/chunk | 3-5s | > 5s |
| First Chunk Total | < 8s | 8-12s | > 12s |
| Queue Concurrency | 2-3 | 1 or 4+ | 0 or 5+ |

---

**Status:** ✅ Debug logging implemented and ready

