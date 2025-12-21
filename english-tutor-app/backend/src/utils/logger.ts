/**
 * Logger Utility
 * Centralized logging service using Pino
 */
import pino from 'pino';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerConfig {
  level?: LogLevel;
  pretty?: boolean;
  environment?: string;
}

/**
 * Create and configure Pino logger instance
 */
function createLogger(config: LoggerConfig = {}): pino.Logger {
  const level = config.level ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
  const environment = config.environment ?? process.env.NODE_ENV ?? 'development';
  const pretty = config.pretty ?? (environment === 'development');

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

  if (pretty) {
    return pino(loggerConfig, pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    }));
  }

  return pino(loggerConfig);
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

