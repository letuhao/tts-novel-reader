import { useEffect, useRef } from 'react'
import type { Paragraph } from '../../types'
import RoleIndicator from './RoleIndicator'

interface ChapterContentProps {
  paragraphs: Paragraph[]
  currentParagraphNumber: number
  onParagraphClick?: (paragraphNumber: number) => void
  paragraphRefs?: React.MutableRefObject<Map<number, HTMLParagraphElement>>
  showRoleIndicator?: boolean  // Whether to show role indicators
  novelId?: string | null      // Novel ID for voice resolution
  model?: string | null         // TTS model name for voice resolution
}

function ChapterContent({ 
  paragraphs, 
  currentParagraphNumber, 
  onParagraphClick,
  paragraphRefs,
  showRoleIndicator = true,
  novelId,
  model
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
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 prose dark:prose-invert max-w-none pb-48"
    >
      {paragraphs.map((paragraph) => (
        <div
          key={paragraph.id}
          ref={(el) => {
            if (el && paragraphRefs) {
              paragraphRefs.current.set(paragraph.paragraphNumber, el as HTMLParagraphElement)
            }
          }}
          className={`
            mb-4 transition-all duration-200 flex items-start space-x-3
            ${paragraph.paragraphNumber === currentParagraphNumber
              ? 'bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded shadow-sm'
              : ''
            }
            ${onParagraphClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 px-2 py-1 rounded transition-colors' : ''}
          `}
          onClick={() => onParagraphClick?.(paragraph.paragraphNumber)}
        >
          {/* Role Indicator - Left Side */}
          {showRoleIndicator && (paragraph.role || paragraph.voiceId) && (
            <div className="flex-shrink-0 pt-1">
              <RoleIndicator 
                role={paragraph.role || undefined}
                voiceId={paragraph.voiceId || undefined}
                novelId={novelId}
                model={model}
                compact={true}
              />
            </div>
          )}
          
          {/* Paragraph Text */}
          <p className="text-gray-900 dark:text-gray-100 leading-relaxed flex-1">
            {paragraph.text}
          </p>
        </div>
      ))}
    </div>
  )
}

export default ChapterContent

