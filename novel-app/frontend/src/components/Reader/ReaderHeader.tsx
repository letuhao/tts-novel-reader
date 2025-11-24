import { ChevronLeft, ChevronRight, Sparkles, SparklesIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import type { Novel, Chapter } from '../../types'
import * as chapterService from '../../services/chapters'

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
  // CRITICAL: Fetch actual chapters list to ensure all chapters are displayed
  // QUAN TRỌNG: Fetch danh sách chapters thực tế để đảm bảo tất cả chapters được hiển thị
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [chaptersLoading, setChaptersLoading] = useState(false)
  
  useEffect(() => {
    // Use chapters from novel if available, otherwise fetch from API
    // Sử dụng chapters từ novel nếu có, nếu không thì fetch từ API
    if (novel.chapters && novel.chapters.length > 0) {
      setChapters(novel.chapters)
    } else {
      // Fetch chapters list to get accurate count
      // Fetch danh sách chapters để lấy số đếm chính xác
      setChaptersLoading(true)
      chapterService.getChapters(novel.id)
        .then((fetchedChapters) => {
          setChapters(fetchedChapters)
          setChaptersLoading(false)
        })
        .catch((error) => {
          console.error('[ReaderHeader] Failed to fetch chapters:', error)
          setChaptersLoading(false)
        })
    }
  }, [novel.id, novel.chapters])
  
  // Use actual chapters count, fallback to totalChapters
  // Sử dụng số đếm chapters thực tế, fallback về totalChapters
  const actualTotalChapters = chapters.length > 0 ? chapters.length : novel.totalChapters
  
  // CRITICAL: Support non-sequential chapter numbers
  // QUAN TRỌNG: Hỗ trợ số chapter không liên tục
  const getPrevChapterNumber = (): number | null => {
    if (chapters.length === 0) {
      // Fallback: sequential navigation if chapters not loaded
      // Dự phòng: điều hướng tuần tự nếu chapters chưa được load
      return currentChapterNumber > 1 ? currentChapterNumber - 1 : null
    }
    
    // Find previous chapter in actual chapters array (supports gaps)
    // Tìm chapter trước trong mảng chapters thực tế (hỗ trợ khoảng trống)
    // Handle both camelCase and snake_case for backward compatibility
    // Xử lý cả camelCase và snake_case để tương thích ngược
    const sortedChapters = [...chapters].sort((a, b) => {
      const aNum = a.chapterNumber || a.chapter_number || 0
      const bNum = b.chapterNumber || b.chapter_number || 0
      return aNum - bNum
    })
    const currentIndex = sortedChapters.findIndex(ch => {
      const chNum = ch.chapterNumber || ch.chapter_number
      return chNum === currentChapterNumber
    })
    if (currentIndex > 0) {
      const prevCh = sortedChapters[currentIndex - 1]
      return prevCh.chapterNumber || prevCh.chapter_number || null
    }
    return null
  }
  
  const getNextChapterNumber = (): number | null => {
    if (chapters.length === 0) {
      // Fallback: sequential navigation if chapters not loaded
      // Dự phòng: điều hướng tuần tự nếu chapters chưa được load
      return currentChapterNumber < actualTotalChapters ? currentChapterNumber + 1 : null
    }
    
    // Find next chapter in actual chapters array (supports gaps)
    // Tìm chapter tiếp theo trong mảng chapters thực tế (hỗ trợ khoảng trống)
    // Handle both camelCase and snake_case for backward compatibility
    // Xử lý cả camelCase và snake_case để tương thích ngược
    const sortedChapters = [...chapters].sort((a, b) => {
      const aNum = a.chapterNumber || a.chapter_number || 0
      const bNum = b.chapterNumber || b.chapter_number || 0
      return aNum - bNum
    })
    const currentIndex = sortedChapters.findIndex(ch => {
      const chNum = ch.chapterNumber || ch.chapter_number
      return chNum === currentChapterNumber
    })
    if (currentIndex >= 0 && currentIndex < sortedChapters.length - 1) {
      const nextCh = sortedChapters[currentIndex + 1]
      return nextCh.chapterNumber || nextCh.chapter_number || null
    }
    return null
  }
  
  const handlePrevChapter = () => {
    const prevChapter = getPrevChapterNumber()
    if (prevChapter !== null && onChapterChange) {
      onChapterChange(prevChapter)
    }
  }

  const handleNextChapter = () => {
    const nextChapter = getNextChapterNumber()
    if (nextChapter !== null && onChapterChange) {
      onChapterChange(nextChapter)
    }
  }
  
  const prevChapterNumber = getPrevChapterNumber()
  const nextChapterNumber = getNextChapterNumber()

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
          disabled={prevChapterNumber === null || chaptersLoading}
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
            disabled={chaptersLoading}
          >
            {chaptersLoading ? (
              <option value={currentChapterNumber}>Loading chapters...</option>
            ) : (
              // CRITICAL: Use actual chapters array to support non-sequential chapter numbers
              // QUAN TRỌNG: Sử dụng mảng chapters thực tế để hỗ trợ số chapter không liên tục
              chapters.length > 0
                ? chapters.map((ch) => {
                    // Handle both camelCase and snake_case for backward compatibility
                    // Xử lý cả camelCase và snake_case để tương thích ngược
                    const chapterNumber = ch.chapterNumber || ch.chapter_number || 0
                    const title = ch.title || ''
                    // Clean up title - remove single colon or meaningless titles
                    // Làm sạch title - loại bỏ dấu hai chấm đơn hoặc title vô nghĩa
                    const displayTitle = title && title.trim() !== ':' && title.trim().length > 0 
                      ? ` - ${title.trim()}` 
                      : ''
                    return (
                      <option key={ch.id} value={chapterNumber}>
                        {chapterNumber}{displayTitle}
                      </option>
                    )
                  })
                : // Fallback: Generate sequential numbers if chapters array not available
                  // Dự phòng: Generate số liên tục nếu mảng chapters không có sẵn
                  Array.from({ length: actualTotalChapters }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))
            )}
          </select>
          <span className="text-gray-700 dark:text-gray-300">
            of {chaptersLoading ? '...' : actualTotalChapters}
          </span>
        </div>
        
        <button
          onClick={handleNextChapter}
          disabled={nextChapterNumber === null || chaptersLoading}
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

