import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-800 dark:text-red-300 font-medium">Error</p>
          <p className="text-red-700 dark:text-red-400 text-sm mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm text-red-700 dark:text-red-300 hover:underline"
              type="button"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ErrorMessage

