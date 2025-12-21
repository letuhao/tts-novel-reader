/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as loginApi, register as registerApi, logout as logoutApi, getCurrentUser } from '../services/authApi';
import { logger } from '../utils/logger';

export interface User {
  id: string;
  email: string;
  name?: string;
  status: string;
  created_at?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token and user from localStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token is still valid
          try {
            const userResponse = await getCurrentUser();
            if (userResponse.success && userResponse.data) {
              setUser(userResponse.data);
              localStorage.setItem(USER_KEY, JSON.stringify(userResponse.data));
            } else {
              // Token invalid, clear auth
              clearAuth();
            }
          } catch (error) {
            logger.error('Token verification failed', error);
            clearAuth();
          }
        }
      } catch (error) {
        logger.error('Error loading auth', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const clearAuth = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await loginApi({ email, password });

      if (response.success && response.data) {
        const { user: userData, token: authToken } = response.data;
        setToken(authToken);
        setUser(userData);
        localStorage.setItem(TOKEN_KEY, authToken);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        logger.info('User logged in successfully', { email: userData.email });
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      logger.error('Login error', error);
      clearAuth();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await registerApi({ 
        email, 
        password, 
        ...(name && { name })
      });

      if (response.success && response.data) {
        const { user: userData, token: authToken } = response.data;
        setToken(authToken);
        setUser(userData);
        localStorage.setItem(TOKEN_KEY, authToken);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        logger.info('User registered successfully', { email: userData.email });
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      logger.error('Registration error', error);
      clearAuth();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await logoutApi();
      }
    } catch (error) {
      logger.error('Logout error', error);
    } finally {
      clearAuth();
      logger.info('User logged out');
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data);
        localStorage.setItem(USER_KEY, JSON.stringify(response.data));
      } else {
        throw new Error(response.error || 'Failed to refresh user');
      }
    } catch (error) {
      logger.error('Error refreshing user', error);
      clearAuth();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

