import { useState, useEffect } from 'react'
import { Save, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { getVoices, type VoiceMapping } from '../../services/voiceMapping'
import type { Novel } from '../../types'
import type { TTSModel } from '../../services/voiceMapping'
import VoiceSelector from './VoiceSelector'

interface VoiceMappingCardProps {
  novel: Novel
  model: TTSModel
  novelMappings: VoiceMapping
  defaultMappings: VoiceMapping
  hasCustomMappings: boolean
  onMappingChange: (role: string, voice: string) => void
  onSave: () => void
  onClear: () => void
  loading: boolean
}

function VoiceMappingCard({
  novel,
  model,
  novelMappings,
  defaultMappings,
  hasCustomMappings,
  onMappingChange,
  onSave,
  onClear,
  loading
}: VoiceMappingCardProps) {
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(['narrator', 'male_1', 'female_1']))
  const [availableVoices, setAvailableVoices] = useState<string[]>([])
  const [loadingVoices, setLoadingVoices] = useState(false)

  useEffect(() => {
    loadVoices()
  }, [model])

  const loadVoices = async () => {
    try {
      setLoadingVoices(true)
      const voices = await getVoices(model.name, 'all')
      setAvailableVoices(voices)
    } catch (err) {
      console.error('Failed to load voices:', err)
    } finally {
      setLoadingVoices(false)
    }
  }

  const toggleRole = (role: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev)
      if (next.has(role)) {
        next.delete(role)
      } else {
        next.add(role)
      }
      return next
    })
  }

  // Group roles by type
  const narratorRoles = Object.keys(defaultMappings).filter(r => r === 'narrator')
  const maleRoles = Object.keys(defaultMappings)
    .filter(r => r.startsWith('male_'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('male_', '')) || 0
      const numB = parseInt(b.replace('male_', '')) || 0
      return numA - numB
    })
  const femaleRoles = Object.keys(defaultMappings)
    .filter(r => r.startsWith('female_'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('female_', '')) || 0
      const numB = parseInt(b.replace('female_', '')) || 0
      return numA - numB
    })

  const getCurrentVoice = (role: string): string => {
    return novelMappings[role] || defaultMappings[role] || ''
  }

  const hasChanges = () => {
    return Object.keys(novelMappings).length > 0
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Voice Mappings / Ánh Xạ Giọng
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {novel.title} - {model.displayName}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={loading || !hasChanges()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          {hasCustomMappings && (
            <button
              onClick={onClear}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {loadingVoices ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 mt-2">Loading voices...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Narrator */}
          {narratorRoles.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <button
                onClick={() => toggleRole('narrator')}
                className="w-full flex items-center justify-between text-left"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">Narrator / Người Dẫn Chuyện</h3>
                {expandedRoles.has('narrator') ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              {expandedRoles.has('narrator') && (
                <div className="mt-4">
                  <VoiceSelector
                    role="narrator"
                    currentVoice={getCurrentVoice('narrator')}
                    availableVoices={availableVoices}
                    onVoiceChange={(voice) => onMappingChange('narrator', voice)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Male Roles */}
          {maleRoles.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Male Characters / Nhân Vật Nam</h3>
              <div className="space-y-4">
                {maleRoles.map((role) => (
                  <div key={role}>
                    <button
                      onClick={() => toggleRole(role)}
                      className="w-full flex items-center justify-between text-left mb-2"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {role.replace('_', ' ')}
                      </span>
                      {expandedRoles.has(role) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {expandedRoles.has(role) && (
                      <VoiceSelector
                        role={role}
                        currentVoice={getCurrentVoice(role)}
                        availableVoices={availableVoices}
                        onVoiceChange={(voice) => onMappingChange(role, voice)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Female Roles */}
          {femaleRoles.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Female Characters / Nhân Vật Nữ</h3>
              <div className="space-y-4">
                {femaleRoles.map((role) => (
                  <div key={role}>
                    <button
                      onClick={() => toggleRole(role)}
                      className="w-full flex items-center justify-between text-left mb-2"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {role.replace('_', ' ')}
                      </span>
                      {expandedRoles.has(role) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    {expandedRoles.has(role) && (
                      <VoiceSelector
                        role={role}
                        currentVoice={getCurrentVoice(role)}
                        availableVoices={availableVoices}
                        onVoiceChange={(voice) => onMappingChange(role, voice)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VoiceMappingCard

