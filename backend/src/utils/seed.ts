import { prisma } from '../db';

export async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  // ===== Devices (8 machines) =====
  const devices = await Promise.all([
    prisma.device.create({
      data: {
        code: 'INJ-001', name: '注塑机 #1', type: '注塑机', status: 'running',
        area: 'A区', line: 'A1', healthScore: 85, oee: 82, mtbf: 240, mttr: 1.5, priority: 'A',
        config: { tempRange: [180, 220], pressureRange: [80, 150] },
      },
    }),
    prisma.device.create({
      data: {
        code: 'INJ-002', name: '注塑机 #2', type: '注塑机', status: 'fault',
        area: 'A区', line: 'A1', healthScore: 45, oee: 35, mtbf: 120, mttr: 3.2, priority: 'A',
        config: { tempRange: [180, 220], pressureRange: [80, 150] },
      },
    }),
    prisma.device.create({
      data: {
        code: 'CNC-001', name: 'CNC 加工中心 #1', type: 'CNC', status: 'running',
        area: 'B区', line: 'B1', healthScore: 92, oee: 91, mtbf: 360, mttr: 0.8, priority: 'A',
      },
    }),
    prisma.device.create({
      data: {
        code: 'CNC-002', name: 'CNC 加工中心 #2', type: 'CNC', status: 'maintenance',
        area: 'B区', line: 'B1', healthScore: 72, oee: 65, mtbf: 200, mttr: 2.1, priority: 'A',
      },
    }),
    prisma.device.create({
      data: {
        code: 'PCH-001', name: '冲床 #1', type: '冲床', status: 'idle',
        area: 'C区', line: 'C1', healthScore: 78, oee: 58, mtbf: 180, mttr: 1.8, priority: 'B',
      },
    }),
    prisma.device.create({
      data: {
        code: 'WLD-001', name: '焊接机器人 #1', type: '焊接机', status: 'running',
        area: 'D区', line: 'D1', healthScore: 88, oee: 86, mtbf: 300, mttr: 1.2, priority: 'B',
      },
    }),
    prisma.device.create({
      data: {
        code: 'ASM-001', name: '组装线 #1', type: '组装线', status: 'running',
        area: 'E区', line: 'E1', healthScore: 80, oee: 79, mtbf: 260, mttr: 1.0, priority: 'A',
      },
    }),
    prisma.device.create({
      data: {
        code: 'INS-001', name: '检测仪 #1', type: '检测仪', status: 'idle',
        area: 'F区', line: 'F1', healthScore: 90, oee: 72, mtbf: 400, mttr: 0.5, priority: 'C',
      },
    }),
  ]);

  // ===== Work Orders (15) =====
  const statuses = ['pending', 'accepted', 'diagnosing', 'repairing', 'completed', 'completed', 'completed'];
  const priorities = ['P0', 'P1', 'P1', 'P2', 'P2', 'P3'];

  for (let i = 0; i < 15; i++) {
    const device = devices[i % devices.length];
    const daysAgo = Math.floor(Math.random() * 14);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];
    const slaMin = { P0: 30, P1: 60, P2: 240, P3: 480 }[priority] || 240;

    const wo = await prisma.workOrder.create({
      data: {
        code: `WO-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
        deviceId: device.id,
        type: 'repair',
        source: ['manual', 'scan', 'inspection'][i % 3],
        status,
        priority,
        faultType: ['机械', '电气', '液压', '气动', '软件', '机械'][i % 6],
        description: [
          '设备运行异响，振动值偏高',
          '加工精度下降，尺寸超差',
          '液压管路泄漏',
          '控制面板无响应',
          '安全门传感器故障',
          '主轴温度异常升高',
          '冷却液不足报警',
          '伺服驱动器报错',
          '夹具定位偏移',
          '气动压力不足',
          '润滑系统油压偏低',
          '电机过载保护触发',
          '导轨磨损间隙过大',
          '真空吸附力不足',
          'PLC 通讯中断',
        ][i],
        assigneeId: status !== 'pending' ? 'demo-repair' : null,
        slaResponseMin: 15,
        slaRepairMin: slaMin,
        slaDeadline: new Date(createdAt.getTime() + slaMin * 60 * 1000),
        respondedAt: status !== 'pending' ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
        actualStartAt: ['diagnosing', 'repairing', 'completed'].includes(status)
          ? new Date(createdAt.getTime() + 15 * 60 * 1000) : null,
        actualEndAt: status === 'completed' ? new Date(createdAt.getTime() + 120 * 60 * 1000) : null,
        rootCause: status === 'completed' ? ['轴承磨损', '密封圈老化', '传感器脏污', '参数设置错误'][i % 4] : null,
        resolution: status === 'completed' ? ['更换轴承并重新校准', '更换密封圈', '清洁传感器', '调整工艺参数'][i % 4] : null,
        cost: status === 'completed' ? Math.round(500 + Math.random() * 3000) : null,
        satisfactionScore: status === 'completed' ? Math.floor(3 + Math.random() * 3) : null,
        createdAt,
      },
    });

    if (status === 'completed') {
      const steps = [
        { step: 1, content: '现场检查设备运行状态，听取异响', duration: 10 },
        { step: 2, content: '使用振动仪检测各测点振动值', duration: 15 },
        { step: 3, content: '拆卸护罩检查轴承状态，发现磨损', duration: 20 },
        { step: 4, content: '更换轴承并加注润滑脂', duration: 45 },
        { step: 5, content: '试运行30分钟，确认异响消除，振动值正常', duration: 30 },
      ];
      for (const step of steps) {
        await prisma.workLog.create({
          data: {
            workOrderId: wo.id,
            step: step.step,
            content: step.content,
            duration: step.duration,
            operator: 'demo-repair',
          },
        });
      }
    }
  }

  // ===== Inspections (8 records) =====
  for (let i = 0; i < 8; i++) {
    const device = devices[i % devices.length];
    const hasAbnormal = i === 1 || i === 4;
    await prisma.inspection.create({
      data: {
        deviceId: device.id,
        level: 'daily',
        operatorId: 'demo-operator',
        status: 'completed',
        items: [
          { id: 'item-1', name: '润滑油位', method: '目视', value: hasAbnormal ? '低于下限' : '正常', result: hasAbnormal ? 'fail' : 'pass' },
          { id: 'item-2', name: '温度检查', method: '测温枪', value: '45°C', result: 'pass', normalRange: '30-60°C' },
          { id: 'item-3', name: '振动检测', method: '振动仪', value: hasAbnormal ? '7.2mm/s' : '3.1mm/s', result: hasAbnormal ? 'fail' : 'pass', normalRange: '<5.0mm/s' },
          { id: 'item-4', name: '紧固件检查', method: '目视+扳手', value: '正常', result: 'pass' },
          { id: 'item-5', name: '清洁度', method: '目视', value: '良好', result: 'pass' },
        ],
        abnormalCount: hasAbnormal ? 2 : 0,
        doneAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ===== Toolings (10) =====
  const toolingData = [
    { code: 'MOLD-A01', name: '前壳模具 A01', type: '模具', status: 'in_use', deviceId: devices[0].id, theoreticalLife: 500000, lifeUnit: 'cycles', lifeUsed: 320000 },
    { code: 'MOLD-A02', name: '后壳模具 A02', type: '模具', status: 'in_stock', theoreticalLife: 500000, lifeUnit: 'cycles', lifeUsed: 180000 },
    { code: 'FIX-B01', name: 'CNC 夹具 B01', type: '夹具', status: 'in_use', deviceId: devices[2].id, theoreticalLife: 10000, lifeUnit: 'cycles', lifeUsed: 6500 },
    { code: 'FIX-B02', name: 'CNC 夹具 B02', type: '夹具', status: 'maintenance', theoreticalLife: 10000, lifeUnit: 'cycles', lifeUsed: 9500 },
    { code: 'CUT-C01', name: 'PCD 刀具 C01', type: '刀具', status: 'in_use', deviceId: devices[2].id, theoreticalLife: 2000, lifeUnit: 'cycles', lifeUsed: 1800 },
    { code: 'CUT-C02', name: '硬质合金铣刀 C02', type: '刀具', status: 'in_stock', theoreticalLife: 3000, lifeUnit: 'cycles', lifeUsed: 500 },
    { code: 'GAU-D01', name: '三坐标测头 D01', type: '量具', status: 'in_use', deviceId: devices[4].id, theoreticalLife: 5000, lifeUnit: 'cycles', lifeUsed: 4200 },
    { code: 'GAU-D02', name: '激光干涉仪 D02', type: '量具', status: 'in_stock', theoreticalLife: 10000, lifeUnit: 'hours', lifeUsed: 3200 },
    { code: 'MOLD-A03', name: '装饰条模具 A03', type: '模具', status: 'repair', theoreticalLife: 300000, lifeUnit: 'cycles', lifeUsed: 280000 },
    { code: 'FIX-B03', name: '焊接夹具 B03', type: '夹具', status: 'in_use', deviceId: devices[5].id, theoreticalLife: 20000, lifeUnit: 'cycles', lifeUsed: 8500 },
  ];

  for (const td of toolingData) {
    await prisma.tooling.create({
      data: {
        ...td,
        lifeRemaining: td.theoreticalLife ? td.theoreticalLife - td.lifeUsed : 0,
        healthScore: td.theoreticalLife ? Math.round((1 - td.lifeUsed / td.theoreticalLife) * 100) : 80,
        purchaseDate: new Date('2025-06-01'),
        purchaseCost: Math.round(5000 + Math.random() * 50000),
        location: `${td.type === '模具' ? 'A' : td.type === '夹具' ? 'B' : 'C'}货架-${Math.ceil(Math.random() * 5)}排`,
      },
    });
  }

  // ===== Knowledge Entries (5) =====
  await prisma.knowledgeEntry.createMany({
    data: [
      { title: '注塑机异响-轴承磨损', faultType: '机械', symptom: '设备运行异响，振动值偏高', cause: '主轴轴承磨损，润滑不足', solution: '1. 停机检查轴承 2. 更换轴承 3. 加注润滑脂 4. 试运行确认', status: 'approved', tags: ['注塑机', '轴承', '异响'] },
      { title: 'CNC 加工精度下降-主轴间隙', faultType: '机械', symptom: '加工精度下降，表面粗糙度超标', cause: '主轴轴承间隙过大，主轴热变形', solution: '1. 检测主轴跳动 2. 调整轴承预紧力 3. 如无效更换轴承 4. 重新校准', status: 'approved', tags: ['CNC', '精度', '主轴'] },
      { title: '液压管路泄漏-O型圈老化', faultType: '液压', symptom: '液压管路接头处渗油，系统压力下降', cause: 'O型密封圈老化失效', solution: '1. 确认泄漏点 2. 更换密封圈 3. 紧固接头 4. 补充液压油 5. 试压确认', status: 'approved', tags: ['液压', '泄漏', '密封圈'] },
      { title: '控制面板无响应-电源模块故障', faultType: '电气', symptom: '控制面板黑屏，指示灯不亮', cause: '开关电源模块损坏', solution: '1. 检查输入电源 2. 测量电源模块输出 3. 更换电源模块 4. 重启系统', status: 'pending', tags: ['电气', '控制面板', '电源'] },
      { title: '安全门报警-传感器位置偏移', faultType: '电气', symptom: '安全门关闭后仍报警', cause: '安全门传感器安装位置偏移', solution: '1. 检查传感器安装支架 2. 调整传感器位置 3. 测试开关门信号 4. 紧固固定螺丝', status: 'approved', tags: ['安全', '传感器', '报警'] },
    ],
  });

  // ===== Improvement Projects (3) =====
  await prisma.improvementProject.createMany({
    data: [
      { title: 'SMED 换型优化 - INJ-001', lossType: '换型/调整', currentValue: 45, targetValue: 20, unit: 'min', assignee: '张三', deadline: new Date('2026-06-30'), status: 'active', progress: 60, description: '通过快速换模工装和标准化操作流程，将注塑机换型时间从45分钟缩短至20分钟' },
      { title: 'CNC-002 主轴精度恢复', lossType: '设备故障', currentValue: 12, targetValue: 3, unit: '次/月', assignee: '李四', deadline: new Date('2026-07-15'), status: 'active', progress: 30, description: '针对CNC-002频繁主轴故障，实施预知性维护策略' },
      { title: 'TPM 点检体系优化', lossType: '设备故障', currentValue: 18, targetValue: 10, unit: '次/月', assignee: '王五', deadline: new Date('2026-06-20'), status: 'completed', progress: 100, description: '优化点检标准和频率，基于数据分析淘汰无效点检项' },
    ],
  });

  console.log(`✅ Demo data seeded: ${devices.length} devices, 15 work orders, 8 inspections, 10 toolings, 5 knowledge entries, 3 projects`);
}

// Allow running directly: `npx tsx src/utils/seed.ts`
const isMainModule = process.argv[1]?.includes('seed');
if (isMainModule) {
  seedDemoData()
    .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
