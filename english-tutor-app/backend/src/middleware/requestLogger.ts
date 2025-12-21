/**
 * Request Logger Middleware
 * Logs incoming HTTP requests
 */
import type { Request, Response, NextFunction } from 'express';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger({ component: 'http' });

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Log request
  logger.info({
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  }, 'Incoming request');

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    }, 'Request completed');
  });

  next();
}

