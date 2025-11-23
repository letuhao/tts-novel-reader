/**
 * AudioPlayer Component - Single Source of Truth Architecture
 * Uses audioQueue as the only source of truth for audio progression
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, RotateCcw, X } from 'lucide-react'
import { Howl } from 'howler'
import { useAudioStore } from '../../store/useAudioStore'
import { useReaderStore } from '../../store/useReaderStore'
import { useProgressStore } from '../../store/useProgressStore'
import { audioQueue } from '../../services/audioQueue'
import { logError } from '../../utils/logger'
import { AUDIO_CONFIG } from '../../utils/constants'

function AudioPlayer() {
  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    audioFiles, // Only used to initialize queue
    isLoading,
    play: playAction,
    pause: pauseAction,
    setPlaybackRate,
    setVolume,
    setCurrentTime,
    setDuration,
    setIsLoading,
    setCurrentAudio,
  } = useAudioStore()

  const { novelId, chapterNumber, currentParagraphNumber, paragraphs, setCurrentParagraph } = useReaderStore()
  const { saveProgress } = useProgressStore()
  
  // Local state
  const [currentHowl, setCurrentHowl] = useState<Howl | null>(null)
  const [showPlayer, setShowPlayer] = useState(false)
  
  // Queue state (read from queue, never stored locally)
  const [queueCurrentIndex, setQueueCurrentIndex] = useState<number>(-1)
  const [queueCurrentFile, setQueueCurrentFile] = useState<ReturnType<typeof audioQueue.getCurrentFile>>(null)
  const [queueTotalFiles, setQueueTotalFiles] = useState<number>(0)
  
  // Refs
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize queue when audioFiles change from store
  useEffect(() => {
    console.log('[AudioPlayer] Initialization effect triggered:', {
      novelId,
      chapterNumber,
      audioFilesLength: audioFiles?.length || 0,
      currentParagraphNumber
    })
    
    if (!novelId || !chapterNumber) {
      console.log('[AudioPlayer] Missing novelId or chapterNumber, resetting queue')
      audioQueue.reset()
      setShowPlayer(false)
      return
    }

    if (!Array.isArray(audioFiles) || audioFiles.length === 0) {
      console.log('[AudioPlayer] No audio files, resetting queue')
      audioQueue.reset()
      setShowPlayer(false)
      return
    }

    // Initialize queue with audio files
    const startIndex = currentParagraphNumber 
      ? audioFiles.findIndex(f => f.paragraphNumber === currentParagraphNumber) 
      : 0

    console.log('[AudioPlayer] ✅ Initializing queue with', audioFiles.length, 'files, starting at index', startIndex >= 0 ? startIndex : 0)
    
    // Initialize queue - this will emit a 'changed' event
    audioQueue.initialize(audioFiles, startIndex >= 0 ? startIndex : 0)
    
    // Immediately sync state from queue (don't wait for subscription event)
    setQueueCurrentIndex(audioQueue.getCurrentIndex())
    setQueueCurrentFile(audioQueue.getCurrentFile())
    setQueueTotalFiles(audioQueue.getTotalCount())
    
    console.log('[AudioPlayer] ✅ Queue initialized, state synced:', {
      index: audioQueue.getCurrentIndex(),
      totalFiles: audioQueue.getTotalCount(),
      currentFile: audioQueue.getCurrentFile()?.paragraphNumber
    })
    
    setShowPlayer(true)
    isInitializedRef.current = false

    // Cleanup on unmount or chapter change
    return () => {
      if (currentHowl) {
        try {
          currentHowl.off()
          if (currentHowl.playing()) {
            currentHowl.pause()
          }
          currentHowl.unload()
        } catch (error) {
          console.warn('[AudioPlayer] Error cleaning up on unmount:', error)
        }
        setCurrentHowl(null)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [novelId, chapterNumber, Array.isArray(audioFiles) ? audioFiles.length : 0, currentParagraphNumber])

  // Subscribe to queue events - SINGLE SOURCE OF TRUTH
  useEffect(() => {
    const unsubscribe = audioQueue.subscribe((event) => {
      console.log('[AudioPlayer] Queue event:', event.type, {
        currentIndex: event.data.currentIndex,
        totalFiles: event.data.totalFiles,
        paragraphNumber: event.data.currentFile?.paragraphNumber,
      })

      // Update local state from queue (read-only, never modify queue state here)
      setQueueCurrentIndex(event.data.currentIndex)
      setQueueCurrentFile(event.data.currentFile)
      setQueueTotalFiles(event.data.totalFiles)

      // Update reader store paragraph
      if (event.data.currentFile) {
        setCurrentParagraph(event.data.currentFile.paragraphNumber)
      }
    })

    // Initialize state from queue
    setQueueCurrentIndex(audioQueue.getCurrentIndex())
    setQueueCurrentFile(audioQueue.getCurrentFile())
    setQueueTotalFiles(audioQueue.getTotalCount())

    return unsubscribe
  }, [setCurrentParagraph])

  // Load and play audio when queue index changes
  useEffect(() => {
    // Validation
    console.log('[AudioPlayer] Effect triggered:', {
      showPlayer,
      queueCurrentIndex,
      queueTotalFiles,
      queueCurrentFile: queueCurrentFile?.paragraphNumber,
      audioFilesCount: audioFiles?.length || 0
    })
    
    // Debug: Log queue state
    const queueDebug = audioQueue.getDebugInfo()
    console.log('[AudioPlayer] Queue debug info:', queueDebug)
    
    if (!showPlayer) {
      console.log('[AudioPlayer] Player not shown, skipping')
      return
    }
    
    if (queueTotalFiles === 0) {
      console.log('[AudioPlayer] No files in queue, skipping')
      return
    }
    
    // Get current file directly from queue (single source of truth)
    const currentFile = audioQueue.getCurrentFile()
    if (!currentFile) {
      console.warn('[AudioPlayer] No current file from queue', {
        queueCurrentIndex,
        queueTotalFiles,
        queueDebug
      })
      return
    }
    
    // Ensure we use the queue's current index (might be different from state due to async)
    const actualQueueIndex = audioQueue.getCurrentIndex()
    if (actualQueueIndex < 0) {
      console.warn('[AudioPlayer] Queue index is invalid:', actualQueueIndex)
      // Try to reset queue index to 0 if files exist
      if (queueTotalFiles > 0) {
        console.log('[AudioPlayer] Attempting to fix queue index...')
        audioQueue.jumpToIndex(0)
        return // Let the queue event trigger a re-render
      }
      return
    }

    console.log(`[AudioPlayer] ✅ Loading audio for queue index ${actualQueueIndex}, paragraph ${currentFile.paragraphNumber}`)
    
    // Validate audio URL
    if (!currentFile.audioURL) {
      console.error('[AudioPlayer] ❌ Audio file has no URL:', currentFile)
      return
    }

    let howl: Howl | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let isMounted = true

    // Clean up previous audio
    if (currentHowl) {
      try {
        currentHowl.off() // Remove all listeners
        if (currentHowl.playing()) {
          currentHowl.pause()
        }
        currentHowl.unload()
      } catch (error) {
        console.warn('[AudioPlayer] Error cleaning previous audio:', error)
      }
      setCurrentHowl(null)
    }

    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Reset UI state
    setCurrentTime(0)
    setDuration(0)
    setIsLoading(true)

    // Build audio URL
    const backendBaseUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:11110'
    const audioSrc = currentFile.audioURL.startsWith('http')
      ? currentFile.audioURL
      : `${backendBaseUrl}${currentFile.audioURL}`

    // Capture current queue index at creation time (use actual queue index, not state)
    const queueIndexAtCreation = audioQueue.getCurrentIndex()

    // Create Howl instance
    howl = new Howl({
      src: [audioSrc],
      html5: true,
      format: ['wav'],
      preload: 'metadata',
      volume: volume,
      rate: playbackRate,
      onload: () => {
        if (!isMounted || !howl) return
        
        // Check if queue index has changed (this Howl is now stale)
        const currentQueueIndex = audioQueue.getCurrentIndex()
        if (currentQueueIndex !== queueIndexAtCreation) {
          console.log(`[AudioPlayer] onload IGNORED - queue index changed from ${queueIndexAtCreation} to ${currentQueueIndex}`)
          return
        }
        
        setDuration(howl.duration())
        setIsLoading(false)
        
        // Auto-play if currently playing (for seamless transitions)
        if (isPlaying) {
          howl.play()
        }
      },
      onplay: () => {
        if (!isMounted) return
        
        // Check if queue index has changed
        const currentQueueIndex = audioQueue.getCurrentIndex()
        if (currentQueueIndex !== queueIndexAtCreation) {
          console.log(`[AudioPlayer] onplay IGNORED - queue index changed from ${queueIndexAtCreation} to ${currentQueueIndex}`)
          return
        }
        
        if (!isPlaying) {
          playAction()
        }
      },
      onpause: () => {
        if (!isMounted) return
        
        // Check if queue index has changed
        const currentQueueIndex = audioQueue.getCurrentIndex()
        if (currentQueueIndex !== queueIndexAtCreation) {
          return
        }
        
        if (isPlaying) {
          pauseAction()
        }
      },
      onend: () => {
        if (!isMounted) return
        
        // CRITICAL: Check if this Howl is still for the current queue index
        const currentQueueIndex = audioQueue.getCurrentIndex()
        if (currentQueueIndex !== queueIndexAtCreation) {
          console.log(`[AudioPlayer] onend IGNORED - queue index changed from ${queueIndexAtCreation} to ${currentQueueIndex}`)
          return
        }
        
        // Advance queue (atomic operation)
        console.log(`[AudioPlayer] Audio ended for queue index ${queueIndexAtCreation}, advancing queue`)
        const advanced = audioQueue.advanceNext()
        
        if (!advanced) {
          // End of queue
          console.log(`[AudioPlayer] Reached end of queue`)
          pauseAction()
        }
      },
      onloaderror: (_id: number, error: unknown) => {
        if (!isMounted) return
        logError('Howl load error', error)
        setIsLoading(false)
        pauseAction()
      },
      onplayerror: (_id: number, error: unknown) => {
        if (!isMounted) return
        logError('Howl play error', error)
        setIsLoading(false)
        pauseAction()
      },
    })

    setCurrentHowl(howl)
    setCurrentAudio(howl)

    // Progress tracking
    let lastSavedTime = 0
    intervalId = setInterval(() => {
      if (!isMounted || !howl) return
      
      // Check if queue index has changed
      const currentQueueIndex = audioQueue.getCurrentIndex()
      if (currentQueueIndex !== queueIndexAtCreation) {
        return // Stop tracking if queue changed
      }
      
      if (!howl.playing()) return

      const seek = howl.seek() as number
      if (typeof seek === 'number') {
        setCurrentTime(seek)

        // Auto-save progress
        const currentTimeFloor = Math.floor(seek)
        if (
          novelId && 
          chapterNumber && 
          currentTimeFloor !== lastSavedTime &&
          currentTimeFloor % AUDIO_CONFIG.PROGRESS_SAVE_INTERVAL_SECONDS === 0
        ) {
          lastSavedTime = currentTimeFloor
          saveProgress({
            novelId,
            chapterNumber,
            paragraphNumber: currentFile.paragraphNumber,
            position: seek,
          }).catch((error) => {
            logError('Failed to save progress', error)
          })
        }
      }
    }, AUDIO_CONFIG.PROGRESS_UPDATE_INTERVAL_MS)

    progressIntervalRef.current = intervalId

    // Cleanup
    return () => {
      isMounted = false
      
      if (intervalId) {
        clearInterval(intervalId)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }

      // Save progress
      if (novelId && chapterNumber && howl && queueIndexAtCreation === audioQueue.getCurrentIndex()) {
        try {
          const seek = howl.seek()
          if (typeof seek === 'number' && seek > 0) {
            saveProgress({
              novelId,
              chapterNumber,
              paragraphNumber: currentFile.paragraphNumber,
              position: seek,
            }).catch((error) => {
              logError('Failed to save progress on cleanup', error)
            })
          }
        } catch (error) {
          logError('Error getting seek position on cleanup', error)
        }
      }

      // Clean up Howl
      if (howl) {
        try {
          howl.off()
          if (howl.playing()) {
            howl.pause()
          }
          howl.unload()
        } catch (error) {
          console.warn('[AudioPlayer] Error cleaning up Howl:', error)
        }
        howl = null
      }
    }
  }, [queueCurrentIndex, queueCurrentFile, queueTotalFiles, isPlaying, playbackRate, volume, showPlayer, novelId, chapterNumber, setCurrentTime, setDuration, setIsLoading, playAction, pauseAction, setCurrentAudio, saveProgress])
  // NOTE: currentHowl is NOT in dependencies - it's set inside this effect, adding it would cause infinite loop

  // Update volume
  useEffect(() => {
    if (currentHowl) {
      currentHowl.volume(volume)
    }
  }, [volume, currentHowl])

  // Update playback rate
  useEffect(() => {
    if (currentHowl) {
      currentHowl.rate(playbackRate)
    }
  }, [playbackRate, currentHowl])

  // Play/Pause handler
  const handlePlay = useCallback(() => {
    console.log('[AudioPlayer] handlePlay called', {
      hasCurrentHowl: !!currentHowl,
      isLoading,
      isPlaying,
      queueCurrentFile: queueCurrentFile?.paragraphNumber,
      queueCurrentIndex,
      queueTotalFiles
    })
    
    // Get current Howl from store (might be more up-to-date than local state)
    const howlToUse = currentHowl || useAudioStore.getState().currentAudio
    
    if (!howlToUse) {
      console.warn('[AudioPlayer] handlePlay: No Howl instance available')
      // Try to get from queue - maybe audio is loading
      const currentFile = audioQueue.getCurrentFile()
      if (currentFile) {
        if (isLoading) {
          console.log('[AudioPlayer] Audio is loading, setting play state - will play when loaded')
          playAction() // Set play state - will auto-play when loaded
        } else {
          console.warn('[AudioPlayer] No Howl instance but file exists in queue - audio loading effect may not have run')
        }
      } else {
        console.error('[AudioPlayer] No Howl instance and no current file in queue')
      }
      return
    }

    try {
      if (howlToUse.playing()) {
        console.log('[AudioPlayer] Pausing audio')
        howlToUse.pause()
        pauseAction()
      } else {
        console.log('[AudioPlayer] Playing audio')
        const playId = howlToUse.play()
        if (playId) {
          playAction()
        } else if (isLoading) {
          console.log('[AudioPlayer] play() returned no ID (still loading), setting play state')
          playAction() // Will play when loaded
        } else {
          console.warn('[AudioPlayer] play() returned no ID and not loading')
        }
      }
    } catch (error) {
      logError('Error in handlePlay', error)
    }
  }, [currentHowl, isLoading, isPlaying, playAction, pauseAction, queueCurrentFile, queueCurrentIndex, queueTotalFiles])

  const handlePrevious = () => {
    // Use queue for navigation
    audioQueue.goPrevious()
  }

  const handleNext = () => {
    // Use queue for navigation
    audioQueue.advanceNext()
  }

  const handleReplay = () => {
    if (currentHowl) {
      currentHowl.seek(0)
      setCurrentTime(0)
      if (!currentHowl.playing()) {
        currentHowl.play()
        playAction()
      }
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentHowl || !duration || isLoading) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const seekTime = percentage * duration
    
    handleSeekToTime(seekTime)
  }

  const handleSeekToTime = (seekTime: number) => {
    if (!currentHowl || !duration || isLoading) return
    
    const clampedTime = Math.max(0, Math.min(duration, seekTime))
    currentHowl.seek(clampedTime)
    setCurrentTime(clampedTime)
    
    if (isPlaying && !currentHowl.playing()) {
      currentHowl.play()
    }
  }

  const handleClose = useCallback(() => {
    if (currentHowl) {
      try {
        currentHowl.off()
        if (currentHowl.playing()) {
          currentHowl.pause()
        }
        currentHowl.unload()
      } catch (error) {
        console.warn('[AudioPlayer] Error closing audio:', error)
      }
      setCurrentHowl(null)
      setCurrentAudio(null)
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    pauseAction()
    setShowPlayer(false)
    audioQueue.reset()
    
    if (novelId && chapterNumber && currentHowl) {
      try {
        const seek = currentHowl.seek()
        if (typeof seek === 'number' && seek > 0 && queueCurrentFile) {
          saveProgress({
            novelId,
            chapterNumber,
            paragraphNumber: queueCurrentFile.paragraphNumber,
            position: seek,
          }).catch((error) => {
            logError('Failed to save progress on close', error)
          })
        }
      } catch (error) {
        logError('Error saving progress on close', error)
      }
    }
  }, [currentHowl, novelId, chapterNumber, queueCurrentFile, pauseAction, setCurrentAudio, saveProgress])

  if (!showPlayer || queueTotalFiles === 0 || !queueCurrentFile) {
    return null
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              Chapter {chapterNumber} - Paragraph {queueCurrentFile?.paragraphNumber || 0} / {paragraphs?.length || queueTotalFiles}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {queueCurrentFile 
                ? `Playing paragraph ${queueCurrentFile.paragraphNumber !== null && queueCurrentFile.paragraphNumber !== undefined ? queueCurrentFile.paragraphNumber : '?'} (Queue: ${queueCurrentIndex + 1}/${queueTotalFiles})` 
                : 'Loading...'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close player"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div 
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1 cursor-pointer relative"
            onClick={handleSeek}
            role="progressbar"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault()
                const seekTime = e.key === 'ArrowLeft' 
                  ? Math.max(0, currentTime - 5)
                  : Math.min(duration, currentTime + 5)
                handleSeekToTime(seekTime)
              }
            }}
            aria-label="Audio progress bar - click to seek"
          >
            <div
              className="bg-primary-600 h-2 rounded-full transition-all pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Playback Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevious}
              disabled={audioQueue.isAtStart() || isLoading}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous paragraph"
              type="button"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlay}
              disabled={isLoading || (!queueCurrentFile && !audioQueue.getCurrentFile())}
              className="p-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              type="button"
              title={!queueCurrentFile && !audioQueue.getCurrentFile() ? 'Waiting for audio to load...' : undefined}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleReplay}
              disabled={isLoading || !queueCurrentFile || !currentHowl}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Replay current paragraph"
              type="button"
              title="Replay from beginning"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleNext}
              disabled={audioQueue.isAtEnd() || isLoading}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next paragraph"
              type="button"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Volume and Speed Controls */}
          <div className="flex items-center space-x-4">
            {/* Volume */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setVolume(volume > 0 ? 0 : 1)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label={volume > 0 ? 'Mute' : 'Unmute'}
                type="button"
              >
                {volume > 0 ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20"
              />
            </div>

            {/* Playback Speed */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Speed:</span>
              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1.0">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2.0">2.0x</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Format time in seconds to MM:SS
 */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return '0:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default AudioPlayer
