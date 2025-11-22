import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import { useNovelStore } from '../store/useNovelStore'
import NovelCard from '../components/Library/NovelCard'
import NovelUpload from '../components/Library/NovelUpload'
import SearchBar from '../components/Library/SearchBar'
import Loading from '../components/Common/Loading'
import ErrorMessage from '../components/Common/ErrorMessage'

function LibraryPage() {
  const navigate = useNavigate()
  const { novels, loading, error, fetchNovels } = useNovelStore()

  useEffect(() => {
    fetchNovels()
  }, [fetchNovels])

  const handleNovelSelect = (novelId: string) => {
    navigate(`/novel/${novelId}`)
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <BookOpen className="w-8 h-8" />
            <span>Novel Library</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Your collection of novels / Bộ sưu tập truyện của bạn
          </p>
        </div>
        <NovelUpload />
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <SearchBar />
      </div>

      {/* Error Message */}
      {error && (
        <ErrorMessage message={error} />
      )}

      {/* Loading State */}
      {loading && (
        <Loading message="Loading novels..." />
      )}

      {/* Novels Grid */}
      {!loading && !error && (
        <>
          {novels.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No novels yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Upload your first novel to get started!
              </p>
              <NovelUpload />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {novels.map((novel) => (
                <NovelCard
                  key={novel.id}
                  novel={novel}
                  onSelect={() => handleNovelSelect(novel.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default LibraryPage

