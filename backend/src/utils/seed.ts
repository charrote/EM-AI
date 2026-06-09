import { prisma } from '../db';

// ── 场景类型定义 ──────────────────────────────
export const SCENARIO_METAL = 'metal';
export const SCENARIO_CAPACITOR = 'capacitor';

interface AreaDef {
  name: string;
  type: string;
  codePrefix: string;
  count: number;
}

const metalAreas: AreaDef[] = [
  { name: 'CNC加工区', type: 'CNC', codePrefix: 'CNC', count: 25 },
  { name: '冷墩区', type: '冷墩机', codePrefix: 'LD', count: 20 },
  { name: '研磨区', type: '研磨机', codePrefix: 'YM', count: 22 },
  { name: '注塑区', type: '注塑机', codePrefix: 'ZS', count: 25 },
  { name: '激光切割区', type: '激光切割机', codePrefix: 'JG', count: 22 },
  { name: '大型弯折区', type: '大型弯折机', codePrefix: 'WZ', count: 20 },
  { name: '外观检测区', type: '全自动外观机', codePrefix: 'WG', count: 22 },
];

const capacitorAreas: AreaDef[] = [
  { name: '裁切区', type: '裁切机', codePrefix: 'CQ', count: 24 },
  { name: '钉卷区', type: '钉卷机', codePrefix: 'DJ', count: 25 },
  { name: '入壳区', type: '入壳机', codePrefix: 'RK', count: 23 },
  { name: '套管区', type: '套管机', codePrefix: 'TG', count: 24 },
  { name: '老化区', type: '老化设备', codePrefix: 'LH', count: 25 },
  { name: '包装区', type: '自动包装机', codePrefix: 'BZ', count: 23 },
];

const statuses = ['running', 'running', 'running', 'running', 'idle', 'idle', 'fault', 'maintenance'] as const;

function generateDevicesForArea(area: AreaDef, scenario: string, line: string) {
  const devices = [];
  for (let i = 1; i <= area.count; i++) {
    const status = statuses[i % statuses.length];
    const baseHealth = status === 'running' ? 75 + Math.floor(Math.random() * 20)
      : status === 'idle' ? 70 + Math.floor(Math.random() * 15)
      : status === 'fault' ? 30 + Math.floor(Math.random() * 20)
      : 50 + Math.floor(Math.random() * 20);
    const baseOEE = status === 'running' ? 70 + Math.floor(Math.random() * 20)
      : status === 'idle' ? 50 + Math.floor(Math.random() * 15)
      : 30 + Math.floor(Math.random() * 20);

    devices.push({
      code: `${area.codePrefix}-${String(i).padStart(3, '0')}`,
      name: `${area.type} #${i}`,
      type: area.type,
      status,
      area: area.name,
      line: `${line}${Math.ceil(i / 10)}`,
      scenario,
      healthScore: baseHealth,
      oee: baseOEE,
      mtbf: Math.round(100 + Math.random() * 300),
      mttr: Math.round((0.5 + Math.random() * 4) * 10) / 10,
      priority: ['A', 'A', 'A', 'B', 'B', 'C'][i % 6],
    });
  }
  return devices;
}

export interface DeviceSeed {
  code: string; name: string; type: string; status: string;
  area: string; line: string; scenario: string;
  healthScore: number; oee: number; mtbf: number; mttr: number;
  priority: string;
}

// ── 生成 300 台设备 ──────────────────────────
export function generateAllDevices(): DeviceSeed[] {
  const metalDevices = metalAreas.flatMap((area) => generateDevicesForArea(area, SCENARIO_METAL, 'M'));
  const capDevices = capacitorAreas.flatMap((area) => generateDevicesForArea(area, SCENARIO_CAPACITOR, 'E'));
  return [...metalDevices, ...capDevices];
}

