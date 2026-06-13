import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// ── 辅助：获取当前用户 ID ──────────────────────────
function getUserId(req: Request): string {
  // Demo: 从 header 取或用默认值
  return (req.headers['x-user-id'] as string) || 'demo-admin';
}

// ── 统计数据 ────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const total = await prisma.knowledgeEntry.count();
    const cases = await prisma.knowledgeEntry.count({ where: { type: 'case' } });
    const sops = await prisma.knowledgeEntry.count({ where: { type: 'sop' } });
    const pending = await prisma.knowledgeEntry.count({ where: { status: 'pending' } });
    const approved = await prisma.knowledgeEntry.count({ where: { status: 'approved' } });
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthlyStart = new Date(); monthlyStart.setDate(1); monthlyStart.setHours(0, 0, 0, 0);
    const todayAdded = await prisma.knowledgeEntry.count({ where: { createdAt: { gte: todayStart } } });
    const monthlyAdded = await prisma.knowledgeEntry.count({ where: { createdAt: { gte: monthlyStart } } });
    res.json({
      data: { total, cases, sops, pending, approved, todayAdded, monthlyAdded },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── 获取设备类型树（用于左侧导航）──────────────────
router.get('/equipment-types', async (_req: Request, res: Response) => {
  try {
    const entries = await prisma.knowledgeEntry.findMany({
      where: { equipmentType: { not: null } },
      select: { equipmentType: true, faultPart: true, type: true },
    });

    // 构建树：设备类型 → 故障部位 → 计数
    const typeMap = new Map<string, { count: number; parts: Map<string, number> }>();
    for (const e of entries) {
      const et = e.equipmentType || '其他';
      if (!typeMap.has(et)) typeMap.set(et, { count: 0, parts: new Map() });
      const item = typeMap.get(et)!;
      item.count++;
      if (e.faultPart) {
        item.parts.set(e.faultPart, (item.parts.get(e.faultPart) || 0) + 1);
      }
    }

    const tree = Array.from(typeMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      children: Array.from(data.parts.entries()).map(([part, cnt]) => ({
        name: part,
        count: cnt,
      })),
    }));

    res.json({ data: tree });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipment types' });
  }
});

// ── 列表（支持分页、搜索、筛选）────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      type, equipmentType, faultPart, severity, faultType,
      status, search, sortBy, page, pageSize,
    } = req.query as Record<string, string>;

    const where: any = {};

    // Filter by type
    if (type && type !== 'all') where.type = type;
    else if (type === 'all') { /* no filter */ }

    if (equipmentType) where.equipmentType = equipmentType;
    if (faultPart) where.faultPart = faultPart;
    if (severity) where.severity = severity;
    if (faultType) where.faultType = faultType;
    if (status) where.status = status;

    // Full-text search across multiple fields
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { symptom: { contains: search } },
        { cause: { contains: search } },
        { solution: { contains: search } },
        { prevention: { contains: search } },
        { equipmentType: { contains: search } },
        { faultPart: { contains: search } },
        { author: { contains: search } },
      ];
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'views') orderBy = { views: 'desc' };
    else if (sortBy === 'severity') orderBy = { severity: 'asc' };

    // Pagination
    const p = parseInt(page || '1');
    const ps = Math.min(parseInt(pageSize || '50'), 100);
    const skip = (p - 1) * ps;

    const [entries, total] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        where,
        orderBy,
        skip,
        take: ps,
      }),
      prisma.knowledgeEntry.count({ where }),
    ]);

    res.json({ data: entries, total, page: p, pageSize: ps });
  } catch (err) {
    console.error('Knowledge list error:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge entries' });
  }
});

// ── 收藏列表 ────────────────────────────────────────
router.get('/favorites', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const favorites = await prisma.knowledgeFavorite.findMany({
      where: { userId },
      include: { entry: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: favorites.map(f => ({ ...f.entry, favoritedAt: f.createdAt })) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// ── 详情 ────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const entry = await prisma.knowledgeEntry.findUnique({
      where: { id: req.params.id as string },
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });

    // 增加浏览次数
    await prisma.knowledgeEntry.update({
      where: { id: req.params.id as string },
      data: { views: { increment: 1 } },
    });

    // 检查当前用户是否已收藏
    const userId = getUserId(req);
    const fav = await prisma.knowledgeFavorite.findUnique({
      where: { userId_entryId: { userId, entryId: req.params.id as string } },
    });

    res.json({ data: { ...entry, views: entry.views + 1, isFavorited: !!fav } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
});

// ── 创建知识条目 ────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const data = {
      ...req.body,
      createdBy: userId,
      author: req.body.author || userId,
      status: 'pending',
    };
    const entry = await prisma.knowledgeEntry.create({ data });
    res.status(201).json({ data: entry });
  } catch (err) {
    console.error('Create knowledge error:', err);
    res.status(500).json({ error: 'Failed to create knowledge entry' });
  }
});

// ── 更新 ────────────────────────────────────────────
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const entry = await prisma.knowledgeEntry.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ data: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// ── 删除 ────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Delete related favorites first
    await prisma.knowledgeFavorite.deleteMany({ where: { entryId: req.params.id as string } });
    await prisma.knowledgeEntry.delete({ where: { id: req.params.id as string } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ── 审核 ────────────────────────────────────────────
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected'
    const entry = await prisma.knowledgeEntry.update({
      where: { id: req.params.id as string },
      data: { status: status || 'approved' },
    });
    res.json({ data: entry });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve entry' });
  }
});

// ── 收藏/取消收藏 ──────────────────────────────────
router.post('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const entryId = req.params.id as string;

    const existing = await prisma.knowledgeFavorite.findUnique({
      where: { userId_entryId: { userId, entryId } },
    });

    if (existing) {
      await prisma.knowledgeFavorite.delete({ where: { id: existing.id } });
      res.json({ data: { favorited: false } });
    } else {
      await prisma.knowledgeFavorite.create({ data: { userId, entryId } });
      res.json({ data: { favorited: true } });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

export default router;
