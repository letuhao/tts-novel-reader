/**
 * English Tutor Backend Server
 * Main entry point for the backend API server
 */
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { testConnection, closePool } from './database/connection.js';
import { runMigrations } from './database/migrations/migrate.js';

// Load environment variables
dotenv.config();

// Initialize database on startup
async function initializeDatabase(): Promise<void> {
  try {
    logger.info('Initializing database connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    
    logger.info('Running database migrations...');
    await runMigrations();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Database initialization failed');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// Note: __dirname and __filename are available via import.meta.url in ES modules

const app: Express = express();
const PORT = process.env.PORT ?? 11200;
const HOST = process.env.HOST ?? '0.0.0.0';

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:11201',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (should be after other middleware to log final request state)
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'english-tutor-backend'
  });
});

// API routes
import ollamaRoutes from './routes/ollama.js';
import ttsRoutes from './routes/tts.js';
import sttRoutes from './routes/stt.js';
import settingsRoutes from './routes/settings.js';

app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'English Tutor API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      api: '/api',
      ollama: {
        health: '/api/ollama/health',
        chat: 'POST /api/ollama/chat',
        grammar: 'POST /api/ollama/grammar',
        exercise: 'POST /api/ollama/exercise',
        feedback: 'POST /api/ollama/feedback',
      },
      tts: {
        health: '/api/tts/health',
        synthesize: 'POST /api/tts/synthesize',
        voices: 'GET /api/tts/voices',
        audio: 'GET /api/tts/audio/:fileId',
      },
      stt: {
        health: '/api/stt/health',
        transcribe: 'POST /api/stt/transcribe',
      },
      settings: {
        system: {
          getAll: 'GET /api/settings/system',
          getByKey: 'GET /api/settings/system/:key',
          getByCategory: 'GET /api/settings/system/category/:category',
          update: 'PUT /api/settings/system/:key',
          delete: 'DELETE /api/settings/system/:key',
        },
        user: {
          getAll: 'GET /api/settings/user/:userId',
          getByKey: 'GET /api/settings/user/:userId/:key',
          update: 'PUT /api/settings/user/:userId/:key',
          delete: 'DELETE /api/settings/user/:userId/:key',
        },
      },
    },
  });
});

// Register route handlers
app.use('/api/ollama', ollamaRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/stt', sttRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error in request');
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
(async () => {
  // Initialize database first
  await initializeDatabase();

  // Start HTTP server
  app.listen(Number(PORT), HOST, () => {
    logger.info({
      port: Number(PORT),
      host: HOST,
      environment: process.env.NODE_ENV ?? 'development',
    }, 'English Tutor Backend Server started');
    
    logger.info(`Server running on http://${HOST}:${PORT}`);
    logger.info(`Health check: http://${HOST}:${PORT}/health`);
    logger.info(`API: http://${HOST}:${PORT}/api`);
  });
})();

