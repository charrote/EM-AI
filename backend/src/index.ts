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
import demoRoutes from './routes/demo';
import authRoutes from './routes/auth';
import { simulator } from './services/simulator';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/toolings', toolingRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/improvements', improvementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/demo', demoRoutes);

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
  console.log(`🚀 EM-AI Backend running on http://localhost:${PORT}`);
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
