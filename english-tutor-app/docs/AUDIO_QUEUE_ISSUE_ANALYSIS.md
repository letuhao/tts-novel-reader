# Audio Queue Issue Analysis

## Problem
Audio files are playing sequentially (correct), but they wait for ALL audio to be generated before starting playback, instead of playing immediately when each audio is ready.

**Expected behavior:**
- Receive audio 1 → Play audio 1 immediately
- Receive audio 2, 3 simultaneously → Play audio 2 (after 1 finishes), then play audio 3

**Current behavior:**
- Receive audio 1, 2, 3, 4 → Wait for all → Then play sequentially

## Root Cause Analysis

### Current Implementation
1. `audioQueueService.start()` is called in `useEffect` when WebSocket connects
2. `start()` returns an Observable that processes the queue using `concatMap`
3. Audio items are queued via `audioQueueService.queue()` when `chunk:tts-completed` events arrive
4. `concatMap` should process items sequentially as they arrive

### Potential Issues

1. **Timing Issue**: Items might be queued before the subscription is active
   - With RxJS Subject, items emitted before subscription are lost
   - But logs show all items are processed, so subscription is active

2. **Observable Chain Issue**: The `playAudio` Observable might not be properly waiting
   - `playAudio` returns an Observable that should complete when audio ends
   - But maybe it's completing too early?

3. **Promise Resolution Issue**: `playAudioFromStore` Promise might resolve when playback starts, not when it ends
   - Code shows it only resolves on `ended` event, so this should be correct

4. **Race Condition**: Multiple audio items might be processed simultaneously
   - `concatMap` should prevent this, but maybe there's a bug

## Solution Approach

### Option 1: Ensure Queue Starts Immediately
- Make sure `start()` subscription is active before any items are queued
- Add logging to verify timing

### Option 2: Fix Observable Chain
- Ensure `playAudio` Observable properly waits for audio to finish
- Add better error handling and cleanup

### Option 3: Refactor to Simpler Approach
- Use a simpler queue mechanism that doesn't rely on complex RxJS chains
- Process items one at a time with explicit state management

## Recommended Solution

The issue is likely that the Observable chain is correct, but there's a subtle timing or state management issue. The best approach is to:

1. Add comprehensive logging to track when items are queued vs when they start processing
2. Ensure `playAudio` Observable properly waits for audio to complete
3. Verify that only one audio plays at a time

## Next Steps

1. Add detailed logging to `audioQueueService` to track queue state
2. Verify `playAudio` Observable completion timing
3. Test with single audio item to verify basic functionality
4. Then test with multiple items to identify the delay

