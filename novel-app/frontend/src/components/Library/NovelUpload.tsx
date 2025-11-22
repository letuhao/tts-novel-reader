import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { useNovelStore } from '../../store/useNovelStore'
import * as novelService from '../../services/novels'

function NovelUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addNovel, fetchNovels } = useNovelStore()

  const handleFileSelect = async (file: File | null) => {
    if (!file) return

    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Simulate progress (in real app, use actual upload progress)
      setUploadProgress(25)
      
      const novel = await novelService.upload(file)
      
      setUploadProgress(75)
      addNovel(novel)
      
      setUploadProgress(100)
      await fetchNovels() // Refresh list
      
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload novel')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
        className="hidden"
        disabled={isUploading}
        id="novel-upload"
      />
      
      <label
        htmlFor="novel-upload"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          inline-flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer
          transition-colors
          ${isUploading 
            ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed' 
            : 'bg-primary-600 hover:bg-primary-700 text-white'
          }
        `}
      >
        <Upload className="w-5 h-5" />
        <span>{isUploading ? 'Uploading...' : 'Upload Novel'}</span>
      </label>

      {error && (
        <div className="absolute top-full mt-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
            type="button"
          >
            <X className="w-4 h-4 inline" />
          </button>
        </div>
      )}

      {isUploading && uploadProgress > 0 && (
        <div className="absolute top-full mt-2 w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default NovelUpload

