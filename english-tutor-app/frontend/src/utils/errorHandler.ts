/**
 * Error Handler Utility
 * Provides consistent error handling and retry logic
 */
import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: unknown) => boolean;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retryable = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryCondition = (error) => {
      if (error instanceof AppError) {
        return error.retryable;
      }
      // Retry on network errors
      if (error instanceof Error) {
        return error.message.includes('network') || error.message.includes('timeout');
      }
      return false;
    },
  } = options;

  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      const delay = retryDelay * Math.pow(2, attempt);
      logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, { error });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('network') || error.message.includes('Network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return 'Request timed out. Please try again.';
    }
    
    // 401 errors
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return 'Session expired. Please log in again.';
    }
    
    // 403 errors
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return 'You do not have permission to perform this action.';
    }
    
    // 404 errors
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      return 'Resource not found.';
    }
    
    // 500 errors
    if (error.message.includes('500') || error.message.includes('Internal Server')) {
      return 'Server error. Please try again later.';
    }
    
    // Generic error
    return error.message || 'An unexpected error occurred.';
  }
  
  return 'An unexpected error occurred.';
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  }
  
  return false;
}

