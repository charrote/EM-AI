import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { seedDemoData } from '../utils/seed';
import { simulator } from '../services/simulator';

const router = Router();

// POST /api/demo/reset — reset demo data
router.post('/reset', async (_req: Request, res: Response) => {
  try {
    // Stop simulator during reset
    const wasRunning = simulator.status === 'running';
    simulator.stop();

    // Delete all data in reverse dependency order
    await prisma.workLog.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.inspection.deleteMany();
    await prisma.tooling.deleteMany();
    await prisma.knowledgeEntry.deleteMany();
    await prisma.improvementProject.deleteMany();
    await prisma.device.deleteMany();

    // Re-seed
    await seedDemoData();

    // Restart simulator if it was running
    if (wasRunning) simulator.start();

    res.json({ success: true, message: 'Demo data reset successfully' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Failed to reset demo data' });
  }
});

// POST /api/demo/simulator/start — start simulator
router.post('/simulator/start', (_req: Request, res: Response) => {
  simulator.start();
  res.json({ status: 'running', tickCount: simulator.tickCount });
});

// POST /api/demo/simulator/stop — stop simulator
router.post('/simulator/stop', (_req: Request, res: Response) => {
  simulator.stop();
  res.json({ status: 'stopped', tickCount: simulator.tickCount });
});

// GET /api/demo/simulator — simulator status
router.get('/simulator', (_req: Request, res: Response) => {
  res.json({
    status: simulator.status,
    tickCount: simulator.tickCount,
    uptime: simulator.uptime,
    startTime: simulator.startTime.toISOString(),
  });
});

// GET /api/demo/snapshots — list daily snapshots
router.get('/snapshots', (_req: Request, res: Response) => {
  const snapshots = simulator.getSnapshots();
  res.json({ data: snapshots });
});

export default router;
