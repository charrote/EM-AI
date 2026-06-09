import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/devices — list all devices
router.get('/', async (_req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { code: 'asc' },
    });
    res.json({ data: devices, total: devices.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /api/devices/:id — device detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id as string },
      include: {
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json({ data: device });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// GET /api/devices/:id/work-orders — device work orders
router.get('/:id/work-orders', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '30')) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const workOrders = await prisma.workOrder.findMany({
      where: {
        deviceId: req.params.id as string,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: workOrders });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// PUT /api/devices/:id/status — update device status (demo helper)
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const device = await prisma.device.update({
      where: { id: req.params.id as string },
      data: { status },
    });
    res.json({ data: device });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update device status' });
  }
});

export default router;
