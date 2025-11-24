# Audio Player Enhancements

## Problems Fixed / Vấn đề Đã Sửa

### 1. Audio player doesn't auto-advance to next audio after completing playback
**Problem**: When an audio file finished playing, it wouldn't automatically move to and play the next paragraph audio.

**Solution**:
- Enhanced `onend` callback to set `shouldAutoPlayRef` flag before advancing
- Modified `onload` callback to check `shouldAutoPlayRef` flag and auto-play if set
- Ensure play state is maintained when auto-advancing
- Reset initialization flags properly when switching audio files

### 2. Cannot pause/play when audio is already playing (must reload page)
**Problem**: Sometimes the play/pause button stops responding when audio is playing, requiring a page reload.

**Root Causes**:
- State desynchronization between React state (`isPlaying`) and Howl instance state
- Race conditions in play/pause handlers
- Missing error handling when Howl instance becomes invalid

**Solutions**:
- Added state synchronization interval to periodically check and fix desync between React state and Howl instance
- Enhanced `handlePlay` function with better error handling and recovery
- Added checks for Howl instance state (unloaded, etc.) with recovery logic
- Improved `onplay` and `onpause` callbacks to prevent state desync
- Added `useCallback` to `handlePlay` for better performance and consistency

## Implementation Details / Chi tiết Triển khai

### Auto-Advance Mechanism

```typescript
onend: () => {
  if (currentAudioIndex < audioFiles.length - 1) {
    shouldAutoPlayRef.current = isPlaying // Remember if we should continue playing
    isInitializedRef.current = false      // Reset for next audio
    setCurrentAudioIndex(nextIndex)       // Advance (triggers useEffect to load next)
  }
}

onload: () => {
  // When next audio loads, check if we should auto-play
  if ((isPlaying || shouldAutoPlayRef.current) && !isInitializedRef.current) {
    howl.play()
    shouldAutoPlayRef.current = false // Reset flag
  }
}
```

### State Synchronization

```typescript
useEffect(() => {
  const syncInterval = setInterval(() => {
    const actuallyPlaying = currentHowl.playing()
    
    // Fix desync: React state says paused but Howl is playing
    if (actuallyPlaying && !isPlaying) {
      playAction()
    }
    // Fix desync: React state says playing but Howl is paused
    else if (!actuallyPlaying && isPlaying) {
      pauseAction()
    }
  }, 500) // Check every 500ms
  
  return () => clearInterval(syncInterval)
}, [currentHowl, isPlaying, ...])
```

### Enhanced Play/Pause Handler

```typescript
const handlePlay = useCallback(() => {
  if (!currentHowl) return
  
  try {
    const isActuallyPlaying = currentHowl.playing()
    
    if (isActuallyPlaying) {
      currentHowl.pause()
      pauseAction()
    } else {
      const playId = currentHowl.play()
      if (playId) {
        playAction()
      } else {
        // Handle edge cases (loading, unloaded, etc.)
        if (isLoading) {
          playAction() // Will play when loaded
        }
      }
    }
  } catch (error) {
    // Recovery: reload audio if unloaded
    if (currentHowl.state() === 'unloaded') {
      // Force reload
    }
  }
}, [currentHowl, isLoading, ...])
```

## Benefits / Lợi ích

✅ **Seamless playback**: Audio automatically advances to next paragraph when current finishes
✅ **Reliable controls**: Play/pause button always works, no need to reload page
✅ **State consistency**: React state stays in sync with actual audio playback state
✅ **Better UX**: Smooth continuous playback experience
✅ **Error recovery**: Automatically recovers from common audio playback issues

## Files Changed / Tệp Đã Thay đổi

- `novel-app/frontend/src/components/Audio/AudioPlayer.tsx`
  - Enhanced `onend` callback with auto-advance flag
  - Improved `onload` callback to auto-play next audio
  - Added state synchronization mechanism
  - Enhanced `handlePlay` with better error handling
  - Added `shouldAutoPlayRef` to track auto-advance intent

## Testing / Kiểm tra

After these changes:
1. ✅ Start playing audio - should play automatically
2. ✅ Wait for audio to finish - should auto-advance to next paragraph and continue playing
3. ✅ Click pause/play repeatedly - should always respond correctly
4. ✅ Check state sync - React state should match actual playback state
5. ✅ Test error recovery - should recover from unloaded/invalid states

