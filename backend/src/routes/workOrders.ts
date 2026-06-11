import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/work-orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const assignee = req.query.assignee as string | undefined;
    const priority = req.query.priority as string | undefined;
    const deviceId = req.query.deviceId as string | undefined;
    const limit = req.query.limit as string | undefined;
    const where: any = {};
    if (status) {
      const statuses = (status as string).split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else {
        where.status = { in: statuses };
      }
    }
    if (assignee) where.assigneeId = assignee;
    if (priority) where.priority = priority;
    if (deviceId) where.deviceId = deviceId;

    const workOrders = await prisma.workOrder.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit ? parseInt(limit as string) : 50,
      include: { device: true },
    });
    res.json({ data: workOrders, total: workOrders.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch work orders' });
  }
});

// GET /api/work-orders/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const wo = await prisma.workOrder.findUnique({
      where: { id: req.params.id as string },
      include: {
        device: true,
        workLogs: { orderBy: { step: 'asc' } },
      },
    });
    if (!wo) return res.status(404).json({ error: 'Work order not found' });
    res.json({ data: wo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch work order' });
  }
});

// POST /api/work-orders — create work order
router.post('/', async (req: Request, res: Response) => {
  try {
    const { deviceId, type, source, priority, faultType, description, images } = req.body;
    
    // Generate code: WO-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.workOrder.count();
    const code = `WO-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Auto set SLA based on priority
    const slaMap: Record<string, number> = { P0: 30, P1: 60, P2: 240, P3: 480 };
    const slaMin = slaMap[priority] || 240;
    const slaDeadline = new Date(Date.now() + slaMin * 60 * 1000);

    const wo = await prisma.workOrder.create({
      data: {
        code,
        deviceId,
        type: type || 'repair',
        source: source || 'manual',
        priority: priority || 'P1',
        faultType,
        description,
        status: 'pending',
        slaResponseMin: 15,
        slaRepairMin: slaMin,
        slaDeadline,
      },
    });
    res.status(201).json({ data: wo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create work order' });
  }
});

// PUT /api/work-orders/:id/status — update status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const status: string = req.body.status;
    const validTransitions: Record<string, string[]> = {
      pending: ['accepted', 'cancelled'],
      accepted: ['diagnosing', 'cancelled'],
      diagnosing: ['repairing', 'cancelled'],
      repairing: ['verifying', 'cancelled'],
      verifying: ['completed', 'repairing'],
      completed: [],
      cancelled: [],
    };

    const current = await prisma.workOrder.findUnique({ where: { id: req.params.id as string } });
    if (!current) return res.status(404).json({ error: 'Work order not found' });

    const allowed = validTransitions[current.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Invalid transition: ${current.status} → ${status}`,
        allowedTransitions: allowed,
      });
    }

    const updateData: any = { status };
    if (status === 'accepted') updateData.respondedAt = new Date();
    if (status === 'diagnosing') updateData.actualStartAt = new Date();
    if (status === 'completed') updateData.actualEndAt = new Date();

    const wo = await prisma.workOrder.update({
      where: { id: req.params.id as string },
      data: updateData,
    });
    res.json({ data: wo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update work order status' });
  }
});

// POST /api/work-orders/:id/accept — accept work order
router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const wo = await prisma.workOrder.update({
      where: { id: req.params.id as string },
      data: { status: 'accepted', respondedAt: new Date(), assigneeId: req.body.assigneeId || 'demo-repair' },
    });
    res.json({ data: wo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept work order' });
  }
});

// POST /api/work-orders/:id/complete — complete work order
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { rootCause, resolution, partsUsed, cost, satisfactionScore } = req.body;
    const wo = await prisma.workOrder.update({
      where: { id: req.params.id as string },
      data: {
        status: 'completed',
        actualEndAt: new Date(),
        rootCause,
        resolution,
        partsUsed: partsUsed || [],
        cost: cost || 0,
        satisfactionScore: satisfactionScore || 5,
      },
    });

    // Auto-create knowledge entry
    await prisma.knowledgeEntry.create({
      data: {
        title: `故障: ${wo.faultType || '未知'} - ${wo.deviceId}`,
        faultType: wo.faultType,
        symptom: wo.description,
        cause: rootCause,
        solution: resolution,
        status: 'pending',
        sourceWoId: wo.id,
      },
    });

    res.json({ data: wo });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete work order' });
  }
});

// POST /api/work-orders/:id/work-logs — add work logs
router.post('/:id/work-logs', async (req: Request, res: Response) => {
  try {
    const { logs } = req.body; // array of { step, content, duration, images }
    const workOrderId = String(req.params.id) as string;

    // Delete existing logs and replace
    await prisma.workLog.deleteMany({ where: { workOrderId } });

    const created = await Promise.all(
      logs.map((log: any) =>
        prisma.workLog.create({
          data: {
            workOrderId,
            step: log.step,
            content: log.content,
            duration: log.duration,
            images: log.images || [],
            operator: log.operator || 'demo-repair',
          },
        })
      )
    );
    res.status(201).json({ data: created });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save work logs' });
  }
});

// GET /api/work-orders/:id/ai-diagnosis — AI diagnosis mock
router.get('/:id/ai-diagnosis', async (req: Request, res: Response) => {
  // Mock data for demo
  const mockDiagnosis = {
    similarCases: [
      {
        id: 'KC-001',
        symptom: '设备运行异响，振动值偏高',
        cause: '主轴轴承磨损，润滑不足',
        solution: '更换主轴轴承，加注润滑脂',
        similarity: 0.92,
      },
      {
        id: 'KC-002',
        symptom: '加工精度下降，表面粗糙度超标',
        cause: '主轴轴承间隙过大',
        solution: '调整轴承预紧力，如无效则更换轴承',
        similarity: 0.78,
      },
      {
        id: 'KC-003',
        symptom: '运行中温度异常升高',
        cause: '冷却系统流量不足',
        solution: '清洗冷却管路，检查水泵',
        similarity: 0.65,
      },
    ],
    recommendedDiagnosis: [
      { step: '1. 检查主轴轴承振动值', probability: 0.85, priority: 'high' },
      { step: '2. 检查润滑系统油位和油质', probability: 0.72, priority: 'high' },
      { step: '3. 检查冷却系统运行状态', probability: 0.45, priority: 'medium' },
    ],
    recommendedParts: [
      { name: '主轴轴承 SKF 6205', code: 'BRG-6205', quantity: 2, stock: 5 },
      { name: '润滑脂 Shell Gadus S2', code: 'LUBE-GS2', quantity: 1, stock: 12 },
    ],
    modelVersion: 'v1.2-demo',
    confidence: 0.82,
  };

  res.json({ data: mockDiagnosis });
});

export default router;
