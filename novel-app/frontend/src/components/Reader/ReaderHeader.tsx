import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Novel } from '../../types'

interface ReaderHeaderProps {
  novel: Novel
  currentChapterNumber: number
  onChapterChange?: (chapterNumber: number) => void
}

function ReaderHeader({ novel, currentChapterNumber, onChapterChange }: ReaderHeaderProps) {
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
      
      <div className="flex items-center space-x-4">
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
    </div>
  )
}

export default ReaderHeader

