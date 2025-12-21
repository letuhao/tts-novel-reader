/**
 * Message Bubble Component
 * Improved message bubble design with better styling
 */
import { Volume2, Loader2, AlertCircle } from 'lucide-react';
import type { Message } from '../store/useConversationStore';

interface MessageBubbleProps {
  message: Message;
  isPlaying?: boolean;
}

export default function MessageBubble({ message, isPlaying = false }: MessageBubbleProps): JSX.Element {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-md'
        } ${isPlaying && isAssistant ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}
      >
        {/* Message Content */}
        <div className="flex items-start gap-2">
          {message.icon && (
            <span className="text-lg flex-shrink-0">{message.icon}</span>
          )}
          <p className={`flex-1 ${isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
            {message.content}
          </p>
        </div>

        {/* TTS Status & Audio Info */}
        {isAssistant && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {message.ttsStatus === 'pending' && (
              <span className={`flex items-center gap-1 ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                <Loader2 className="w-3 h-3 animate-spin" />
                Pending
              </span>
            )}
            {message.ttsStatus === 'processing' && (
              <span className={`flex items-center gap-1 ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating
              </span>
            )}
            {message.ttsStatus === 'completed' && message.duration && (
              <span className={`flex items-center gap-1 ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                <Volume2 className="w-3 h-3" />
                {message.duration.toFixed(1)}s
              </span>
            )}
            {message.ttsStatus === 'failed' && (
              <span className={`flex items-center gap-1 text-red-500 dark:text-red-400`}>
                <AlertCircle className="w-3 h-3" />
                Failed
              </span>
            )}
            {isPlaying && (
              <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium animate-pulse">
                Playing
              </span>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className={`mt-1 text-xs ${isUser ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

