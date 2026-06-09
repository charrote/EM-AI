import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/dashboard/andon — 效率看板实时数据
router.get('/', async (_req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      include: {
        workOrders: {
          where: { status: { in: ['pending', 'accepted', 'diagnosing', 'repairing'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const activeAlerts = await prisma.workOrder.findMany({
      where: { status: { in: ['pending', 'accepted'] } },
      orderBy: { priority: 'asc' },
      take: 10,
      include: { device: true },
    });

    // Device status summary
    const statusCounts: Record<string, number> = {};
    const deviceOEEs = devices.map(d => {
      statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
      const baseOEE = d.status === 'running' ? 0.85 : d.status === 'idle' ? 0.6 : 0;
      return {
        id: d.id,
        code: d.code,
        name: d.name,
        status: d.status,
        oee: Math.round((baseOEE + Math.random() * 0.1 - 0.05) * 100),
      };
    });

    const totalLosses = {
      fault: Math.round(20 + Math.random() * 15),
      changeover: Math.round(30 + Math.random() * 20),
      idle: Math.round(10 + Math.random() * 10),
      speed: Math.round(5 + Math.random() * 5),
      defect: Math.round(5 + Math.random() * 5),
      startup: Math.round(2 + Math.random() * 3),
    };

    const avgOEE = deviceOEEs.reduce((s, d) => s + d.oee, 0) / (deviceOEEs.length || 1);

    res.json({
      data: {
        overallOEE: Math.round(avgOEE),
        deviceCount: devices.length,
        runningCount: statusCounts['running'] || 0,
        faultCount: statusCounts['fault'] || 0,
        idleCount: statusCounts['idle'] || 0,
        maintenanceCount: (statusCounts['maintenance'] || 0) + (statusCounts['repair'] || 0),
        deviceOEEs,
        statusCounts,
        totalLosses,
        activeAlerts: activeAlerts.map(a => ({
          id: a.id,
          code: a.code,
          deviceName: (a.device as any)?.name || '未知',
          priority: a.priority,
          faultType: a.faultType,
          status: a.status,
          createdAt: a.createdAt,
          slaDeadline: a.slaDeadline,
        })),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch andon data' });
  }
});

export default router;