export async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  // Clean existing data
  await prisma.workLog.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.tooling.deleteMany();
  await prisma.improvementProject.deleteMany();
  await prisma.knowledgeEntry.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.device.deleteMany();
  await prisma.deviceType.deleteMany();

  // ── 设备类型主数据 ──────────────────────────
  const deviceTypeNames = [...SCENARIO_METAL_DEVICE_TYPES, ...SCENARIO_CAPACITOR_DEVICE_TYPES, '模具', '夹具', '刀具', '量具'];
  for (let i = 0; i < deviceTypeNames.length; i++) {
    await prisma.deviceType.create({
      data: { name: deviceTypeNames[i], code: `DT-${String(i + 1).padStart(3, '0')}`, sortOrder: i + 1 },
    });
  }
  console.log(`   设备类型: ${deviceTypeNames.length} 种`);

  // ── 设备 300 台 ─────────────────────────────
  const allDevices = generateAllDevices();
  const devices = await Promise.all(
    allDevices.map((d) =>
      prisma.device.create({
        data: {
          code: d.code, name: d.name, type: d.type,
          status: d.status, area: d.area, line: d.line,
          healthScore: d.healthScore, oee: d.oee,
          mtbf: d.mtbf, mttr: d.mttr,
          priority: d.priority,
          config: d.type === '注塑机'
            ? { tempRange: [180, 220], pressureRange: [80, 150] }
            : {},
        },
      })
    )
  );

  // ── 工单 50 条 ──────────────────────────────
  const statusOptions = ['pending', 'accepted', 'diagnosing', 'repairing', 'completed', 'completed', 'completed'];
  const priorityOptions = ['P0', 'P1', 'P1', 'P2', 'P2', 'P3'];
  const faultTypes = ['机械', '电气', '液压', '气动', '软件', '机械', '电气'];
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
  const repairers = ['张伟', '李强', '王磊', '陈明', '刘洋', '赵刚', '周浩', '孙健'];

  for (let i = 0; i < 50; i++) {
    const device = devices[i % devices.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);
    const status = statusOptions[i % statusOptions.length];
    const priority = priorityOptions[i % priorityOptions.length];
    const slaMin = { P0: 30, P1: 60, P2: 240, P3: 480 }[priority] || 240;
    const assignee = status !== 'pending' ? repairers[i % repairers.length] : null;

    await prisma.workOrder.create({
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
  }

  // ── 点检 15 条 ──────────────────────────────
  for (let i = 0; i < 15; i++) {
    const device = devices[i % devices.length];
    const hasAbnormal = i === 1 || i === 4 || i === 7 || i === 11;
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

  // ── 工治具 15 条 ────────────────────────────
  const toolingData = [
    { code: 'MOLD-A01', name: '前壳模具 A01', type: '模具', theoreticalLife: 500000, lifeUnit: 'cycles', lifeUsed: 320000 },
    { code: 'MOLD-A02', name: '后壳模具 A02', type: '模具', theoreticalLife: 500000, lifeUnit: 'cycles', lifeUsed: 180000 },
    { code: 'FIX-B01', name: 'CNC 夹具 B01', type: '夹具', theoreticalLife: 10000, lifeUnit: 'cycles', lifeUsed: 6500 },
    { code: 'FIX-B02', name: 'CNC 夹具 B02', type: '夹具', theoreticalLife: 10000, lifeUnit: 'cycles', lifeUsed: 9500 },
    { code: 'CUT-C01', name: 'PCD 刀具 C01', type: '刀具', theoreticalLife: 2000, lifeUnit: 'cycles', lifeUsed: 1800 },
    { code: 'CUT-C02', name: '硬质合金铣刀 C02', type: '刀具', theoreticalLife: 3000, lifeUnit: 'cycles', lifeUsed: 500 },
    { code: 'GAU-D01', name: '三坐标测头 D01', type: '量具', theoreticalLife: 5000, lifeUnit: 'cycles', lifeUsed: 4200 },
    { code: 'GAU-D02', name: '激光干涉仪 D02', type: '量具', theoreticalLife: 10000, lifeUnit: 'hours', lifeUsed: 3200 },
    { code: 'MOLD-A03', name: '装饰条模具 A03', type: '模具', theoreticalLife: 300000, lifeUnit: 'cycles', lifeUsed: 280000 },
    { code: 'FIX-B03', name: '焊接夹具 B03', type: '夹具', theoreticalLife: 20000, lifeUnit: 'cycles', lifeUsed: 8500 },
    { code: 'MOLD-A04', name: '插件模具 A04', type: '模具', theoreticalLife: 400000, lifeUnit: 'cycles', lifeUsed: 210000 },
    { code: 'CUT-C03', name: '金刚石刀具 C03', type: '刀具', theoreticalLife: 5000, lifeUnit: 'cycles', lifeUsed: 800 },
    { code: 'FIX-B04', name: '钉卷夹具 B04', type: '夹具', theoreticalLife: 15000, lifeUnit: 'cycles', lifeUsed: 7200 },
    { code: 'GAU-D03', name: '膜厚测试仪 D03', type: '量具', theoreticalLife: 8000, lifeUnit: 'hours', lifeUsed: 4500 },
    { code: 'MOLD-A05', name: '注塑模具 A05', type: '模具', theoreticalLife: 600000, lifeUnit: 'cycles', lifeUsed: 350000 },
  ];

  for (const td of toolingData) {
    await prisma.tooling.create({
      data: {
        ...td,
        status: ['in_use', 'in_stock', 'in_use', 'maintenance', 'in_use', 'in_stock', 'in_use', 'in_stock', 'repair', 'in_use', 'in_use', 'in_stock', 'in_use', 'in_stock', 'in_use'][toolingData.indexOf(td)],
        deviceId: devices[toolingData.indexOf(td) % devices.length].id,
        lifeRemaining: td.theoreticalLife ? td.theoreticalLife - td.lifeUsed : 0,
        healthScore: td.theoreticalLife ? Math.round((1 - td.lifeUsed / td.theoreticalLife) * 100) : 80,
        purchaseDate: new Date('2025-06-01'),
        purchaseCost: Math.round(5000 + Math.random() * 50000),
        location: `仓库-${td.type === '模具' ? 'A' : td.type === '夹具' ? 'B' : 'C'}区`,
      },
    });
  }

  // ── 知识条目 6 ──────────────────────────────
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

  // ── 改善项目 3 ──────────────────────────────
  await prisma.improvementProject.createMany({
    data: [
      { title: 'SMED 换型优化 - 注塑区', lossType: '换型/调整', currentValue: 45, targetValue: 20, unit: 'min', assignee: '张三', deadline: new Date('2026-06-30'), status: 'active', progress: 60, description: '通过快速换模工装和标准化操作流程，将注塑机换型时间从45分钟缩短至20分钟' },
      { title: 'CNC 加工区主轴精度恢复计划', lossType: '设备故障', currentValue: 12, targetValue: 3, unit: '次/月', assignee: '李四', deadline: new Date('2026-07-15'), status: 'active', progress: 30, description: '针对CNC加工区频繁主轴故障，实施预知性维护策略' },
      { title: 'TPM 点检体系优化', lossType: '设备故障', currentValue: 18, targetValue: 10, unit: '次/月', assignee: '王五', deadline: new Date('2026-06-20'), status: 'completed', progress: 100, description: '优化点检标准和频率，基于数据分析淘汰无效点检项' },
    ],
  });

  // ═══════════════════════════════════════════════
  // 企业层级 Demo 数据
  // ═══════════════════════════════════════════════
  const group = await prisma.organization.create({
    data: { code: 'GRP-01', name: 'Uantek 集团', level: 'group', sortOrder: 1, location: '浙江省温州市' },
  });

  const company = await prisma.organization.create({
    data: { code: 'CMP-01', name: 'Uantek 精密制造有限公司', level: 'company', parentId: group.id, sortOrder: 1, location: '温州市经济技术开发区' },
  });

  const workshopMetal = await prisma.organization.create({
    data: { code: 'WS-METAL', name: '金属加工车间', level: 'workshop', parentId: company.id, sortOrder: 1, location: 'A 栋 1F' },
  });
  const workshopCapacitor = await prisma.organization.create({
    data: { code: 'WS-CAP', name: '电解电容车间', level: 'workshop', parentId: company.id, sortOrder: 2, location: 'A 栋 2F' },
  });

  const linesMetal = [
    { code: 'LN-CNC', name: 'CNC 产线', workshopId: workshopMetal.id, sortOrder: 1 },
    { code: 'LN-LD', name: '冷墩产线', workshopId: workshopMetal.id, sortOrder: 2 },
    { code: 'LN-YM', name: '研磨产线', workshopId: workshopMetal.id, sortOrder: 3 },
    { code: 'LN-ZS', name: '注塑产线', workshopId: workshopMetal.id, sortOrder: 4 },
    { code: 'LN-JG', name: '激光切割产线', workshopId: workshopMetal.id, sortOrder: 5 },
    { code: 'LN-WZ', name: '弯折产线', workshopId: workshopMetal.id, sortOrder: 6 },
    { code: 'LN-WG', name: '外观检测产线', workshopId: workshopMetal.id, sortOrder: 7 },
  ];
  const linesCap = [
    { code: 'LN-CQ', name: '裁切产线', workshopId: workshopCapacitor.id, sortOrder: 1 },
    { code: 'LN-DJ', name: '钉卷产线', workshopId: workshopCapacitor.id, sortOrder: 2 },
    { code: 'LN-RK', name: '入壳产线', workshopId: workshopCapacitor.id, sortOrder: 3 },
    { code: 'LN-TG', name: '套管产线', workshopId: workshopCapacitor.id, sortOrder: 4 },
    { code: 'LN-LH', name: '老化产线', workshopId: workshopCapacitor.id, sortOrder: 5 },
    { code: 'LN-BZ', name: '包装产线', workshopId: workshopCapacitor.id, sortOrder: 6 },
  ];

  const allLines = [...linesMetal, ...linesCap];
  for (const l of allLines) {
    await prisma.organization.create({
      data: { code: l.code, name: l.name, level: 'line', parentId: l.workshopId, sortOrder: l.sortOrder },
    });
  }

  // Link some devices to the org hierarchy
  const metalLines = await prisma.organization.findMany({ where: { parentId: workshopMetal.id }, orderBy: { sortOrder: 'asc' } });
  const capLines = await prisma.organization.findMany({ where: { parentId: workshopCapacitor.id }, orderBy: { sortOrder: 'asc' } });
  const metalDevicesList = await prisma.device.findMany({ where: { type: { in: SCENARIO_METAL_DEVICE_TYPES } } });
  const capDevicesList = await prisma.device.findMany({ where: { type: { in: SCENARIO_CAPACITOR_DEVICE_TYPES } } });

  // Map device types to line index
  const typeToLineIdx: Record<string, number> = {
    'CNC': 0, '冷墩机': 1, '研磨机': 2, '注塑机': 3, '激光切割机': 4, '大型弯折机': 5, '全自动外观机': 6,
  };
  const typeToLineCap: Record<string, number> = {
    '裁切机': 0, '钉卷机': 1, '入壳机': 2, '套管机': 3, '老化设备': 4, '自动包装机': 5,
  };

  for (const d of metalDevicesList) {
    const idx = typeToLineIdx[d.type] ?? Math.floor(Math.random() * metalLines.length);
    if (metalLines[idx]) {
      await prisma.device.update({
        where: { id: d.id },
        data: { workshopId: workshopMetal.id, lineId: metalLines[idx].id },
      });
    }
  }
  for (const d of capDevicesList) {
    const idx = typeToLineCap[d.type] ?? Math.floor(Math.random() * capLines.length);
    if (capLines[idx]) {
      await prisma.device.update({
        where: { id: d.id },
        data: { workshopId: workshopCapacitor.id, lineId: capLines[idx].id },
      });
    }
  }

  const metalCount = allDevices.filter(d => d.scenario === SCENARIO_METAL).length;
  const capCount = allDevices.filter(d => d.scenario === SCENARIO_CAPACITOR).length;
  console.log(`✅ Demo data seeded: ${devices.length} devices, 50 work orders, 15 inspections, 15 toolings, 6 knowledge entries, 3 projects`);
  console.log(`   金属加工: ${metalCount}台 · 电解电容: ${capCount}台`);
  console.log(`   🏗 企业层级: 1 集团 → 1 公司 → 2 车间 → ${allLines.length} 产线`);
}

// Device type constants (mirrored from routes/devices.ts)
const SCENARIO_METAL_DEVICE_TYPES = ['CNC', '冷墩机', '研磨机', '注塑机', '激光切割机', '大型弯折机', '全自动外观机'];
const SCENARIO_CAPACITOR_DEVICE_TYPES = ['裁切机', '钉卷机', '入壳机', '套管机', '老化设备', '自动包装机'];

// Allow running directly
const isMainModule = process.argv[1]?.includes('seed');
if (isMainModule) {
  seedDemoData()
    .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
