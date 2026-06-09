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
  const scope = req.query.scope || 'plant';
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
    const device = await prisma.device.findUnique({ where: { id: req.params.id } });
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

// GET /api/dashboard/devices/:id/trend — device trend
router.get('/devices/:id/trend', async (req: Request, res: Response) => {
  const range = parseInt(req.query.range as string) || 30;
  const points = Math.min(range, 30);
  const trend = Array.from({ length: points }, (_, i) => ({
    date: new Date(Date.now() - (points - 1 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    oee: Math.round((70 + Math.random() * 20) * 100) / 100,
    availability: Math.round((75 + Math.random() * 18) * 100) / 100,
    performance: Math.round((78 + Math.random() * 18) * 100) / 100,
    quality: Math.round((85 + Math.random() * 12) * 100) / 100,
  }));
  res.json({ data: trend });
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
