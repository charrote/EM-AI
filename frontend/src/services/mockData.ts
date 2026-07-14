/**
 * Mock 数据生成器
 * 用于 dataMode = 'mock' 时的演示数据
 */

// 设备 Mock 数据
export function generateMockDevices(count: number = 20) {
  const statuses = ['running', 'idle', 'fault', 'maintenance', 'repair', 'changeover'];
  const types = ['CNC 加工中心', '注塑机', '冲床', '焊接机器人', '装配线', '检测设备'];
  const areas = ['机加工区', '注塑区', '焊接区', '装配区', '质检区'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `DEV-${String(i + 1).padStart(3, '0')}`,
    code: `CNC-${String(i + 1).padStart(3, '0')}`,
    name: `${types[i % types.length]}-${String(i + 1).padStart(2, '0')}`,
    type: types[i % types.length],
    status: statuses[i % statuses.length],
    area: areas[i % areas.length],
    oee: Math.floor(Math.random() * 30) + 60, // 60-90
    healthScore: Math.floor(Math.random() * 40) + 50, // 50-90
    mtbf: Math.floor(Math.random() * 500) + 100,
    mttr: Math.floor(Math.random() * 60) + 10,
    totalRunningTime: Math.floor(Math.random() * 10000) + 1000,
  }));
}

// 工单 Mock 数据
export function generateMockWorkOrders(count: number = 30) {
  const statuses = ['pending', 'accepted', 'repairing', 'verifying', 'completed'];
  const priorities = ['P0', 'P1', 'P2', 'P3'];
  const faultTypes = ['机械', '电气', '液压', '气动', '软件', '其他'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `WO-${String(i + 1).padStart(4, '0')}`,
    code: `WO-202607${String(i + 1).padStart(3, '0')}`,
    type: 'repair',
    source: i % 3 === 0 ? 'iot_auto' : (i % 2 === 0 ? 'scan' : 'manual'),
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    faultType: faultTypes[i % faultTypes.length],
    deviceId: `DEV-${String((i % 20) + 1).padStart(3, '0')}`,
    description: '设备异常，需要维修',
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// OEE 数据 Mock
export function generateMockOEEData() {
  return {
    overallOEE: 72.5,
    availability: 85.2,
    performance: 91.4,
    quality: 93.1,
    dailyTrend: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      oee: Math.floor(Math.random() * 20) + 65,
      target: 85,
    })),
  };
}

// 损失分析 Mock 数据
export function generateMockLossData() {
  return [
    { cause: '设备故障', duration: 245, percentage: 35, cumulative: 35 },
    { cause: '换型调整', duration: 180, percentage: 25, cumulative: 60 },
    { cause: '速度损失', duration: 120, percentage: 17, cumulative: 77 },
    { cause: '废品返工', duration: 90, percentage: 13, cumulative: 90 },
    { cause: '启动停机', duration: 45, percentage: 6, cumulative: 96 },
    { cause: '其他', duration: 15, percentage: 4, cumulative: 100 },
  ];
}

// 班组 Mock 数据
export function generateMockTeams(count: number = 8) {
  const shifts = ['早班', '中班', '晚班'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `TEAM-${String(i + 1).padStart(2, '0')}`,
    code: `T${String(i + 1).padStart(2, '0')}`,
    name: `${shifts[i % shifts.length]}组-${String(i + 1).padStart(2, '0')}`,
    leader: ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'][i],
    shift: shifts[i % shifts.length],
    memberCount: Math.floor(Math.random() * 5) + 8,
    workshopId: `WS-${String(Math.floor(i / 3) + 1).padStart(2, '0')}`,
  }));
}

// 工治具 Mock 数据
export function generateMockToolings(count: number = 15) {
  const types = ['模具', '夹具', '刀具', '量具', '其他'];
  const statuses = ['in_stock', 'in_use', 'maintenance', 'repair'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `TLG-${String(i + 1).padStart(4, '0')}`,
    code: `TLG-${String(i + 1).padStart(4, '0')}`,
    name: `${types[i % types.length]}-${String(i + 1).padStart(2, '0')}`,
    type: types[i % types.length],
    status: statuses[i % statuses.length],
    lifeUsed: Math.floor(Math.random() * 5000),
    lifeRemaining: Math.floor(Math.random() * 5000),
    healthScore: Math.floor(Math.random() * 40) + 50,
  }));
}

