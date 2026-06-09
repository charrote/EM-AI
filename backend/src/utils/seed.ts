import { prisma } from '../db';

// ── 场景配置 ──────────────────────────────────
export const SCENARIO_METAL = 'metal';
export const SCENARIO_CAPACITOR = 'capacitor';

export interface DeviceSeed {
  code: string; name: string; type: string; status: string;
  area: string; line: string; scenario: string;
  healthScore: number; oee: number; mtbf: number; mttr: number;
  priority: string; config?: any;
}

// 金属加工场景
const metalDevices: DeviceSeed[] = [
  // CNC 加工区
  { code: 'CNC-001', name: 'CNC 加工中心 #1', type: 'CNC', status: 'running', area: 'CNC加工区', line: 'M1', scenario: SCENARIO_METAL, healthScore: 92, oee: 91, mtbf: 360, mttr: 0.8, priority: 'A' },
  { code: 'CNC-002', name: 'CNC 加工中心 #2', type: 'CNC', status: 'running', area: 'CNC加工区', line: 'M1', scenario: SCENARIO_METAL, healthScore: 88, oee: 85, mtbf: 310, mttr: 1.1, priority: 'A' },
  { code: 'CNC-003', name: 'CNC 加工中心 #3', type: 'CNC', status: 'idle', area: 'CNC加工区', line: 'M1', scenario: SCENARIO_METAL, healthScore: 76, oee: 62, mtbf: 200, mttr: 2.3, priority: 'A' },
  { code: 'CNC-004', name: 'CNC 加工中心 #4', type: 'CNC', status: 'fault', area: 'CNC加工区', line: 'M2', scenario: SCENARIO_METAL, healthScore: 38, oee: 28, mtbf: 95, mttr: 4.5, priority: 'A' },
  // 冷墩区
  { code: 'LD-001', name: '冷墩机 #1', type: '冷墩机', status: 'running', area: '冷墩区', line: 'M1', scenario: SCENARIO_METAL, healthScore: 85, oee: 80, mtbf: 280, mttr: 1.5, priority: 'A' },
  { code: 'LD-002', name: '冷墩机 #2', type: '冷墩机', status: 'repair', area: '冷墩区', line: 'M1', scenario: SCENARIO_METAL, healthScore: 52, oee: 40, mtbf: 150, mttr: 3.8, priority: 'A' },
  // 研磨区
  { code: 'YM-001', name: '研磨机 #1', type: '研磨机', status: 'running', area: '研磨区', line: 'M2', scenario: SCENARIO_METAL, healthScore: 90, oee: 87, mtbf: 340, mttr: 0.9, priority: 'B' },
  { code: 'YM-002', name: '研磨机 #2', type: '研磨机', status: 'maintenance', area: '研磨区', line: 'M2', scenario: SCENARIO_METAL, healthScore: 68, oee: 55, mtbf: 180, mttr: 2.8, priority: 'B' },
  // 注塑区
  { code: 'ZS-001', name: '注塑机 #1', type: '注塑机', status: 'running', area: '注塑区', line: 'A1', scenario: SCENARIO_METAL, healthScore: 85, oee: 82, mtbf: 240, mttr: 1.5, priority: 'A', config: { tempRange: [180, 220], pressureRange: [80, 150] } },
  { code: 'ZS-002', name: '注塑机 #2', type: '注塑机', status: 'fault', area: '注塑区', line: 'A1', scenario: SCENARIO_METAL, healthScore: 45, oee: 35, mtbf: 120, mttr: 3.2, priority: 'A', config: { tempRange: [180, 220], pressureRange: [80, 150] } },
  { code: 'ZS-003', name: '注塑机 #3', type: '注塑机', status: 'running', area: '注塑区', line: 'A2', scenario: SCENARIO_METAL, healthScore: 82, oee: 78, mtbf: 260, mttr: 1.3, priority: 'A', config: { tempRange: [185, 225], pressureRange: [85, 145] } },
  // 激光切割区
  { code: 'JG-001', name: '激光切割机 #1', type: '激光切割机', status: 'running', area: '激光切割区', line: 'M3', scenario: SCENARIO_METAL, healthScore: 94, oee: 90, mtbf: 400, mttr: 0.6, priority: 'A' },
  { code: 'JG-002', name: '激光切割机 #2', type: '激光切割机', status: 'idle', area: '激光切割区', line: 'M3', scenario: SCENARIO_METAL, healthScore: 79, oee: 60, mtbf: 220, mttr: 1.9, priority: 'A' },
  // 大型弯折区
  { code: 'WZ-001', name: '大型弯折机 #1', type: '大型弯折机', status: 'running', area: '大型弯折区', line: 'M3', scenario: SCENARIO_METAL, healthScore: 87, oee: 83, mtbf: 300, mttr: 1.2, priority: 'B' },
  { code: 'WZ-002', name: '大型弯折机 #2', type: '大型弯折机', status: 'repair', area: '大型弯折区', line: 'M3', scenario: SCENARIO_METAL, healthScore: 55, oee: 42, mtbf: 160, mttr: 3.5, priority: 'B' },
  // 外观检测区
  { code: 'WG-001', name: '全自动外观机 #1', type: '全自动外观机', status: 'running', area: '外观检测区', line: 'M2', scenario: SCENARIO_METAL, healthScore: 91, oee: 88, mtbf: 350, mttr: 0.7, priority: 'C' },
  { code: 'WG-002', name: '全自动外观机 #2', type: '全自动外观机', status: 'idle', area: '外观检测区', line: 'M2', scenario: SCENARIO_METAL, healthScore: 83, oee: 70, mtbf: 280, mttr: 1.0, priority: 'C' },
];

