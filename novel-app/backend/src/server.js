/**
 * Novel Reader Backend Server
 * Server Backend Đọc Truyện
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import novelRoutes from './routes/novels.js';
import audioRoutes from './routes/audio.js';
import progressRoutes from './routes/progress.js';
import workerRoutes from './routes/worker.js';
import generationRoutes from './routes/generation.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow audio/other resources
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resource access
}));
app.use(compression());

// CORS configuration - allow frontend origin
// Note: Static files have their own CORS middleware below
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
    // Allow requests from localhost:5173 (Vite dev server) and localhost:11110 (backend)
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files - PUBLIC ACCESS (no CORS restrictions)
// Allow anyone to access static files (audio, images, etc.)
// This removes all CORS checks for /static/* routes
app.options('/static/*', (req, res) => {
  // Allow all origins - public access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// CORS middleware for static files - PUBLIC ACCESS (no restrictions)
// This ensures CORS headers are set before express.static processes the file
app.use('/static', (req, res, next) => {
  // Allow public access - no CORS restrictions
  // Set wildcard origin (public access, no credentials needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
  
  next();
});

// Express static middleware supports Range requests by default
// IMPORTANT: Re-apply CORS headers in setHeaders to ensure they're not overridden
app.use('/static', express.static(path.join(__dirname, '../../storage'), {
  setHeaders: (res, filePath, stat) => {
    // CRITICAL: Re-apply CORS headers here (Express.static might override them)
    // This ensures CORS headers are always set correctly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
    
    // Set proper headers for audio files to support streaming
    if (filePath.endsWith('.wav') || filePath.endsWith('.mp3') || filePath.endsWith('.ogg')) {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', filePath.endsWith('.wav') ? 'audio/wav' : 
                     filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/ogg');
    }
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Novel Reader Backend',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Novel Reader Backend',
    version: '1.0.0',
    docs: '/api/docs',
    health: '/health'
  });
});

// API routes
app.use('/api/novels', novelRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/worker', workerRoutes);
app.use('/api/generation', generationRoutes);  // Generation progress routes

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
const PORT = process.env.PORT || 11110;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ Novel Reader Backend running on http://${HOST}:${PORT}`);
  console.log(`✅ Backend Đọc Truyện đang chạy trên http://${HOST}:${PORT}`);
  console.log(`📚 API: http://${HOST}:${PORT}/api`);
  console.log(`❤️  Health: http://${HOST}:${PORT}/health`);
});

