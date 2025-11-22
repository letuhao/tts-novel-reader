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

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow audio/other resources
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/static', express.static(path.join(__dirname, '../../storage')));

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
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`✅ Novel Reader Backend running on http://${HOST}:${PORT}`);
  console.log(`✅ Backend Đọc Truyện đang chạy trên http://${HOST}:${PORT}`);
  console.log(`📚 API: http://${HOST}:${PORT}/api`);
  console.log(`❤️  Health: http://${HOST}:${PORT}/health`);
});

