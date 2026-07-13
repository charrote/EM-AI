import { useMemo, useState } from 'react';
import { Typography, Tabs, Tag, Progress, Slider, Tooltip, Card, Button } from 'antd';
import {
  BarChartOutlined,
  ThunderboltOutlined,
  FireOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  RocketOutlined,
  AimOutlined,
  ArrowUpOutlined,
  DollarOutlined,
  ExperimentOutlined,
  BulbOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { useResponsive } from '../hooks/useResponsive';

const { Text } = Typography;

/* ─── 类型定义 ──────────────────────────────── */

interface LossData {
  type: string;
  value: number;
  percentage: number;
  category: 'availability' | 'performance' | 'quality';
  trend: 'up' | 'down' | 'flat';
  devices: { deviceId: string; deviceName: string; lossValue: number }[];
}

interface DeviceOEEItem {
  deviceId: string;
  deviceName: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  topLoss: string;
  topLossValue: number;
}

interface ImprovementPath {
  id: string;
  name: string;
  category: string;
  impact: number;
  effort: number;
  cost: number;
  roi: number;
  description: string;
  steps: string[];
  estimatedTime: string;
  color: string;
}

interface RootCauseChain {
  id: string;
  rootCause: string;
  category: string;
  impactDevices: string[];
  impactValue: number;
  evidence: string;
  severity: 'high' | 'medium' | 'low';
}

interface WhatIfParam {
  id: string;
  name: string;
  unit: string;
  current: number;
  min: number;
  max: number;
  category: string;
  coefficient: number;
  description: string;
}

interface WhatIfResult {
  parameter: string;
  originalValue: number;
  newValue: number;
  delta: number;
  oeeImpact: number;
}

/* ─── Mock 数据 ─────────────────────────────── */

const mockLosses: LossData[] = [
  { type: '计划停机', value: 8.2, percentage: 16.4, category: 'availability', trend: 'down',
    devices: [
      { deviceId: 'D001', deviceName: 'CNC-01', lossValue: 2.1 }, { deviceId: 'D002', deviceName: 'CNC-02', lossValue: 1.8 },
      { deviceId: 'D003', deviceName: 'INJ-01', lossValue: 1.5 }, { deviceId: 'D004', deviceName: 'ROB-01', lossValue: 1.2 },
      { deviceId: 'D005', deviceName: 'CONV-01', lossValue: 1.6 },
    ] },
  { type: '设备故障', value: 6.5, percentage: 13.0, category: 'availability', trend: 'up',
    devices: [
      { deviceId: 'D001', deviceName: 'CNC-01', lossValue: 1.8 }, { deviceId: 'D002', deviceName: 'CNC-02', lossValue: 1.5 },
      { deviceId: 'D003', deviceName: 'INJ-01', lossValue: 1.2 }, { deviceId: 'D004', deviceName: 'ROB-01', lossValue: 1.0 },
      { deviceId: 'D005', deviceName: 'CONV-01', lossValue: 1.0 },
    ] },
  { type: '换型调整', value: 5.8, percentage: 11.6, category: 'availability', trend: 'flat',
    devices: [
      { deviceId: 'D001', deviceName: 'CNC-01', lossValue: 1.6 }, { deviceId: 'D002', deviceName: 'CNC-02', lossValue: 1.4 },
      { deviceId: 'D003', deviceName: 'INJ-01', lossValue: 1.1 }, { deviceId: 'D004', deviceName: 'ROB-01', lossValue: 0.8 },
      { deviceId: 'D005', deviceName: 'CONV-01', lossValue: 0.9 },
    ] },
  { type: '速度损失', value: 7.3, percentage: 14.6, category: 'performance', trend: 'down',
    devices: [
      { deviceId: 'D001', deviceName: 'CNC-01', lossValue: 2.0 }, { deviceId: 'D002', deviceName: 'CNC-02', lossValue: 1.7 },
      { deviceId: 'D003', deviceName: 'INJ-01', lossValue: 1.4 }, { deviceId: 'D004', deviceName: 'ROB-01', lossValue: 1.2 },
      { deviceId: 'D005', deviceName: 'CONV-01', lossValue: 1.0 },
    ] },
  { type: '微小停顿', value: 4.6, percentage: 9.2, category: 'performance', trend: 'up',
    devices: [
      { deviceId: 'D001', deviceName: 'CNC-01', lossValue: 1.3 }, { deviceId: 'D002', deviceName: 'CNC-02', lossValue: 1.1 },
      { deviceId: 'D003', deviceName: 'INJ-01', lossValue: 0.9 }, { deviceId: 'D004', deviceName: 'ROB-01', lossValue: 0.7 },
      { deviceId: 'D005', deviceName: 'CONV-01', lossValue: 0.6 },
    ] },
  { type: '不良品返工', value: 5.1, percentage: 10.2, category: 'quality', trend: 'flat',
    devices: [
      { deviceId: 'D001', deviceName: 'CNC-01', lossValue: 1.4 }, { deviceId: 'D002', deviceName: 'CNC-02', lossValue: 1.2 },
      { deviceId: 'D003', deviceName: 'INJ-01', lossValue: 1.0 }, { deviceId: 'D004', deviceName: 'ROB-01', lossValue: 0.8 },
      { deviceId: 'D005', deviceName: 'CONV-01', lossValue: 0.7 },
    ] },
  { type: '首件不良', value: 2.4, percentage: 4.8, category: 'quality', trend: 'down',
    devices: [
      { deviceId: 'D001', deviceName: 'CNC-01', lossValue: 0.7 }, { deviceId: 'D002', deviceName: 'CNC-02', lossValue: 0.6 },
      { deviceId: 'D003', deviceName: 'INJ-01', lossValue: 0.5 }, { deviceId: 'D004', deviceName: 'ROB-01', lossValue: 0.4 },
      { deviceId: 'D005', deviceName: 'CONV-01', lossValue: 0.2 },
    ] },
];

const mockDevicesOEE: DeviceOEEItem[] = [
  { deviceId: 'D001', deviceName: 'CNC-01', availability: 82.1, performance: 91.5, quality: 97.8, oee: 73.5, target: 75.0, status: 'warning', topLoss: '速度损失', topLossValue: 2.0 },
  { deviceId: 'D002', deviceName: 'CNC-02', availability: 85.3, performance: 89.2, quality: 98.1, oee: 74.7, target: 75.0, status: 'warning', topLoss: '设备故障', topLossValue: 1.5 },
  { deviceId: 'D003', deviceName: 'INJ-01', availability: 88.0, performance: 87.5, quality: 96.5, oee: 74.3, target: 78.0, status: 'critical', topLoss: '换型调整', topLossValue: 1.1 },
  { deviceId: 'D004', deviceName: 'ROB-01', availability: 91.2, performance: 93.8, quality: 98.5, oee: 84.1, target: 80.0, status: 'good', topLoss: '速度损失', topLossValue: 1.2 },
  { deviceId: 'D005', deviceName: 'CONV-01', availability: 86.7, performance: 88.0, quality: 97.2, oee: 74.1, target: 75.0, status: 'warning', topLoss: '计划停机', topLossValue: 1.6 },
  { deviceId: 'D006', deviceName: 'WLD-01', availability: 83.5, performance: 90.1, quality: 97.0, oee: 72.7, target: 75.0, status: 'critical', topLoss: '设备故障', topLossValue: 1.8 },
  { deviceId: 'D007', deviceName: 'PAK-01', availability: 89.0, performance: 92.0, quality: 98.0, oee: 79.3, target: 78.0, status: 'good', topLoss: '速度损失', topLossValue: 0.8 },
  { deviceId: 'D008', deviceName: 'QC-01', availability: 92.5, performance: 95.0, quality: 99.0, oee: 86.8, target: 85.0, status: 'good', topLoss: '微小停顿', topLossValue: 0.5 },
];

const mockImprovementPaths: ImprovementPath[] = [
  { id: 'ip1', name: 'TPM全员生产维护', category: '设备管理', impact: 92, effort: 4, cost: 150, roi: 280, description: '建立TPM体系，减少计划外停机', steps: ['设备状态评估', '自主维护培训', '计划维护优化', '效果跟踪'], estimatedTime: '6个月', color: '#10b981' },
  { id: 'ip2', name: 'SMED快速换型', category: '换型优化', impact: 85, effort: 3, cost: 80, roi: 200, description: '缩短换型时间，提升设备利用率', steps: ['换型流程分析', '内外作业分离', '标准化操作', '验证测试'], estimatedTime: '3个月', color: '#3b82f6' },
  { id: 'ip3', name: 'FMS柔性制造升级', category: '自动化', impact: 78, effort: 5, cost: 500, roi: 320, description: '升级FMS系统，提升产线柔性和效率', steps: ['需求分析', '方案设计', '设备采购', '安装调试', '人员培训'], estimatedTime: '12个月', color: '#8b5cf6' },
  { id: 'ip4', name: '质量在线检测', category: '质量管理', impact: 70, effort: 3, cost: 120, roi: 180, description: '部署在线质量检测，降低不良率', steps: ['检测方案设计', '传感器选型', '系统集成', '算法训练'], estimatedTime: '4个月', color: '#f59e0b' },
  { id: 'ip5', name: '预测性维护', category: '智能维护', impact: 88, effort: 4, cost: 200, roi: 250, description: '基于AI的预测性维护，减少意外停机', steps: ['数据采集', '模型训练', '预警系统部署', '闭环优化'], estimatedTime: '8个月', color: '#ef4444' },
  { id: 'ip6', name: '操作员多能工培训', category: '人员发展', impact: 65, effort: 2, cost: 30, roi: 150, description: '提升操作员技能覆盖度，减少瓶颈', steps: ['技能矩阵评估', '培训计划制定', '实操考核', '认证管理'], estimatedTime: '2个月', color: '#06b6d4' },
  { id: 'ip7', name: '备件库存优化', category: '供应链管理', impact: 55, effort: 2, cost: 50, roi: 120, description: '优化备件库存，减少等待时间', steps: ['ABC分析', '安全库存计算', '供应商协议', '系统上线'], estimatedTime: '3个月', color: '#ec4899' },
  { id: 'ip8', name: '能源管理系统', category: '能源优化', impact: 45, effort: 3, cost: 100, roi: 90, description: '部署EMS，优化能耗，间接提升效率', steps: ['能耗审计', '监控部署', '策略制定', '持续改进'], estimatedTime: '5个月', color: '#14b8a6' },
];

const mockRootCauseChains: RootCauseChain[] = [
  { id: 'rc1', rootCause: '刀具磨损导致加工精度下降', category: '设备老化', impactDevices: ['CNC-01', 'CNC-02'], impactValue: 1.2, evidence: '连续3批次首检不合格，刀具寿命统计显示平均寿命下降15%', severity: 'high' },
  { id: 'rc2', rootCause: '冷却液浓度不达标', category: '维护缺失', impactDevices: ['CNC-01', 'CNC-02', 'INJ-01'], impactValue: 0.8, evidence: '水质检测报告pH值偏低，操作工未按时添加浓缩液', severity: 'medium' },
  { id: 'rc3', rootCause: 'PLC程序逻辑缺陷', category: '软件问题', impactDevices: ['INJ-01'], impactValue: 1.5, evidence: '注塑机在特定模具下频繁报异常，程序回滚后恢复正常', severity: 'high' },
  { id: 'rc4', rootCause: '原料批次波动', category: '原材料', impactDevices: ['INJ-01', 'CONV-01'], impactValue: 0.6, evidence: '原料供应商切换后，产品尺寸Cpk值从1.67降至1.33', severity: 'medium' },
  { id: 'rc5', rootCause: '环境温湿度变化', category: '环境因素', impactDevices: ['QC-01'], impactValue: 0.4, evidence: '夏季高温期间检测精度波动，空调故障修复后恢复', severity: 'low' },
  { id: 'rc6', rootCause: '操作员操作不规范', category: '人为因素', impactDevices: ['ROB-01', 'WLD-01'], impactValue: 0.5, evidence: '新操作员上岗后，设备报异常频率增加20%', severity: 'medium' },
];

const mockWhatIfParams: WhatIfParam[] = [
  { id: 'w1', name: '平均故障间隔(MTBF)', unit: '小时', current: 72, min: 24, max: 168, category: '可靠性', coefficient: 0.002, description: '设备可靠性核心指标，MTBF越高故障越少' },
  { id: 'w2', name: '换型时间', unit: '分钟', current: 25, min: 5, max: 60, category: '换型', coefficient: -0.003, description: '换型时间越短，设备利用率越高' },
  { id: 'w3', name: '计划维护频率', unit: '天', current: 7, min: 1, max: 30, category: '维护', coefficient: 0.001, description: '更频繁的计划维护可减少意外停机' },
  { id: 'w4', name: '不良率', unit: '%', current: 3.2, min: 0.5, max: 10, category: '质量', coefficient: -0.004, description: '不良率直接影响OEE质量维度' },
  { id: 'w5', name: '设备速度损失率', unit: '%', current: 8.5, min: 1, max: 20, category: '性能', coefficient: -0.003, description: '速度损失越小，设备性能越高' },
  { id: 'w6', name: '微小停顿频次', unit: '次/天', current: 15, min: 3, max: 50, category: '性能', coefficient: -0.001, description: '微小停顿越多，设备连续性越差' },
];

const baseOEE = 75.2;

/* ─── 辅助函数 ──────────────────────────────── */

function getTrendIcon(trend: 'up' | 'down' | 'flat') {
  if (trend === 'up') return <ArrowUpOutlined style={{ color: '#ef4444' }} />;
  if (trend === 'down') return <ArrowUpOutlined style={{ color: '#10b981', transform: 'rotate(180deg)' }} />;
  return <span style={{ color: '#9ca3af' }}>—</span>;
}

function getStatusTag(status: 'good' | 'warning' | 'critical') {
  const configs = { good: { color: '#10b981', text: '良好' }, warning: { color: '#f59e0b', text: '警告' }, critical: { color: '#ef4444', text: '严重' } };
  const c = configs[status];
  return <Tag color={c.color}>{c.text}</Tag>;
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = { availability: '#ef4444', performance: '#f59e0b', quality: '#3b82f6' };
  return colors[category] ?? '#9ca3af';
}

/* ─── 子组件 ──────────────────────────────── */

function StatCard({ title, value, unit, trend, icon, color, isCompact: compact }: {
  title: string; value: string | number; unit?: string; trend?: 'up' | 'down' | 'flat';
  icon: React.ReactNode; color: string; isCompact?: boolean;
}) {
  const isCompact = compact ?? false;
  return (
    <div style={{
      padding: isCompact ? '12px 14px' : '16px 20px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 8,
      border: `1px solid ${color}30`,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {icon}
        <Text style={{ fontSize: isCompact ? 11 : 12, color: 'rgba(255,255,255,0.6)' }}>{title}</Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: isCompact ? 22 : 28, fontWeight: 700, color }}>{value}</span>
        {unit && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{unit}</span>}
        {trend && <span style={{ marginLeft: 4 }}>{getTrendIcon(trend)}</span>}
      </div>
    </div>
  );
}

function LossList({ losses, isCompact: compact }: { losses: LossData[]; isCompact?: boolean }) {
  const isCompact = compact ?? false;
  const sorted = [...losses].sort((a, b) => b.value - a.value);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 6 : 8 }}>
      {sorted.map((item) => (
        <div key={item.type} style={{
          display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 10,
          padding: isCompact ? '6px 10px' : '8px 14px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 6,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: getCategoryColor(item.category), flexShrink: 0 }} />
          <Text style={{ flex: 1, fontSize: isCompact ? 11 : 13, color: '#fff' }}>{item.type}</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: isCompact ? 11 : 13, color: getCategoryColor(item.category) }}>
              {item.value}%
            </Text>
            {getTrendIcon(item.trend)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Tab 1: 损失诊断
   ═══════════════════════════════════════════════ */

function LossRadarTab() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  const radarOption = useMemo(() => ({
    backgroundColor: 'transparent',
    textStyle: { color: 'rgba(255,255,255,0.8)', fontSize: isCompact ? 10 : 12 },
    tooltip: { trigger: 'item' as const, backgroundColor: 'rgba(7,10,26,0.95)', borderColor: 'rgba(255,255,255,0.1)' },
    legend: {
      data: ['设备可用率损失', '设备性能损失', '产品质量损失'],
      textStyle: { color: 'rgba(255,255,255,0.7)', fontSize: isCompact ? 10 : 11 },
      bottom: isCompact ? 0 : 10,
      itemWidth: isCompact ? 12 : 16, itemHeight: isCompact ? 8 : 10,
    },
    radar: {
      indicator: mockLosses.map((l) => ({ name: l.type, max: 10 })),
      shape: 'polygon', center: ['50%', '45%'],
      radius: isCompact ? 110 : 150,
      axisName: { color: 'rgba(255,255,255,0.8)', fontSize: isCompact ? 9 : 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
    },
    series: [{
      type: 'radar', symbol: 'circle', symbolSize: 4,
      data: [
        { value: mockLosses.filter((l) => l.category === 'availability').map((l) => l.value), name: '设备可用率损失', lineStyle: { color: '#ef4444', width: 2 }, areaStyle: { color: 'rgba(239,68,68,0.2)' }, itemStyle: { color: '#ef4444' } },
        { value: mockLosses.filter((l) => l.category === 'performance').map((l) => l.value), name: '设备性能损失', lineStyle: { color: '#f59e0b', width: 2 }, areaStyle: { color: 'rgba(245,158,11,0.2)' }, itemStyle: { color: '#f59e0b' } },
        { value: mockLosses.filter((l) => l.category === 'quality').map((l) => l.value), name: '产品质量损失', lineStyle: { color: '#3b82f6', width: 2 }, areaStyle: { color: 'rgba(59,130,246,0.2)' }, itemStyle: { color: '#3b82f6' } },
      ],
    }],
  }), [isCompact]);

  const availLoss = mockLosses.filter((l) => l.category === 'availability').reduce((s, l) => s + l.value, 0);
  const perfLoss = mockLosses.filter((l) => l.category === 'performance').reduce((s, l) => s + l.value, 0);
  const qualLoss = mockLosses.filter((l) => l.category === 'quality').reduce((s, l) => s + l.value, 0);

  const topLoss = [...mockLosses].sort((a, b) => b.value - a.value)[0];
  const rootDevices = topLoss.devices.sort((a, b) => b.lossValue - a.lossValue);
  const rootDevice = rootDevices[0];

  // 损失热力图数据
  const lossTypes = mockLosses.map(l => l.type);
  const deviceNames = [...new Set(mockLosses.flatMap(l => l.devices.map(d => d.deviceName)))];
  const heatmapData = mockLosses.flatMap(l =>
    l.devices.map(d => [lossTypes.indexOf(l.type), deviceNames.indexOf(d.deviceName), d.lossValue])
  );

  const heatmapOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: isCompact ? 80 : 100, right: 20, top: 10, bottom: isCompact ? 60 : 80 },
    xAxis: { type: 'category' as const, data: lossTypes, axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: isCompact ? 8 : 9, rotate: 30 }, splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } } },
    yAxis: { type: 'category' as const, data: deviceNames, axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: isCompact ? 9 : 10 }, splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } } },
    visualMap: { min: 0, max: 2.5, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#070A1A', '#1a237e', '#ef4444'] }, textStyle: { color: 'rgba(255,255,255,0.4)' } },
    series: [{ type: 'heatmap' as const, data: heatmapData, label: { show: true, color: 'rgba(255,255,255,0.8)', fontSize: isCompact ? 9 : 10 }, itemStyle: { borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } } }],
  }), [isCompact]);

  // OEE 散点气泡图
  const scatterOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 50, right: 20, top: 30, bottom: 30 },
    tooltip: { trigger: 'item' as const, backgroundColor: 'rgba(7,10,26,0.95)', borderColor: 'rgba(255,255,255,0.1)', formatter: (p: any) => `<div>${p.name}</div><div>可用率: ${p.data[0]}% | 性能率: ${p.data[1]}% | 质量率: ${p.data[2]}% | OEE: ${p.data[3]}%</div>` },
    xAxis: { name: '可用率 (%)', nameTextStyle: { color: 'rgba(255,255,255,0.4)', fontSize: 10 }, type: 'value' as const, min: 75, max: 100, axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
    yAxis: { name: '性能率 (%)', nameTextStyle: { color: 'rgba(255,255,255,0.4)', fontSize: 10 }, type: 'value' as const, min: 80, max: 100, axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
    series: [{
      type: 'scatter' as const, symbolSize: (d: number[]) => Math.max(12, Math.min(40, d[2] * 0.4)),
      data: mockDevicesOEE.map(d => ({ name: d.deviceName, value: [d.availability, d.performance, d.quality, d.oee], itemStyle: { color: d.status === 'good' ? '#10b981' : d.status === 'warning' ? '#f59e0b' : '#ef4444', shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.3)' } })),
      label: { show: true, formatter: (p: any) => p.name, color: 'rgba(255,255,255,0.7)', fontSize: isCompact ? 9 : 10, position: 'right' },
    }],
  }), [isCompact]);

  // 损失趋势预测
  const days = ['6/26', '6/27', '6/28', '6/29', '6/30', '7/1', '7/2'];
  const trendColors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
  const trendSeries = mockLosses.map((loss, idx) => ({
    name: loss.type,
    type: 'line' as const,
    smooth: true,
    data: Array.from({ length: 7 }, (_, i) => {
      const base = loss.value;
      const noise = Math.sin(i * 0.7 + idx) * 1.5;
      const drift = (i - 3) * (loss.trend === 'up' ? 0.3 : loss.trend === 'down' ? -0.3 : 0.05);
      return Math.max(0, Math.min(10, +(base + noise + drift).toFixed(1)));
    }),
    lineStyle: { color: trendColors[idx % trendColors.length], width: 1.5 },
    itemStyle: { color: trendColors[idx % trendColors.length] },
    symbolSize: 3,
    areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: `${trendColors[idx % trendColors.length]}25` }, { offset: 1, color: `${trendColors[idx % trendColors.length]}01` }] } },
  }));

  const trendOption = useMemo(() => ({
    backgroundColor: 'transparent',
    legend: { data: mockLosses.map(l => l.type), textStyle: { color: 'rgba(255,255,255,0.5)', fontSize: isCompact ? 8 : 9 }, bottom: 0, itemWidth: 10, itemHeight: 6 },
    grid: { left: 45, right: 15, top: 10, bottom: isCompact ? 50 : 60 },
    tooltip: { trigger: 'axis' as const, backgroundColor: 'rgba(7,10,26,0.95)', borderColor: 'rgba(255,255,255,0.1)' },
    xAxis: { type: 'category' as const, data: days, axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: isCompact ? 8 : 9 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } } },
    yAxis: { type: 'value' as const, name: '损失率 (%)', nameTextStyle: { color: 'rgba(255,255,255,0.25)', fontSize: 9 }, axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
    series: trendSeries,
  }), [isCompact]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 12 : 20 }}>
      {/* AI 诊断摘要卡片 */}
      <div style={{
        padding: isCompact ? 12 : 16,
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <WarningOutlined style={{ color: '#3B82F6', fontSize: 16 }} />
          <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#3B82F6' }}>AI 诊断结果</Text>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '8px 12px', flex: 1, minWidth: 180 }}>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.5)', display: 'block' }}>最大损失因子</Text>
              <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 700, color: '#ef4444' }}>{topLoss.type} ({topLoss.percentage}%)</Text>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '8px 12px', flex: 1, minWidth: 180 }}>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.5)', display: 'block' }}>根因定位</Text>
              <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 700, color: '#f59e0b' }}>{rootDevice?.deviceName} 贡献 {rootDevice?.lossValue}%</Text>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '8px 12px', flex: 1, minWidth: 180 }}>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.5)', display: 'block' }}>改善建议</Text>
              <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 700, color: '#10b981' }}>SMED快速换模 · OEE预期+6.2%</Text>
            </div>
          </div>
        </div>
      </div>

      {/* OEE 统计概览 */}
      <div style={{ display: 'flex', gap: isCompact ? 10 : 16, flexWrap: 'wrap' }}>
        <StatCard title="可用率损失" value={availLoss.toFixed(1)} unit="%" trend="down" icon={<FireOutlined />} color="#ef4444" isCompact={isCompact} />
        <StatCard title="性能损失" value={perfLoss.toFixed(1)} unit="%" trend="down" icon={<ThunderboltOutlined />} color="#f59e0b" isCompact={isCompact} />
        <StatCard title="质量损失" value={qualLoss.toFixed(1)} unit="%" trend="flat" icon={<AimOutlined />} color="#3b82f6" isCompact={isCompact} />
        <StatCard title="总损失" value={(availLoss + perfLoss + qualLoss).toFixed(1)} unit="%" trend="down" icon={<ExclamationCircleOutlined />} color="#ec4899" isCompact={isCompact} />
      </div>

      {/* 雷达图 + 损失排名 */}
      <div style={{ display: 'flex', gap: isCompact ? 10 : 20, flexWrap: 'wrap' }}>
        <div style={{ flex: isCompact ? '100%' : '1.5', minWidth: 0 }}>
          <div style={{ padding: isCompact ? 12 : 20, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 10, display: 'block' }}>
              <BarChartOutlined style={{ marginRight: 6 }} />OEE 损失雷达图
            </Text>
            <ReactECharts option={radarOption} style={{ height: isCompact ? 280 : 380 }} />
          </div>
        </div>
        <div style={{ flex: isCompact ? '100%' : 1, minWidth: isCompact ? 0 : 280 }}>
          <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 10, display: 'block' }}>
              <FireOutlined style={{ marginRight: 6 }} />损失排名
            </Text>
            <LossList losses={mockLosses} isCompact={isCompact} />
          </div>
        </div>
      </div>

      {/* 损失热力图 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 10, display: 'block' }}>
          <FireOutlined style={{ marginRight: 6 }} />设备 × 损失类型热力图
        </Text>
        <ReactECharts option={heatmapOption} style={{ height: isCompact ? 250 : 320 }} />
      </div>

      {/* OEE 散点气泡图 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 10, display: 'block' }}>
          <ExperimentOutlined style={{ marginRight: 6 }} />OEE 散点气泡图
        </Text>
        <ReactECharts option={scatterOption} style={{ height: isCompact ? 280 : 380 }} />
      </div>

      {/* 损失趋势预测 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 10, display: 'block' }}>
          <ThunderboltOutlined style={{ marginRight: 6 }} />损失趋势预测（近7天 + 未来预测）
        </Text>
        <ReactECharts option={trendOption} style={{ height: isCompact ? 280 : 380 }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Tab 2: 根因追溯
   ═══════════════════════════════════════════════ */

interface WorkOrderLink {
  woId: string; woCode: string; deviceName: string; faultType: string; rootCause: string; resolved: boolean; date: string;
}

interface AttributionDim {
  dimension: string; items: { name: string; value: number; percentage: number }[];
}

const mockWOLinks: WorkOrderLink[] = [
  { woId: 'wo001', woCode: 'WO-20260615-001', deviceName: 'CNC-01', faultType: '加工精度超差', rootCause: '刀具磨损', resolved: true, date: '2026-06-15' },
  { woId: 'wo002', woCode: 'WO-20260618-003', deviceName: 'CNC-02', faultType: '主轴异响', rootCause: '刀具磨损', resolved: true, date: '2026-06-18' },
  { woId: 'wo003', woCode: 'WO-20260622-007', deviceName: 'INJ-01', faultType: '注塑温度异常', rootCause: 'PLC程序逻辑缺陷', resolved: true, date: '2026-06-22' },
  { woId: 'wo004', woCode: 'WO-20260625-002', deviceName: 'CNC-01', faultType: '冷却液泄漏', rootCause: '冷却液浓度不达标', resolved: false, date: '2026-06-25' },
  { woId: 'wo005', woCode: 'WO-20260628-001', deviceName: 'ROB-01', faultType: '定位偏差', rootCause: '操作员操作不规范', resolved: true, date: '2026-06-28' },
  { woId: 'wo006', woCode: 'WO-20260701-005', deviceName: 'CONV-01', faultType: '传送速度波动', rootCause: '原料批次波动', resolved: false, date: '2026-07-01' },
];

const mockAttribution: AttributionDim[] = [
  { dimension: '班次', items: [{ name: '白班', value: 42, percentage: 42 }, { name: '中班', value: 33, percentage: 33 }, { name: '夜班', value: 25, percentage: 25 }] },
  { dimension: '产品类型', items: [{ name: '精密件A', value: 38, percentage: 38 }, { name: '标准件B', value: 35, percentage: 35 }, { name: '非标件C', value: 27, percentage: 27 }] },
  { dimension: '操作员', items: [{ name: '张师傅', value: 15, percentage: 15 }, { name: '李师傅', value: 28, percentage: 28 }, { name: '王师傅', value: 32, percentage: 32 }, { name: '赵师傅', value: 25, percentage: 25 }] },
];

function RootCauseTab() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const severityConfig = { high: { color: '#ef4444', label: '严重' }, medium: { color: '#f59e0b', label: '中等' }, low: { color: '#9ca3af', label: '轻微' } };

  const attributionOptions = useMemo(() => mockAttribution.map((dim) => ({
    backgroundColor: 'transparent',
    grid: { left: 80, right: 10, top: 20, bottom: 25 },
    xAxis: { type: 'value' as const, axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
    yAxis: { type: 'category' as const, data: dim.items.map((i) => i.name).reverse(), axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10 } },
    series: [{ type: 'bar' as const, data: dim.items.map((i) => i.value).reverse(), barWidth: 14, itemStyle: { borderRadius: [0, 4, 4, 0], color: { type: 'linear' as const, x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.4)' }, { offset: 1, color: '#3B82F6' }] } } }],
  })), []);

  // 设备对标
  const sortedDevices = [...mockDevicesOEE].sort((a, b) => b.oee - a.oee);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 12 : 20 }}>
      {/* a) 损失因子钻取 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>
          <WarningOutlined style={{ marginRight: 6 }} />损失因子钻取 · TOP6 根因链
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {mockRootCauseChains.map((rc) => {
            const sc = severityConfig[rc.severity];
            return (
              <div key={rc.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: isCompact ? '8px 10px' : '10px 14px',
                background: rc.severity === 'high' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                border: rc.severity === 'high' ? '1px solid rgba(239,68,68,0.15)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 6,
              }}>
                <Tag color={sc.color} style={{ borderRadius: 4, fontSize: 9, padding: '0 4px', lineHeight: '18px', border: 'none', flexShrink: 0 }}>{sc.label}</Tag>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: isCompact ? 11 : 12, color: '#fff', fontWeight: 600 }}>{rc.rootCause}</Text>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)' }}>影响: {rc.impactDevices.join(', ')}</Text>
                    <Text style={{ fontSize: isCompact ? 9 : 10, color: '#ef4444' }}>损失: {rc.impactValue}%</Text>
                  </div>
                  <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginTop: 2 }}>{rc.evidence}</Text>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* b) 关联工单链 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>
          <ToolOutlined style={{ marginRight: 6 }} />关联工单链
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {mockWOLinks.map((wo) => (
            <div key={wo.woId} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isCompact ? '6px 8px' : '8px 12px',
              background: 'rgba(255,255,255,0.02)', borderRadius: 6,
            }}>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)', width: 130, flexShrink: 0 }}>{wo.woCode}</Text>
              <Text style={{ fontSize: isCompact ? 10 : 11, color: '#fff', width: 70, flexShrink: 0 }}>{wo.deviceName}</Text>
              <Text style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.6)', flex: 1 }}>{wo.faultType}</Text>
              <Tag color={wo.resolved ? 'success' : 'warning'} style={{ borderRadius: 4, fontSize: 9, padding: '0 4px', lineHeight: '18px', border: 'none' }}>{wo.resolved ? '已解决' : '待处理'}</Tag>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.3)' }}>{wo.date}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* c) 多维归因分析 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 16, display: 'block' }}>
          <ExperimentOutlined style={{ marginRight: 6 }} />多维归因分析
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(3, 1fr)', gap: isCompact ? 12 : 16 }}>
          {mockAttribution.map((dim, idx) => (
            <div key={dim.dimension}>
              <Text style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.6)', marginBottom: 8, display: 'block' }}>{dim.dimension}</Text>
              <ReactECharts option={attributionOptions[idx]} style={{ height: isCompact ? 120 : 150 }} />
            </div>
          ))}
        </div>
      </div>

      {/* d) 设备族群对标 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>
          <AimOutlined style={{ marginRight: 6 }} />设备族群对标
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sortedDevices.map((d, idx) => (
            <div key={d.deviceId} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: isCompact ? '4px 8px' : '6px 12px',
              background: idx === 0 ? 'rgba(16,185,129,0.06)' : 'transparent', borderRadius: 6,
            }}>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: idx === 0 ? '#10b981' : 'rgba(255,255,255,0.4)', width: 20 }}>#{idx + 1}</Text>
              <Text style={{ fontSize: isCompact ? 10 : 11, color: '#fff', width: 70 }}>{d.deviceName}</Text>
              <Progress percent={Math.round(d.oee)} size="small" strokeColor={d.status === 'good' ? '#10b981' : d.status === 'warning' ? '#f59e0b' : '#ef4444'} showInfo={false} style={{ flex: 1 }} />
              <Text style={{ fontSize: isCompact ? 10 : 11, color: d.oee >= (d.target || 75) ? '#10b981' : '#ef4444', fontWeight: 600, width: 40, textAlign: 'right' }}>{d.oee.toFixed(1)}%</Text>
              {idx === 0 && <Tag color="#10b981" style={{ borderRadius: 4, fontSize: 9, padding: '0 4px', lineHeight: '18px', border: 'none' }}>标杆</Tag>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Tab 3: 改善推演
   ═══════════════════════════════════════════════ */

interface ImprovementTracking {
  id: string; name: string; status: '进行中' | '已完成' | '未开始';
  startDate: string; actualOEEDelta: number; expectedOEEDelta: number;
}

const mockTracking: ImprovementTracking[] = [
  { id: 'tr1', name: 'SMED快速换型', status: '进行中', startDate: '2026-05-01', actualOEEDelta: 2.1, expectedOEEDelta: 6.2 },
  { id: 'tr2', name: 'TPM全员生产维护', status: '进行中', startDate: '2026-04-15', actualOEEDelta: 3.5, expectedOEEDelta: 8.0 },
  { id: 'tr3', name: '质量在线检测', status: '已完成', startDate: '2026-03-01', actualOEEDelta: 4.8, expectedOEEDelta: 5.0 },
  { id: 'tr4', name: '操作员多能工培训', status: '未开始', startDate: '-', actualOEEDelta: 0, expectedOEEDelta: 2.0 },
];

function ImprovementTab() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  // ── What-if 逻辑 ──
  const [params, setParams] = useState(mockWhatIfParams.map((p) => ({ ...p, adjusted: p.current })));
  const [baselineSaved, setBaselineSaved] = useState(false);

  const currentOEE = useMemo(() => {
    let delta = 0;
    params.forEach((p) => { delta += p.coefficient * (p.adjusted - p.current) * 10; });
    return Math.max(0, Math.min(100, baseOEE + delta));
  }, [params]);
  const deltaOEE = useMemo(() => currentOEE - baseOEE, [currentOEE]);

  const handleSliderChange = (id: string, value: number) => {
    setParams((prev) => prev.map((p) => (p.id === id ? { ...p, adjusted: value } : p)));
  };
  const resetAll = () => {
    setParams(mockWhatIfParams.map((p) => ({ ...p, adjusted: p.current })));
    setBaselineSaved(false);
  };

  const results = useMemo(() =>
    params.map((p) => ({ parameter: p.name, originalValue: p.current, newValue: p.adjusted, delta: p.adjusted - p.current, oeeImpact: p.coefficient * (p.adjusted - p.current) * 10 })),
  [params]);

  // 改善路径
  const sortedPaths = [...mockImprovementPaths].sort((a, b) => b.roi - a.roi);

  // ROI 图表
  const roiOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { left: 90, right: 30, top: 10, bottom: isCompact ? 40 : 50 },
    xAxis: { type: 'value' as const, name: 'ROI (%)', nameTextStyle: { color: 'rgba(255,255,255,0.3)', fontSize: 9 }, axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } } },
    yAxis: { type: 'category' as const, data: sortedPaths.map(p => p.name).reverse(), axisLabel: { color: 'rgba(255,255,255,0.7)', fontSize: isCompact ? 8 : 10 } },
    series: [{
      type: 'bar' as const, data: sortedPaths.map(p => ({ value: p.roi, itemStyle: { color: p.color, borderRadius: [0, 4, 4, 0] } })).reverse(),
      barWidth: isCompact ? 12 : 16,
    }],
  }), [isCompact]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 12 : 20 }}>
      {/* a) 改善路径规划 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>
          <RocketOutlined style={{ marginRight: 6 }} />改善路径规划
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(2, 1fr)', gap: isCompact ? 8 : 10 }}>
          {sortedPaths.map((p) => (
            <div key={p.id} style={{
              padding: isCompact ? '8px 10px' : '10px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${p.color}30`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <Text style={{ fontSize: isCompact ? 11 : 12, color: '#fff', fontWeight: 600 }}>{p.name}</Text>
                <Tag color={p.color} style={{ borderRadius: 4, fontSize: 9, padding: '0 4px', lineHeight: '18px', border: 'none', marginLeft: 'auto' }}>{p.category}</Tag>
              </div>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>{p.description}</Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)' }}>影响度</Text>
                  <Progress percent={p.impact} size="small" strokeColor={p.color} showInfo={false} />
                </div>
                <div style={{ flex: 1 }}>
                  <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)' }}>难度</Text>
                  <Progress percent={p.effort * 20} size="small" strokeColor="#f59e0b" showInfo={false} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.3)' }}>预计 {p.estimatedTime}</Text>
                <Text style={{ fontSize: isCompact ? 8 : 9, color: '#10b981' }}>ROI {p.roi}%</Text>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* b) ROI 估算 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>
          <DollarOutlined style={{ marginRight: 6 }} />ROI 估算 · 改善投入 vs 预期收益
        </Text>
        <ReactECharts option={roiOption} style={{ height: isCompact ? 250 : 320 }} />
        <div style={{ display: 'grid', gridTemplateColumns: isCompact ? '1fr' : 'repeat(3, 1fr)', gap: isCompact ? 6 : 10, marginTop: 12 }}>
          {sortedPaths.slice(0, 3).map((p) => (
            <div key={p.id} style={{ padding: isCompact ? '6px 8px' : '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, border: `1px solid ${p.color}20` }}>
              <Text style={{ fontSize: isCompact ? 10 : 11, color: '#fff' }}>{p.name}</Text>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.5)' }}>投入 ¥{p.cost}万</Text>
                <Text style={{ fontSize: isCompact ? 9 : 10, color: '#10b981' }}>收益 ¥{Math.round(p.cost * p.roi / 100)}万</Text>
              </div>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: '#3b82f6' }}>回收期 {Math.round(p.cost / (p.cost * p.roi / 100 / 12))}个月</Text>
            </div>
          ))}
        </div>
      </div>

      {/* c) What-if 模拟器 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>
          <ExperimentOutlined style={{ marginRight: 6 }} />What-if 模拟 · 损失推演
        </Text>
        <div style={{ display: 'flex', gap: isCompact ? 12 : 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Text style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.6)', display: 'block' }}>基线 OEE</Text>
            <span style={{ fontSize: isCompact ? 22 : 28, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{baseOEE}%</span>
          </div>
          <div>
            <Text style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.6)', display: 'block' }}>模拟后 OEE</Text>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: isCompact ? 28 : 36, fontWeight: 700, color: deltaOEE >= 0 ? '#10b981' : '#ef4444' }}>{currentOEE.toFixed(1)}%</span>
              <Tag color={deltaOEE >= 0 ? '#10b981' : '#ef4444'}>{deltaOEE >= 0 ? '↑' : '↓'} {Math.abs(deltaOEE).toFixed(1)}%</Tag>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <Button type={baselineSaved ? 'primary' : 'default'} icon={<CheckCircleOutlined />} onClick={() => setBaselineSaved(true)} size={isCompact ? 'small' : 'middle'}>保存基线</Button>
            <Button icon={<RocketOutlined />} onClick={resetAll} size={isCompact ? 'small' : 'middle'}>重置</Button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 10 : 14 }}>
          {params.map((p) => (
            <div key={p.id} style={{ padding: isCompact ? '8px 10px' : '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: isCompact ? 11 : 12, color: '#fff' }}>{p.name}</Text>
                  <Tag color="warning" style={{ fontSize: 9, padding: '0 4px', lineHeight: '16px' }}>{p.category}</Tag>
                </div>
                <Text style={{ fontSize: isCompact ? 10 : 11, color: p.adjusted !== p.current ? '#10b981' : 'rgba(255,255,255,0.5)' }}>
                  {p.adjusted}{p.unit}
                  {p.adjusted !== p.current && <span style={{ color: p.adjusted > p.current ? '#10b981' : '#ef4444', marginLeft: 4 }}>({p.adjusted > p.current ? '+' : ''}{p.adjusted - p.current})</span>}
                </Text>
              </div>
              <Slider min={p.min} max={p.max} step={p.unit === '小时' || p.unit === '天' ? 1 : 0.1} value={p.adjusted} onChange={(v) => handleSliderChange(p.id, v)} style={{ flex: 1 }} />
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.35)', display: 'block', marginTop: 2 }}>{p.description}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* d) 改善闭环追踪 */}
      <div style={{ padding: isCompact ? 12 : 16, background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
        <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 600, color: '#fff', marginBottom: 12, display: 'block' }}>
          <CheckCircleOutlined style={{ marginRight: 6 }} />改善闭环追踪
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {mockTracking.map((tr) => {
            const statusColor = tr.status === '已完成' ? '#10b981' : tr.status === '进行中' ? '#3b82f6' : '#9ca3af';
            return (
              <div key={tr.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: isCompact ? '6px 8px' : '8px 12px',
                background: 'rgba(255,255,255,0.02)', borderRadius: 6,
              }}>
                <Tag color={statusColor} style={{ borderRadius: 4, fontSize: 9, padding: '0 4px', lineHeight: '18px', border: 'none', flexShrink: 0 }}>{tr.status}</Tag>
                <Text style={{ fontSize: isCompact ? 11 : 12, color: '#fff', fontWeight: 600, width: isCompact ? 80 : 120, flexShrink: 0 }}>{tr.name}</Text>
                <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)' }}>{tr.startDate}</Text>
                <div style={{ flex: 1 }}>
                  <Progress
                    percent={tr.status === '未开始' ? 0 : Math.round(tr.actualOEEDelta / tr.expectedOEEDelta * 100)}
                    size="small"
                    strokeColor={tr.status === '已完成' ? '#10b981' : '#3b82f6'}
                    showInfo={false}
                    format={() => ''}
                  />
                </div>
                <div style={{ textAlign: 'right', minWidth: 80 }}>
                  <Text style={{ fontSize: isCompact ? 9 : 10, color: '#10b981' }}>实际 +{tr.actualOEEDelta}%</Text>
                  <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>/ 预期 +{tr.expectedOEEDelta}%</Text>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════ */

export default function AuraOEE() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const [activeTab, setActiveTab] = useState('radar');

  const avgOEE = mockDevicesOEE.reduce((s, d) => s + d.oee, 0) / mockDevicesOEE.length;
  const avgAvail = mockDevicesOEE.reduce((s, d) => s + d.availability, 0) / mockDevicesOEE.length;
  const avgPerf = mockDevicesOEE.reduce((s, d) => s + d.performance, 0) / mockDevicesOEE.length;
  const avgQual = mockDevicesOEE.reduce((s, d) => s + d.quality, 0) / mockDevicesOEE.length;

  const tabItems = useMemo(() => [
    { key: 'radar', label: <span><BarChartOutlined /> <span style={{ marginLeft: 4 }}>损失诊断</span></span> },
    { key: 'matrix', label: <span><WarningOutlined /> <span style={{ marginLeft: 4 }}>根因追溯</span></span> },
    { key: 'whatif', label: <span><RocketOutlined /> <span style={{ marginLeft: 4 }}>改善推演</span></span> },
  ], []);

  return (
    <div style={{
      minHeight: '100%',
      padding: isCompact ? 12 : 20,
      background: 'rgba(7,10,26,0.85)',
      borderRadius: 12,
    }}>
      <div style={{ marginBottom: isCompact ? 12 : 16 }}>
        <Text style={{ fontSize: isCompact ? 16 : 20, fontWeight: 700, color: '#fff' }}>
          <ThunderboltOutlined style={{ marginRight: 8, color: '#f59e0b' }} />OEE 智能诊断
        </Text>
      </div>

      <div style={{ display: 'flex', gap: isCompact ? 8 : 16, marginBottom: isCompact ? 12 : 16, flexWrap: 'wrap' }}>
        <StatCard title="当前OEE" value={avgOEE.toFixed(1)} unit="%" trend="down" icon={<BarChartOutlined />} color="#3b82f6" isCompact={isCompact} />
        <StatCard title="可用率" value={avgAvail.toFixed(1)} unit="%" trend="down" icon={<ClockCircleOutlined />} color="#ef4444" isCompact={isCompact} />
        <StatCard title="性能率" value={avgPerf.toFixed(1)} unit="%" trend="flat" icon={<ThunderboltOutlined />} color="#f59e0b" isCompact={isCompact} />
        <StatCard title="质量率" value={avgQual.toFixed(1)} unit="%" trend="up" icon={<AimOutlined />} color="#10b981" isCompact={isCompact} />
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems.map((tab) => ({
          key: tab.key,
          label: tab.label,
          children: tab.key === 'radar' ? <LossRadarTab /> : tab.key === 'matrix' ? <RootCauseTab /> : <ImprovementTab />,
        }))}
        size={isCompact ? 'small' : 'middle'}
        style={{ background: 'transparent' }}
        tabBarStyle={{ margin: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}
      />
    </div>
  );
}
