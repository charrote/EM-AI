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

// ═══════════════════════════════════════════════
// 设备基础数据管理（manage 前缀，必须在 /:id 前注册）
// ═══════════════════════════════════════════════

// GET /api/devices/manage — 分页列表
router.get('/manage', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'))));
    const { type, status, workshopId, lineId, keyword } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (workshopId) where.workshopId = workshopId;
    if (lineId) where.lineId = lineId;
    if (keyword) {
      where.OR = [
        { code: { contains: String(keyword) } },
        { name: { contains: String(keyword) } },
        { brand: { contains: String(keyword) } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.device.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { code: 'asc' },
      }),
      prisma.device.count({ where }),
    ]);

    // Enrich with org names
    const orgIds = data.flatMap(d => [d.workshopId, d.lineId]).filter(Boolean) as string[];
    const orgs = orgIds.length > 0
      ? await prisma.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })
      : [];
    const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));

    const enriched = data.map(d => ({
      ...d,
      workshopName: d.workshopId ? orgMap[d.workshopId] || null : null,
      lineName: d.lineId ? orgMap[d.lineId] || null : null,
    }));

    res.json({ data: enriched, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════
// 设备类型主数据 CRUD
// ═══════════════════════════════════════════════

// GET /api/devices/manage/types — 设备类型列表
router.get('/manage/types', async (_req: Request, res: Response) => {
  try {
    const types = await prisma.deviceType.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ data: types });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devices/manage/types — 创建设备类型
router.post('/manage/types', async (req: Request, res: Response) => {
  try {
    const { name, code, description, icon, sortOrder } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const type = await prisma.deviceType.create({
      data: { name, code, description, icon, sortOrder: sortOrder || 0 },
    });
    res.status(201).json({ data: type });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: '设备类型名称或编码已存在' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/devices/manage/types/:id — 更新设备类型
router.put('/manage/types/:id', async (req: Request, res: Response) => {
  try {
    const { name, code, description, icon, sortOrder, isActive, documents } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;
    if (documents !== undefined) data.documents = documents;

    const type = await prisma.deviceType.update({
      where: { id: req.params.id as string },
      data,
    });
    res.json({ data: type });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: '设备类型名称或编码已存在' });
    if (err.code === 'P2025') return res.status(404).json({ error: '设备类型不存在' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/devices/manage/types/:id — 删除设备类型
router.delete('/manage/types/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const type = await prisma.deviceType.findUnique({ where: { id } });
    if (!type) return res.status(404).json({ error: '设备类型不存在' });

    const deviceCount = await prisma.device.count({ where: { type: type.name } });
    if (deviceCount > 0) {
      return res.status(400).json({ error: `该类型下还有 ${deviceCount} 台设备，无法删除` });
    }

    await prisma.deviceType.delete({ where: { id } });
    res.json({ data: { id, deleted: true } });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: '设备类型不存在' });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/devices/manage/:id — 设备详情
router.get('/manage/:id', async (req: Request, res: Response) => {
  try {
    const device = await prisma.device.findUnique({ where: { id: req.params.id as string } });
    if (!device) return res.status(404).json({ error: 'Device not found' });
    res.json({ data: device });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/devices/manage — 创建设备
router.post('/manage', async (req: Request, res: Response) => {
  try {
    const {
      code, name, type, status, area, line,
      workshopId, lineId, brand, modelName, serialNo, supplier,
      installDate, warrantyUntil, powerRating, specifications,
      priority, oeeTarget,
      theoreticalCapacity, onlineParams, programList, documents,
    } = req.body;

    if (!code || !name || !type) {
      return res.status(400).json({ error: 'code, name, type are required' });
    }

    const device = await prisma.device.create({
      data: {
        code, name, type, status: status || 'idle', area, line,
        workshopId, lineId, brand, modelName, serialNo, supplier,
        installDate: installDate ? new Date(installDate) : null,
        warrantyUntil: warrantyUntil ? new Date(warrantyUntil) : null,
        powerRating, specifications, priority: priority || 'B', oeeTarget,
        healthScore: 100,
        theoreticalCapacity,
        onlineParams: onlineParams || undefined,
        programList: programList || undefined,
        documents: documents || undefined,
      },
    });
    res.status(201).json({ data: device });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Device code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/devices/manage/:id — 更新设备
router.put('/manage/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      code, name, type, status, area, line,
      workshopId, lineId, brand, modelName, serialNo, supplier,
      installDate, warrantyUntil, powerRating, specifications,
      priority, healthScore, oeeTarget,
      theoreticalCapacity, onlineParams, programList, documents,
    } = req.body;
    const data: any = {};
    if (code !== undefined) data.code = code;
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (area !== undefined) data.area = area;
    if (line !== undefined) data.line = line;
    if (workshopId !== undefined) data.workshopId = workshopId;
    if (lineId !== undefined) data.lineId = lineId;
    if (brand !== undefined) data.brand = brand;
    if (modelName !== undefined) data.modelName = modelName;
    if (serialNo !== undefined) data.serialNo = serialNo;
    if (supplier !== undefined) data.supplier = supplier;
    if (installDate !== undefined) data.installDate = installDate ? new Date(installDate) : null;
    if (warrantyUntil !== undefined) data.warrantyUntil = warrantyUntil ? new Date(warrantyUntil) : null;
    if (powerRating !== undefined) data.powerRating = powerRating;
    if (specifications !== undefined) data.specifications = specifications;
    if (priority !== undefined) data.priority = priority;
    if (healthScore !== undefined) data.healthScore = healthScore;
    if (oeeTarget !== undefined) data.oeeTarget = oeeTarget;
    if (theoreticalCapacity !== undefined) data.theoreticalCapacity = theoreticalCapacity;
    if (onlineParams !== undefined) data.onlineParams = onlineParams;
    if (programList !== undefined) data.programList = programList;
    if (documents !== undefined) data.documents = documents;

    const device = await prisma.device.update({ where: { id }, data });
    res.json({ data: device });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Device code already exists' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Device not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/devices/manage/:id — 删除设备（有工单时拒绝）
router.delete('/manage/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const workOrderCount = await prisma.workOrder.count({ where: { deviceId: id } });
    if (workOrderCount > 0) {
      return res.status(400).json({ error: `Cannot delete device with ${workOrderCount} work orders` });
    }
    await prisma.device.delete({ where: { id } });
    res.json({ data: { id, deleted: true } });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Device not found' });
    res.status(500).json({ error: err.message });
  }
});



// ── 辅助：解析多选查询参数 ────────────────────
function parseArrayParam(val: unknown): string[] | undefined {
  if (!val) return undefined;
  if (Array.isArray(val)) return val as string[];
  const str = val as string;
  if (str.includes(',')) return str.split(',').map(s => s.trim()).filter(Boolean);
  return [str];
}

// GET /api/devices — 设备列表（支持多选过滤）
router.get('/', async (req: Request, res: Response) => {
  try {
    const scenario = req.query.scenario as string | undefined;
    const areas = parseArrayParam(req.query.area);
    const deviceTypes = parseArrayParam(req.query.type);
    const statuses = parseArrayParam(req.query.status);

    const where: any = {};

    // Filter by scenario → device type
    if (scenario === 'metal') {
      where.type = { in: SCENARIO_METAL_DEVICE_TYPES };
    } else if (scenario === 'capacitor') {
      where.type = { in: SCENARIO_CAPACITOR_DEVICE_TYPES };
    }

    // Additional multi-select filters
    if (areas) where.area = { in: areas };
    if (deviceTypes) where.type = { in: deviceTypes };
    if (statuses) where.status = { in: statuses };

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
