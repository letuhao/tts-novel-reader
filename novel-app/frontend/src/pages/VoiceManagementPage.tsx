import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Mic, 
  BookOpen, 
  Settings, 
  RefreshCw, 
  Save, 
  Trash2, 
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { 
  getModels, 
  getVoices, 
  getDefaultMappings, 
  getNovelMappings, 
  setNovelMappings, 
  clearNovelMappings,
  getAssignmentStrategy,
  setAssignmentStrategy,
  type TTSModel,
  type VoiceMapping
} from '../services/voiceMapping'
import { getAll } from '../services/novels'
import type { Novel } from '../types'
import VoiceMappingCard from '../components/VoiceMapping/VoiceMappingCard'
import VoiceSelector from '../components/VoiceMapping/VoiceSelector'

function VoiceManagementPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Data
  const [models, setModels] = useState<TTSModel[]>([])
  const [novels, setNovels] = useState<Novel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [selectedNovel, setSelectedNovel] = useState<string | null>(null)
  
  // Novel-specific data
  const [novelMappings, setNovelMappingsState] = useState<VoiceMapping>({})
  const [defaultMappings, setDefaultMappings] = useState<VoiceMapping>({})
  const [assignmentStrategy, setAssignmentStrategyState] = useState<'round-robin' | 'manual'>('round-robin')
  const [hasCustomMappings, setHasCustomMappings] = useState(false)

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  // Load novel mappings when novel/model changes
  useEffect(() => {
    if (selectedNovel && selectedModel) {
      loadNovelMappings()
    }
  }, [selectedNovel, selectedModel])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [modelsData, novelsData] = await Promise.all([
        getModels(),
        getAll()
      ])
      
      setModels(modelsData)
      setNovels(novelsData)
      
      // Set default model (prefer Coqui XTTS-v2)
      const coquiModel = modelsData.find(m => m.name === 'coqui-xtts-v2')
      if (coquiModel) {
        setSelectedModel(coquiModel.name)
      } else if (modelsData.length > 0) {
        setSelectedModel(modelsData[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadNovelMappings = async () => {
    if (!selectedNovel || !selectedModel) return
    
    try {
      setLoading(true)
      setError(null)
      
      const data = await getNovelMappings(selectedNovel, selectedModel)
      const strategy = await getAssignmentStrategy(selectedNovel)
      
      setNovelMappingsState(data.novelMappings || {})
      setDefaultMappings(data.defaultMappings || {})
      setHasCustomMappings(data.hasCustomMappings)
      setAssignmentStrategyState(strategy)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load novel mappings')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMappings = async () => {
    if (!selectedNovel || !selectedModel) return
    
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      
      await setNovelMappings(selectedNovel, selectedModel, novelMappings)
      setHasCustomMappings(true)
      setSuccess('Voice mappings saved successfully!')
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save mappings')
    } finally {
      setLoading(false)
    }
  }

  const handleClearMappings = async () => {
    if (!selectedNovel || !selectedModel) return
    
    if (!confirm('Are you sure you want to clear all custom voice mappings for this novel?')) {
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      
      await clearNovelMappings(selectedNovel, selectedModel)
      setNovelMappingsState({})
      setHasCustomMappings(false)
      setSuccess('Voice mappings cleared successfully!')
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear mappings')
    } finally {
      setLoading(false)
    }
  }

  const handleStrategyChange = async (strategy: 'round-robin' | 'manual') => {
    if (!selectedNovel) return
    
    try {
      setLoading(true)
      setError(null)
      
      await setAssignmentStrategy(selectedNovel, strategy)
      setAssignmentStrategyState(strategy)
      setSuccess(`Assignment strategy changed to ${strategy}`)
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update strategy')
    } finally {
      setLoading(false)
    }
  }

  const handleMappingChange = (role: string, voice: string) => {
    setNovelMappingsState(prev => ({
      ...prev,
      [role]: voice
    }))
  }

  const selectedNovelData = novels.find(n => n.id === selectedNovel)
  const selectedModelData = models.find(m => m.name === selectedModel)

  if (loading && !selectedNovel) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Mic className="w-8 h-8" />
          Voice Management / Quản Lý Giọng
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure voice mappings for TTS models and novels
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200">{success}</span>
        </div>
      )}

      {/* Model Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Select TTS Model / Chọn Model TTS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {models.map((model) => (
            <button
              key={model.name}
              onClick={() => setSelectedModel(model.name)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedModel === model.name
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
              }`}
            >
              <div className="text-left">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {model.displayName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Default: {model.defaultVoice}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Novel Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Select Novel / Chọn Novel
        </h2>
        {novels.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No novels found. Upload a novel first.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Go to Library
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {novels.map((novel) => (
              <button
                key={novel.id}
                onClick={() => setSelectedNovel(novel.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedNovel === novel.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {novel.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {novel.totalChapters || 0} chapters
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Voice Mapping Configuration */}
      {selectedNovel && selectedModel && selectedNovelData && (
        <div className="space-y-6">
          {/* Assignment Strategy */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Assignment Strategy / Chiến Lược Gán Giọng
            </h2>
            <div className="flex gap-4">
              <button
                onClick={() => handleStrategyChange('round-robin')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  assignmentStrategy === 'round-robin'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Round-Robin (Auto)
              </button>
              <button
                onClick={() => handleStrategyChange('manual')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  assignmentStrategy === 'manual'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Manual
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {assignmentStrategy === 'round-robin'
                ? 'Automatically assign voices in round-robin fashion'
                : 'Use novel-specific voice mappings only'}
            </p>
          </div>

          {/* Voice Mapping Card */}
          <VoiceMappingCard
            novel={selectedNovelData}
            model={selectedModelData!}
            novelMappings={novelMappings}
            defaultMappings={defaultMappings}
            hasCustomMappings={hasCustomMappings}
            onMappingChange={handleMappingChange}
            onSave={handleSaveMappings}
            onClear={handleClearMappings}
            loading={loading}
          />
        </div>
      )}

      {/* Instructions */}
      {!selectedNovel && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
            How to use / Cách sử dụng
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-300">
            <li>Select a TTS model from the list above</li>
            <li>Select a novel to configure voice mappings</li>
            <li>Choose assignment strategy (Round-Robin or Manual)</li>
            <li>Customize voice mappings for each role</li>
            <li>Save your changes</li>
          </ol>
        </div>
      )}
    </div>
  )
}

export default VoiceManagementPage

