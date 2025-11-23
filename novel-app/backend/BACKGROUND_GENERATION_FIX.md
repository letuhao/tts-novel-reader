# Background Generation Fix

## Current Problem

The audio generation is **NOT 100% background**. It will stop if you close the browser.

### Why?

The current implementation uses `await` in the route handler:
```javascript
const result = await worker.generateChapterAudio(...);
res.json({ success: true, result: result });
```

This means:
1. HTTP request stays open during generation
2. If browser closes → HTTP connection is lost
3. Node.js/Express may cancel the async operation
4. Generation stops when browser closes ❌

## Solution: Fire-and-Forget Pattern

We need to:
1. **Immediately return** a response with a `progressId`
2. **Run generation in background** without waiting
3. **Store progress** in database for status polling
4. **Don't await** the generation - fire and forget

## Implementation

### Step 1: Modify Worker Routes

Change from:
```javascript
router.post('/generate/chapter', async (req, res, next) => {
  const result = await worker.generateChapterAudio(...);
  res.json({ success: true, result: result });
});
```

To:
```javascript
router.post('/generate/chapter', async (req, res, next) => {
  // Create progress entry
  const progress = await GenerationProgressModel.createOrUpdate({
    novelId,
    chapterNumber,
    status: 'pending',
    ...
  });
  
  // Start generation in background (don't await!)
  worker.generateChapterAudio(...)
    .then(result => {
      // Update progress on completion
      GenerationProgressModel.update(progress.id, {
        status: 'completed',
        ...
      });
    })
    .catch(error => {
      // Update progress on error
      GenerationProgressModel.update(progress.id, {
        status: 'failed',
        errorMessage: error.message
      });
    });
  
  // Return immediately
  res.json({
    success: true,
    message: 'Generation started in background',
    progressId: progress.id
  });
});
```

### Step 2: Add Status Endpoint

Already exists at `/api/worker/status/:novelId/:chapterNumber`

### Step 3: Frontend Changes

Frontend should:
1. Call generation endpoint
2. Get `progressId` immediately
3. Poll status endpoint every few seconds
4. Show progress to user
5. User can close browser - generation continues ✅

## Benefits

✅ **100% Background**: Generation continues even if browser closes
✅ **Non-blocking**: API responds immediately
✅ **Progress Tracking**: Can check status anytime via `progressId`
✅ **Resilient**: Won't stop if network connection drops

## Status

- ❌ Current: Stops when browser closes
- ✅ After fix: Continues in background 100%

