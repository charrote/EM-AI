import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/organizations — 获取完整树（扁平列表，前端组装）
router.get('/', async (_req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
    res.json({ data: orgs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/tree — 获取树形结构
router.get('/tree', async (_req: Request, res: Response) => {
  try {
    const orgs = await prisma.organization.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      include: { _count: { select: { children: true } } },
    });

    // 统计每个节点下的设备数
    const deviceCounts = await prisma.device.groupBy({
      by: ['workshopId'],
      _count: true,
    });
    const countMap: Record<string, number> = {};
    deviceCounts.forEach((d: { workshopId: string | null; _count: number }) => {
      if (d.workshopId) countMap[d.workshopId] = (countMap[d.workshopId] || 0) + d._count;
    });

    // Build tree
    const buildTree = (parentId: string | null): any[] =>
      orgs
        .filter((o: any) => o.parentId === parentId)
        .map((o: any) => ({
          ...o,
          deviceCount: countMap[o.id] || 0,
          children: buildTree(o.id),
        }));

    const tree = buildTree(null);
    res.json({ data: tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/:id — 节点详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return res.status(404).json({ error: 'Node not found' });
    res.json({ data: org });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/organizations/:id/devices — 节点下的设备
router.get('/:id/devices', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) return res.status(404).json({ error: 'Node not found' });

    // 获取该节点及其所有下级节点的 ID
    const allOrgs = await prisma.organization.findMany();
    const collectIds = (parentId: string): string[] => {
      const ids = [parentId];
      allOrgs.filter((o: any) => o.parentId === parentId).forEach((child: any) => {
        ids.push(...collectIds(child.id));
      });
      return ids;
    };
    const orgIds = collectIds(org.id);

    // 查询关联这些节点的设备（workshopId 或 lineId 匹配）
    const devices = await prisma.device.findMany({
      where: {
        OR: [
          { workshopId: { in: orgIds } },
          { lineId: { in: orgIds } },
        ],
      },
      orderBy: { code: 'asc' },
    });

    res.json({
      data: devices,
      meta: { nodeName: org.name, nodeLevel: org.level, total: devices.length },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organizations — 创建节点
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, level, parentId, sortOrder, location, contact, oeeTarget } = req.body;
    if (!code || !name || !level) {
      return res.status(400).json({ error: 'code, name, level are required' });
    }

    // 验证层级规则
    const validLevels = ['group', 'company', 'workshop', 'line'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: `level must be one of: ${validLevels.join(', ')}` });
    }

    if (parentId) {
      const parent = await prisma.organization.findUnique({ where: { id: parentId } });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });

      const levelOrder = { group: 0, company: 1, workshop: 2, line: 3 };
      if ((levelOrder[level as keyof typeof levelOrder] || 0) !== (levelOrder[parent.level as keyof typeof levelOrder] || 0) + 1) {
        return res.status(400).json({ error: `Invalid level hierarchy: ${parent.level} cannot have child of level ${level}` });
      }
    } else if (level !== 'group') {
      return res.status(400).json({ error: 'Only "group" level nodes can have no parent' });
    }

    const org = await prisma.organization.create({
      data: { code, name, level, parentId: parentId || null, sortOrder, location, contact, oeeTarget },
    });
    res.status(201).json({ data: org });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Code already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/organizations/:id — 更新节点
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { code, name, sortOrder, isActive, location, contact, oeeTarget } = req.body;
    const org = await prisma.organization.update({
      where: { id },
      data: { code, name, sortOrder, isActive, location, contact, oeeTarget },
    });
    res.json({ data: org });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Code already exists' });
    if (err.code === 'P2025') return res.status(404).json({ error: 'Node not found' });
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/organizations/:id — 删除节点（必须为空）
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const org = await prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!org) return res.status(404).json({ error: 'Node not found' });

    const childrenCount = (org as any)._count?.children || 0;
    if (childrenCount > 0) {
      return res.status(400).json({ error: 'Cannot delete node with children' });
    }

    // Check if any devices reference this node
    const deviceCount = await prisma.device.count({
      where: { OR: [{ workshopId: id }, { lineId: id }] },
    });
    if (deviceCount > 0) {
      return res.status(400).json({ error: `Cannot delete node with ${deviceCount} associated devices` });
    }

    await prisma.organization.delete({ where: { id } });
    res.json({ data: { id, deleted: true } });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Node not found' });
    res.status(500).json({ error: err.message });
  }
});

export default router;
