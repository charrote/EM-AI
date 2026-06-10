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
  console.log(`✅ Demo data seeded: ${devices.length} devices, 50 work orders, 15 inspections, 15 toolings, 6 knowledge entries, 8 RCA, 3 projects`);
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
