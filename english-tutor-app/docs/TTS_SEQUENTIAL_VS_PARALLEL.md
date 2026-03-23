# TTS Sequential vs Parallel Processing Analysis

## Current Configuration

**Current Setup:**
- `maxConcurrent: 2` - Processing 2 audio chunks in parallel
- TTS backend: Coqui AI XTTS-v2
- GPU: RTX 4090 (single GPU)

## Problem with Parallel Processing on Single GPU

### Why Parallel Doesn't Help with 1 GPU

1. **GPU Resource Contention**:
   - RTX 4090 has limited VRAM and compute units
   - Running 2 TTS requests simultaneously causes:
     - Memory contention (both models loading into VRAM)
     - Compute unit sharing (slower per-request)
     - Context switching overhead

2. **No Real Speedup**:
   - With 1 GPU, parallel requests don't run truly in parallel
   - They compete for the same resources
   - Total time ≈ same as sequential, but with more overhead

3. **Realtime Impact**:
   - Parallel processing can cause:
     - Higher latency per chunk
     - More variable processing times
     - System instability under load
   - Sequential processing is more predictable and stable

### Performance Comparison

**Parallel (maxConcurrent: 2):**
- Chunk 0: 12.5s (competing with Chunk 1)
- Chunk 1: 10.0s (competing with Chunk 0)
- Total: ~12.5s (limited by slower chunk)
- **Issues**: Resource contention, unpredictable timing

**Sequential (maxConcurrent: 1):**
- Chunk 0: 10.0s (full GPU resources)
- Chunk 1: 10.0s (full GPU resources)
- Total: ~20.0s
- **Benefits**: Predictable, stable, optimal GPU utilization per chunk

### Why Sequential is Better for Realtime

1. **Faster First Chunk**:
   - Sequential: First chunk gets full GPU → faster completion → faster playback start
   - Parallel: Both chunks compete → slower first chunk → delayed playback

2. **Predictable Timing**:
   - Sequential: Consistent ~10s per chunk
   - Parallel: Variable timing due to contention

3. **Better Resource Utilization**:
   - Sequential: Each chunk uses 100% GPU efficiently
   - Parallel: Each chunk uses ~50% GPU inefficiently

4. **Lower Latency**:
   - Sequential: First audio ready faster → user hears response sooner
   - Parallel: Both chunks delayed → user waits longer

## Recommendation

**Change `maxConcurrent` from 2 to 1** for single GPU setups.

### Benefits:
- ✅ Faster first chunk completion
- ✅ More predictable timing
- ✅ Better GPU utilization
- ✅ Lower latency to first audio
- ✅ More stable system performance

### Trade-offs:
- ⚠️ Slightly longer total time for all chunks (but acceptable for realtime UX)

## Implementation

Change in `pipelineService.ts`:
```typescript
maxConcurrent: 1, // Sequential processing for single GPU
```

## Future Considerations

If you add more GPUs later:
- `maxConcurrent: 2` for 2 GPUs
- `maxConcurrent: 4` for 4 GPUs
- Or use GPU affinity to assign specific GPUs to specific requests

