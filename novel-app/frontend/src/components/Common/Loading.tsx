import { Loader2 } from 'lucide-react'

interface LoadingProps {
  message?: string
}

function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600 dark:text-primary-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  )
}

export default Loading

