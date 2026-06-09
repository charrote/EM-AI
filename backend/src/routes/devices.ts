import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// ── 场景定义 ──────────────────────────────────
const SCENARIO_METAL_DEVICE_TYPES = ['CNC', '冷墩机', '研磨机', '注塑机', '激光切割机', '大型弯折机', '全自动外观机'];
const SCENARIO_CAPACITOR_DEVICE_TYPES = ['裁切机', '钉卷机', '入壳机', '套管机', '老化设备', '自动包装机'];

export const SCENARIOS = {
  metal: { label: '金属加工', types: SCENARIO_METAL_DEVICE_TYPES },
  capacitor: { label: '电解电容', types: SCENARIO_CAPACITOR_DEVICE_TYPES },
};

// GET /api/devices/scenarios — 场景配置
router.get('/scenarios', (_req: Request, res: Response) => {
  res.json({ data: SCENARIOS });
});

// GET /api/devices/areas — 区域汇总（按场景）
router.get('/areas', async (req: Request, res: Response) => {
  try {
    const scenario = req.query.scenario as string;
    const deviceTypes = scenario === 'capacitor' ? SCENARIO_CAPACITOR_DEVICE_TYPES : SCENARIO_METAL_DEVICE_TYPES;

    // Get all devices for this scenario
    const devices = await prisma.device.findMany({
      where: { type: { in: deviceTypes } },
      include: {
        workOrders: {
          where: { status: { in: ['pending', 'accepted', 'diagnosing', 'repairing'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ area: 'asc' }, { code: 'asc' }],
    });

    // Group by area
    const areaMap = new Map<string, {
      area: string;
      total: number;
      devices: any[];
      statusCounts: Record<string, number>;
      typeCounts: Record<string, number>;
    }>();

    for (const d of devices) {
      const area = d.area || '未分配';
      if (!areaMap.has(area)) {
        areaMap.set(area, { area, total: 0, devices: [], statusCounts: {}, typeCounts: {} });
      }
      const entry = areaMap.get(area)!;
      entry.total++;
      entry.devices.push(d);
      entry.statusCounts[d.status] = (entry.statusCounts[d.status] || 0) + 1;
      entry.typeCounts[d.type] = (entry.typeCounts[d.type] || 0) + 1;
    }

    res.json({
      data: Array.from(areaMap.values()),
      total: devices.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch area summary' });
  }
});

// GET /api/devices — 设备列表（支持过滤）
router.get('/', async (req: Request, res: Response) => {
  try {
    const scenario = req.query.scenario as string | undefined;
    const area = req.query.area as string | undefined;
    const deviceType = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};

    // Filter by scenario → device type
    if (scenario === 'metal') {
      where.type = { in: SCENARIO_METAL_DEVICE_TYPES };
    } else if (scenario === 'capacitor') {
      where.type = { in: SCENARIO_CAPACITOR_DEVICE_TYPES };
    }

    // Additional filters
    if (area) where.area = area;
    if (deviceType) where.type = deviceType;
    if (status) where.status = status;

    const devices = await prisma.device.findMany({
      where,
      include: {
        workOrders: {
          where: { status: { in: ['pending', 'accepted', 'diagnosing', 'repairing'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ area: 'asc' }, { code: 'asc' }],
    });

    res.json({ data: devices, total: devices.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// GET /api/devices/:id — 设备详情（含活跃工单 + 维修人）
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id as string },
      include: {
        workOrders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Find active work order (non-completed)
    const activeWo = device.workOrders.find(
      (wo) => !['completed', 'cancelled'].includes(wo.status)
    );

    res.json({
      data: {
        ...device,
        activeWorkOrder: activeWo || null,
        recentWorkOrders: device.workOrders,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// GET /api/devices/:id/work-orders — 设备工单历史
router.get('/:id/work-orders', async (req: Request, res: Response) => {
  try {
    const days = parseInt(String(req.query.days || '90')) || 90;
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

// PUT /api/devices/:id/status — 更新设备状态（Demo helper）
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
