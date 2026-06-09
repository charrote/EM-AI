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

  // Apply scope-based variation
  const vary = (factor: number) => mockPareto.map(p => {
    const variedCount = Math.max(1, Math.round(p.count * (factor + Math.random() * 0.4)));
    const variedDuration = Math.round(p.duration * (factor + Math.random() * 0.4));
    const totalVar = mockPareto.reduce((s, _) => s + variedDuration, 0);
    const sumMock = mockPareto.reduce((s, p) => s + p.duration, 0);
    const scaledDuration = Math.round(variedDuration * (sumMock / totalVar));
    return { ...p, count: variedCount, duration: scaledDuration };
  });

  if (scope === 'device') {
    const factor = req.query.deviceId ? 0.6 : 0.8;
    const varied = vary(factor);
    return res.json({ data: varied });
  }
  if (scope === 'product') {
    const factor = req.query.product === 'A' ? 0.9 : req.query.product === 'B' ? 0.7 : 0.5;
    const varied = vary(factor);
    return res.json({ data: varied });
  }
  if (scope === 'team') {
    const factor = req.query.team === '甲班' ? 1.0 : req.query.team === '乙班' ? 0.8 : 0.6;
    const varied = vary(factor);
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
  try {
    // ── Real DB stats ──
    const totalDevices = await prisma.device.count();
    const byStatus = await prisma.device.groupBy({ by: ['status'], _count: true });
    const runningCount = byStatus.find(s => s.status === 'running')?._count || 0;
    const faultCount = byStatus.find(s => s.status === 'fault')?._count || 0;
    const idleCount = byStatus.find(s => s.status === 'idle')?._count || 0;
    const maintenanceCount = byStatus.find(s => ['maintenance', 'repair'].includes(s.status))?._count || 0;

    const woPending = await prisma.workOrder.count({ where: { status: { in: ['pending', 'accepted'] } } });
    const woCompleted = await prisma.workOrder.count({ where: { status: 'completed' } });
    const woTotal = await prisma.workOrder.count();

    const healthValues = await prisma.device.findMany({ select: { healthScore: true } });
    const avgHealth = healthValues.reduce((s, d) => s + (d.healthScore || 0), 0) / (healthValues.length || 1);
    const excellent = healthValues.filter(d => (d.healthScore || 0) >= 90).length;
    const good = healthValues.filter(d => (d.healthScore || 0) >= 75 && d.healthScore! < 90).length;
    const fair = healthValues.filter(d => (d.healthScore || 0) >= 60 && d.healthScore! < 75).length;
    const poor = healthValues.filter(d => (d.healthScore || 0) < 60).length;

    // ── Monthly simulated trends (no real history in DB) ──
    const baseOEE = Math.round((runningCount / totalDevices) * 70 + 15);
    const monthlyOEETrend = [
      { month: '2026-01', oee: Math.max(60, baseOEE - 8) },
      { month: '2026-02', oee: Math.max(60, baseOEE - 6) },
      { month: '2026-03', oee: Math.max(60, baseOEE - 4) },
      { month: '2026-04', oee: Math.max(60, baseOEE - 2) },
      { month: '2026-05', oee: baseOEE },
      { month: '2026-06', oee: Math.min(95, baseOEE + 2) },
    ];

    // ── Daily OEE trend (30 days) ──
    const faultDays = new Set<number>();
    for (let i = 0; i < 3; i++) {
      const day = Math.floor(Math.random() * 30);
      faultDays.add(day);
      if (day + 1 < 30) faultDays.add(day + 1);
    }
    const dailyOEETrend: { date: string; oee: number }[] = [];
    let dayOee = baseOEE - 4;
    for (let i = 29; i >= 0; i--) {
      let change: number;
      if (faultDays.has(i)) {
        change = faultDays.has(i + 1) ? 0.5 + Math.random() * 1.5 : -(8 + Math.random() * 5);
      } else {
        change = (Math.random() - 0.5) * 0.8;
      }
      dayOee = Math.max(40, Math.min(98, dayOee + change));
      dailyOEETrend.unshift({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
        oee: Math.round(dayOee * 10) / 10,
      });
    }

    const maintenanceCost = [
      { month: '2026-01', cost: Math.round(35000 + faultCount * 1200 + Math.random() * 5000) },
      { month: '2026-02', cost: Math.round(32000 + faultCount * 1000 + Math.random() * 5000) },
      { month: '2026-03', cost: Math.round(38000 + faultCount * 1100 + Math.random() * 5000) },
      { month: '2026-04', cost: Math.round(30000 + faultCount * 900 + Math.random() * 5000) },
      { month: '2026-05', cost: Math.round(28000 + faultCount * 800 + Math.random() * 5000) },
      { month: '2026-06', cost: Math.round(25000 + faultCount * 700 + Math.random() * 5000) },
    ];

    const improvementROI = [
      { project: 'SMED 换型优化', investment: 50000, saving: 180000, roi: '260%' },
      { project: 'TPM 点检体系', investment: 30000, saving: 96000, roi: '220%' },
      { project: '预测性维护试点', investment: 80000, saving: 240000, roi: '200%' },
      { project: 'OEE 数据采集系统', investment: 45000, saving: 108000, roi: '140%' },
    ];

    // ── Top devices by health score (desc) ──
    const topHealthy = await prisma.device.findMany({
      where: { healthScore: { not: null } },
      orderBy: { healthScore: 'desc' },
      take: 10,
      select: { code: true, name: true, type: true, status: true, healthScore: true, oee: true },
    });

    // ── Fault type distribution from work orders ──
    const faultTypes = await prisma.workOrder.groupBy({
      by: ['faultType'],
      _count: true,
      where: { faultType: { not: null } },
      orderBy: { _count: { faultType: 'desc' } },
    });

    // ── Work order status distribution ──
    const woByStatus = await prisma.workOrder.groupBy({ by: ['status'], _count: true });

    // ── Monthly work order count (last 6 months) ──
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const woMonthly = await prisma.workOrder.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true },
    });
    const woMonthlyAgg: Record<string, { total: number; completed: number }> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      woMonthlyAgg[key] = { total: 0, completed: 0 };
    }
    for (const wo of woMonthly) {
      const key = `${wo.createdAt.getFullYear()}-${String(wo.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (woMonthlyAgg[key]) {
        woMonthlyAgg[key].total++;
        if (wo.status === 'completed') woMonthlyAgg[key].completed++;
      }
    }

    res.json({
      data: {
        // KPIs
        totalDevices,
        runningCount,
        runningRate: totalDevices > 0 ? Math.round((runningCount / totalDevices) * 10000) / 100 : 0,
        faultCount,
        idleCount,
        maintenanceCount,
        avgHealth: Math.round(avgHealth * 10) / 10,

        // Work order stats
        woPending,
        woCompleted,
        woTotal,
        woCompletionRate: woTotal > 0 ? Math.round((woCompleted / woTotal) * 10000) / 100 : 0,

        // Monthly trends
        monthlyOEETrend,
        dailyOEETrend,
        maintenanceCost,
        woMonthlyTrend: Object.entries(woMonthlyAgg).map(([month, v]) => ({ month, ...v })),

        // Distributions
        healthDistribution: [
          { label: '优秀 (90-100)', count: excellent, percentage: totalDevices > 0 ? Math.round(excellent / totalDevices * 10000) / 100 : 0 },
          { label: '良好 (75-89)', count: good, percentage: totalDevices > 0 ? Math.round(good / totalDevices * 10000) / 100 : 0 },
          { label: '一般 (60-74)', count: fair, percentage: totalDevices > 0 ? Math.round(fair / totalDevices * 10000) / 100 : 0 },
          { label: '较差 (<60)', count: poor, percentage: totalDevices > 0 ? Math.round(poor / totalDevices * 10000) / 100 : 0 },
        ],
        deviceStatusDistribution: [
          { label: '运行中', key: 'running', count: runningCount },
          { label: '待机', key: 'idle', count: idleCount },
          { label: '故障', key: 'fault', count: faultCount },
          { label: '保养/维修', key: 'maintenance', count: maintenanceCount },
        ],
        woStatusDistribution: woByStatus.map(s => ({ status: s.status, count: s._count })),
        faultTypeDistribution: faultTypes.map(f => ({ type: f.faultType, count: f._count })),

        // Tables
        improvementROI,
        topHealthyDevices: topHealthy,

        // Latest OEE for KPI display
        currentOEE: monthlyOEETrend[monthlyOEETrend.length - 1].oee,
        prevOEE: monthlyOEETrend.length > 1 ? monthlyOEETrend[monthlyOEETrend.length - 2].oee : monthlyOEETrend[0].oee,
        latestCost: maintenanceCost[maintenanceCost.length - 1].cost,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/oee-trend?orgId=xxx — OEE trend filtered by org level
router.get('/oee-trend', async (req: Request, res: Response) => {
  try {
    const orgId = req.query.orgId as string | undefined;
    let deviceIds: string[] = [];

    if (orgId) {
      // Collect org node IDs under the given org (including itself)
      const allOrgs = await prisma.organization.findMany();
      const collectIds = (parentId: string): string[] => {
        const ids = [parentId];
        allOrgs.filter(o => o.parentId === parentId).forEach(child => {
          ids.push(...collectIds(child.id));
        });
        return ids;
      };
      const orgIds = collectIds(orgId);

      // Find devices linked to these orgs
      const devices = await prisma.device.findMany({
        where: { OR: [{ workshopId: { in: orgIds } }, { lineId: { in: orgIds } }] },
        select: { id: true, status: true, oee: true },
      });
      deviceIds = devices.map(d => d.id);
    }

    const devices = orgId
      ? await prisma.device.findMany({ where: { id: { in: deviceIds } }, select: { status: true, oee: true } })
      : await prisma.device.findMany({ select: { status: true, oee: true } });

    const runningCount = devices.filter(d => d.status === 'running').length;
    const totalDevices = devices.length;
    const baseOEE = totalDevices > 0 ? Math.round((runningCount / totalDevices) * 70 + 15) : 75;

    // Generate 30-day daily trend
    const faultDays = new Set<number>();
    for (let i = 0; i < 3; i++) {
      const day = Math.floor(Math.random() * 30);
      faultDays.add(day);
      if (day + 1 < 30) faultDays.add(day + 1);
    }
    const trend: { date: string; oee: number }[] = [];
    let dayOee = baseOEE - 4;
    for (let i = 29; i >= 0; i--) {
      let change: number;
      if (faultDays.has(i)) {
        change = faultDays.has(i + 1) ? 0.5 + Math.random() * 1.5 : -(8 + Math.random() * 5);
      } else {
        change = (Math.random() - 0.5) * 0.8;
      }
      dayOee = Math.max(40, Math.min(98, dayOee + change));
      trend.unshift({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
        oee: Math.round(dayOee * 10) / 10,
      });
    }

    // Also compute current vs previous period OEE for the delta
    const periodSize = Math.min(6, Math.floor(trend.length / 5));
    const currentPeriod = trend.slice(-periodSize);
    const prevPeriod = trend.slice(-periodSize * 2, -periodSize);
    const currentAvg = currentPeriod.reduce((s, d) => s + d.oee, 0) / currentPeriod.length;
    const prevAvg = prevPeriod.length > 0 ? prevPeriod.reduce((s, d) => s + d.oee, 0) / prevPeriod.length : currentAvg;

    const orgName = orgId
      ? (await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }))?.name
      : undefined;

    res.json({
      data: {
        orgId: orgId || null,
        orgName: orgName || '全厂',
        totalDevices,
        runningCount,
        baseOEE,
        currentOEE: Math.round(currentAvg * 10) / 10,
        prevOEE: Math.round(prevAvg * 10) / 10,
        trend,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
