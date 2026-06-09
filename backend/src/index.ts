import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

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
import { simulator } from './services/simulator';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/toolings', toolingRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/improvements', improvementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inspection-plans', inspectionPlanRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/dashboard/andon', andonRoutes);
app.use('/api/rca', rcaRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/teams', teamRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
