import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET /api/dashboard/oee — overall OEE data
router.get('/oee', async (_req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany();
    const workOrders = await prisma.workOrder.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    // Calculate mock OEE values based on device status
    const deviceOEE = devices.map(d => {
      const baseOEE = d.status === 'running' ? 0.85 : d.status === 'idle' ? 0.6 : 0;
      const oee = baseOEE + (Math.random() * 0.1 - 0.05);
      return {
        id: d.id,
        code: d.code,
        name: d.name,
        status: d.status,
        oee: Math.round(oee * 10000) / 100,
        availability: Math.round((oee + 0.05) * 10000) / 100,
        performance: Math.round((oee + 0.08) * 10000) / 100,
        quality: Math.round((oee + 0.1) * 10000) / 100,
      };
    });

    const avgOEE = deviceOEE.reduce((s, d) => s + d.oee, 0) / (deviceOEE.length || 1);

    res.json({
      data: {
        overallOEE: Math.round(avgOEE * 100) / 100,
        deviceOEE,
        trend: [
          { date: '2026-05-09', oee: Math.round((avgOEE - 3) * 100) / 100 },
          { date: '2026-05-16', oee: Math.round((avgOEE - 1.5) * 100) / 100 },
          { date: '2026-05-23', oee: Math.round((avgOEE) * 100) / 100 },
          { date: '2026-05-30', oee: Math.round((avgOEE + 1) * 100) / 100 },
          { date: '2026-06-06', oee: Math.round((avgOEE + 2) * 100) / 100 },
        ],
        totalDevices: devices.length,
        alertCount: workOrders.filter(w => w.status === 'pending' || w.status === 'accepted').length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch OEE data' });
  }
});

// GET /api/dashboard/losses — 6 big losses
router.get('/losses', async (_req: Request, res: Response) => {
  const losses = [
    { type: '设备故障', category: '计划外停机', value: 42, unit: '小时', percentage: 35 },
    { type: '换型/调整', category: '计划内停机', value: 54, unit: '小时', percentage: 45 },
    { type: '短暂停机', category: '性能损失', value: 8, unit: '小时', percentage: 6.7 },
    { type: '速度降低', category: '性能损失', value: 6, unit: '小时', percentage: 5 },
    { type: '废品/返工', category: '质量损失', value: 7, unit: '小时', percentage: 5.8 },
    { type: '启动损失', category: '质量损失', value: 3, unit: '小时', percentage: 2.5 },
  ];
  res.json({ data: losses });
});

// GET /api/dashboard/pareto — pareto analysis
router.get('/pareto', async (req: Request, res: Response) => {
  const scope = (req.query.scope as string) || 'plant';
  const mockPareto = [
    { cause: '换型时间过长', count: 24, duration: 3240, percentage: 28.5, cumulative: 28.5 },
    { cause: '设备突发故障', count: 18, duration: 2520, percentage: 22.1, cumulative: 50.6 },
    { cause: '等待物料', count: 15, duration: 1800, percentage: 15.8, cumulative: 66.4 },
    { cause: '操作不当导致废品', count: 12, duration: 840, percentage: 7.4, cumulative: 73.8 },
    { cause: '刀具磨损', count: 10, duration: 720, percentage: 6.3, cumulative: 80.1 },
    { cause: '程序/参数错误', count: 8, duration: 600, percentage: 5.3, cumulative: 85.4 },
    { cause: '冷却系统问题', count: 6, duration: 480, percentage: 4.2, cumulative: 89.6 },
    { cause: '其他', count: 15, duration: 1180, percentage: 10.4, cumulative: 100 },
  ];

  // If device scope, return device-specific (slightly varied)
  if (scope === 'device' && req.query.deviceId) {
    const varied = mockPareto.map(p => ({
      ...p,
      count: Math.max(1, Math.round(p.count * (0.7 + Math.random() * 0.6))),
      duration: Math.round(p.duration * (0.7 + Math.random() * 0.6)),
    }));
    return res.json({ data: varied });
  }

  res.json({ data: mockPareto });
});

// GET /api/dashboard/devices/:id/oee — single device OEE
router.get('/devices/:id/oee', async (req: Request, res: Response) => {
  try {
    const device = await prisma.device.findUnique({ where: { id: req.params.id as string } });
    if (!device) return res.status(404).json({ error: 'Device not found' });

    const baseOEE = device.status === 'running' ? 0.82 : device.status === 'idle' ? 0.58 : 0.35;
    res.json({
      data: {
        deviceId: device.id,
        deviceName: device.name,
        oee: Math.round(baseOEE * 100),
        availability: Math.round((baseOEE + 0.06) * 100),
        performance: Math.round((baseOEE + 0.09) * 100),
        quality: Math.round((baseOEE + 0.12) * 100),
        losses: [
          { type: '故障', value: Math.round(12 + Math.random() * 8), percentage: 25 },
          { type: '换型', value: Math.round(20 + Math.random() * 10), percentage: 40 },
          { type: '短暂停机', value: Math.round(3 + Math.random() * 3), percentage: 6 },
          { type: '速度降低', value: Math.round(4 + Math.random() * 3), percentage: 8 },
          { type: '废品', value: Math.round(5 + Math.random() * 3), percentage: 10 },
          { type: '启动损失', value: Math.round(2 + Math.random() * 2), percentage: 4 },
        ],
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch device OEE' });
  }
});

// GET /api/dashboard/devices/:id/trend — device trend (realistic smooth curve)
router.get('/devices/:id/trend', async (req: Request, res: Response) => {
  try {
    const device = await prisma.device.findUnique({ where: { id: req.params.id as string } });
    const currentOEE = device?.oee ?? 75;

    const range = parseInt(String(req.query.range || '30')) || 30;
    const points = Math.min(range, 30);

    // Walk backwards from current OEE, applying small incremental changes
    // to create a smooth, realistic 30-day trajectory.
    const trend: { date: string; oee: number; availability: number; performance: number; quality: number }[] = [];
    let dayOee = currentOEE;
    let dayAvail = Math.min(100, currentOEE + 5);
    let dayPerf = Math.min(100, currentOEE + 8);
    let dayQual = Math.min(100, currentOEE + 10);

    // Pre-generate a few "fault days" with recovery patterns
    const faultDays = new Set<number>();
    for (let i = 0; i < 3; i++) {
      const day = Math.floor(Math.random() * points);
      faultDays.add(day);
      // Also add recovery days after each fault
      if (day + 1 < points) faultDays.add(day + 1);
      if (day + 2 < points) faultDays.add(day + 2);
    }

    for (let i = points - 1; i >= 0; i--) {
      // Determine daily change — small and incremental
      let oeeChange: number;

      if (faultDays.has(i)) {
        // Fault event: sharp drop then gradual recovery
        if (i === Math.max(...Array.from(faultDays).filter(d => faultDays.has(d)))) {
          oeeChange = -(8 + Math.random() * 5); // -8 to -13 on first fault day
        } else {
          oeeChange = 0.5 + Math.random() * 1.5; // +0.5 to +2 recovery
        }
      } else {
        // Normal day: tiny drift ±0.3%
        oeeChange = (Math.random() - 0.5) * 0.6;
        // Add a very gentle weekly pattern (slightly higher mid-week)
        const dayOfWeek = new Date(Date.now() - i * 86400000).getDay();
        if (dayOfWeek >= 2 && dayOfWeek <= 4) oeeChange += 0.1;
      }

      dayOee = Math.max(40, Math.min(100, dayOee + oeeChange));
      dayAvail = Math.min(100, Math.max(dayOee + 3, dayAvail + (Math.random() - 0.5) * 0.4));
      dayPerf = Math.min(100, Math.max(dayOee + 5, dayPerf + (Math.random() - 0.5) * 0.4));
      dayQual = Math.min(100, Math.max(dayOee + 7, dayQual + (Math.random() - 0.5) * 0.3));

      // Record from oldest to newest
      trend.unshift({
        date: new Date(Date.now() - (points - 1 - i) * 86400000).toISOString().slice(0, 10),
        oee: Math.round(dayOee * 100) / 100,
        availability: Math.round(dayAvail * 100) / 100,
        performance: Math.round(dayPerf * 100) / 100,
        quality: Math.round(dayQual * 100) / 100,
      });
    }

    res.json({ data: trend });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch device trend' });
  }
});

// GET /api/dashboard/executive — executive dashboard
router.get('/executive', async (_req: Request, res: Response) => {
  res.json({
    data: {
      healthDistribution: [
        { label: '优秀 (90-100)', count: 3, percentage: 37.5 },
        { label: '良好 (75-89)', count: 2, percentage: 25 },
        { label: '一般 (60-74)', count: 2, percentage: 25 },
        { label: '较差 (<60)', count: 1, percentage: 12.5 },
      ],
      monthlyOEETrend: [
        { month: '2026-01', oee: 72 },
        { month: '2026-02', oee: 74 },
        { month: '2026-03', oee: 73 },
        { month: '2026-04', oee: 76 },
        { month: '2026-05', oee: 78 },
        { month: '2026-06', oee: 80 },
      ],
      maintenanceCost: [
        { month: '2026-01', cost: 45000 },
        { month: '2026-02', cost: 42000 },
        { month: '2026-03', cost: 48000 },
        { month: '2026-04', cost: 41000 },
        { month: '2026-05', cost: 38000 },
        { month: '2026-06', cost: 35000 },
      ],
      improvementROI: [
        { project: 'SMED 换型优化', investment: 50000, saving: 180000, roi: '260%' },
        { project: 'TPM 点检体系', investment: 30000, saving: 96000, roi: '220%' },
        { project: '预测性维护', investment: 80000, saving: 240000, roi: '200%' },
      ],
    },
  });
});

export default router;
