import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Import routes
import consentRoutes from './routes/consent.js';
import audioRoutes from './routes/audio.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Security & Middleware
// ============================================

app.use(helmet());
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================
// Request logging middleware
// ============================================

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Health check endpoint
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'URIESMOOTH Voice Backend',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// API Routes
// ============================================

// Consent management
app.use('/api/consent', consentRoutes);

// Audio processing pipeline
app.use('/api/audio', audioRoutes);

// ============================================
// Error handling middleware
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    path: req.path,
  });
});

// ============================================
// Start server
// ============================================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       URIESMOOTH VOICE - Backend Server Started           ║
║                                                           ║
║  Server: http://localhost:${PORT}                         
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(24)}
║  Consent Required: ${(process.env.CONSENT_REQUIRED || 'true').padEnd(18)}
║  Development Skip: ${(process.env.DEVELOPMENT_SKIP_CONSENT || 'false').padEnd(17)}
║  Mock Services: ${(process.env.MOCK_SERVICES || 'true').padEnd(21)}
║  VAC Enabled: ${(process.env.VAC_ENABLED || 'true').padEnd(23)}
║                                                           ║
║  API Documentation:                                       ║
║  - Consent: POST /api/consent/create                      ║
║  - Process: POST /api/audio/process                       ║
║  - Health: GET  /health                                   ║
║  - Pipeline Health: POST /api/audio/health                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] Shutting down gracefully...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[Server] Interrupted');
  process.exit(0);
});

export default app;
