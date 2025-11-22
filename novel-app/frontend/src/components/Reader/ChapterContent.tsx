import { useEffect, useRef } from 'react'
import type { Paragraph } from '../../types'

interface ChapterContentProps {
  paragraphs: Paragraph[]
  currentParagraphNumber: number
  onParagraphClick?: (paragraphNumber: number) => void
  paragraphRefs?: React.MutableRefObject<Map<number, HTMLParagraphElement>>
}

function ChapterContent({ 
  paragraphs, 
  currentParagraphNumber, 
  onParagraphClick,
  paragraphRefs 
}: ChapterContentProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to current paragraph when it changes
  useEffect(() => {
    if (currentParagraphNumber > 0 && paragraphRefs) {
      const paragraphElement = paragraphRefs.current.get(currentParagraphNumber)
      if (paragraphElement) {
        // Smooth scroll to paragraph
        paragraphElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
      }
    }
  }, [currentParagraphNumber, paragraphRefs])

  return (
    <div 
      ref={containerRef}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 prose dark:prose-invert max-w-none"
    >
      {paragraphs.map((paragraph) => (
        <p
          key={paragraph.id}
          ref={(el) => {
            if (el && paragraphRefs) {
              paragraphRefs.current.set(paragraph.paragraphNumber, el)
            }
          }}
          className={`
            mb-4 text-gray-900 dark:text-gray-100 leading-relaxed transition-all duration-200
            ${paragraph.paragraphNumber === currentParagraphNumber
              ? 'bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded shadow-sm'
              : ''
            }
            ${onParagraphClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors' : ''}
          `}
          onClick={() => onParagraphClick?.(paragraph.paragraphNumber)}
        >
          {paragraph.text}
        </p>
      ))}
    </div>
  )
}

export default ChapterContent

