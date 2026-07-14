import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

let cfg: any = {};
try {
  cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config.json'), 'utf-8'));
} catch {
  // config.json not found (e.g., Docker deployment) — use env vars or defaults
}

import deviceRoutes from './routes/devices';
import workOrderRoutes from './routes/workOrders';
import inspectionRoutes from './routes/inspections';
import toolingRoutes from './routes/toolings';
import knowledgeRoutes from './routes/knowledge';
import improvementRoutes from './routes/improvements';
import dashboardRoutes from './routes/dashboard';
import inspectionPlanRoutes from './routes/inspectionPlans';
import maintenanceRoutes from './routes/maintenance';
import andonRoutes from './routes/andon';
import rcaRoutes from './routes/rca';
import demoRoutes from './routes/demo';
import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import organizationRoutes from './routes/organizations';
import teamRoutes from './routes/teams';
import calendarRoutes from './routes/calendar';
import settingsRoutes from './routes/settings';
import nlrRoutes from './routes/nlr';
import { simulator } from './services/simulator';
import { authMiddleware } from './middleware/auth';
import { securityHeaders } from './middleware/security';
import { requestLogger } from './middleware/security';

const app = express();
const PORT = cfg.API_PORT || parseInt(process.env.PORT || '') || 5174;

// Security middleware
app.use(securityHeaders);

// Request logging
app.use(requestLogger);

// Core middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check — no auth required
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes — no auth required
app.use('/api/auth', authRoutes);

// All other API routes require authentication
app.use('/api/devices', authMiddleware, deviceRoutes);
app.use('/api/work-orders', authMiddleware, workOrderRoutes);
app.use('/api/inspections', authMiddleware, inspectionRoutes);
app.use('/api/toolings', authMiddleware, toolingRoutes);
app.use('/api/knowledge', authMiddleware, knowledgeRoutes);
app.use('/api/improvements', authMiddleware, improvementRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/inspection-plans', authMiddleware, inspectionPlanRoutes);
app.use('/api/maintenance', authMiddleware, maintenanceRoutes);
app.use('/api/dashboard/andon', authMiddleware, andonRoutes);
app.use('/api/rca', authMiddleware, rcaRoutes);
app.use('/api/demo', authMiddleware, demoRoutes);
app.use('/api/upload', authMiddleware, uploadRoutes);
app.use('/api/nlr', authMiddleware, nlrRoutes);
app.use('/api/organizations', authMiddleware, organizationRoutes);
app.use('/api/teams', authMiddleware, teamRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 EM-AI Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Ensure demo-data dir exists
  const demoDataDir = path.join(__dirname, '../demo-data');
  if (!fs.existsSync(demoDataDir)) {
    fs.mkdirSync(demoDataDir, { recursive: true });
  }
  console.log(`📁 Demo data directory: ${demoDataDir}`);

  // Start real-time data simulator
  simulator.start();
});