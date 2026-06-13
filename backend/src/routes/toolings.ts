import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/toolings — 工治具列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
      ];
    }

    const toolings = await prisma.tooling.findMany({
      where,
      orderBy: { code: 'asc' },
      include: { device: true },
    });
    res.json({ data: toolings, total: toolings.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch toolings' });
  }
});

// GET /api/toolings/:id — 工治具详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tooling = await prisma.tooling.findUnique({
      where: { id: req.params.id as string },
      include: { device: true },
    });
    if (!tooling) return res.status(404).json({ error: 'Tooling not found' });
    res.json({ data: tooling });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tooling' });
  }
});

// POST /api/toolings — 新增工治具
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      code, name, type, status, deviceId, location, supplier,
      theoreticalLife, lifeUnit, purchaseCost, config,
    } = req.body;

    const tooling = await prisma.tooling.create({
      data: {
        code: code || `TL-${Date.now()}`,
        name, type, status: status || 'in_stock',
        deviceId, location, supplier,
        theoreticalLife: theoreticalLife ? parseInt(theoreticalLife) : null,
        lifeUnit: lifeUnit || 'cycles',
        purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null,
        config: config || null,
        lifeUsed: 0,
        lifeRemaining: theoreticalLife ? parseInt(theoreticalLife) : null,
      },
    });
    res.status(201).json({ data: tooling });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tooling' });
  }
});

// PUT /api/toolings/:id — 更新工治具
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tooling = await prisma.tooling.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ data: tooling });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tooling' });
  }
});

// PUT /api/toolings/:id/status — 状态切换
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, deviceId } = req.body;
    const validStatuses = ['in_stock', 'in_use', 'maintenance', 'repair', 'retired', 'pending_inspect'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const tooling = await prisma.tooling.update({
      where: { id: req.params.id as string },
      data: {
        status,
        ...(deviceId !== undefined ? { deviceId: deviceId || null } : {}),
        ...(status === 'retired' ? {} : {}),
      },
    });
    res.json({ data: tooling });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tooling status' });
  }
});

// DELETE /api/toolings/:id — 删除工治具
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.tooling.delete({ where: { id: req.params.id as string } });
    res.json({ data: { success: true } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete tooling' });
  }
});

// PUT /api/toolings/:id/mount — 单个工治具上机
router.put('/:id/mount', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });

    const tooling = await prisma.tooling.update({
      where: { id: req.params.id as string },
      data: { status: 'in_use', deviceId },
    });
    res.json({ data: tooling });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mount tooling' });
  }
});

// POST /api/toolings/batch-mount — 批量上机
router.post('/batch-mount', async (req: Request, res: Response) => {
  try {
    const { deviceId, toolingIds } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required' });
    if (!toolingIds || !Array.isArray(toolingIds) || toolingIds.length === 0) {
      return res.status(400).json({ error: 'toolingIds must be a non-empty array' });
    }

    const result = await prisma.tooling.updateMany({
      where: { id: { in: toolingIds } },
      data: { status: 'in_use', deviceId },
    });
    res.json({ data: { count: result.count } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to batch mount toolings' });
  }
});

// PUT /api/toolings/:id/dismount — 单个工治具下机
router.put('/:id/dismount', async (req: Request, res: Response) => {
  try {
    const tooling = await prisma.tooling.update({
      where: { id: req.params.id as string },
      data: { status: 'in_stock', deviceId: null },
    });
    res.json({ data: tooling });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dismount tooling' });
  }
});

// POST /api/toolings/batch-dismount — 批量下机
router.post('/batch-dismount', async (req: Request, res: Response) => {
  try {
    const { toolingIds } = req.body;
    if (!toolingIds || !Array.isArray(toolingIds) || toolingIds.length === 0) {
      return res.status(400).json({ error: 'toolingIds must be a non-empty array' });
    }

    const result = await prisma.tooling.updateMany({
      where: { id: { in: toolingIds } },
      data: { status: 'in_stock', deviceId: null },
    });
    res.json({ data: { count: result.count } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to batch dismount toolings' });
  }
});

// GET /api/toolings/by-device/:deviceId — 获取设备上的工治具
router.get('/by-device/:deviceId', async (req: Request, res: Response) => {
  try {
    const toolings = await prisma.tooling.findMany({
      where: { deviceId: req.params.deviceId as string },
      orderBy: { code: 'asc' },
      include: { device: true },
    });
    res.json({ data: toolings, total: toolings.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch toolings by device' });
  }
});

export default router;
