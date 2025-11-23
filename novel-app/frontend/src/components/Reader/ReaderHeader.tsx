import { ChevronLeft, ChevronRight, Sparkles, SparklesIcon } from 'lucide-react'
import type { Novel } from '../../types'

interface ReaderHeaderProps {
  novel: Novel
  currentChapterNumber: number
  onChapterChange?: (chapterNumber: number) => void
  onDetectChapterRoles?: () => void
  onDetectNovelRoles?: () => void
  roleDetectionLoading?: boolean
  roleDetectionLoadingText?: string
  forceRegenerateRoles?: boolean
  onForceRegenerateRolesChange?: (force: boolean) => void
}

function ReaderHeader({ 
  novel, 
  currentChapterNumber, 
  onChapterChange,
  onDetectChapterRoles,
  onDetectNovelRoles,
  roleDetectionLoading = false,
  roleDetectionLoadingText,
  forceRegenerateRoles = false,
  onForceRegenerateRolesChange
}: ReaderHeaderProps) {
  const handlePrevChapter = () => {
    if (currentChapterNumber > 1 && onChapterChange) {
      onChapterChange(currentChapterNumber - 1)
    }
  }

  const handleNextChapter = () => {
    if (currentChapterNumber < novel.totalChapters && onChapterChange) {
      onChapterChange(currentChapterNumber + 1)
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {novel.title}
        </h1>
      </div>
      
      <div className="flex items-center space-x-4 mb-4">
        <button
          onClick={handlePrevChapter}
          disabled={currentChapterNumber <= 1}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          type="button"
          aria-label="Previous chapter"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center space-x-2">
          <span className="text-gray-700 dark:text-gray-300">Chapter</span>
          <select
            value={currentChapterNumber}
            onChange={(e) => onChapterChange?.(Number.parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Array.from({ length: novel.totalChapters }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
          <span className="text-gray-700 dark:text-gray-300">
            of {novel.totalChapters}
          </span>
        </div>
        
        <button
          onClick={handleNextChapter}
          disabled={currentChapterNumber >= novel.totalChapters}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          type="button"
          aria-label="Next chapter"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Role Detection Buttons */}
      {(onDetectChapterRoles || onDetectNovelRoles) && (
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {/* Force Regenerate Checkbox */}
          <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={forceRegenerateRoles}
              onChange={(e) => onForceRegenerateRolesChange?.(e.target.checked)}
              disabled={roleDetectionLoading}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
            />
            <span>Force Regenerate (Overwrite existing roles)</span>
          </label>
          
          {onDetectChapterRoles && (
            <button
              onClick={onDetectChapterRoles}
              disabled={roleDetectionLoading}
              className="px-3 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              type="button"
              title="Detect roles for this chapter"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {roleDetectionLoading && roleDetectionLoadingText?.includes('Chapter')
                  ? roleDetectionLoadingText
                  : 'Detect Roles (Chapter)'}
              </span>
            </button>
          )}
          
          {onDetectNovelRoles && (
            <button
              onClick={onDetectNovelRoles}
              disabled={roleDetectionLoading}
              className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              type="button"
              title="Detect roles for all chapters"
            >
              <SparklesIcon className="w-4 h-4" />
              <span>
                {roleDetectionLoading && roleDetectionLoadingText?.includes('Novel')
                  ? roleDetectionLoadingText
                  : 'Detect Roles (All Chapters)'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default ReaderHeader

