/**
 * Logger Usage Examples
 * 
 * This file demonstrates how to use the logger in different scenarios
 */

import { logger, createChildLogger, type LogLevel } from './logger.js';

// Basic usage
logger.info('Simple info message');
logger.error('Error message');
logger.warn('Warning message');
logger.debug('Debug message');

// Structured logging (recommended)
logger.info({ userId: '123', action: 'login' }, 'User logged in');
logger.error({ err: new Error('Something went wrong') }, 'Operation failed');

// Create child logger with context
const serviceLogger = createChildLogger({ service: 'user-service' });
serviceLogger.info('This log will include service context');

const requestLogger = createChildLogger({ requestId: 'req-123' });
requestLogger.info('This log will include requestId');

// Log levels
const levels: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
levels.forEach((level) => {
  logger[level]({ level }, `Log at ${level} level`);
});

// Error logging
try {
  throw new Error('Example error');
} catch (err) {
  logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, 'Caught error');
}

