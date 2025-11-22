/**
 * Logger Utility
 * Centralized logging with environment-based levels
 * 
 * In production, only errors are logged.
 * In development, all logs are shown.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel

  constructor() {
    // In production, only show errors
    // In development, show all logs
    this.level = process.env.NODE_ENV === 'production' ? LogLevel.ERROR : LogLevel.DEBUG
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level}]`
    return `${prefix} ${message}`
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message), ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message), ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args)
    }
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      console.error(this.formatMessage('ERROR', message), errorObj, ...args)
      
      // TODO: Send to error tracking service in production
      // if (process.env.NODE_ENV === 'production') {
      //   sendToErrorTrackingService(message, errorObj)
      // }
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export convenience methods
export const logDebug = (message: string, ...args: unknown[]) => logger.debug(message, ...args)
export const logInfo = (message: string, ...args: unknown[]) => logger.info(message, ...args)
export const logWarn = (message: string, ...args: unknown[]) => logger.warn(message, ...args)
export const logError = (message: string, error?: unknown, ...args: unknown[]) => 
  logger.error(message, error, ...args)

