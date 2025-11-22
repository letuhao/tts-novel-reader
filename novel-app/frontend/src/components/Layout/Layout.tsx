import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Settings, Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/useUIStore'
import AudioPlayer from '../Audio/AudioPlayer'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold text-gray-900 dark:text-white">
              <BookOpen className="w-6 h-6" />
              <span>Novel Reader</span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === '/'
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Library
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === '/settings'
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
                type="button"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>

      {/* Audio Player (Fixed Bottom) */}
      <AudioPlayer />
    </div>
  )
}

export default Layout

