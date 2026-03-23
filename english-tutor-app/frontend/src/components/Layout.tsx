/**
 * Layout Component - Main layout wrapper
 */
import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, Home, Settings, LogOut, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <MessageCircle className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">English Tutor</h1>
              </Link>
            </div>
            <nav className="flex items-center space-x-4">
              <Link
                to="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </div>
              </Link>
              <Link
                to="/conversations"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/conversations') || isActive('/conversation')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <MessageCircle className="h-4 w-4" />
                  <span>Conversations</span>
                </div>
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/settings')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </div>
              </Link>
              
              {/* User Menu */}
              <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-300">
                <div className="flex items-center space-x-2 text-sm text-gray-700">
                  <User className="h-4 w-4" />
                  <span>{user?.name || user?.email || 'User'}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

