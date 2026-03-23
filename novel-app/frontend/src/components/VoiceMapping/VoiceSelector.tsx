import { useState } from 'react'
import { Check, Search } from 'lucide-react'

interface VoiceSelectorProps {
  role: string
  currentVoice: string
  availableVoices: string[]
  onVoiceChange: (voice: string) => void
}

function VoiceSelector({ role, currentVoice, availableVoices, onVoiceChange }: VoiceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredVoices = availableVoices.filter(voice =>
    voice.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search voices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      
      <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        {filteredVoices.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No voices found
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredVoices.map((voice) => (
              <button
                key={voice}
                onClick={() => onVoiceChange(voice)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${
                  currentVoice === voice
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : ''
                }`}
              >
                <span className="text-gray-900 dark:text-white">{voice}</span>
                {currentVoice === voice && (
                  <Check className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {currentVoice && (
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Selected: <span className="font-medium text-gray-900 dark:text-white">{currentVoice}</span>
        </div>
      )}
    </div>
  )
}

export default VoiceSelector

