import { BookOpen, Trash2 } from 'lucide-react'
import type { Novel } from '../../types'

interface NovelCardProps {
  novel: Novel
  onSelect: () => void
  onDelete?: (id: string) => void
}

function NovelCard({ novel, onSelect, onDelete }: NovelCardProps) {
  const progressPercent = novel.totalChapters > 0 
    ? Math.round((0 / novel.totalChapters) * 100) 
    : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <BookOpen className="w-10 h-10 text-primary-600 dark:text-primary-400 mt-1" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {novel.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {novel.totalChapters} chapters
            </p>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(novel.id)
            }}
            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            aria-label="Delete novel"
            type="button"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      
      <button
        onClick={onSelect}
        className="w-full btn-primary"
        type="button"
      >
        Read / Đọc
      </button>
    </div>
  )
}

export default NovelCard

