import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/teams — 班组列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const workshopId = String(req.query.workshopId || '') || undefined;
    const keyword = req.query.keyword as string | undefined;
    const where: any = {};
    if (workshopId) where.workshopId = workshopId;
    if (keyword) {
      where.OR = [
        { code: { contains: String(keyword) } },
        { name: { contains: String(keyword) } },
        { leader: { contains: String(keyword) } },
      ];
    }

    const teams = await prisma.team.findMany({
      where,
      orderBy: [{ workshopId: 'asc' }, { code: 'asc' }],
    });

    // Enrich with workshop name
    const orgIds = teams.map(t => t.workshopId).filter(Boolean) as string[];
    const orgs = orgIds.length > 0
      ? await prisma.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })
      : [];
    const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));

    const enriched = teams.map(t => ({
      ...t,
      workshopName: t.workshopId ? orgMap[t.workshopId] || null : null,
    }));

    res.json({ data: enriched, total: enriched.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/teams/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ error: '班组未找到' });
    res.json({ data: team });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teams — 创建班组
router.post('/', async (req: Request, res: Response) => {
  try {
    const { code, name, leader, memberCount, shift, workshopId, description } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: '编码和名称为必填项' });
    }

    const existing = await prisma.team.findUnique({ where: { code } });
    if (existing) {
      return res.status(409).json({ error: `班组编码 ${code} 已存在` });
    }

    const team = await prisma.team.create({
      data: { code, name, leader, memberCount: memberCount ?? 0, shift, workshopId, description },
    });
    res.status(201).json({ data: team });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/teams/:id — 更新班组
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { code, name, leader, memberCount, shift, workshopId, description, isActive } = req.body;

    const id = String(req.params.id);
    // 编码唯一性检查（排除自身）
    if (code) {
      const conflict = await prisma.team.findFirst({ where: { code, NOT: { id } } });
      if (conflict) {
        return res.status(409).json({ error: `班组编码 ${code} 已被占用` });
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: { code, name, leader, memberCount, shift, workshopId, description, isActive },
    });
    res.json({ data: team });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/teams/:id — 删除班组
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    // 检查是否有工单关联
    const woCount = await prisma.workOrder.count({ where: { teamId: id } });
    if (woCount > 0) {
      return res.status(400).json({ error: `该班组关联了 ${woCount} 个工单，无法删除` });
    }
    await prisma.team.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
