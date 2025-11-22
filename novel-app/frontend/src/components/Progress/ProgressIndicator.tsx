interface ProgressIndicatorProps {
  currentParagraph: number
  totalParagraphs: number
  chapterNumber: number
}

function ProgressIndicator({ currentParagraph, totalParagraphs, chapterNumber }: ProgressIndicatorProps) {
  const progressPercent = totalParagraphs > 0
    ? Math.round((currentParagraph / totalParagraphs) * 100)
    : 0

  return (
    <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
        <span>
          Chapter {chapterNumber} - Paragraph {currentParagraph} of {totalParagraphs}
        </span>
        <span>{progressPercent}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}

export default ProgressIndicator

