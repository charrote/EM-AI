import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { seedDemoData } from '../utils/seed';

const router = Router();

// POST /api/demo/reset — reset demo data
router.post('/reset', async (_req: Request, res: Response) => {
  try {
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

    res.json({ success: true, message: 'Demo data reset successfully' });
  } catch (err) {
    console.error('Reset error:', err);
    res.status(500).json({ error: 'Failed to reset demo data' });
  }
});

export default router;
