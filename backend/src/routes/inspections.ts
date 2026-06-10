import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/inspections — list inspections
router.get('/', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string | undefined;
    const status = req.query.status as string | undefined;
    const level = req.query.level as string | undefined;
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;
    if (status) where.status = status;
    if (level) where.level = level;

    const inspections = await prisma.inspection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { device: true },
    });
    res.json({ data: inspections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inspections' });
  }
});

// POST /api/inspections — submit inspection
router.post('/', async (req: Request, res: Response) => {
  try {
    const { deviceId, level, operatorId, items, location } = req.body;

    // Count abnormal items
    const abnormalItems = (items || []).filter((item: any) => item.result === 'fail');
    let triggeredWoId: string | null = null;

    // Auto-create work order if abnormal
    if (abnormalItems.length > 0) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const count = await prisma.workOrder.count();
      const code = `WO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

      const wo = await prisma.workOrder.create({
        data: {
          code,
          deviceId,
          type: 'repair',
          source: 'inspection',
          priority: 'P1',
          faultType: '机械',
          description: `点检异常: ${abnormalItems.map((i: any) => i.name).join(', ')}`,
          status: 'pending',
          slaResponseMin: 15,
          slaRepairMin: 60,
          slaDeadline: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      triggeredWoId = wo.id;
    }

    const inspection = await prisma.inspection.create({
      data: {
        deviceId,
        level: level || 'daily',
        operatorId: operatorId || 'demo-operator',
        status: 'completed',
        items: items || [],
        abnormalCount: abnormalItems.length,
        triggeredWoId,
        location: location || null,
        doneAt: new Date(),
      },
    });

    res.status(201).json({ data: inspection, triggeredWorkOrderId: triggeredWoId });
  } catch (err) {
    console.error('Inspection create error:', err);
    res.status(500).json({ error: 'Failed to submit inspection' });
  }
});

export default router;
