import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// ─── 保养计划 ─────────────────────────────────

// GET /api/maintenance-plans — 保养计划列表
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string | undefined;
    const type = req.query.type as string | undefined;
    const active = req.query.active as string | undefined;
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;
    if (type) where.type = type;
    if (active !== undefined) where.active = active === 'true';

    const plans = await prisma.maintenancePlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: plans, total: plans.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch maintenance plans' });
  }
});

// GET /api/maintenance-plans/:id — 单个保养计划
router.get('/plans/:id', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.maintenancePlan.findUnique({
      where: { id: req.params.id as string },
    });
    if (!plan) return res.status(404).json({ error: 'Maintenance plan not found' });
    res.json({ data: plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch maintenance plan' });
  }
});

// POST /api/maintenance-plans — 新建保养计划
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const { title, deviceId, deviceType, type, triggerType, triggerValue, intervalDays, items, sopUrl, description } = req.body;

    // Auto-calculate next scheduled date
    const nextScheduledAt = new Date();
    if (triggerType === 'time' && intervalDays) {
      nextScheduledAt.setDate(nextScheduledAt.getDate() + intervalDays);
    } else {
      nextScheduledAt.setDate(nextScheduledAt.getDate() + 30); // default 30 days
    }

    const plan = await prisma.maintenancePlan.create({
      data: {
        title, deviceId, deviceType, type: type || 'daily',
        triggerType: triggerType || 'time',
        triggerValue: triggerValue || 30,
        intervalDays: intervalDays || 30,
        items, sopUrl, description,
        nextScheduledAt,
      },
    });
    res.status(201).json({ data: plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create maintenance plan' });
  }
});

// PUT /api/maintenance-plans/:id — 更新保养计划
router.put('/plans/:id', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.maintenancePlan.update({
      where: { id: req.params.id as string },
      data: req.body,
    });
    res.json({ data: plan });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update maintenance plan' });
  }
});

// DELETE /api/maintenance-plans/:id — 删除保养计划
router.delete('/plans/:id', async (req: Request, res: Response) => {
  try {
    await prisma.maintenancePlan.delete({ where: { id: req.params.id as string } });
    res.json({ data: { success: true } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete maintenance plan' });
  }
});

// ─── 保养执行 ─────────────────────────────────

// GET /api/maintenance-records — 保养记录列表
router.get('/records', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId as string | undefined;
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;
    if (status) where.status = status;

    const records = await prisma.maintenanceRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: records, total: records.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch maintenance records' });
  }
});

// POST /api/maintenance-records — 开始/完成保养执行
router.post('/records', async (req: Request, res: Response) => {
  try {
    const { planId, deviceId, title, type, operatorId, action } = req.body;

    if (action === 'start') {
      // Create new maintenance record
      const record = await prisma.maintenanceRecord.create({
        data: {
          planId, deviceId, title, type,
          operatorId: operatorId || 'demo-repair',
          status: 'in_progress',
          steps: [],
          partsUsed: [],
        },
      });
      return res.status(201).json({ data: record });
    }

    if (action === 'complete') {
      const { recordId, steps, partsUsed, result, beforeImages, afterImages, duration, notes } = req.body;
      const record = await prisma.maintenanceRecord.update({
        where: { id: recordId as string },
        data: {
          status: 'completed',
          steps: steps || [],
          partsUsed: partsUsed || [],
          result: result || 'normal',
          beforeImages: beforeImages || [],
          afterImages: afterImages || [],
          duration: duration || 0,
          notes,
          completedAt: new Date(),
        },
      });

      // Update plan last executed
      if (planId) {
        const nextDate = new Date();
        const plan = await prisma.maintenancePlan.findUnique({ where: { id: planId as string } });
        if (plan) {
          nextDate.setDate(nextDate.getDate() + (plan.intervalDays || 30));
          await prisma.maintenancePlan.update({
            where: { id: planId as string },
            data: { lastExecutedAt: new Date(), nextScheduledAt: nextDate },
          });
        }
      }

      return res.json({ data: record });
    }

    // Update steps in progress
    const { recordId: rid, steps: newSteps } = req.body;
    const updated = await prisma.maintenanceRecord.update({
      where: { id: rid as string },
      data: { steps: newSteps },
    });
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process maintenance record' });
  }
});

export default router;
