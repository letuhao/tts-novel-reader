/**
 * AudioPlayer Component
 * Component AudioPlayer - Trình phát audio
 * 
 * Features:
 * - Seamless playback across multiple paragraph audio files
 * - Play/pause controls
 * - Progress tracking
 * - Volume and speed controls
 * - Auto-advance to next paragraph
 * - Shows current paragraph being played
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, RotateCcw, X } from 'lucide-react'
import { Howl } from 'howler'
import { useAudioStore } from '../../store/useAudioStore'
import { useReaderStore } from '../../store/useReaderStore'
import { useProgressStore } from '../../store/useProgressStore'
import { logError } from '../../utils/logger'
import { AUDIO_CONFIG } from '../../utils/constants'

function AudioPlayer() {
  const {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    audioFiles,
    currentAudioIndex,
    isLoading,
    setAudioFiles,
    setCurrentAudioIndex,
    play: playAction,
    pause: pauseAction,
    setPlaybackRate,
    setVolume,
    setCurrentTime,
    setDuration,
    setIsLoading,
    setCurrentAudio,
  } = useAudioStore()

  const { novelId, chapterNumber, currentParagraphNumber, setCurrentParagraph } = useReaderStore()
  const { saveProgress } = useProgressStore()
  
  const [currentHowl, setCurrentHowl] = useState<Howl | null>(null)
  const [showPlayer, setShowPlayer] = useState(false)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize audio files when chapter changes
  useEffect(() => {
    if (!novelId || !chapterNumber || audioFiles.length === 0) {
      setShowPlayer(false)
      
      // Clean up existing audio when hiding player
      if (currentHowl) {
        if (currentHowl.playing()) {
          currentHowl.pause()
        }
        currentHowl.unload()
        setCurrentHowl(null)
      }
      
      // Clear interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      
      return
    }

    setShowPlayer(true)
    isInitializedRef.current = false

    // Clean up existing audio
    if (currentHowl) {
      if (currentHowl.playing()) {
        currentHowl.pause()
      }
      currentHowl.unload()
      setCurrentHowl(null)
    }

    // Clear interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Find starting paragraph index
    const startIndex = currentParagraphNumber 
      ? audioFiles.findIndex(f => f.paragraphNumber === currentParagraphNumber) 
      : 0

    if (startIndex >= 0) {
      setCurrentAudioIndex(startIndex)
    }

    // Cleanup on unmount
    return () => {
      if (currentHowl) {
        if (currentHowl.playing()) {
          currentHowl.pause()
        }
        currentHowl.unload()
        setCurrentHowl(null)
      }
      
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [novelId, chapterNumber, audioFiles.length, currentParagraphNumber, setCurrentAudioIndex])

  // Load and play current audio file
  useEffect(() => {
    if (!showPlayer || audioFiles.length === 0 || currentAudioIndex < 0 || currentAudioIndex >= audioFiles.length) {
      return
    }

    const audioFile = audioFiles[currentAudioIndex]
    if (!audioFile) return

    let howl: Howl | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let isMounted = true

    // Clean up previous audio
    if (currentHowl) {
      currentHowl.unload()
      setCurrentHowl(null)
    }

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }

    // Reset progress when switching to new audio file
    // Đặt lại tiến độ khi chuyển sang file audio mới
    setCurrentTime(0)
    setDuration(0)
    setIsLoading(true)
    setCurrentParagraph(audioFile.paragraphNumber)

    // Convert relative URL to absolute URL for Howler.js
    // Prefer hitting the backend directly instead of going through the Vite proxy,
    // because some browsers/devtools will show proxied media/Range requests as "canceled"
    // when the underlying connection is interrupted or re-used.
    // Chuyển URL tương đối thành URL tuyệt đối cho Howler.js, ưu tiên gọi trực tiếp backend
    const backendBaseUrl = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:11110'
    const audioSrc = audioFile.audioURL.startsWith('http')
      ? audioFile.audioURL  // Already absolute
      : `${backendBaseUrl}${audioFile.audioURL}`  // Call backend directly (e.g. http://localhost:11110/static/...)

    // Configure Howler.js for streaming audio
    // With html5: true, HTML5 Audio API handles Range requests automatically
    // XHR mode can cause request cancellation, so we avoid it
    howl = new Howl({
      src: [audioSrc],
      html5: true,  // Use HTML5 Audio (handles Range requests automatically)
      format: ['wav'],  // Specify format explicitly
      preload: 'metadata',  // Load metadata first, allows streaming
      volume: volume,
      rate: playbackRate,
      onload: () => {
        if (!isMounted || !howl) return
        setDuration(howl.duration())
        setIsLoading(false)
        if (isPlaying && !isInitializedRef.current) {
          howl.play()
          isInitializedRef.current = true
        }
      },
      onplay: () => {
        if (!isMounted) return
        playAction()
      },
      onpause: () => {
        if (!isMounted) return
        pauseAction()
      },
      onend: () => {
        if (!isMounted) return
        // Auto-advance to next paragraph
        if (currentAudioIndex < audioFiles.length - 1) {
          setCurrentAudioIndex(currentAudioIndex + 1)
        } else {
          // End of chapter
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

    // Start progress tracking
    let lastSavedTime = 0
    intervalId = setInterval(() => {
      if (!isMounted || !howl || !howl.playing()) return

      const seek = howl.seek() as number
      if (typeof seek === 'number') {
        setCurrentTime(seek)

        // Auto-save progress every N seconds (debounced)
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
            paragraphNumber: audioFile.paragraphNumber,
            position: seek,
          }).catch((error) => {
            logError('Failed to save progress', error)
          })
        }
      }
    }, AUDIO_CONFIG.PROGRESS_UPDATE_INTERVAL_MS)

    progressIntervalRef.current = intervalId

    // Cleanup on unmount or dependency change
    return () => {
      isMounted = false
      
      // Clear interval
      if (intervalId) {
        clearInterval(intervalId)
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }

      // Save progress before cleanup if audio was playing
      if (novelId && chapterNumber && howl) {
        try {
          const seek = howl.seek()
          if (typeof seek === 'number' && seek > 0) {
            saveProgress({
              novelId,
              chapterNumber,
              paragraphNumber: audioFile.paragraphNumber,
              position: seek,
            }).catch((error) => {
              logError('Failed to save progress on cleanup', error)
            })
          }
        } catch (error) {
          logError('Error getting seek position on cleanup', error)
        }
      }

      // Clean up Howl instance
      if (howl) {
        // Stop playing first
        if (howl.playing()) {
          howl.pause()
        }
        // Unload to free memory
        howl.unload()
        howl = null
      }
    }
  }, [currentAudioIndex, audioFiles, isPlaying, playbackRate, volume, showPlayer, novelId, chapterNumber, setCurrentParagraph, setCurrentTime, setDuration, setIsLoading, playAction, pauseAction, setCurrentAudioIndex, saveProgress])

  // Update Howl volume when volume changes
  useEffect(() => {
    if (currentHowl) {
      currentHowl.volume(volume)
    }
  }, [volume, currentHowl])

  // Update Howl rate when playbackRate changes
  useEffect(() => {
    if (currentHowl) {
      currentHowl.rate(playbackRate)
    }
  }, [playbackRate, currentHowl])

  const handlePlay = () => {
    if (currentHowl) {
      if (currentHowl.playing()) {
        currentHowl.pause()
        pauseAction()
      } else {
        currentHowl.play()
        playAction()
      }
    }
  }

  const handlePrevious = () => {
    if (currentAudioIndex > 0) {
      setCurrentAudioIndex(currentAudioIndex - 1)
      setCurrentTime(0)
    }
  }

  const handleNext = () => {
    if (currentAudioIndex < audioFiles.length - 1) {
      setCurrentAudioIndex(currentAudioIndex + 1)
      setCurrentTime(0)
    }
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
    
    // Resume playing if it was playing before
    if (isPlaying && !currentHowl.playing()) {
      currentHowl.play()
    }
  }

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    // Could add tooltip showing hover time here if needed
    // For now, we just handle the click for seeking
  }

  const handleClose = useCallback(() => {
    // Clean up audio
    if (currentHowl) {
      if (currentHowl.playing()) {
        currentHowl.pause()
      }
      currentHowl.unload()
      setCurrentHowl(null)
      setCurrentAudio(null)
    }
    
    // Clear interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    pauseAction()
    setShowPlayer(false)
    setAudioFiles([])
    
    // Save progress before closing if audio was playing
    if (novelId && chapterNumber && currentHowl) {
      try {
        const seek = currentHowl.seek()
        if (typeof seek === 'number' && seek > 0) {
          const audioFile = audioFiles[currentAudioIndex]
          if (audioFile) {
            saveProgress({
              novelId,
              chapterNumber,
              paragraphNumber: audioFile.paragraphNumber,
              position: seek,
            }).catch((error) => {
              logError('Failed to save progress on close', error)
            })
          }
        }
      } catch (error) {
        logError('Error saving progress on close', error)
      }
    }
  }, [currentHowl, novelId, chapterNumber, audioFiles, currentAudioIndex, pauseAction, setShowPlayer, setAudioFiles, setCurrentAudio, saveProgress])

  if (!showPlayer || audioFiles.length === 0) {
    return null
  }

  const currentFile = audioFiles[currentAudioIndex]
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              Chapter {chapterNumber} - Paragraph {currentFile?.paragraphNumber || 0} / {audioFiles.length}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {currentFile 
                ? `Playing paragraph ${currentFile.paragraphNumber !== null && currentFile.paragraphNumber !== undefined ? currentFile.paragraphNumber : '?'}` 
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

        {/* Progress Bar - Clickable for seeking */}
        <div className="mb-3">
          <div 
            className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1 cursor-pointer relative"
            onClick={handleSeek}
            onMouseMove={handleProgressHover}
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
              disabled={currentAudioIndex <= 0 || isLoading}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous paragraph"
              type="button"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={handlePlay}
              disabled={isLoading || !currentFile}
              className="p-3 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              type="button"
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
              disabled={isLoading || !currentFile || !currentHowl}
              className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Replay current paragraph"
              type="button"
              title="Replay from beginning"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={handleNext}
              disabled={currentAudioIndex >= audioFiles.length - 1 || isLoading}
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
