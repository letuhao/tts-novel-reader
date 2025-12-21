/**
 * Logger utility for frontend with timeline support
 * Compatible with backend logger format for event timeline analysis
 */

interface LogEntry {
  level: 'info' | 'error' | 'warn' | 'debug';
  timestamp: string; // ISO 8601 format
  relativeTime: number | undefined; // Milliseconds since conversation start (if available)
  message: string;
  data: Record<string, unknown> | undefined;
}

// Store conversation start time for relative timing
let conversationStartTime: number | null = null;

/**
 * Set conversation start time for relative timing
 */
export function setConversationStartTime(): void {
  conversationStartTime = Date.now();
}

/**
 * Clear conversation start time
 */
export function clearConversationStartTime(): void {
  conversationStartTime = null;
}

/**
 * Get current timestamp in ISO format (compatible with backend)
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Get relative time since conversation start (if available)
 */
function getRelativeTime(): number | undefined {
  if (conversationStartTime) {
    return Date.now() - conversationStartTime;
  }
  return undefined;
}

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const parts: string[] = [];
  
  // Timestamp
  const time = new Date(entry.timestamp);
  const timeStr = time.toISOString();
  parts.push(`[${timeStr}]`);
  
  // Relative time (if available)
  if (entry.relativeTime !== undefined) {
    parts.push(`[+${entry.relativeTime.toFixed(0)}ms]`);
  }
  
  // Level
  parts.push(`[${entry.level.toUpperCase()}]`);
  
  // Message
  parts.push(entry.message);
  
  // Data (if present)
  if (entry.data && Object.keys(entry.data).length > 0) {
    parts.push(JSON.stringify(entry.data, null, 2));
  }
  
  return parts.join(' ');
}

/**
 * Create structured log entry
 */
function createLogEntry(
  level: LogEntry['level'],
  message: string,
  data?: Record<string, unknown>
): LogEntry {
  return {
    level,
    timestamp: getTimestamp(),
    relativeTime: getRelativeTime(),
    message,
    data,
  };
}

/**
 * Enhanced logger with timeline support
 * Supports both new format (message, data) and old format (backward compatible)
 */
export const logger = {
  info: (messageOrData: string | Record<string, unknown>, data?: Record<string, unknown>) => {
    let message: string;
    let logData: Record<string, unknown> | undefined;
    
    if (typeof messageOrData === 'string') {
      message = messageOrData;
      logData = data;
    } else {
      // Old format: first arg is data object
      message = 'Info';
      logData = messageOrData;
    }
    
    const entry = createLogEntry('info', message, logData);
    if (import.meta.env.DEV) {
      console.log(formatLogEntry(entry));
      // Also log structured data for easier parsing
      if (logData) {
        console.log('  Data:', logData);
      }
    }
  },
  
  error: (messageOrError: string | Error | Record<string, unknown>, errorOrData?: Error | Record<string, unknown>) => {
    let message: string;
    let logData: Record<string, unknown> | undefined;
    
    if (typeof messageOrError === 'string') {
      message = messageOrError;
      if (errorOrData instanceof Error) {
        logData = {
          error: errorOrData.message,
          stack: errorOrData.stack,
        };
      } else if (errorOrData) {
        logData = errorOrData as Record<string, unknown>;
      }
    } else if (messageOrError instanceof Error) {
      message = messageOrError.message;
      logData = {
        error: messageOrError.message,
        stack: messageOrError.stack,
        ...(errorOrData && typeof errorOrData === 'object' && !(errorOrData instanceof Error) ? errorOrData : {}),
      };
    } else {
      // Old format: first arg is data object
      message = 'Error';
      logData = messageOrError;
    }
    
    const entry = createLogEntry('error', message, logData);
    console.error(formatLogEntry(entry));
    // Also log structured data for easier parsing
    if (logData) {
      console.error('  Data:', logData);
    }
  },
  
  warn: (messageOrData: string | Record<string, unknown>, data?: Record<string, unknown>) => {
    let message: string;
    let logData: Record<string, unknown> | undefined;
    
    if (typeof messageOrData === 'string') {
      message = messageOrData;
      logData = data;
    } else {
      // Old format: first arg is data object
      message = 'Warning';
      logData = messageOrData;
    }
    
    const entry = createLogEntry('warn', message, logData);
    console.warn(formatLogEntry(entry));
    // Also log structured data for easier parsing
    if (logData) {
      console.warn('  Data:', logData);
    }
  },
  
  debug: (messageOrData: string | Record<string, unknown>, data?: Record<string, unknown>) => {
    let message: string;
    let logData: Record<string, unknown> | undefined;
    
    if (typeof messageOrData === 'string') {
      message = messageOrData;
      logData = data;
    } else {
      // Old format: first arg is data object
      message = 'Debug';
      logData = messageOrData;
    }
    
    const entry = createLogEntry('debug', message, logData);
    if (import.meta.env.DEV) {
      console.debug(formatLogEntry(entry));
      // Also log structured data for easier parsing
      if (logData) {
        console.debug('  Data:', logData);
      }
    }
  },
  
  // Helper to log with timestamp only (backward compatibility)
  log: (...args: unknown[]) => {
    const timestamp = getTimestamp();
    const relativeTime = getRelativeTime();
    const timePrefix = relativeTime !== undefined 
      ? `[${timestamp}] [+${relativeTime.toFixed(0)}ms]`
      : `[${timestamp}]`;
    console.log(timePrefix, ...args);
  },
};