// 组织树 Mock 数据
export function generateMockOrgTree() {
  return [
    {
      id: 'ORG-001',
      code: 'GRP001',
      name: '集团总部',
      level: 'group',
      children: [
        {
          id: 'ORG-002',
          code: 'WS001',
          name: '机加工车间',
          level: 'workshop',
          children: [
            { id: 'ORG-003', code: 'LINE001', name: 'CNC 产线 1', level: 'line' },
            { id: 'ORG-004', code: 'LINE002', name: 'CNC 产线 2', level: 'line' },
          ],
        },
        {
          id: 'ORG-005',
          code: 'WS002',
          name: '注塑车间',
          level: 'workshop',
          children: [
            { id: 'ORG-006', code: 'LINE003', name: '注塑产线 1', level: 'line' },
          ],
        },
      ],
    },
  ];
}

// 点检记录 Mock 数据
export function generateMockInspections(count: number = 20) {
  const levels = ['daily', 'weekly', 'monthly'];
  const statuses = ['pending', 'in_progress', 'completed', 'skipped'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `INS-${String(i + 1).padStart(4, '0')}`,
    deviceId: `DEV-${String((i % 20) + 1).padStart(3, '0')}`,
    level: levels[i % levels.length],
    status: statuses[i % statuses.length],
    abnormalCount: i % 5 === 0 ? Math.floor(Math.random() * 3) + 1 : 0,
    doneAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// 保养记录 Mock 数据
export function generateMockMaintenanceRecords(count: number = 15) {
  const types = ['daily', 'level1', 'level2', 'overhaul'];
  const statuses = ['in_progress', 'completed', 'skipped'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `MTN-${String(i + 1).padStart(4, '0')}`,
    deviceId: `DEV-${String((i % 20) + 1).padStart(3, '0')}`,
    title: `${types[i % types.length]}保养`,
    type: types[i % types.length],
    status: statuses[i % statuses.length],
    duration: Math.floor(Math.random() * 120) + 30,
    completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// 改善项目 Mock 数据
export function generateMockImprovements(count: number = 10) {
  const statuses = ['active', 'completed', 'cancelled'];
  const lossTypes = ['故障损失', '换型损失', '速度损失', '废品损失'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `IMP-${String(i + 1).padStart(4, '0')}`,
    title: `改善项目-${String(i + 1).padStart(2, '0')}`,
    lossType: lossTypes[i % lossTypes.length],
    currentValue: Math.floor(Math.random() * 50) + 50,
    targetValue: Math.floor(Math.random() * 30) + 80,
    unit: '%',
    status: statuses[i % statuses.length],
    progress: Math.floor(Math.random() * 100),
    deadline: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// 知识库条目 Mock 数据
export function generateMockKnowledge(count: number = 15) {
  const types = ['case', 'sop'];
  const statuses = ['pending', 'approved', 'rejected'];
  const faultTypes = ['机械', '电气', '液压', '气动', '软件'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `KNW-${String(i + 1).padStart(4, '0')}`,
    type: types[i % types.length],
    title: `${faultTypes[i % faultTypes.length]}故障处理-${String(i + 1).padStart(2, '0')}`,
    faultType: faultTypes[i % faultTypes.length],
    status: statuses[i % statuses.length],
    views: Math.floor(Math.random() * 100) + 10,
    author: ['张三', '李四', '王五', '赵六'][i % 4],
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// 安灯看板数据 Mock
export function generateMockAndonData() {
  return {
    total: 5,
    active: 3,
    resolved: 2,
    items: [
      {
        id: 'ANDON-001',
        deviceId: 'DEV-001',
        deviceName: 'CNC-001',
        faultType: '机械',
        priority: 'P0',
        status: 'active',
        reportedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        assignee: '张三',
      },
      {
        id: 'ANDON-002',
        deviceId: 'DEV-005',
        deviceName: '注塑机-001',
        faultType: '电气',
        priority: 'P1',
        status: 'active',
        reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        assignee: '李四',
      },
    ],
  };
}

// 根因分析记录 Mock
export function generateMockRcaRecords(count: number = 10) {
  const statuses = ['draft', 'completed'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `RCA-${String(i + 1).padStart(4, '0')}`,
    deviceId: `DEV-${String((i % 20) + 1).padStart(3, '0')}`,
    title: `根因分析-${String(i + 1).padStart(2, '0')}`,
    problemDesc: '设备异常停机',
    status: statuses[i % statuses.length],
    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// 改善机会 Mock 数据
export function generateMockImprovementOpportunities(count: number = 10) {
  const lossTypes = ['设备故障', '换型/调整', '短暂停机', '速度降低', '废品/返工', '启动损失'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `OPP-${String(i + 1).padStart(4, '0')}`,
    lossType: lossTypes[i % lossTypes.length],
    title: `${lossTypes[i % lossTypes.length]}改善机会-${String(i + 1).padStart(2, '0')}`,
    currentValue: Math.floor(Math.random() * 30) + 50,
    targetValue: Math.floor(Math.random() * 20) + 30,
    unit: 'min',
    reason: '通过数据分析发现该损失类型偏高，建议改善',
  }));
}

// 设备管理列表 Mock 数据 (用于工治具上/下机)
export function generateMockDeviceManage(count: number = 20) {
  const types = ['CNC 加工中心', '注塑机', '冲床', '焊接机器人', '装配线', '检测设备'];
  const areas = ['机加工区', '注塑区', '焊接区', '装配区', '质检区'];
  const lines = ['LINE-001', 'LINE-002', 'LINE-003', 'LINE-004', 'LINE-005'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `DEV-${String(i + 1).padStart(3, '0')}`,
    code: `DEV-${String(i + 1).padStart(3, '0')}`,
    name: `${types[i % types.length]}-${String(i + 1).padStart(2, '0')}`,
    type: types[i % types.length],
    area: areas[i % areas.length],
    line: lines[i % lines.length],
  }));
}

// 保养计划 Mock 数据
export function generateMockMaintenancePlans(count: number = 10) {
  const types = ['daily', 'level1', 'level2', 'overhaul'];
  const typeLabels: Record<string, string> = {
    daily: '日常保养', level1: '一级保养', level2: '二级保养', overhaul: '大修保养',
  };
  const triggerTypes = ['time', 'runtime', 'output'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `PLAN-${String(i + 1).padStart(4, '0')}`,
    title: `${typeLabels[types[i % types.length]]}计划-${String(i + 1).padStart(2, '0')}`,
    deviceId: `DEV-${String((i % 20) + 1).padStart(3, '0')}`,
    deviceType: ['CNC', '注塑机', '冲床'][i % 3],
    type: types[i % types.length],
    triggerType: triggerTypes[i % triggerTypes.length],
    triggerValue: [7, 500, 1000][i % 3],
    intervalDays: [30, 90, 180, 365][i % 4],
    items: [
      { name: '检查润滑油位' },
      { name: '清洁滤网' },
      { name: '紧固螺栓' },
    ],
    active: i % 3 !== 0,
    lastExecutedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    nextScheduledAt: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// 点检计划 Mock 数据
export function generateMockInspectionPlans(count: number = 8) {
  const types = ['CNC', '注塑机', '冲床', '焊接机器人'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `IPLAN-${String(i + 1).padStart(4, '0')}`,
    deviceType: types[i % types.length],
    name: `${types[i % types.length]}点检计划`,
    active: i % 4 !== 0,
    items: [
      { name: '检查润滑油位', method: '目视', normalRange: '上/下刻度之间' },
      { name: '温度检查', method: '测温枪', normalRange: '30-60°C' },
      { name: '振动检测', method: '振动仪', normalRange: '<5.0mm/s' },
    ],
  }));
}

// 知识库统计 Mock 数据
export function generateMockKnowledgeStats() {
  return {
    total: 45,
    cases: 28,
    sops: 17,
    pending: 3,
    approved: 42,
    todayAdded: 2,
    monthlyAdded: 15,
  };
}

// 知识库设备类型树 Mock 数据
export function generateMockEquipmentTypes() {
  return [
    {
      name: 'CNC 加工中心',
      count: 18,
      children: [
        { name: '主轴系统', count: 6 },
        { name: '刀库系统', count: 4 },
        { name: '冷却系统', count: 3 },
        { name: '其他', count: 5 },
      ],
    },
    {
      name: '注塑机',
      count: 12,
      children: [
        { name: '液压系统', count: 5 },
        { name: '温控系统', count: 4 },
        { name: '其他', count: 3 },
      ],
    },
    {
      name: '冲床',
      count: 8,
      children: [
        { name: '离合器', count: 3 },
        { name: '模具系统', count: 3 },
        { name: '其他', count: 2 },
      ],
    },
    {
      name: '焊接机器人',
      count: 7,
      children: [
        { name: '焊枪系统', count: 4 },
        { name: '送丝系统', count: 3 },
      ],
    },
  ];
}

// 日历条目 Mock 数据
export function generateMockCalendarEntries(year: number, month: number, count: number = 28) {
  const entries: any[] = [];
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  
  for (let day = 1; day <= count; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = day === today.getDate() && isCurrentMonth;
    
    entries.push({
      id: `CAL-${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year,
      month,
      day,
      isWorkDay: !isWeekend,
      shiftType: !isWeekend ? (isToday ? 'day' : ['day', 'middle', 'night'][day % 3]) : null,
      holidayName: isWeekend ? null : (day === 15 ? '中秋节' : day === 25 ? '国庆节' : null),
    });
  }
  
  return entries;
}