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
  await prisma.rcaAnalysis.deleteMany();
  await prisma.team.deleteMany();
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
  const statusOptions = ['pending', 'accepted', 'diagnosing', 'repairing', 'verifying', 'completed', 'completed'];
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
    const handler = ['diagnosing', 'repairing', 'verifying', 'completed'].includes(status) ? repairers[(i + 1) % repairers.length] : null;
    const reviewer = ['verifying', 'completed'].includes(status) ? repairers[(i + 2) % repairers.length] : null;

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
        handlerId: handler,
        reviewerId: reviewer,
        completedBy: status === 'completed' ? repairers[i % repairers.length] : null,
        slaResponseMin: 15,
        slaRepairMin: slaMin,
        slaDeadline: new Date(createdAt.getTime() + slaMin * 60 * 1000),
        respondedAt: status !== 'pending' ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
        actualStartAt: ['diagnosing', 'repairing', 'verifying', 'completed'].includes(status)
          ? new Date(createdAt.getTime() + 15 * 60 * 1000) : null,
        verifiedAt: ['verifying', 'completed'].includes(status)
          ? new Date(createdAt.getTime() + 45 * 60 * 1000) : null,
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

  // ── 知识条目 ──────────────────────────────────
  await prisma.knowledgeEntry.createMany({
    data: [
      // ========== 故障案例 (type: case) ==========
      {
        type: 'case', title: '海天注塑机 MA2500 合模异响及飞边问题',
        equipmentType: '注塑机', faultPart: '合模机构', severity: 'P2', faultType: '液压',
        symptom: '合模过程中听到金属撞击声，产品边缘出现 0.5mm 飞边。异响随合模速度增大而加剧。',
        cause: '液压锁紧压力设定值偏低（标准 120bar，实际 85bar），且锁紧块磨损导致间隙过大（实测 0.3mm，标准 ≤0.08mm）。',
        solution: '1. 检查液压站压力表，发现溢流阀设定值偏移\n2. 重新调整溢流阀至 120bar\n3. 更换磨损锁紧块（左右各一）\n4. 安装新垫片调整间隙至 0.05mm\n5. 试运行 20 个循环确认无异响',
        prevention: '每月检查锁紧块磨损量，纳入点检表。每季度检测液压系统压力。',
        content: { spareParts: [{ part_id: 'SP-001', name: '锁紧块', qty: 2 }, { part_id: 'SP-002', name: '垫片', qty: 1 }] },
        tags: ['合模异响', '飞边', '锁紧块', '液压压力'], status: 'approved', author: '张工',
        views: 128, createdAt: new Date('2026-06-10'),
      },
      {
        type: 'case', title: 'CNC 主轴轴承温升过高报警',
        equipmentType: 'CNC加工中心', faultPart: '主轴', severity: 'P1', faultType: '机械',
        symptom: '主轴运行 30 分钟后温度超过 65°C 报警，轴承座处手摸烫手，振动值从 2.1mm/s 升至 6.8mm/s。',
        cause: '主轴前轴承润滑脂干涸，保持架磨损产生金属碎屑，导致轴承运转阻力增大、发热严重。',
        solution: '1. 停机冷却 2 小时\n2. 拆卸主轴护套，检查轴承外观\n3. 清除轴承内金属碎屑\n4. 加注专用主轴润滑脂（SKF LGHP 2/5）\n5. 手动旋转确认顺畅后重新装配\n6. 试运行监测温度 1 小时，稳定在 42°C',
        prevention: '主轴轴承每 2000 小时更换润滑脂，建立润滑台账。每日点检记录主轴温度。',
        content: { spareParts: [{ part_id: 'SP-003', name: '主轴润滑脂', qty: 1, unit: '支' }] },
        tags: ['CNC', '主轴', '轴承高温', '润滑'], status: 'approved', author: '李工',
        views: 95, createdAt: new Date('2026-06-08'),
      },
      {
        type: 'case', title: '空压机油气分离器堵塞导致排气压力不足',
        equipmentType: '空压机', faultPart: '气动系统', severity: 'P2', faultType: '机械',
        symptom: '空压机排气压力从 0.8MPa 下降至 0.5MPa，加载时间延长至正常的 2 倍，油气分离器压差达到 0.12bar。',
        cause: '油气分离滤芯使用超过 4000 小时（建议更换周期 2000 小时），滤芯严重堵塞。',
        solution: '1. 停机泄压\n2. 更换油气分离滤芯（型号：SA-22A）\n3. 更换空气滤清器\n4. 检查并清洁冷却器翅片\n5. 启动测试，排气压力恢复至 0.78MPa',
        prevention: '严格执行油气分离器每 2000 小时更换制度。安装压差传感器实时监测。',
        content: { spareParts: [{ part_id: 'SP-004', name: '油气分离滤芯 SA-22A', qty: 1 }, { part_id: 'SP-005', name: '空气滤清器', qty: 1 }] },
        tags: ['空压机', '排气压力', '油气分离器'], status: 'approved', author: '王工',
        views: 76, createdAt: new Date('2026-06-05'),
      },
      {
        type: 'case', title: 'AGV 导航定位偏移导致运输路径偏离',
        equipmentType: 'AGV', faultPart: '控制系统', severity: 'P1', faultType: '电气',
        symptom: 'AGV 在 3 号工位转弯时定位偏差达 15cm，触发安全激光急停，影响产线物料配送。',
        cause: '驱动轮编码器信号受变频器干扰导致脉冲丢失，导航控制器累计定位误差超限。',
        solution: '1. 检查编码器电缆屏蔽层接地，发现接地线脱落\n2. 重新焊接屏蔽接地线\n3. 在编码器信号线加装磁环滤波器\n4. 重新标定导航原点\n5. 连续运行 10 圈确认定位精度 ±2cm',
        prevention: '编码器电缆定期检查（每月）。AGV 导航精度每周校准一次。',
        content: { spareParts: [{ part_id: 'SP-006', name: '磁环滤波器', qty: 2 }, { part_id: 'SP-007', name: '编码器电缆组件', qty: 1 }] },
        tags: ['AGV', '导航偏移', '编码器', '干扰'], status: 'approved', author: '陈工',
        views: 112, createdAt: new Date('2026-06-03'),
      },
      {
        type: 'case', title: '注塑机螺杆卡死无法转动',
        equipmentType: '注塑机', faultPart: '机械结构', severity: 'P0', faultType: '机械',
        symptom: '注塑机熔胶时螺杆无法转动，电机过载报警，手动盘车完全卡死。',
        cause: '料筒温度传感器故障导致实际温度远低于设定值（设定 230°C，实际 140°C），塑料未充分熔融堵塞螺杆槽。',
        solution: '1. 紧急停机并挂牌\n2. 检查料筒各段温度传感器，发现第二段热电偶开路\n3. 更换热电偶（型号：K 型 300mm）\n4. 用加热棒对料筒局部加热至 250°C\n5. 手动缓慢盘车松动螺杆\n6. 排空料筒内余料\n7. 重新升温后恢复正常生产',
        prevention: '温度传感器每日点检。建立传感器定期校准计划（每季度）。',
        content: { spareParts: [{ part_id: 'SP-008', name: 'K型热电偶 300mm', qty: 1 }] },
        tags: ['注塑机', '螺杆卡死', '温度传感器', 'P0'], status: 'approved', author: '周工',
        views: 203, createdAt: new Date('2026-05-28'),
      },
      {
        type: 'case', title: 'CNC 刀库乱刀故障',
        equipmentType: 'CNC加工中心', faultPart: '电气控制', severity: 'P2', faultType: '电气',
        symptom: '自动换刀时刀库乱转，无法正确抓取目标刀具，报警代码 ATC-003。',
        cause: '刀库计数器接近开关感应距离偏移（标准 2mm，实际 4.5mm），导致刀具计数丢失。',
        solution: '1. 手动复位刀库至 1 号刀位\n2. 检查接近开关安装位置，发现固定螺丝松动\n3. 重新调整接近开关至 2mm 感应距离\n4. 紧固螺丝并点胶防松\n5. 执行刀库校准程序，所有刀具对位确认',
        prevention: '接近开关每月检查紧固状态。换刀机构每季度润滑保养。',
        content: { spareParts: [{ part_id: 'SP-009', name: '接近开关 PNP-NO', qty: 1 }] },
        tags: ['CNC', '刀库', '乱刀', '接近开关'], status: 'approved', author: '李工',
        views: 67, createdAt: new Date('2026-05-25'),
      },
      {
        type: 'case', title: '液压站油温过高导致系统停机',
        equipmentType: '注塑机', faultPart: '液压系统', severity: 'P2', faultType: '液压',
        symptom: '液压站油温持续上升至 65°C（报警阈值），系统自动停机保护。',
        cause: '液压油冷却器水侧结垢严重，冷却效率下降约 40%。油箱油位偏低，循环散热不足。',
        solution: '1. 检查冷却水流量，发现仅为正常值的 60%\n2. 拆卸冷却器，用 5% 草酸溶液清洗水侧通道\n3. 补充液压油至标准油位\n4. 清洗油箱呼吸器\n5. 开机测试，油温稳定在 48°C',
        prevention: '冷却器每半年清洗一次。液压油每季度检测理化指标。建立油温监控预警。',
        content: { spareParts: [{ part_id: 'SP-010', name: '液压油 46#', qty: 20, unit: '升' }] },
        tags: ['液压站', '油温过高', '冷却器', '液压油'], status: 'pending', author: '张工',
        views: 45, createdAt: new Date('2026-06-12'),
      },
      {
        type: 'case', title: '激光切割机光路偏移导致切割不良',
        equipmentType: '激光切割机', faultPart: '光学系统', severity: 'P1', faultType: '机械',
        symptom: '切割边缘出现 0.3mm 斜度，切缝宽度不均匀，焦点位置偏移约 2mm。',
        cause: '切割头保护镜片污染，激光透过率下降约 15%。聚焦镜安装座因振动松动。',
        solution: '1. 检查光路，用透光率检测仪确认保护镜片污染\n2. 更换保护镜片\n3. 检查聚焦镜座紧固螺丝并重新拧紧\n4. 重新校准焦点位置\n5. 试切确认切缝垂直度达标',
        prevention: '保护镜片每日检视，每周清洁或更换。切割头固定螺丝每月检查。',
        content: { spareParts: [{ part_id: 'SP-011', name: '保护镜片 30mm', qty: 1 }, { part_id: 'SP-012', name: '聚焦镜', qty: 1 }] },
        tags: ['激光切割', '光路偏移', '切割不良', '保护镜片'], status: 'approved', author: '赵工',
        views: 88, createdAt: new Date('2026-05-20'),
      },

      // ========== 新增故障案例 (电容车间设备) ==========
      {
        type: 'case', title: '裁切机送料偏移导致裁切尺寸超差',
        equipmentType: '裁切机', faultPart: '送料机构', severity: 'P2', faultType: '机械',
        symptom: '裁切长度出现周期性偏差，波动范围 ±0.8mm（标准 ±0.3mm），产品不合格率升至 12%。',
        cause: '送料辊压紧弹簧疲劳松动，导致送料过程中铝箔打滑，送料长度不稳定。',
        solution: '1. 停机检查送料辊压紧机构\n2. 测量弹簧自由长度，发现已缩短 3mm（标准 50mm）\n3. 更换压紧弹簧\n4. 调整压紧力至 25N\n5. 试裁 50 片确认尺寸精度恢复至 ±0.2mm',
        prevention: '送料辊压紧弹簧每 3 个月检查更换。送料精度每日首件确认。',
        content: { spareParts: [{ part_id: 'SP-013', name: '压紧弹簧', qty: 2 }, { part_id: 'SP-014', name: '送料辊胶套', qty: 1 }] },
        tags: ['裁切机', '送料偏移', '尺寸超差', '压紧弹簧'], status: 'approved', author: '黄工',
        views: 82, createdAt: new Date('2026-06-11'),
      },
      {
        type: 'case', title: '钉卷机铝箔跑偏导致产品报废',
        equipmentType: '钉卷机', faultPart: '送箔机构', severity: 'P1', faultType: '机械',
        symptom: '钉卷过程中铝箔向左偏移 1.5mm，导致芯子卷绕不整齐，批量报废约 200 只。',
        cause: '送箔导轮轴承磨损产生径向跳动 0.1mm，导轮表面粘附胶渍导致铝箔跑偏。',
        solution: '1. 拆卸送箔导轮检查，发现轴承已磨损发卡\n2. 更换导轮轴承（型号：695ZZ）\n3. 用丙酮清洁导轮表面胶渍\n4. 重新校准导轮平行度\n5. 连续运行 30 分钟确认走箔正常',
        prevention: '导轮轴承每半年更换。导轮表面每日清洁并检查有无胶渍。',
        content: { spareParts: [{ part_id: 'SP-015', name: '导轮轴承 695ZZ', qty: 2 }, { part_id: 'SP-016', name: '工业丙酮', qty: 1, unit: '瓶' }] },
        tags: ['钉卷机', '铝箔跑偏', '导轮轴承', '产品报废'], status: 'approved', author: '刘工',
        views: 96, createdAt: new Date('2026-06-07'),
      },
      {
        type: 'case', title: '入壳机入壳不到位导致芯包破损',
        equipmentType: '入壳机', faultPart: '机械结构', severity: 'P1', faultType: '机械',
        symptom: '入壳机在将芯包推入铝壳时阻力异常，约 8% 的芯包入壳不到位导致铝壳变形。',
        cause: '推杆直线轴承磨损，推杆运动轨迹偏移 0.3mm，导致芯包与铝壳中心不对中。',
        solution: '1. 检查推杆直线轴承间隙，发现磨损量达 0.15mm\n2. 更换推杆直线轴承（型号：LM8UU）\n3. 清洁推杆表面并涂抹润滑脂\n4. 调整推杆与铝壳夹具的同轴度至 0.05mm\n5. 试产 100 只确认良率恢复至 99.5%',
        prevention: '直线轴承每季度检查更换。推杆同轴度每月校准一次。',
        content: { spareParts: [{ part_id: 'SP-017', name: '直线轴承 LM8UU', qty: 2 }, { part_id: 'SP-018', name: '润滑脂', qty: 1, unit: '支' }] },
        tags: ['入壳机', '入壳不到位', '直线轴承', '芯包破损'], status: 'approved', author: '何工',
        views: 73, createdAt: new Date('2026-06-02'),
      },
      {
        type: 'case', title: '套管机热收缩温度异常导致套管不良',
        equipmentType: '套管机', faultPart: '加热系统', severity: 'P2', faultType: '电气',
        symptom: '热收缩套管加热后收缩不均匀，一端收缩过度而另一端收缩不足，不良率约 15%。',
        cause: '加热管老化导致加热区温度分布不均，实测左端 180°C、右端 220°C（设定 200°C）。',
        solution: '1. 用红外测温枪检测加热区温度分布\n2. 发现左端加热管阻值偏大（实测 85Ω，标准 50Ω）\n3. 更换左侧加热管（规格：220V/500W）\n4. 重新测试温度分布，左右温差 ≤5°C\n5. 调整温控 PID 参数优化响应速度',
        prevention: '加热管每 2000 小时检测阻值。温度均匀性每月用测温纸检测。',
        content: { spareParts: [{ part_id: 'SP-019', name: '加热管 220V/500W', qty: 1 }] },
        tags: ['套管机', '热收缩', '温度异常', '加热管'], status: 'approved', author: '吴工',
        views: 58, createdAt: new Date('2026-05-30'),
      },
      {
        type: 'case', title: '老化设备温度均匀性超标',
        equipmentType: '老化设备', faultPart: '加热系统', severity: 'P2', faultType: '电气',
        symptom: '老化柜内 9 点温度检测显示最大温差达 12°C（标准 ≤5°C），影响产品老化效果。',
        cause: '循环风机皮带松弛导致转速下降约 20%，柜内热空气循环不良形成温度死角。',
        solution: '1. 检查循环风机皮带张紧度，发现皮带松弛可压下 15mm（标准 ≤8mm）\n2. 调整电机安装座张紧皮带至标准张力\n3. 清洁风机叶轮表面积尘\n4. 重新检测 9 点温度，最大温差降至 3.5°C\n5. 校准各层温度传感器',
        prevention: '风机皮带每月检查张紧度。风机叶轮每季度清洁。温度均匀性每周检测。',
        content: { spareParts: [{ part_id: 'SP-020', name: '风机皮带', qty: 1 }, { part_id: 'SP-021', name: '温度传感器 PT100', qty: 2 }] },
        tags: ['老化设备', '温度均匀性', '风机皮带', '温度死角'], status: 'pending', author: '郑工',
        views: 41, createdAt: new Date('2026-06-13'),
      },
      {
        type: 'case', title: '自动包装机封口不严导致漏气',
        equipmentType: '自动包装机', faultPart: '封口机构', severity: 'P2', faultType: '机械',
        symptom: '包装袋封口处出现微小气孔，密封性测试合格率仅 82%，产品保质期受影响。',
        cause: '封口铜块表面粘附碳化塑料残留物，导致封口时局部温度偏低、压力不均。',
        solution: '1. 停机降温后拆卸封口铜块\n2. 用细砂纸（600目）打磨铜块表面去除碳化物\n3. 用无水酒精清洁铜块\n4. 重新装配并调整封口压力至 0.4MPa\n5. 封口温度设定调整为 180°C±5°C\n6. 连续封口 100 袋测试，合格率升至 97%',
        prevention: '封口铜块每日下班前清洁。封口质量每 2 小时抽检一次。',
        content: { spareParts: [{ part_id: 'SP-022', name: '封口铜块', qty: 1 }, { part_id: 'SP-023', name: '耐高温防粘布', qty: 2 }] },
        tags: ['自动包装机', '封口不严', '漏气', '封口铜块'], status: 'approved', author: '钱工',
        views: 69, createdAt: new Date('2026-05-22'),
      },
      // ========== 新增故障案例 (金属车间设备) ==========
      {
        type: 'case', title: '大型弯折机折弯角度偏差超出公差',
        equipmentType: '大型弯折机', faultPart: '机械结构', severity: 'P2', faultType: '机械',
        symptom: '弯折 90° 角时实际角度 88.5°~91.2° 波动，超出 ±0.5° 公差要求。',
        cause: '弯折滑块导轨磨损，滑块与导轨间隙达 0.12mm（标准 ≤0.03mm），导致滑块运动轨迹不稳定。',
        solution: '1. 用塞尺检测滑块导轨间隙，确认各点间隙不均匀\n2. 拆卸滑块检查导轨磨损状态\n3. 研磨导轨修复磨损面\n4. 更换滑块耐磨片\n5. 重新装配并调整间隙至 0.02mm\n6. 试弯 20 件确认角度稳定在 90°±0.3°',
        prevention: '导轨每季度检测磨损量，加注润滑脂。滑块耐磨片每年更换。',
        content: { spareParts: [{ part_id: 'SP-024', name: '滑块耐磨片', qty: 2 }, { part_id: 'SP-025', name: '导轨润滑脂', qty: 1, unit: '支' }] },
        tags: ['大型弯折机', '折弯角度', '导轨磨损', '滑块'], status: 'approved', author: '孙工',
        views: 54, createdAt: new Date('2026-05-18'),
      },
      {
        type: 'case', title: '研磨机主轴振动超标导致工件表面振纹',
        equipmentType: '研磨机', faultPart: '主轴', severity: 'P1', faultType: '机械',
        symptom: '加工工件表面出现明显振纹，Ra 值从 0.4μm 恶化至 1.2μm，主轴振动值达 9.5mm/s。',
        cause: '主轴皮带轮动平衡块脱落，导致高速旋转时不平衡离心力引发共振。',
        solution: '1. 用振动分析仪检测主轴频谱，发现 1 倍频分量异常\n2. 检查皮带轮发现平衡块脱落位置\n3. 拆卸皮带轮做动平衡校正（G2.5 级）\n4. 重新装配并检查皮带张紧力\n5. 试磨工件检测表面质量恢复至 Ra 0.4μm',
        prevention: '主轴皮带轮每半年做一次动平衡检测。主轴振动每月例行监测。',
        content: { spareParts: [{ part_id: 'SP-026', name: '平衡块套装', qty: 1 }, { part_id: 'SP-027', name: '三角皮带', qty: 2 }] },
        tags: ['研磨机', '主轴振动', '振纹', '动平衡'], status: 'approved', author: '马工',
        views: 91, createdAt: new Date('2026-05-12'),
      },
      {
        type: 'case', title: '冷墩机冲头润滑不良导致卡死',
        equipmentType: '冷墩机', faultPart: '润滑系统', severity: 'P1', faultType: '机械',
        symptom: '冷墩机高速运转中冲头突然卡死，电机过载保护跳闸，冲头表面出现拉伤痕迹。',
        cause: '润滑油管路接头松动导致润滑油泄漏，冲头导套处于干摩擦状态，温度升高后发生热咬合。',
        solution: '1. 手动盘车确认冲头卡死位置\n2. 拆卸冲头和导套检查损伤程度\n3. 用细油石打磨冲头拉伤部位\n4. 更换冲头导套\n5. 检查润滑管路发现接头松动，重新紧固并补加润滑油\n6. 调整润滑油流量至 5 滴/分钟\n7. 试运行 30 分钟确认润滑正常',
        prevention: '润滑管路每日巡检。润滑油流量每班次确认。冲头导套每 500 小时更换。',
        content: { spareParts: [{ part_id: 'SP-028', name: '冲头导套', qty: 1 }, { part_id: 'SP-029', name: '润滑油 68#', qty: 5, unit: '升' }] },
        tags: ['冷墩机', '冲头卡死', '润滑不良', '干摩擦'], status: 'approved', author: '高工',
        views: 107, createdAt: new Date('2026-05-08'),
      },
      {
        type: 'case', title: '全自动外观机检测误判率异常升高',
        equipmentType: '全自动外观机', faultPart: '视觉系统', severity: 'P2', faultType: '电气',
        symptom: '外观检测机误判率从 2% 升至 15%，大量良品被误判为不良品，需人工复检。',
        cause: '相机镜头表面沾染油污，导致图像对比度下降 30%，AI 检测模型置信度阈值触发频繁。',
        solution: '1. 用专用镜头清洁纸擦拭镜头表面\n2. 用标准校准板重新标定相机白平衡和对焦\n3. 检查光源亮度，发现 LED 光源衰减约 20%\n4. 更换 LED 光源模组\n5. 重新采集 500 张图像训练更新检测模型\n6. 验证误判率恢复至 1.8%',
        prevention: '相机镜头每日开机前清洁。光源亮度每月检测。校准板每周标定一次。',
        content: { spareParts: [{ part_id: 'SP-030', name: 'LED 光源模组', qty: 1 }, { part_id: 'SP-031', name: '校准板', qty: 1 }] },
        tags: ['外观机', '误判', '镜头污染', '视觉检测'], status: 'approved', author: '杨工',
        views: 63, createdAt: new Date('2026-04-25'),
      },
      {
        type: 'case', title: 'CNC 切削液泄漏导致车间地面湿滑',
        equipmentType: 'CNC加工中心', faultPart: '辅助系统', severity: 'P3', faultType: '其他',
        symptom: 'CNC-023 设备底部大量切削液泄漏，每小时约损失 3 升，车间地面存在滑倒隐患。',
        cause: '切削液回液管路接头密封圈老化破损，高压切削液从接头处喷射泄漏。',
        solution: '1. 停机停泵，排空管路残余切削液\n2. 检查回液管路所有接头，发现 2 处密封圈破损\n3. 更换密封圈（材质：氟橡胶）\n4. 重新连接接头并紧固至规定扭矩 15Nm\n5. 开机试运行 1 小时确认无泄漏\n6. 清理地面切削液并铺设防滑垫',
        prevention: '切削液管路密封圈每半年更换。每日巡检设备底部有无泄漏痕迹。',
        content: { spareParts: [{ part_id: 'SP-032', name: '氟橡胶密封圈', qty: 5 }, { part_id: 'SP-033', name: '切削液', qty: 20, unit: '升' }] },
        tags: ['CNC', '切削液泄漏', '密封圈', 'P3'], status: 'approved', author: '李工',
        views: 35, createdAt: new Date('2026-04-15'),
      },
      {
        type: 'case', title: '注塑机模具顶针断裂导致产品粘模',
        equipmentType: '注塑机', faultPart: '模具', severity: 'P0', faultType: '机械',
        symptom: '注塑完成后产品无法从动模侧脱落，顶出时发出异响，发现 3 根顶针断裂。',
        cause: '顶针板复位弹簧断裂导致顶针板回位不到位，合模时顶针与定模干涉导致过载断裂。',
        solution: '1. 紧急停机，手动盘车将模具打开\n2. 拆卸动模检查顶针板状态\n3. 取出断裂顶针，检查顶针孔有无损伤\n4. 更换 3 根新顶针（规格：Φ4×200mm）\n5. 更换复位弹簧\n6. 重新装配并调整顶出行程至 50mm\n7. 慢速合模确认顶针复位正常\n8. 试产 20 模确认脱模正常',
        prevention: '顶针复位弹簧每 10 万模次更换。顶针磨损每季度检查。模具定期保养。',
        content: { spareParts: [{ part_id: 'SP-034', name: '顶针 Φ4×200mm', qty: 3 }, { part_id: 'SP-035', name: '复位弹簧', qty: 2 }] },
        tags: ['注塑机', '模具', '顶针断裂', '粘模', 'P0'], status: 'approved', author: '周工',
        views: 188, createdAt: new Date('2026-04-10'),
      },

      // ========== 标准作业程序 (type: sop) ==========
      {
        type: 'sop', title: 'CNC 主轴轴承更换标准作业程序 v3.0',
        equipmentType: 'CNC加工中心', faultPart: '主轴',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '本 SOP 适用于 CNC 加工中心主轴前/后轴承更换作业。作业前必须断电挂牌。',
        content: {
          tools_required: ['扭矩扳手（5-50Nm）', '拉马（三爪）', '铜棒', '清洗剂（CRC）', '千分表', '轴承加热器', '专用套筒'],
          safety_warnings: ['断电挂牌，确认主电源已切断', '佩戴护目镜和防割手套', '轴承加热时防止烫伤', '起吊主轴组件注意安全'],
          steps: [
            { step_no: 1, description: '拆卸主轴护罩及冷却管接头', image_url: null, notes: '注意螺丝规格，分类放置' },
            { step_no: 2, description: '用千分表检测主轴跳动并记录', image_url: null, notes: '记录原始数据用于对比' },
            { step_no: 3, description: '使用拉马拆卸主轴前轴承', image_url: null, notes: '均匀受力，避免损坏主轴颈' },
            { step_no: 4, description: '清洁轴承座内孔及主轴颈', image_url: null, notes: '使用无纺布和清洗剂，确保无杂质' },
            { step_no: 5, description: '用轴承加热器将新轴承加热至 110°C', image_url: null, notes: '严禁用火焰直接加热' },
            { step_no: 6, description: '安装新轴承至主轴', image_url: null, notes: '趁热安装，到位后自然冷却' },
            { step_no: 7, description: '加注专用润滑脂 SKF LGHP 2/5', image_url: null, notes: '加注量为轴承空间的 30%-40%' },
            { step_no: 8, description: '重新装配并调整轴承预紧力', image_url: null, notes: '预紧扭矩按厂家手册 25Nm' },
          ],
          parameters: { torque_value: '25 Nm（预紧）', grease_type: 'SKF LGHP 2/5', bearing_clearance: 'C3 级' },
        },
        tags: ['CNC', '主轴轴承', '更换SOP', 'v3.0'], status: 'approved', author: '李主管',
        views: 210, createdAt: new Date('2026-05-15'),
      },
      {
        type: 'sop', title: '注塑机螺杆拆卸与清洁标准作业',
        equipmentType: '注塑机', faultPart: '机械结构',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '适用于注塑机螺杆拆卸检查、清洁及回装的全流程操作。更换材料或停机超过 7 天建议执行。',
        content: {
          tools_required: ['螺杆拆卸专用工具', '铜刷', '高温清洗剂', '千分尺', '内窥镜', '吊装带'],
          safety_warnings: ['料筒温度必须降至 100°C 以下方可操作', '佩戴耐高温手套和护目镜', '吊装时确保螺杆固定牢固', '清洗剂需在通风处使用'],
          steps: [
            { step_no: 1, description: '将料筒温度升至 240°C 排空余料', image_url: null, notes: '使用 PP 料或专用清洗料' },
            { step_no: 2, description: '关闭加热，等待料筒降温至 80°C', image_url: null, notes: '降温过程约 40-60 分钟' },
            { step_no: 3, description: '拆卸射嘴、法兰连接螺栓', image_url: null, notes: '高温螺栓注意防烫' },
            { step_no: 4, description: '使用专用工具抽出螺杆', image_url: null, notes: '水平抽出，防止螺杆弯曲' },
            { step_no: 5, description: '检查螺杆磨损情况并记录', image_url: null, notes: '重点检查螺纹棱磨损和镀层' },
            { step_no: 6, description: '用铜刷和清洗剂清洁螺杆', image_url: null, notes: '禁止使用钢刷，防止损伤表面' },
            { step_no: 7, description: '检查料筒内壁（内窥镜）', image_url: null, notes: '记录磨损和划痕位置' },
            { step_no: 8, description: '回装螺杆并紧固连接螺栓', image_url: null, notes: '按对角线顺序紧固，扭矩 120Nm' },
          ],
          parameters: { barrel_temp: '80°C（拆卸温度）', bolt_torque: '120 Nm', cleaning_agent: '高温螺杆清洗剂' },
        },
        tags: ['注塑机', '螺杆清洁', '拆卸SOP'], status: 'approved', author: '周工',
        views: 156, createdAt: new Date('2026-04-20'),
      },
      {
        type: 'sop', title: '空压机日常点检标准作业',
        equipmentType: '空压机', faultPart: null,
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '本 SOP 为空压机每日开机前/后的点检标准，操作员应逐项确认并签字。',
        content: {
          tools_required: ['点检表', '测温枪', '听诊棒', '手电筒'],
          safety_warnings: ['点检前确认设备已停机卸压', '勿触碰高温管路', '电气柜操作需戴绝缘手套'],
          steps: [
            { step_no: 1, description: '检查油位是否在标准线范围内', image_url: null, notes: '油位应在上下刻度线之间' },
            { step_no: 2, description: '检查油气分离器压差表', image_url: null, notes: '压差＞0.08bar 需关注' },
            { step_no: 3, description: '检查冷却水流量及水温', image_url: null, notes: '进水温度≤32°C，出水≤45°C' },
            { step_no: 4, description: '检查气管路有无泄漏', image_url: null, notes: '用听诊棒检查接头处' },
            { step_no: 5, description: '启动后检查排气压力及温度', image_url: null, notes: '排气压力 0.7-0.8MPa，温度≤105°C' },
            { step_no: 6, description: '记录运行参数至点检表', image_url: null, notes: '发现异常及时上报' },
          ],
          parameters: { oil_level: '上下刻度线之间', exhaust_pressure: '0.7-0.8 MPa', exhaust_temp: '≤105°C', coolant_inlet: '≤32°C' },
        },
        tags: ['空压机', '日常点检', '保养SOP'], status: 'approved', author: '王工',
        views: 178, createdAt: new Date('2026-03-10'),
      },
      {
        type: 'sop', title: 'AGV 锂电池更换作业指导书',
        equipmentType: 'AGV', faultPart: null,
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '当 AGV 电池续航低于原始容量 60% 或出现充电异常时，执行电池更换作业。',
        content: {
          tools_required: ['绝缘手套', '万用表', '专用电池搬运车', '扭矩扳手', '防静电手腕带'],
          safety_warnings: ['必须穿戴绝缘手套和护目镜', '更换前确认 AGV 已完全断电', '旧电池需放入专用回收箱', '严禁短路电池正负极'],
          steps: [
            { step_no: 1, description: '将 AGV 开至指定维修区并关闭电源', image_url: null, notes: '确认急停开关已按下' },
            { step_no: 2, description: '断开电池连接器并测量开路电压', image_url: null, notes: '记录旧电池电压数据' },
            { step_no: 3, description: '松开电池固定螺栓，取出旧电池', image_url: null, notes: '使用专用搬运车，注意重心' },
            { step_no: 4, description: '清洁电池仓及连接器触点', image_url: null, notes: '使用无水酒精擦拭' },
            { step_no: 5, description: '装入新电池并紧固固定螺栓', image_url: null, notes: '螺栓扭矩 8Nm' },
            { step_no: 6, description: '连接电池连接器并测量电压确认', image_url: null, notes: '确认电压在 48V±2V 范围内' },
            { step_no: 7, description: '开机自检并执行导航校准', image_url: null, notes: '需运行 3 圈自检程序' },
          ],
          parameters: { battery_voltage: '48V ±2V', bolt_torque: '8 Nm', battery_type: '磷酸铁锂 48V/80Ah' },
        },
        tags: ['AGV', '电池更换', '维修SOP'], status: 'approved', author: '陈工',
        views: 89, createdAt: new Date('2026-05-05'),
      },
      {
        type: 'sop', title: '液压系统年度保养标准作业',
        equipmentType: '注塑机', faultPart: '液压系统',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '液压系统每年一次全面保养，确保系统运行可靠、延长部件寿命。',
        content: {
          tools_required: ['滤油机', '颗粒计数器', '扭矩扳手', '内六角扳手套装', '油管接头扳手', '清洗套装'],
          safety_warnings: ['系统卸压后方可拆装液压元件', '液压油温度需降至 40°C 以下', '废油按规定收集处理', '高压管路操作注意安全'],
          steps: [
            { step_no: 1, description: '停机卸压并关闭液压泵电源', image_url: null, notes: '确认压力表归零' },
            { step_no: 2, description: '取液压油样品送检', image_url: null, notes: '检测粘度、酸值、颗粒度' },
            { step_no: 3, description: '排放旧液压油并清洁油箱', image_url: null, notes: '用无纺布擦拭油箱内部' },
            { step_no: 4, description: '更换液压回油滤芯及吸油滤芯', image_url: null, notes: '注意滤芯型号和安装方向' },
            { step_no: 5, description: '加注新液压油至标准油位', image_url: null, notes: '使用滤油机在线过滤加注' },
            { step_no: 6, description: '检查液压泵联轴器及对中', image_url: null, notes: '联轴器橡胶件如老化需更换' },
            { step_no: 7, description: '检查各电磁阀动作及密封', image_url: null, notes: '手动测试阀芯换向' },
            { step_no: 8, description: '系统加压测试，检查泄漏点', image_url: null, notes: '加压至系统压力 1.1 倍保压' },
          ],
          parameters: { oil_change_interval: '12 个月', oil_type: '46# 抗磨液压油', filter_type: '回油滤芯 P165411', system_pressure: '140 bar' },
        },
        tags: ['液压系统', '年度保养', '保养SOP'], status: 'approved', author: '张工',
        views: 134, createdAt: new Date('2026-02-15'),
      },
      // ========== 新增标准作业程序 ==========
      {
        type: 'sop', title: '大型弯折机模具更换标准作业',
        equipmentType: '大型弯折机', faultPart: '机械结构',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '适用于大型弯折机上下模具的更换作业。模具重量较大，必须使用起重设备辅助。',
        content: {
          tools_required: ['行车/吊车（3吨）', '吊装带', '内六角扳手套装', '扭矩扳手', '铜锤', '水平仪', '塞尺'],
          safety_warnings: ['吊装作业必须由持证人员操作', '起重前确认吊装带完好', '模具下方严禁站人', '更换完成后确认所有紧固件锁紧'],
          steps: [
            { step_no: 1, description: '将弯折机滑块停至下死点并关闭主电源', image_url: null, notes: '悬挂"维修中"警示牌' },
            { step_no: 2, description: '拆卸上模固定螺栓和压板', image_url: null, notes: '螺栓按对角顺序松动' },
            { step_no: 3, description: '用行车将上模吊出放置到模具架', image_url: null, notes: '吊装时保持模具水平' },
            { step_no: 4, description: '拆卸下模固定螺栓，取出下模', image_url: null, notes: '注意下模定位销位置' },
            { step_no: 5, description: '清洁模具安装面和工作台', image_url: null, notes: '确保无毛刺和异物' },
            { step_no: 6, description: '安装新下模，对准定位销', image_url: null, notes: '用水平仪确认下模水平度' },
            { step_no: 7, description: '安装新上模，调整与下模间隙', image_url: null, notes: '用塞尺调整间隙均匀度 0.5mm' },
            { step_no: 8, description: '紧固所有螺栓并标记扭矩已达标', image_url: null, notes: '紧固扭矩按设备手册执行' },
            { step_no: 9, description: '手动慢速弯折一次确认无干涉', image_url: null, notes: '注意听有无异常声响' },
          ],
          parameters: { mold_gap: '0.5mm（上下模间隙）', bolt_torque: '120 Nm（M16 螺栓）', lifting_capacity: '3 吨以下' },
        },
        tags: ['大型弯折机', '模具更换', 'SOP', '吊装作业'], status: 'approved', author: '孙工',
        views: 76, createdAt: new Date('2026-04-05'),
      },
      {
        type: 'sop', title: '冷墩机冲头研磨与更换标准作业',
        equipmentType: '冷墩机', faultPart: '冲头机构',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '当冲头出现磨损、崩刃或产品尺寸超差时执行本 SOP。研磨后需检测冲头硬度。',
        content: {
          tools_required: ['工具磨床', '千分尺（0-25mm）', 'R 规', '硬度计', '放大镜（10倍）', '冲头拆卸专用扳手'],
          safety_warnings: ['磨床操作需佩戴护目镜', '冲头研磨时禁止戴手套', '拆卸冲头前确认设备已停机', '废磨削液按环保要求处理'],
          steps: [
            { step_no: 1, description: '关闭冷墩机主电源并泄压', image_url: null, notes: '等待飞轮完全停止' },
            { step_no: 2, description: '拆卸冲头固定螺母和冲头', image_url: null, notes: '检查冲头座有无磨损' },
            { step_no: 3, description: '用放大镜检查冲头刃口状态', image_url: null, notes: '记录磨损位置和程度' },
            { step_no: 4, description: '在工具磨床上研磨冲头刃口', image_url: null, notes: '研磨量每次≤0.05mm，保持冷却' },
            { step_no: 5, description: '用千分尺检测冲头外径尺寸', image_url: null, notes: '尺寸公差 ±0.01mm' },
            { step_no: 6, description: '用 R 规检查刃口圆弧半径', image_url: null, notes: '标准 R0.5mm，允差 ±0.05mm' },
            { step_no: 7, description: '硬度检测确认热处理层完好', image_url: null, notes: '表面硬度 HRC58-62' },
            { step_no: 8, description: '回装冲头并紧固至标准扭矩', image_url: null, notes: '扭矩 45Nm，涂抹防松胶' },
          ],
          parameters: { grinding_amount: '≤0.05mm/次', hardness_range: 'HRC 58-62', edge_radius: 'R0.5mm ±0.05mm', tighten_torque: '45 Nm' },
        },
        tags: ['冷墩机', '冲头研磨', '更换SOP', '模具维护'], status: 'approved', author: '高工',
        views: 92, createdAt: new Date('2026-03-20'),
      },
      {
        type: 'sop', title: '裁切机刀片更换与对刀标准作业',
        equipmentType: '裁切机', faultPart: '裁切机构',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '当裁切边缘出现毛刺、切口不平整或裁切尺寸偏差时，需执行刀片更换。',
        content: {
          tools_required: ['内六角扳手', '扭矩扳手', '塞尺', '千分尺', '刀片拉拔器', '防割手套', '铜棒'],
          safety_warnings: ['刀片极其锋利，必须佩戴防割手套', '拆卸刀片时注意刃口方向', '废刀片放入专用回收盒', '对刀时严禁手指触碰刃口'],
          steps: [
            { step_no: 1, description: '切断裁切机电源并挂锁', image_url: null, notes: '执行 LOTO 上锁挂牌程序' },
            { step_no: 2, description: '拆卸刀片护罩和安全传感器', image_url: null, notes: '注意传感器位置以便回装' },
            { step_no: 3, description: '用刀片拉拔器拆卸旧刀片', image_url: null, notes: '戴防割手套操作' },
            { step_no: 4, description: '清洁刀轴安装面和定位面', image_url: null, notes: '确保无锈蚀和毛刺' },
            { step_no: 5, description: '安装新刀片并紧固螺栓', image_url: null, notes: '注意刀片刃口方向正确' },
            { step_no: 6, description: '用塞尺调整刀片与底刀间隙', image_url: null, notes: '间隙 0.03-0.05mm 均匀一致' },
            { step_no: 7, description: '手动盘车检查有无干涉', image_url: null, notes: '一圆周内无碰触声' },
            { step_no: 8, description: '回装护罩和传感器并通电测试', image_url: null, notes: '试切 10 张确认裁切质量' },
          ],
          parameters: { blade_gap: '0.03-0.05 mm', bolt_torque: '25 Nm（M8 螺栓）', blade_type: 'SKH-9 高速钢' },
        },
        tags: ['裁切机', '刀片更换', '对刀', 'SOP'], status: 'approved', author: '黄工',
        views: 115, createdAt: new Date('2026-03-05'),
      },
      {
        type: 'sop', title: '老化设备温度校准标准作业',
        equipmentType: '老化设备', faultPart: '加热系统',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '老化设备温度均匀性直接影响产品老化效果，每月至少执行一次温度校准。',
        content: {
          tools_required: ['标准温度计（精度 0.1°C）', '9 点温度测试架', '红外测温枪', '螺丝刀套装', '校准记录表'],
          safety_warnings: ['校准前确保老化柜冷却至室温', '高温区域注意烫伤', '电气操作需戴绝缘手套'],
          steps: [
            { step_no: 1, description: '将 9 点温度传感器均匀布置在老化柜内', image_url: null, notes: '按上中下、左中右 9 点布局' },
            { step_no: 2, description: '设定控温温度至常用值（如 85°C）', image_url: null, notes: '记录设定值' },
            { step_no: 3, description: '启动加热并等待温度稳定 30 分钟', image_url: null, notes: '温度波动 ≤1°C 视为稳定' },
            { step_no: 4, description: '记录 9 点温度传感器的实测值', image_url: null, notes: '填入校准记录表' },
            { step_no: 5, description: '计算最大温差，判断是否 ≤5°C', image_url: null, notes: '超差需调整或维修' },
            { step_no: 6, description: '如温差超标，检查风机和加热管', image_url: null, notes: '参考对应故障排查 SOP' },
            { step_no: 7, description: '调整温控器偏移量使中心点达标', image_url: null, notes: '偏移量调整≤3°C' },
            { step_no: 8, description: '复测确认合格后出具校准报告', image_url: null, notes: '校准标签贴在设备上' },
          ],
          parameters: { target_temp: '85°C（常用）', max_delta: '≤5°C', stabilization_time: '30 分钟', calibration_interval: '每月' },
        },
        tags: ['老化设备', '温度校准', '保养SOP', '均匀性'], status: 'approved', author: '郑工',
        views: 68, createdAt: new Date('2026-02-20'),
      },
      {
        type: 'sop', title: '激光切割机光路调整与镜片更换标准作业',
        equipmentType: '激光切割机', faultPart: '光学系统',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '当切割质量下降、焦点偏移或保护镜片污染时执行。光路调整需在洁净环境下操作。',
        content: {
          tools_required: ['透光率检测仪', '六角扳手套装', '无水酒精', '无尘布', '镊子', '光路校准仪', '防护眼镜（激光波长）'],
          safety_warnings: ['调整光路前必须关闭激光器并放电', '禁止直视激光束', '镜片操作必须戴无粉手套', '废弃镜片按特殊废物处理'],
          steps: [
            { step_no: 1, description: '关闭激光器电源并确认电容放电完成', image_url: null, notes: '等待 5 分钟确保完全放电' },
            { step_no: 2, description: '拆卸切割头保护镜片固定盖', image_url: null, notes: '注意密封圈位置' },
            { step_no: 3, description: '用透光率检测仪检测镜片污染程度', image_url: null, notes: '透光率＜90% 需更换' },
            { step_no: 4, description: '用镊子取出旧镜片，无尘布清洁镜座', image_url: null, notes: '吹除灰尘，避免划伤' },
            { step_no: 5, description: '安装新保护镜片（镀膜面朝上）', image_url: null, notes: '严禁手指接触镜片表面' },
            { step_no: 6, description: '用光路校准仪检测激光束对中', image_url: null, notes: '偏差须＜0.1mm' },
            { step_no: 7, description: '调整反射镜架螺丝校正光路', image_url: null, notes: '微调至校准仪显示对中' },
            { step_no: 8, description: '重新校准焦点位置并试切确认', image_url: null, notes: '试切亚克力板检查切缝垂直度' },
          ],
          parameters: { transmittance_threshold: '≥90%', beam_alignment: '＜0.1mm', focus_tolerance: '±0.05mm', cleanroom_class: '10 万级' },
        },
        tags: ['激光切割机', '光路调整', '镜片更换', '校准SOP'], status: 'approved', author: '赵工',
        views: 103, createdAt: new Date('2026-01-15'),
      },
      {
        type: 'sop', title: '全自动外观机检测参数标定标准作业',
        equipmentType: '全自动外观机', faultPart: '视觉系统',
        severity: null, faultType: null,
        symptom: null, cause: null, solution: null,
        prevention: '当出现批量误判、漏检或更换相机/光源后，需执行检测参数标定。',
        content: {
          tools_required: ['标准校准板', '灰度卡', '光源照度计', '专用标定软件 UKey', '无尘布', '无水酒精'],
          safety_warnings: ['标定前清洁设备内部', '使用标定软件需管理员权限', '光源调整时注意避免直视'],
          steps: [
            { step_no: 1, description: '清洁相机镜头、光源罩和检测区域玻璃', image_url: null, notes: '确保无指纹和油污' },
            { step_no: 2, description: '放置标准校准板于检测位', image_url: null, notes: '校准板平面与检测面平行' },
            { step_no: 3, description: '打开标定软件，执行白平衡校准', image_url: null, notes: 'RGB 三通道偏差＜3%' },
            { step_no: 4, description: '执行像素当量标定', image_url: null, notes: 'XY 方向分别标定' },
            { step_no: 5, description: '用灰度卡检测光源照度均匀性', image_url: null, notes: '中心与边缘照度差＜10%' },
            { step_no: 6, description: '运行标准样品测试程序', image_url: null, notes: '至少 50 个标准样品' },
            { step_no: 7, description: '确认误判率＜3% 且漏检率＜1%', image_url: null, notes: '超差需调整检测参数' },
            { step_no: 8, description: '导出标定报告并签字确认', image_url: null, notes: '标定记录存档备查' },
          ],
          parameters: { white_balance_delta: 'RGB 各＜3%', uniformity: '中心边缘差＜10%', false_positive_rate: '＜3%', miss_rate: '＜1%' },
        },
        tags: ['外观机', '参数标定', '视觉校准', 'SOP'], status: 'approved', author: '杨工',
        views: 59, createdAt: new Date('2026-01-10'),
      },
    ],
  });

  // ── RCA 分析历史记录 8 条 ────────────────────
  const rcaDevices = await prisma.device.findMany({ take: 8, orderBy: { code: 'asc' } });
  const rcaData = [
    { title: 'CNC-001 主轴异响根因分析', problemDesc: 'CNC-001 在运行中发出周期性异响，振动值从3.2mm/s升至7.8mm/s', rootCause: '主轴前轴承磨损严重，保持架断裂', improvement: '更换SKF主轴轴承，建立轴承振动定期监测制度，每500小时检测一次', whyChain: [{ level: 1, question: '为什么会发生这个问题？', answer: '主轴运行异响，振动值超标' }, { level: 2, question: '为什么会是这个原因？', answer: '主轴轴承磨损，间隙增大' }, { level: 3, question: '这个原因的根本因素是什么？', answer: '轴承润滑不足，长期过载运行' }, { level: 4, question: '还有更深层的原因吗？', answer: '润滑系统管路部分堵塞，润滑油流量不足' }, { level: 5, question: '再深一层，真正根源是什么？', answer: '润滑系统未纳入定期点检范围，缺乏预防性维护' }], fishboneData: { man: ['操作不规范', '润滑周期意识不足'], machine: ['主轴轴承', '润滑系统管路'], material: ['润滑油品质下降'], method: ['润滑周期不合理', '点检标准缺失'], measure: ['振动检测周期过长'], environment: ['加工区域粉尘较多'] } },
    { title: '注塑机 ZS-005 温度异常分析', problemDesc: '注塑机 ZS-005 加热区温度波动大，影响产品质量', rootCause: '温控模块热电偶老化，PID参数偏离最佳值', improvement: '更换热电偶传感器，重新整定PID参数，建立温控系统季度校准制度', whyChain: [{ level: 1, question: '为什么会发生这个问题？', answer: '注塑温度波动大，产品尺寸超差' }, { level: 2, question: '为什么会温度波动？', answer: '温控系统响应迟缓' }, { level: 3, question: '为什么温控响应迟缓？', answer: '热电偶信号漂移' }, { level: 4, question: '为什么热电偶会漂移？', answer: '热电偶使用超期，性能退化' }, { level: 5, question: '根本原因是什么？', answer: '热电偶未纳入定期校准计划' }], fishboneData: { man: ['技术人员校准经验不足'], machine: ['热电偶', 'PID控制器'], material: ['原料批次差异'], method: ['校准周期过长', '无预警机制'], measure: ['温度检测精度不足'], environment: ['车间环境温度变化大'] } },
    { title: '冷墩机 LD-003 冲头断裂分析', problemDesc: '冷墩机 LD-003 在高速生产中冲头突然断裂，造成模具损坏', rootCause: '冲头材料疲劳达到寿命极限，未及时更换', improvement: '建立冲头寿命数据库，实施寿命到期预警更换制度', whyChain: [{ level: 1, question: '为什么会发生冲头断裂？', answer: '冲头承受反复冲击载荷' }, { level: 2, question: '为什么冲头会到达寿命极限？', answer: '冲头已使用超过理论寿命30%' }, { level: 3, question: '为什么没有及时更换？', answer: '缺乏冲头使用次数记录系统' }, { level: 4, question: '为什么没有记录系统？', answer: '依赖人工经验判断，无数字化管理' }, { level: 5, question: '根本原因是什么？', answer: '工具寿命管理数字化程度不足' }], fishboneData: { man: ['操作员未受过培训'], machine: ['冲头材料', '模具'], material: ['材料硬度不合格'], method: ['无寿命管理流程', '未按计划更换'], measure: ['冲击次数无法实时统计'], environment: ['冷却润滑不足'] } },
    { title: '液压机 YY-002 压力不稳分析', problemDesc: '液压机系统压力在保压阶段持续下降，无法保持设定压力', rootCause: '液压缸密封圈严重磨损，导致内泄漏', improvement: '更换液压缸密封组件，增加液压油定期检测项目', whyChain: [{ level: 1, question: '为什么会压力不稳？', answer: '液压系统内泄漏' }, { level: 2, question: '为什么会产生内泄漏？', answer: '液压缸密封圈磨损' }, { level: 3, question: '密封圈为什么磨损？', answer: '液压油污染度偏高，加速密封磨损' }, { level: 4, question: '为什么油污染度高？', answer: '液压油滤芯更换周期过长' }, { level: 5, question: '根本原因是什么？', answer: '液压系统维护标准执行不到位' }], fishboneData: { man: ['维护人员技能不足'], machine: ['液压缸密封件', '液压泵'], material: ['液压油污染', '密封件材质'], method: ['更换周期不科学', '点检标准不细致'], measure: ['油品检测频率低'], environment: ['现场粉尘污染'] } },
    { title: '裁切机 CQ-002 定位偏差分析', problemDesc: '裁切机裁切尺寸出现系统性偏差，偏差量约0.5mm', rootCause: '送料辊编码器联轴器松动，导致位置反馈失准', improvement: '紧固联轴器并增加防松措施，增加编码器信号校准到日点检项目', whyChain: [{ level: 1, question: '为什么出现尺寸偏差？', answer: '送料定位不准' }, { level: 2, question: '为什么送料定位不准？', answer: '位置反馈信号与实际不符' }, { level: 3, question: '为什么反馈信号失准？', answer: '编码器与辊轴连接松动' }, { level: 4, question: '为什么连接会松动？', answer: '长期振动导致联轴器螺栓松动' }, { level: 5, question: '根本原因是什么？', answer: '联轴器紧固未纳入定期检查项目' }], fishboneData: { man: ['操作员未及时发现偏差'], machine: ['编码器', '联轴器', '送料辊'], material: ['材料厚度波动'], method: ['校准频率不足', '无防松设计'], measure: ['尺寸检测频次低'], environment: ['设备基础振动大'] } },
    { title: '焊接机 HJ-001 焊接缺陷分析', problemDesc: '焊接机出现批量焊接气孔缺陷，不良率达到8%', rootCause: '保护气体管路存在泄漏点，导致保护气氛不足', improvement: '修复气体管路泄漏点，增加气路气密性日检项目', whyChain: [{ level: 1, question: '为什么产生气孔缺陷？', answer: '焊接保护气氛不足' }, { level: 2, question: '为什么保护气氛不足？', answer: '气体流量低于工艺要求' }, { level: 3, question: '为什么流量偏低？', answer: '管路存在微小泄漏' }, { level: 4, question: '为什么管路会泄漏？', answer: '快插接头密封圈老化' }, { level: 5, question: '根本原因是什么？', answer: '气路系统密封件缺乏定期更换计划' }], fishboneData: { man: ['操作员未检查气路'], machine: ['焊枪', '气体管路', '流量计'], material: ['焊丝质量', '保护气体纯度'], method: ['气体流量标准模糊', '无检漏流程'], measure: ['气体流量未实时监控'], environment: ['车间气流影响'] } },
    { title: '钉卷机 DJ-003 铝箔断裂分析', problemDesc: '钉卷机在高速运转过程中铝箔频繁断裂，每次停机约15分钟', rootCause: '送箔路径上导辊表面有毛刺，划伤铝箔边缘造成应力集中', improvement: '更换导辊表面处理为陶瓷涂层，增加导辊表面质量日检项目', whyChain: [{ level: 1, question: '为什么铝箔断裂？', answer: '铝箔边缘有微裂纹' }, { level: 2, question: '为什么产生微裂纹？', answer: '导辊表面不光滑划伤铝箔' }, { level: 3, question: '为什么导辊表面不光滑？', answer: '导辊表面涂层磨损' }, { level: 4, question: '为什么涂层会磨损？', answer: '长期运行未检查导辊表面状态' }, { level: 5, question: '根本原因是什么？', answer: '导辊表面质量未纳入点检标准' }], fishboneData: { man: ['操作员未关注导辊状态'], machine: ['导辊', '送箔机构', '张力辊'], material: ['铝箔材质', '导辊涂层'], method: ['无导辊检查标准', '更换周期缺失'], measure: ['表面粗糙度无检测'], environment: ['湿度偏高'] } },
    { title: '空压机系统压力波动分析', problemDesc: '全厂空压系统压力频繁波动，影响多台设备正常运行', rootCause: '干燥机前置过滤器堵塞，造成压差增大，后端供气不足', improvement: '清洗过滤器并缩短更换周期至1个月，增加压差监控报警', whyChain: [{ level: 1, question: '为什么空压压力波动？', answer: '末端用气量大于供气量' }, { level: 2, question: '为什么供气量不足？', answer: '空压机加载时间延长' }, { level: 3, question: '为什么加载时间延长？', answer: '干燥机前置过滤器堵塞' }, { level: 4, question: '为什么过滤芯堵塞？', answer: '更换周期过长（3个月）' }, { level: 5, question: '根本原因是什么？', answer: '过滤器压差无监控，周期性更换不科学' }], fishboneData: { man: ['维护人员巡检不到位'], machine: ['空压机', '干燥机', '过滤器'], material: ['滤芯质量', '压缩空气质量'], method: ['更换周期过长', '无压差监控'], measure: ['压差未实时监测'], environment: ['空压站通风不良'] } },
  ];

  for (let i = 0; i < rcaData.length; i++) {
    const device = rcaDevices[i % rcaDevices.length];
    await prisma.rcaAnalysis.create({
      data: {
        deviceId: device.id,
        title: rcaData[i].title,
        problemDesc: rcaData[i].problemDesc,
        whyChain: rcaData[i].whyChain,
        fishboneData: rcaData[i].fishboneData,
        rootCause: rcaData[i].rootCause,
        improvement: rcaData[i].improvement,
        status: 'completed',
        createdAt: new Date(Date.now() - (rcaData.length - i) * 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`   RCA 分析: ${rcaData.length} 条`);

  // ── 改善项目 6 个（含PDCA数据） ──────────────
  await prisma.improvementProject.createMany({
    data: [
      {
        title: 'SMED 换型优化 - 注塑区', lossType: '换型/调整', currentValue: 45, targetValue: 20, unit: 'min', assignee: '张三', deadline: new Date('2026-06-30'), status: 'active', progress: 60, description: '通过快速换模工装和标准化操作流程，将注塑机换型时间从45分钟缩短至20分钟',
        effectData: {
          pdca: {
            plan: { analysis: '当前换型平均45分钟，其中80%为模具搬运和调整时间，主要原因为工具摆放杂乱、无标准化流程', target: '将换型时间缩短至20分钟以内，减少停机损失', actionPlan: '1. 设计快换工装 2. 制定标准化操作卡 3. 培训操作员 4. 试行优化', completed: true },
            do: { execution: '已完成快换工装制作和安装，编制了标准操作流程，组织了3次培训', issues: '工装首次试用时发现定位精度不足，已调整优化', completed: true },
            check: { result: '' },
            act: { standardization: '', promotion: '' },
          },
        },
      },
      {
        title: 'CNC 加工区主轴精度恢复计划', lossType: '设备故障', currentValue: 12, targetValue: 3, unit: '次/月', assignee: '李四', deadline: new Date('2026-07-15'), status: 'active', progress: 30, description: '针对CNC加工区频繁主轴故障，实施预知性维护策略',
        effectData: {
          pdca: {
            plan: { analysis: 'CNC加工区近3个月每月平均发生12起主轴相关故障，占设备总故障的35%', target: '将主轴故障率降低至每月3次以下', actionPlan: '1. 建立主轴振动监测 2. 制定定期保养计划 3. 建立维修历史数据库', completed: true },
            do: { execution: '已完成振动传感器安装，正在采集基线数据', issues: '传感器选型时遇到信号干扰问题，已更换屏蔽线缆', completed: false },
            check: { result: '' },
            act: { standardization: '', promotion: '' },
          },
        },
      },
      {
        title: 'TPM 点检体系优化', lossType: '设备故障', currentValue: 18, targetValue: 10, unit: '次/月', assignee: '王五', deadline: new Date('2026-06-20'), status: 'completed', progress: 100, description: '优化点检标准和频率，基于数据分析淘汰无效点检项',
        effectData: {
          pdca: {
            plan: { analysis: '现有点检项目150项，经分析其中40%从未发现问题，属于无效点检', target: '通过优化点检项目，减少无效点检30%，同时确保漏检率<2%', actionPlan: '1. 统计分析历史点检数据 2. 识别无效点检项 3. 优化点检标准 4. 验证效果', completed: true },
            do: { execution: '已完成历史数据分析和点检项目优化，优化后点检项从150项精简至98项', issues: '一线员工对新标准适应需要时间，已安排培训', completed: true },
            check: { result: '优化后运行2个月，设备故障率从月均18次降至10次，漏检率1.5%', completed: true },
            act: { standardization: '将优化后的点检标准纳入质量管理体系文件，建立半年一次的点检标准评审机制', promotion: '已在CNC加工区试点成功，计划推广至全厂', completed: true },
          },
        },
      },
      {
        title: '冷墩机 LD-005 模具寿命提升', lossType: '速度降低', currentValue: 85000, targetValue: 120000, unit: '件', assignee: '赵六', deadline: new Date('2026-08-01'), status: 'active', progress: 20, description: '通过模具表面处理工艺改进和冷却优化，将模具寿命从8.5万件提升至12万件',
        effectData: {
          pdca: {
            plan: { analysis: 'LD-005模具平均寿命8.5万件，低于行业标杆的15万件，主要磨损形式为热疲劳开裂', target: '模具寿命提升至12万件以上', actionPlan: '1. 评估模具材料 2. 优化热处理工艺 3. 改进冷却方案 4. 试模验证', completed: true },
            do: { execution: '已完成材料评估，正在与供应商沟通新型模具钢方案', issues: '材料交期较长，预计延迟2周', completed: false },
            check: { result: '' },
            act: { standardization: '', promotion: '' },
          },
        },
      },
      {
        title: '包装区效率提升 - 自动装箱', lossType: '短暂停机', currentValue: 25, targetValue: 10, unit: 'min/次', assignee: '孙七', deadline: new Date('2026-07-30'), status: 'active', progress: 10, description: '通过引入自动装箱装置减少包装区频繁停机',
        effectData: {
          pdca: {
            plan: { analysis: '包装区因人工装箱速度慢，每月累计等待停机约250分钟，平均每次25分钟', target: '将每次停机等待时间缩短至10分钟内', actionPlan: '1. 评估自动装箱方案 2. 选型采购 3. 安装调试 4. 培训操作员', completed: false },
            do: { execution: '', issues: '', completed: false },
            check: { result: '' },
            act: { standardization: '', promotion: '' },
          },
        },
      },
      {
        title: '废品率降低 - 注塑成型参数优化', lossType: '废品/返工', currentValue: 5.2, targetValue: 2.0, unit: '%', assignee: '周八', deadline: new Date('2026-09-15'), status: 'active', progress: 45, description: '通过DOE实验设计和注塑参数优化，将废品率从5.2%降低至2%',
        effectData: {
          pdca: {
            plan: { analysis: '注塑区废品率5.2%，高于行业平均3%的目标，主要废品种类为缩水和飞边', target: '废品率降低至2%以下', actionPlan: '1. DOE实验设计 2. 参数优化验证 3. 制定标准参数表 4. 培训推广', completed: true },
            do: { execution: '已完成DOE实验和关键参数确定，正在验证最优参数组合的稳定性', issues: '部分模具因磨损影响参数稳定性，需同步修模', completed: true },
            check: { result: '' },
            act: { standardization: '', promotion: '' },
          },
        },
      },
    ],
  });
  console.log(`   改善项目: 6 个（含PDCA数据）`);

  // ═══════════════════════════════════════════════
  // 企业层级 Demo 数据
  // ═══════════════════════════════════════════════
  const group = await prisma.organization.create({
    data: { code: 'GRP-01', name: 'Uantek 集团', level: 'group', sortOrder: 1, location: '广东省东莞市' },
  });

  const company = await prisma.organization.create({
    data: { code: 'CMP-01', name: 'Uantek 精密制造有限公司', level: 'company', parentId: group.id, sortOrder: 1, location: '东莞市寮步镇东涛大厦', oeeTarget: 85 },
  });

  const workshopMetal = await prisma.organization.create({
    data: { code: 'WS-METAL', name: '金属加工车间', level: 'workshop', parentId: company.id, sortOrder: 1, location: 'A 栋 1F', oeeTarget: 85 },
  });
  const workshopCapacitor = await prisma.organization.create({
    data: { code: 'WS-CAP', name: '电解电容车间', level: 'workshop', parentId: company.id, sortOrder: 2, location: 'A 栋 2F', oeeTarget: 82 },
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
  const knowledgeCount = await prisma.knowledgeEntry.count();
  console.log(`✅ Demo data seeded: ${devices.length} devices, 50 work orders, 15 inspections, 15 toolings, ${knowledgeCount} knowledge entries, 8 RCA, 3 projects`);
  // ── 班组 8 个 ────────────────────────────────
  const teamData = [
    { code: 'TEAM-MA', name: '金属甲班', leader: '张伟', memberCount: 12, shift: '早班', workshopId: workshopMetal.id },
    { code: 'TEAM-MB', name: '金属乙班', leader: '李强', memberCount: 10, shift: '中班', workshopId: workshopMetal.id },
    { code: 'TEAM-MC', name: '金属丙班', leader: '王磊', memberCount: 8, shift: '晚班', workshopId: workshopMetal.id },
    { code: 'TEAM-CA', name: '电容甲班', leader: '陈明', memberCount: 11, shift: '早班', workshopId: workshopCapacitor.id },
    { code: 'TEAM-CB', name: '电容乙班', leader: '刘洋', memberCount: 9, shift: '中班', workshopId: workshopCapacitor.id },
    { code: 'TEAM-CC', name: '电容丙班', leader: '赵刚', memberCount: 7, shift: '晚班', workshopId: workshopCapacitor.id },
    { code: 'TEAM-MNT', name: '维修班组', leader: '周浩', memberCount: 6, shift: '轮班', workshopId: workshopMetal.id },
    { code: 'TEAM-QC', name: '质检班组', leader: '孙健', memberCount: 5, shift: '早班', workshopId: workshopCapacitor.id, description: '负责来料检验和过程巡检' },
  ];
  for (const t of teamData) {
    await prisma.team.create({ data: t });
  }
  console.log(`   班组: ${teamData.length} 个`);

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
