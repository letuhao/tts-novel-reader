/**
 * API Service - Base Configuration
 * Dịch vụ API - Cấu hình Cơ sở
 */
import axios, { AxiosInstance, AxiosError } from 'axios'
import { logError } from '../utils/logger'
import { API_CONFIG } from '../utils/constants'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:11110/api'

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_CONFIG.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add any auth tokens or headers here if needed
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      const message = 
        (error.response.data as { error?: string })?.error || 
        error.message ||
        'An error occurred'
      logError('API Error', new Error(message), { response: error.response?.data })
    } else if (error.request) {
      // Request made but no response
      logError('Network Error', new Error('No response from server'), { request: error.request })
    } else {
      // Something else happened
      logError('API Request Error', error)
    }
    return Promise.reject(error)
  }
)

export default api

