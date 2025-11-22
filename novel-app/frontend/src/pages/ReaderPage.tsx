import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, RotateCcw } from 'lucide-react'
import { useReaderStore } from '../store/useReaderStore'
import { useNovelStore } from '../store/useNovelStore'
import { useAudioStore } from '../store/useAudioStore'
import { useGenerationStore } from '../store/useGenerationStore'
import { useProgressStore } from '../store/useProgressStore'
import ChapterContent from '../components/Reader/ChapterContent'
import ReaderHeader from '../components/Reader/ReaderHeader'
import ProgressIndicator from '../components/Progress/ProgressIndicator'
import Loading from '../components/Common/Loading'
import ErrorMessage from '../components/Common/ErrorMessage'
import * as audioService from '../services/audio'
import * as generationService from '../services/generation'
import { logError } from '../utils/logger'
import { AUDIO_CONFIG } from '../utils/constants'

function ReaderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { currentNovel, loading: novelLoading, fetchNovel } = useNovelStore()
  const { 
    chapterNumber, 
    paragraphs, 
    currentParagraphNumber,
    loading: readerLoading,
    error: readerError,
    loadChapter,
    setNovelId,
    setCurrentParagraph
  } = useReaderStore()

  const { audioFiles, setAudioFiles, setCurrentAudioIndex, currentAudio, play: playAudio } = useAudioStore()
  const { 
    status: generationStatus, 
    progress: generationProgress,
    startGeneration,
    updateProgress 
  } = useGenerationStore()
  const { 
    progress: savedProgress, 
    loadProgress, 
    currentChapter: savedChapter,
    currentParagraph: savedParagraph
  } = useProgressStore()
  
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false)
  const [forceRegenerate, setForceRegenerate] = useState(false)
  const paragraphRefs = useRef<Map<number, HTMLParagraphElement>>(new Map())

  useEffect(() => {
    if (id) {
      setNovelId(id)
      fetchNovel(id)
    }
  }, [id, fetchNovel, setNovelId])

  // Load saved progress when novel is loaded
  useEffect(() => {
    if (id && !hasLoadedProgress) {
      loadProgress(id)
      setHasLoadedProgress(true)
    }
  }, [id, loadProgress, hasLoadedProgress])

  useEffect(() => {
    if (id && currentNovel && !chapterNumber) {
      // Load saved chapter or first chapter
      const chapterToLoad = savedChapter || 1
      loadChapter(id, chapterToLoad).then(() => {
        // After chapter loads, check if we should show resume prompt
        if (savedChapter && savedParagraph) {
          setShowResumePrompt(true)
        }
      })
    }
  }, [id, currentNovel, chapterNumber, loadChapter, savedChapter, savedParagraph])

  // Load audio files when chapter changes
  useEffect(() => {
    const loadAudioFiles = async () => {
      if (!id || !chapterNumber) return

      try {
        // Try to get existing audio files
        const audioFiles = await audioService.getChapterAudio(id, chapterNumber)
        if (audioFiles && audioFiles.length > 0) {
          setAudioFiles(audioFiles)
        } else {
          // No audio files found - user can generate them
          setAudioFiles([])
        }
      } catch (error) {
        logError('Failed to load audio files', error)
        setAudioFiles([])
      }
    }

    loadAudioFiles()
  }, [id, chapterNumber, setAudioFiles])

  // Check generation progress
  useEffect(() => {
    if (!id || !chapterNumber || generationStatus !== 'generating') {
      return
    }

    const checkProgress = async () => {
      try {
        const stats = await generationService.getChapterStats(id, chapterNumber)
        updateProgress(stats)
        
        // If all completed, reload audio files
        if (stats.completed === stats.total && stats.total > 0) {
          const audioFiles = await audioService.getChapterAudio(id, chapterNumber)
          if (audioFiles) {
            setAudioFiles(audioFiles)
          }
        }
      } catch (error) {
        logError('Failed to check generation progress', error)
      }
    }

    const interval = setInterval(checkProgress, AUDIO_CONFIG.GENERATION_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [id, chapterNumber, generationStatus, updateProgress, setAudioFiles])

  const handleGenerateAudio = async () => {
    if (!id || !chapterNumber) return

    try {
      startGeneration(id, chapterNumber)
      
      const result = await audioService.generateChapter(id, chapterNumber, {
        speakerId: AUDIO_CONFIG.DEFAULT_SPEAKER_ID,
        speedFactor: AUDIO_CONFIG.DEFAULT_SPEED_FACTOR,
        forceRegenerate: forceRegenerate,
      })

      if (result.success) {
        // Load generated audio files
        const audioFiles = await audioService.getChapterAudio(id, chapterNumber)
        if (audioFiles) {
          setAudioFiles(audioFiles)
        }
      }
    } catch (error) {
      logError('Failed to generate audio', error)
    }
  }

  const handleGenerateAllChapters = async () => {
    if (!id) return

    try {
      startGeneration(id, 0) // Use 0 to indicate generating all chapters
      
      const result = await audioService.generateAllChapters(id, {
        speakerId: AUDIO_CONFIG.DEFAULT_SPEAKER_ID,
        speedFactor: AUDIO_CONFIG.DEFAULT_SPEED_FACTOR,
        forceRegenerate: forceRegenerate,
      })

      if (result.success) {
        // Reload current chapter audio if available
        if (chapterNumber) {
          const audioFiles = await audioService.getChapterAudio(id, chapterNumber)
          if (audioFiles) {
            setAudioFiles(audioFiles)
          }
        }
      }
    } catch (error) {
      logError('Failed to generate all chapters audio', error)
    }
  }

  const handleChapterChange = async (newChapterNumber: number) => {
    if (!id) return
    await loadChapter(id, newChapterNumber)
    setShowResumePrompt(false)
  }

  const handleResume = async () => {
    if (!id || !savedChapter || !savedParagraph) return

    // Load the saved chapter
    await loadChapter(id, savedChapter)
    
    // Set current paragraph
    setCurrentParagraph(savedParagraph)
    
    // Scroll to paragraph after a short delay to ensure DOM is ready
    setTimeout(() => {
      const paragraphElement = paragraphRefs.current.get(savedParagraph)
      if (paragraphElement) {
        paragraphElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 200)

    // Load audio files and seek to position if available
    try {
      const audioFiles = await audioService.getChapterAudio(id, savedChapter)
      if (audioFiles && audioFiles.length > 0) {
        setAudioFiles(audioFiles)
        
        // Find the audio file for the saved paragraph
        const audioIndex = audioFiles.findIndex(f => f.paragraphNumber === savedParagraph)
        if (audioIndex >= 0) {
          setCurrentAudioIndex(audioIndex)
        }
      }
    } catch (error) {
      logError('Failed to load audio for resume', error)
    }

    setShowResumePrompt(false)
  }

  const handleStartFromBeginning = () => {
    setShowResumePrompt(false)
    if (paragraphs && paragraphs.length > 0) {
      setCurrentParagraph(1)
    }
  }

  const handleParagraphClick = (paragraphNumber: number) => {
    // Jump to the clicked paragraph's audio
    // Nhảy tới audio của paragraph được click
    if (!audioFiles || audioFiles.length === 0) return
    
    // Find the audio file for this paragraph
    const audioIndex = audioFiles.findIndex(f => f.paragraphNumber === paragraphNumber)
    
    if (audioIndex >= 0) {
      // Set current audio index and start playing
      setCurrentAudioIndex(audioIndex)
      setCurrentParagraph(paragraphNumber)
      
      // If audio player is available, start playing from this paragraph
      // Nếu audio player có sẵn, bắt đầu phát từ paragraph này
      if (currentAudio) {
        try {
          currentAudio.seek(0) // Start from beginning of paragraph
          currentAudio.play()
          playAudio()
        } catch (error) {
          logError('Failed to start playback from paragraph', error)
        }
      }
    }
  }

  if (novelLoading || readerLoading) {
    return <Loading message="Loading chapter..." />
  }

  if (readerError) {
    return <ErrorMessage message={readerError} />
  }

  if (!currentNovel) {
    return <ErrorMessage message="Novel not found" />
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="mb-4 flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        type="button"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Library</span>
      </button>

      {/* Reader Header */}
      <ReaderHeader 
        novel={currentNovel}
        currentChapterNumber={chapterNumber || 1}
        onChapterChange={handleChapterChange}
      />

      {/* Resume Reading Prompt */}
      {showResumePrompt && savedChapter && savedParagraph && (
        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Resume Reading?
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                You were reading Chapter {savedChapter}, Paragraph {savedParagraph}
                {savedProgress?.lastReadAt && (
                  <span className="ml-2">
                    (Last read: {new Date(savedProgress.lastReadAt).toLocaleDateString()})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResume}
                className="btn-primary flex items-center space-x-2"
                type="button"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resume</span>
              </button>
              <button
                onClick={handleStartFromBeginning}
                className="btn-secondary"
                type="button"
              >
                Start from Beginning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Audio Buttons */}
      {paragraphs && paragraphs.length > 0 && (
        <div className="mb-4 space-y-3">
          {/* Force Regenerate Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              id="force-regenerate-checkbox"
              type="checkbox"
              checked={forceRegenerate}
              onChange={(e) => setForceRegenerate(e.target.checked)}
              disabled={generationStatus === 'generating'}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label
              htmlFor="force-regenerate-checkbox"
              className={`text-sm font-medium ${
                generationStatus === 'generating'
                  ? 'text-gray-400 dark:text-gray-600'
                  : 'text-gray-700 dark:text-gray-300'
              } cursor-pointer`}
            >
              Force Regenerate (skip already-generated audio files by default)
            </label>
          </div>

          {/* Generate Buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleGenerateAudio}
              disabled={generationStatus === 'generating'}
              className="btn-primary flex items-center space-x-2"
              type="button"
            >
              <Play className="w-5 h-5" />
              <span>
                {generationStatus === 'generating' 
                  ? `Generating Audio... (${generationProgress?.completed || 0}/${generationProgress?.total || 0})`
                  : 'Generate Audio for Chapter'
                }
              </span>
            </button>
            
            {id && currentNovel && (
              <button
                onClick={handleGenerateAllChapters}
                disabled={generationStatus === 'generating'}
                className="btn-secondary flex items-center space-x-2"
                type="button"
              >
                <Play className="w-5 h-5" />
                <span>
                  {generationStatus === 'generating' 
                    ? `Generating All Chapters...`
                    : `Generate All Chapters (${currentNovel.totalChapters || 0})`
                  }
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {chapterNumber && paragraphs && (
        <ProgressIndicator
          currentParagraph={currentParagraphNumber || 0}
          totalParagraphs={paragraphs.length}
          chapterNumber={chapterNumber}
        />
      )}

      {/* Chapter Content */}
      {chapterNumber && paragraphs && (
        <ChapterContent
          paragraphs={paragraphs}
          currentParagraphNumber={currentParagraphNumber || 0}
          paragraphRefs={paragraphRefs}
          onParagraphClick={handleParagraphClick}
        />
      )}
    </div>
  )
}

export default ReaderPage

