/**
 * API Service - Base Axios instance and configuration
 */
import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { formatErrorMessage, isRetryableError, retry, type RetryOptions } from '../utils/errorHandler';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:11200';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for longer operations
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for session management
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    if (token && config.headers) {
      // Add Authorization header
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors with better messages
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      const data = error.response.data as { error?: string; detail?: string; message?: string };
      
      if (status === 401) {
        // Unauthorized - clear auth and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        
        // Only redirect if not already on login/register page
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login';
        }
      }
      
      // Create a more user-friendly error
      const errorMessage = data.error || data.detail || data.message || formatErrorMessage(error);
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).status = status;
      (enhancedError as any).retryable = isRetryableError(error);
      
      return Promise.reject(enhancedError);
    } else if (error.request) {
      // Request made but no response
      const networkError = new Error('Network error: No response from server');
      (networkError as any).retryable = true;
      return Promise.reject(networkError);
    } else {
      // Error in request setup
      return Promise.reject(error);
    }
  }
);

/**
 * Make API request with retry logic
 */
export async function apiRequestWithRetry<T>(
  requestFn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return retry(requestFn, options);
}

export default apiClient;

