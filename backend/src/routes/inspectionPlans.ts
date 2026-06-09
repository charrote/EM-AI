import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/inspection-plans — 点检计划列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const deviceType = req.query.deviceType as string | undefined;
    const level = req.query.level as string | undefined;
    const active = req.query.active as string | undefined;
    const where: any = {};
    if (deviceType) where.deviceType = deviceType;
    if (level) where.level = level;
    if (active !== undefined) where.active = active === 'true';

    const plans = await prisma.inspectionPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: plans, total: plans.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inspection plans' });
  }
});

// GET /api/inspection-plans/:id — 单个计划
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.inspectionPlan.findUnique({
      where: { id: req.params.id as string },
      include: { inspections: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!plan) return res.status(404).json({ error: 'Inspection plan not found' });
    res.json({ data: plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch inspection plan' });
  }
});

// POST /api/inspection-plans — 新建点检计划
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, deviceType, level, frequency, items, sopUrl, description } = req.body;
    const plan = await prisma.inspectionPlan.create({
      data: { title, deviceType, level, frequency, items, sopUrl, description },
    });
    res.status(201).json({ data: plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create inspection plan' });
  }
});

// PUT /api/inspection-plans/:id — 更新点检计划
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.inspectionPlan.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ data: plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update inspection plan' });
  }
});

// DELETE /api/inspection-plans/:id — 删除点检计划
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.inspectionPlan.delete({ where: { id: req.params.id as string } });
    res.json({ data: { success: true } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete inspection plan' });
  }
});

// GET /api/inspection-plans/:id/calendar — 排程日历数据
router.get('/:id/calendar', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.inspectionPlan.findUnique({
      where: { id: req.params.id as string },
    });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // Generate schedule events based on plan frequency
    const events: any[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 过去30天
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 60); // 未来60天

    let current = new Date(startDate);
    while (current < endDate) {
      events.push({
        date: current.toISOString().slice(0, 10),
        title: plan.title,
        deviceType: plan.deviceType,
        level: plan.level,
        status: current > new Date() ? 'scheduled' : 'completed',
      });
      current.setDate(current.getDate() + plan.frequency);
    }

    res.json({ data: events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate calendar' });
  }
});

export default router;
