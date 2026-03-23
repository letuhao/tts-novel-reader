/**
 * Logger Utility
 * Centralized logging service using Pino with file rotation
 */
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createStream } from 'rotating-file-stream';
import { mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerConfig {
  level?: LogLevel;
  pretty?: boolean;
  environment?: string;
  fileLogging?: boolean;
  logDir?: string;
}

/**
 * Get log directory path
 */
function getLogDirectory(): string {
  const projectRoot = path.resolve(__dirname, '../..');
  return path.join(projectRoot, 'logs');
}

/**
 * Create file stream with rotation by date and size
 */
function createRotatingFileStream(logDir: string): NodeJS.WritableStream {
  // Ensure log directory exists
  try {
    mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }

  // Create rotating file stream
  // Format: app-2024-12-21-0.log, app-2024-12-21-1.log, etc.
  // The filename generator receives (time, index) where time can be Date, number, or undefined
  const stream = createStream(
    (_time?: Date | number, index?: number): string => {
      // Use current date for filename
      const currentDate = new Date().toISOString().split('T')[0]!;
      const fileIndex = index ?? 0;
      return path.join(logDir, `app-${currentDate}-${fileIndex}.log`);
    },
    {
      size: '10M', // Rotate when file reaches 10MB
      interval: '1d', // Also rotate daily
      maxFiles: 30, // Keep 30 days of logs
      compress: false, // Don't compress old logs
      // Note: rotate option removed - index starts at 0 by default
    }
  );

  return stream;
}

/**
 * Create and configure Pino logger instance
 */
function createLogger(config: LoggerConfig = {}): pino.Logger {
  const environment = config.environment ?? process.env.NODE_ENV ?? 'development';
  
  // Set log level: default to 'debug' in development, 'info' in production
  // Can be overridden by LOG_LEVEL env var
  const defaultLevel = environment === 'development' ? 'debug' : 'info';
  const level = (config.level ?? (process.env.LOG_LEVEL as LogLevel) ?? defaultLevel) as LogLevel;
  
  const pretty = config.pretty ?? (environment === 'development');
  const fileLogging = config.fileLogging ?? process.env.FILE_LOGGING !== 'false';

  const loggerConfig: pino.LoggerOptions = {
    level,
    base: {
      env: environment,
      service: 'english-tutor-backend',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string): { level: string } => {
        return { level: label.toUpperCase() };
      },
    },
  };

  // Create streams array for multistream
  const streams: Array<{ stream: NodeJS.WritableStream; level?: LogLevel }> = [];

  // Add pretty console output in development
  if (pretty) {
    // pino.transport() returns a stream directly when used with multistream
    const prettyStream = pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    });
    streams.push({
      stream: prettyStream,
      level,
    });
  } else {
    // Plain console output in production
    streams.push({
      stream: process.stdout,
      level,
    });
  }

  // Add file logging if enabled
  if (fileLogging) {
    const logDir = config.logDir ?? getLogDirectory();
    try {
      const fileStream = createRotatingFileStream(logDir);
      
      // Add error handler to file stream
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
      });
      
      streams.push({
        stream: fileStream,
        level,
      });
      console.log(`📝 File logging enabled: ${logDir}`);
    } catch (error) {
      console.error('Failed to setup file logging:', error);
    }
  }

  // If we have multiple streams, use multi-stream
  if (streams.length > 1) {
    const multiStream = pino.multistream(streams);
    return pino(loggerConfig, multiStream);
  }

  // Single stream
  return pino(loggerConfig, streams[0]!.stream);
}

// Singleton logger instance
let loggerInstance: pino.Logger | null = null;

/**
 * Get logger instance (singleton)
 */
export function getLogger(config?: LoggerConfig): pino.Logger {
  if (loggerInstance === null) {
    loggerInstance = createLogger(config);
  }
  return loggerInstance;
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(bindings: pino.Bindings): pino.Logger {
  const logger = getLogger();
  return logger.child(bindings);
}

// Export default logger instance
export const logger = getLogger();