// 电解电容场景
const capacitorDevices: DeviceSeed[] = [
  // 裁切区
  { code: 'CQ-001', name: '裁切机 #1', type: '裁切机', status: 'running', area: '裁切区', line: 'E1', scenario: SCENARIO_CAPACITOR, healthScore: 90, oee: 86, mtbf: 320, mttr: 0.9, priority: 'A' },
  { code: 'CQ-002', name: '裁切机 #2', type: '裁切机', status: 'idle', area: '裁切区', line: 'E1', scenario: SCENARIO_CAPACITOR, healthScore: 75, oee: 58, mtbf: 190, mttr: 2.0, priority: 'A' },
  // 钉卷区
  { code: 'DJ-001', name: '钉卷机 #1', type: '钉卷机', status: 'running', area: '钉卷区', line: 'E1', scenario: SCENARIO_CAPACITOR, healthScore: 86, oee: 82, mtbf: 290, mttr: 1.3, priority: 'A' },
  { code: 'DJ-002', name: '钉卷机 #2', type: '钉卷机', status: 'running', area: '钉卷区', line: 'E2', scenario: SCENARIO_CAPACITOR, healthScore: 81, oee: 77, mtbf: 270, mttr: 1.6, priority: 'A' },
  { code: 'DJ-003', name: '钉卷机 #3', type: '钉卷机', status: 'fault', area: '钉卷区', line: 'E2', scenario: SCENARIO_CAPACITOR, healthScore: 42, oee: 32, mtbf: 110, mttr: 4.0, priority: 'A' },
  // 入壳区
  { code: 'RK-001', name: '入壳机 #1', type: '入壳机', status: 'running', area: '入壳区', line: 'E1', scenario: SCENARIO_CAPACITOR, healthScore: 88, oee: 84, mtbf: 310, mttr: 1.1, priority: 'B' },
  { code: 'RK-002', name: '入壳机 #2', type: '入壳机', status: 'maintenance', area: '入壳区', line: 'E1', scenario: SCENARIO_CAPACITOR, healthScore: 65, oee: 52, mtbf: 170, mttr: 2.5, priority: 'B' },
  // 套管区
  { code: 'TG-001', name: '套管机 #1', type: '套管机', status: 'running', area: '套管区', line: 'E2', scenario: SCENARIO_CAPACITOR, healthScore: 89, oee: 85, mtbf: 330, mttr: 0.8, priority: 'B' },
  { code: 'TG-002', name: '套管机 #2', type: '套管机', status: 'idle', area: '套管区', line: 'E2', scenario: SCENARIO_CAPACITOR, healthScore: 77, oee: 63, mtbf: 210, mttr: 1.8, priority: 'B' },
  // 老化区
  { code: 'LH-001', name: '老化设备 #1', type: '老化设备', status: 'running', area: '老化区', line: 'E3', scenario: SCENARIO_CAPACITOR, healthScore: 93, oee: 90, mtbf: 380, mttr: 0.5, priority: 'A' },
  { code: 'LH-002', name: '老化设备 #2', type: '老化设备', status: 'running', area: '老化区', line: 'E3', scenario: SCENARIO_CAPACITOR, healthScore: 84, oee: 80, mtbf: 300, mttr: 1.2, priority: 'A' },
  { code: 'LH-003', name: '老化设备 #3', type: '老化设备', status: 'repair', area: '老化区', line: 'E3', scenario: SCENARIO_CAPACITOR, healthScore: 48, oee: 38, mtbf: 130, mttr: 3.6, priority: 'A' },
  // 包装区
  { code: 'BZ-001', name: '自动包装机 #1', type: '自动包装机', status: 'running', area: '包装区', line: 'E4', scenario: SCENARIO_CAPACITOR, healthScore: 87, oee: 83, mtbf: 290, mttr: 1.0, priority: 'C' },
  { code: 'BZ-002', name: '自动包装机 #2', type: '自动包装机', status: 'idle', area: '包装区', line: 'E4', scenario: SCENARIO_CAPACITOR, healthScore: 80, oee: 66, mtbf: 240, mttr: 1.4, priority: 'C' },
];

