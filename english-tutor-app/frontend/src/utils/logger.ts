/**
 * Simple logger utility for frontend
 */
export const logger = {
  info: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.log('[INFO]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
      console.debug('[DEBUG]', ...args);
    }
  },
};