const allDeviceSeeds = [...metalDevices, ...capacitorDevices];

export async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  // Clean existing data
  await prisma.workLog.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.tooling.deleteMany();
  await prisma.improvementProject.deleteMany();
  await prisma.knowledgeEntry.deleteMany();
  await prisma.device.deleteMany();

  // ===== Devices (31 across 2 scenarios) =====
  const devices = await Promise.all(
    allDeviceSeeds.map((d) =>
      prisma.device.create({
        data: {
          code: d.code,
          name: d.name,
          type: d.type,
          status: d.status,
          area: d.area,
          line: d.line,
          healthScore: d.healthScore,
          oee: d.oee,
          mtbf: d.mtbf,
          mttr: d.mttr,
          priority: d.priority,
          config: d.config || {},
        },
      })
    )
  );

  // ===== Work Orders (20) =====
  const statuses = ['pending', 'accepted', 'diagnosing', 'repairing', 'completed', 'completed', 'completed', 'completed'];
  const priorities = ['P0', 'P1', 'P1', 'P2', 'P2', 'P3', 'P1', 'P2'];
  const faultTypes = ['机械', '电气', '液压', '气动', '软件', '机械', '电气', '液压'];
  const descriptions = [
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
    '输送带跑偏',
    '加热温控失效',
    '切刀磨损钝化',
    '真空泵噪声异常',
    '编码器信号丢失',
  ];
  const rootCauses = ['轴承磨损', '密封圈老化', '传感器脏污', '参数设置错误', '电路板烧毁', '导轨磨损', '皮带松弛', '过滤器堵塞'];
  const resolutions = ['更换轴承并重新校准', '更换密封圈', '清洁传感器', '调整工艺参数', '更换电路板', '更换导轨并调整', '更换皮带', '清洗过滤器'];

  // Assignees (realistic names)
  const repairers = ['张伟', '李强', '王磊', '陈明', '刘洋', '赵刚'];

  for (let i = 0; i < 20; i++) {
    const device = devices[i % devices.length];
    const daysAgo = Math.floor(Math.random() * 20);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];
    const slaMin = { P0: 30, P1: 60, P2: 240, P3: 480 }[priority] || 240;
    const assignee = status !== 'pending' ? repairers[i % repairers.length] : null;

    const wo = await prisma.workOrder.create({
      data: {
        code: `WO-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
        deviceId: device.id,
        type: 'repair',
        source: ['manual', 'scan', 'inspection', 'iot_auto'][i % 4],
        status,
        priority,
        faultType: faultTypes[i % faultTypes.length],
        description: descriptions[i % descriptions.length],
        assigneeId: assignee,
        slaResponseMin: 15,
        slaRepairMin: slaMin,
        slaDeadline: new Date(createdAt.getTime() + slaMin * 60 * 1000),
        respondedAt: status !== 'pending' ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
        actualStartAt: ['diagnosing', 'repairing', 'completed'].includes(status)
          ? new Date(createdAt.getTime() + 15 * 60 * 1000) : null,
        actualEndAt: status === 'completed' ? new Date(createdAt.getTime() + (60 + Math.random() * 180) * 60 * 1000) : null,
        rootCause: status === 'completed' ? rootCauses[i % rootCauses.length] : null,
        resolution: status === 'completed' ? resolutions[i % resolutions.length] : null,
        cost: status === 'completed' ? Math.round(500 + Math.random() * 5000) : null,
        satisfactionScore: status === 'completed' ? Math.floor(3 + Math.random() * 3) : null,
        createdAt,
      },
    });

    if (status === 'completed') {
      const steps = [
        { step: 1, content: '现场检查设备运行状态', duration: 10 },
        { step: 2, content: '使用检测仪器测量关键参数', duration: 15 },
        { step: 3, content: '拆卸护罩检查内部组件', duration: 20 },
        { step: 4, content: '更换损坏部件', duration: 45 },
        { step: 5, content: '试运行并确认恢复正常', duration: 30 },
      ];
      for (const step of steps) {
        await prisma.workLog.create({
          data: {
            workOrderId: wo.id,
            step: step.step,
            content: step.content,
            duration: step.duration,
            operator: assignee || '维修工',
          },
        });
      }
    }
  }

  // ===== Inspections (10) =====
  for (let i = 0; i < 10; i++) {
    const device = devices[i % devices.length];
    const hasAbnormal = i === 1 || i === 4 || i === 7;
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
        abnormalCount: hasAbnormal ? 1 : 0,
        doneAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      },
    });
  }

  // ===== Toolings (12) =====
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
    { code: 'MOLD-A04', name: '插件模具 A04', type: '模具', status: 'in_use', deviceId: devices[8].id, theoreticalLife: 400000, lifeUnit: 'cycles', lifeUsed: 210000 },
    { code: 'CUT-C03', name: '金刚石刀具 C03', type: '刀具', status: 'in_stock', theoreticalLife: 5000, lifeUnit: 'cycles', lifeUsed: 800 },
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

  // ===== Knowledge Entries (6) =====
  await prisma.knowledgeEntry.createMany({
    data: [
      { title: '注塑机异响-轴承磨损', faultType: '机械', symptom: '设备运行异响，振动值偏高', cause: '主轴轴承磨损，润滑不足', solution: '1. 停机检查轴承 2. 更换轴承 3. 加注润滑脂 4. 试运行确认', status: 'approved', tags: ['注塑机', '轴承', '异响'] },
      { title: 'CNC 加工精度下降-主轴间隙', faultType: '机械', symptom: '加工精度下降，表面粗糙度超标', cause: '主轴轴承间隙过大，主轴热变形', solution: '1. 检测主轴跳动 2. 调整轴承预紧力 3. 如无效更换轴承 4. 重新校准', status: 'approved', tags: ['CNC', '精度', '主轴'] },
      { title: '液压管路泄漏-O型圈老化', faultType: '液压', symptom: '液压管路接头处渗油，系统压力下降', cause: 'O型密封圈老化失效', solution: '1. 确认泄漏点 2. 更换密封圈 3. 紧固接头 4. 补充液压油 5. 试压确认', status: 'approved', tags: ['液压', '泄漏', '密封圈'] },
      { title: '控制面板无响应-电源模块故障', faultType: '电气', symptom: '控制面板黑屏，指示灯不亮', cause: '开关电源模块损坏', solution: '1. 检查输入电源 2. 测量电源模块输出 3. 更换电源模块 4. 重启系统', status: 'pending', tags: ['电气', '控制面板', '电源'] },
      { title: '安全门报警-传感器位置偏移', faultType: '电气', symptom: '安全门关闭后仍报警', cause: '安全门传感器安装位置偏移', solution: '1. 检查传感器安装支架 2. 调整传感器位置 3. 测试开关门信号 4. 紧固固定螺丝', status: 'approved', tags: ['安全', '传感器', '报警'] },
      { title: '钉卷机张力不稳-张力传感器故障', faultType: '电气', symptom: '钉卷过程中铝箔张力波动大，产品不良率升高', cause: '张力传感器零点漂移，控制器PID参数不匹配', solution: '1. 校准张力传感器零点 2. 检查传感器连接线 3. 重新整定PID参数 4. 试运行确认张力稳定', status: 'approved', tags: ['钉卷机', '张力', '传感器'] },
    ],
  });

  // ===== Improvement Projects (3) =====
  await prisma.improvementProject.createMany({
    data: [
      { title: 'SMED 换型优化 - ZS-001', lossType: '换型/调整', currentValue: 45, targetValue: 20, unit: 'min', assignee: '张三', deadline: new Date('2026-06-30'), status: 'active', progress: 60, description: '通过快速换模工装和标准化操作流程，将注塑机换型时间从45分钟缩短至20分钟' },
      { title: 'CNC-003 主轴精度恢复', lossType: '设备故障', currentValue: 12, targetValue: 3, unit: '次/月', assignee: '李四', deadline: new Date('2026-07-15'), status: 'active', progress: 30, description: '针对CNC-003频繁主轴故障，实施预知性维护策略' },
      { title: 'TPM 点检体系优化', lossType: '设备故障', currentValue: 18, targetValue: 10, unit: '次/月', assignee: '王五', deadline: new Date('2026-06-20'), status: 'completed', progress: 100, description: '优化点检标准和频率，基于数据分析淘汰无效点检项' },
    ],
  });

  console.log(`✅ Demo data seeded: ${devices.length} devices, 20 work orders, 10 inspections, 12 toolings, 6 knowledge entries, 3 projects`);
  console.log(`   金属加工: ${metalDevices.length}台 · 电解电容: ${capacitorDevices.length}台`);
}

// Allow running directly
const isMainModule = process.argv[1]?.includes('seed');
if (isMainModule) {
  seedDemoData()
    .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
