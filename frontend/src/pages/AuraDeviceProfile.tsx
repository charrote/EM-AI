// @ts-nocheck
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  ApiOutlined,
  ArrowUpOutlined,
  MinusOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  BugOutlined,
  ClearOutlined,
  NodeIndexOutlined,
  FireOutlined,
  SwapOutlined,
  SearchOutlined,
  RightOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Tag, Select, Tooltip } from 'antd';
import ReactECharts from 'echarts-for-react';
import { useResponsive } from '../hooks/useResponsive';

/* ═══════════════════════════════════════════════════
   类型定义
   ═══════════════════════════════════════════════════ */

interface MetricPoint {
  time: string;
  value: number;
}

interface TimelineEvent {
  id: string;
  type: 'anomaly' | 'cleaning' | 'deviation' | 'maintenance';
  title: string;
  description: string;
  time: string;
  severity: 'low' | 'medium' | 'high';
  /** 穿透目标路由 */
  drillTo?: string;
  /** 穿透描述 */
  drillLabel?: string;
}

interface DeviceMetrics {
  temperature: number;
  rpm: number;
  load: number;
  pressure: number;
  vibration: number;
}

/** 模拟设备信息 */
interface MockDevice {
  id: string;
  name: string;
  code: string;
  type: string;
  area: string;
  line: string;
  status: string;
  baseHealth: number;
  baseTemp: number;
  baseRpm: number;
  baseLoad: number;
}

/** 本地模拟设备列表（无需后端 API） */
const MOCK_DEVICES: MockDevice[] = [
  { id: 'dev-cnc-001', name: 'CNC 立式加工中心 VMC-850', code: 'CNC-001', type: 'CNC', area: '金工车间', line: 'A线', status: 'running', baseHealth: 82, baseTemp: 68, baseRpm: 1450, baseLoad: 55 },
  { id: 'dev-cnc-002', name: 'CNC 卧式加工中心 HMC-630', code: 'CNC-002', type: 'CNC', area: '金工车间', line: 'A线', status: 'running', baseHealth: 76, baseTemp: 72, baseRpm: 1380, baseLoad: 62 },
  { id: 'dev-cold-001', name: '冷墩机 CF-24B', code: 'CF-001', type: '冷墩机', area: '成型车间', line: 'B线', status: 'running', baseHealth: 88, baseTemp: 65, baseRpm: 1200, baseLoad: 48 },
  { id: 'dev-cold-002', name: '冷墩机 CF-36A', code: 'CF-002', type: '冷墩机', area: '成型车间', line: 'B线', status: 'idle', baseHealth: 91, baseTemp: 42, baseRpm: 300, baseLoad: 15 },
  { id: 'dev-grind-001', name: '研磨机 G300', code: 'GR-001', type: '研磨机', area: '精加工车间', line: 'C线', status: 'running', baseHealth: 71, baseTemp: 78, baseRpm: 2200, baseLoad: 68 },
  { id: 'dev-grind-002', name: '研磨机 G500', code: 'GR-002', type: '研磨机', area: '精加工车间', line: 'C线', status: 'maintenance', baseHealth: 45, baseTemp: 82, baseRpm: 2100, baseLoad: 55 },
  { id: 'dev-inj-001', name: '注塑机 IS-280T', code: 'IS-001', type: '注塑机', area: '注塑车间', line: 'D线', status: 'running', baseHealth: 79, baseTemp: 180, baseRpm: 1100, baseLoad: 72 },
  { id: 'dev-laser-001', name: '激光切割机 LC-3015', code: 'LC-001', type: '激光切割机', area: '下料车间', line: 'E线', status: 'running', baseHealth: 93, baseTemp: 58, baseRpm: 2800, baseLoad: 42 },
  { id: 'dev-bend-001', name: '大型弯折机 B-160T', code: 'B-001', type: '大型弯折机', area: '成型车间', line: 'B线', status: 'fault', baseHealth: 35, baseTemp: 95, baseRpm: 600, baseLoad: 85 },
  { id: 'dev-vision-001', name: '全自动外观机 AV-200', code: 'AV-001', type: '全自动外观机', area: '质检车间', line: 'Q线', status: 'running', baseHealth: 87, baseTemp: 45, baseRpm: 1800, baseLoad: 38 },
];

/* ═══════════════════════════════════════════════════
   颜色与工具函数
   ═══════════════════════════════════════════════════ */

const HEALTH_COLORS = {
  excellent: '#22C55E',
  excellentBg: 'rgba(34,197,94,0.15)',
  good: '#3B82F6',
  goodBg: 'rgba(59,130,246,0.15)',
  fair: '#F59E0B',
  fairBg: 'rgba(245,158,11,0.15)',
  poor: '#EF4444',
  poorBg: 'rgba(239,68,68,0.15)',
  critical: '#7F1D1D',
  criticalBg: 'rgba(127,29,29,0.15)',
  textDim: 'rgba(255,255,255,0.35)',
  textMid: 'rgba(255,255,255,0.6)',
  textBright: 'rgba(255,255,255,0.85)',
};

function getHealthColor(score: number): string {
  if (score >= 85) return HEALTH_COLORS.excellent;
  if (score >= 70) return HEALTH_COLORS.good;
  if (score >= 50) return HEALTH_COLORS.fair;
  if (score >= 30) return HEALTH_COLORS.poor;
  return HEALTH_COLORS.critical;
}

function getHealthBg(score: number): string {
  if (score >= 85) return HEALTH_COLORS.excellentBg;
  if (score >= 70) return HEALTH_COLORS.goodBg;
  if (score >= 50) return HEALTH_COLORS.fairBg;
  if (score >= 30) return HEALTH_COLORS.poorBg;
  return HEALTH_COLORS.criticalBg;
}

function getHealthLabel(score: number): string {
  if (score >= 85) return '优秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '注意';
  if (score >= 30) return '较差';
  return '危急';
}

function getHealthIcon(score: number) {
  if (score >= 70) return <CheckCircleOutlined />;
  return <WarningOutlined />;
}

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function generateTimeLabels(count: number, intervalSec: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * intervalSec * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    labels.push(`${hh}:${mm}:${ss}`);
  }
  return labels;
}

function seededRandom(seed: number): () => number {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ═══════════════════════════════════════════════════
   模拟数据生成
   ═══════════════════════════════════════════════════ */

function generateMetrics(
  baseTemp: number, baseRpm: number, baseLoad: number,
  healthScore: number, deviceSeed: number,
): DeviceMetrics {
  const rng = seededRandom(deviceSeed + 999);
  const healthFactor = (100 - healthScore) / 100;

  return {
    temperature: Math.round((baseTemp + healthFactor * 18 + (rng() - 0.5) * 4) * 10) / 10,
    rpm: Math.round((baseRpm - healthFactor * 80 + (rng() - 0.5) * 20) * 10) / 10,
    load: Math.round(Math.min(100, Math.max(20, baseLoad + healthFactor * 25 + (rng() - 0.5) * 6)) * 10) / 10,
    pressure: Math.round((0.5 + healthFactor * 0.3 + (rng() - 0.5) * 0.05) * 100) / 100,
    vibration: Math.round((2.5 + healthFactor * 5 + (rng() - 0.5) * 0.8) * 10) / 10,
  };
}

function generateTimelineEvents(deviceSeed: number, healthScore: number): TimelineEvent[] {
  const rng = seededRandom(deviceSeed + 777);
  const events: TimelineEvent[] = [];
  const now = new Date();
  const types: TimelineEvent['type'][] = ['anomaly', 'cleaning', 'deviation', 'maintenance'];
  const severityPool: TimelineEvent['severity'][] = ['low', 'medium', 'high'];

  const anomalyTitles = ['温度异常跳变', '振动幅值超限', '电流波形畸变', '转速波动异常', '压力骤降'];
  const cleaningTitles = ['传感器数据清洗', '去噪滤波处理', '异常值剔除', '缺失值插补', '数据平滑'];
  const deviationTitles = ['振动基线偏离 12%', '温度基线偏离 8%', '负载基线偏离 15%', '转速基线偏离 6%', '压力基线偏离 10%'];
  const maintenanceTitles = ['轴承润滑保养', '电机巡检维护', '传感器校准', '传动皮带更换', '冷却系统检修'];

  const drillTargets: Record<string, string> = {
    '温度异常跳变': '查看时序图',
    '振动幅值超限': '查看频谱图',
    '电流波形畸变': '查看时序图',
    '振动基线偏离 12%': '查看健康基线',
    '温度基线偏离 8%': '查看健康基线',
    '传感器数据清洗': '查看清洗记录',
    '异常值剔除': '查看清洗记录',
  };

  const eventCount = 8 + Math.floor(rng() * 5);

  for (let i = 0; i < eventCount; i++) {
    const type = types[Math.floor(rng() * types.length)];
    const minutesAgo = i * 45 + Math.floor(rng() * 30);
    const eventTime = new Date(now.getTime() - minutesAgo * 60 * 1000);
    const hh = String(eventTime.getHours()).padStart(2, '0');
    const mm = String(eventTime.getMinutes()).padStart(2, '0');

    let titlePool: string[];
    switch (type) {
      case 'anomaly': titlePool = anomalyTitles; break;
      case 'cleaning': titlePool = cleaningTitles; break;
      case 'deviation': titlePool = deviationTitles; break;
      case 'maintenance': titlePool = maintenanceTitles; break;
    }
    const title = titlePool[Math.floor(rng() * titlePool.length)];

    // 严重程度与健康度相关
    let sevIdx = healthScore < 40 ? Math.floor(rng() * 3) : Math.floor(rng() * 2);
    if (type === 'maintenance') sevIdx = 0;
    const severity = severityPool[Math.min(sevIdx, 2)];

    const descMap: Record<string, string> = {
      '温度异常跳变': `传感器检测到温度在 3s 内从 ${(72 + Math.floor(rng() * 10)).toFixed(1)}°C 跃升至 ${(85 + Math.floor(rng() * 15)).toFixed(1)}°C`,
      '振动幅值超限': `振动传感器读数为 ${(4.5 + rng() * 3).toFixed(1)} mm/s，超出基线阈值`,
      '电流波形畸变': `MES 系统记录到电流谐波失真率达 ${(5 + rng() * 10).toFixed(1)}%`,
      '转速波动异常': `主轴转速在 ${(1400 + Math.floor(rng() * 100))}~${(1500 + Math.floor(rng() * 100))} rpm 间波动`,
      '压力骤降': `液压系统压力从 ${(0.6 + rng() * 0.2).toFixed(2)} MPa 降至 ${(0.2 + rng() * 0.2).toFixed(2)} MPa`,
      '传感器数据清洗': `AI 检测到 ${Math.floor(rng() * 3 + 1)} 个异常数据点，已执行线性插值修复`,
      '去噪滤波处理': `应用卡尔曼滤波器，信噪比从 ${(15 + rng() * 5).toFixed(1)}dB 提升至 ${(25 + rng() * 5).toFixed(1)}dB`,
      '异常值剔除': `识别并剔除 ${Math.floor(rng() * 5 + 2)} 个离群值，数据完整性恢复`,
      '缺失值插补': `历史滑动窗口插补 ${Math.floor(rng() * 3 + 1)} 个缺失数据点`,
      '数据平滑': `3 阶 Savitzky-Golay 滤波，数据曲线平滑度提升 ${(60 + rng() * 20).toFixed(0)}%`,
      '振动基线偏离 12%': '实时振动幅值持续偏离 P95 基线包络上界，偏离系数 12%',
      '温度基线偏离 8%': '轴承温度高于历史同期基线 8%，建议关注润滑状态',
      '负载基线偏离 15%': '当前负载率超出历史稳态基线 15%，可能因工况异常导致',
      '转速基线偏离 6%': '主轴转速轻微偏离基线（6%），处于可接受范围内',
      '压力基线偏离 10%': '液压系统压力偏离基线 10%，建议检查密封件状态',
      '轴承润滑保养': `已执行 ${['油脂加注', '轴承清洗', '密封件更换'][Math.floor(rng() * 3)]}，预计延长寿命 ${Math.floor(rng() * 30 + 15)} 天`,
      '电机巡检维护': `绝缘电阻测试 ${(100 + Math.floor(rng() * 900))} MΩ，状态 ${['正常', '良好', '优秀'][Math.floor(rng() * 3)]}`,
      '传感器校准': `${['温度', '压力', '振动'][Math.floor(rng() * 3)]} 传感器零点校准完成，偏差 ${(0.1 + rng() * 0.5).toFixed(2)}%`,
      '传动皮带更换': `更换 ${['主轴皮带', '进给皮带'][Math.floor(rng() * 2)]}，新旧张力比 ${(1.2 + rng() * 0.5).toFixed(1)}`,
      '冷却系统检修': `清洗冷却管路，流量恢复至 ${(85 + rng() * 15).toFixed(0)}% 设计值`,
    };

    const description = descMap[title] || `${type} 事件记录 #${i + 1}`;
    const drillLabel = drillTargets[title] || undefined;
    const drillTo = drillLabel
      ? (type === 'cleaning' ? '/aura/data-cleaning' :
         type === 'deviation' ? '/aura/device-health' :
         type === 'anomaly' ? '/aura/device-health' : undefined)
      : undefined;

    events.push({
      id: `evt-${deviceSeed}-${i}`,
      type,
      title,
      description,
      time: `${hh}:${mm}`,
      severity,
      drillTo,
      drillLabel,
    });
  }

  // 按时间排序（最近的在前面）
  events.sort((a, b) => {
    const [ah, am] = a.time.split(':').map(Number);
    const [bh, bm] = b.time.split(':').map(Number);
    return (bh * 60 + bm) - (ah * 60 + am);
  });

  return events;
}

function generateTimeSeriesData(
  baseValue: number, volatility: number, count: number, healthScore: number, deviceSeed: number,
): MetricPoint[] {
  const rng = seededRandom(deviceSeed + 333);
  const labels = generateTimeLabels(count, 5);
  const healthFactor = (100 - healthScore) / 100;

  return labels.map((time, i) => {
    const trend = Math.sin((i / count) * Math.PI * 2) * volatility * healthFactor;
    const noise = (rng() - 0.5) * volatility * 0.5;
    const value = Math.round((baseValue + trend + noise) * 10) / 10;
    return { time, value };
  });
}

/* ═══════════════════════════════════════════════════
   子组件: 关键指标卡片
   ═══════════════════════════════════════════════════ */

function MetricCard({
  icon, label, value, unit, color, trend, trendLabel, active, onClick, tooltipTitle,
}: {
  icon: React.ReactNode; label: string; value: string; unit: string;
  color: string; trend?: 'up' | 'down' | 'stable'; trendLabel?: string;
  active?: boolean; onClick?: () => void; tooltipTitle?: React.ReactNode;
}) {
  const trendColor = trend === 'up' ? '#EF4444' : trend === 'down' ? '#22C55E' : 'rgba(255,255,255,0.3)';
  const trendIcon = trend === 'up' ? <ArrowUpOutlined /> : trend === 'down' ? <ArrowUpOutlined style={{ transform: 'rotate(180deg)' }} /> : <MinusOutlined />;

  return (
    <div
      onClick={onClick}
      style={{
        background: active
          ? `linear-gradient(180deg, ${color}18 0%, rgba(20,24,56,0.4) 100%)`
          : 'linear-gradient(180deg, rgba(20,24,56,0.6) 0%, rgba(7,10,26,0.3) 100%)',
        border: active ? `1.5px solid ${color}66` : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        boxShadow: active ? `0 0 16px ${color}22` : 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = `${color}44`;
          e.currentTarget.style.boxShadow = `0 0 20px ${color}22`;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: active ? `${color}30` : `${color}18`,
          color, fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)', fontWeight: active ? 600 : 500, display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {tooltipTitle && (
            <Tooltip title={tooltipTitle} color="#0E1230" placement="top"
              overlayInnerStyle={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', maxWidth: 260, fontSize: 12, lineHeight: 1.5 }}
            >
              <QuestionCircleOutlined style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', cursor: 'pointer' }} />
            </Tooltip>
          )}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>{unit}</span>
      </div>
      {trendLabel && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 10, color: trendColor }}>{trendIcon}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   子组件: 事件类型标签
   ═══════════════════════════════════════════════════ */

const EVENT_TYPE_CONFIG: Record<TimelineEvent['type'], { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  anomaly: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', label: '数据异常', icon: <BugOutlined /> },
  cleaning: { color: '#10B981', bg: 'rgba(16,185,129,0.15)', label: '清洗记录', icon: <ClearOutlined /> },
  deviation: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)', label: '基线偏离', icon: <NodeIndexOutlined /> },
  maintenance: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)', label: '维修记录', icon: <ToolOutlined /> },
};

const SEVERITY_DOT: Record<TimelineEvent['severity'], { color: string; size: number }> = {
  low: { color: 'rgba(255,255,255,0.25)', size: 6 },
  medium: { color: '#F59E0B', size: 8 },
  high: { color: '#EF4444', size: 10 },
};

/* ═══════════════════════════════════════════════════
   子组件: 设备 2D 数字孪生 (Canvas)
   ═══════════════════════════════════════════════════ */

function DeviceTwin({ healthScore, deviceName, metrics }: {
  healthScore: number; deviceName: string; metrics: DeviceMetrics;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const color = getHealthColor(healthScore);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const size = Math.min(w, h) * 0.38;
    const healthFactor = healthScore / 100;

    // ── 背景光晕 ──
    const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.5);
    bgGlow.addColorStop(0, color + '15');
    bgGlow.addColorStop(0.5, color + '08');
    bgGlow.addColorStop(1, 'rgba(7,10,26,0)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, w, h);

    // ── 外环轨道（旋转粒子效果） ──
    const orbits = 3;
    for (let o = 0; o < orbits; o++) {
      const radius = size * (0.7 + o * 0.12);
      const count = 12 + o * 4;
      const speed = 0.0003 * (1 + o * 0.5);

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + time * speed;
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);

        const alpha = 0.15 + 0.15 * Math.sin(angle * 2 + time * 0.001);
        ctx.beginPath();
        ctx.arc(px, py, 2 - o * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }
    }

    // ── 设备主体 ──
    const bodyW = size * 0.7;
    const bodyH = size * 0.85;

    // 主机身（圆角矩形）
    const rx = cx - bodyW / 2;
    const ry = cy - bodyH / 2;
    const radius = 12;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 30 + 10 * Math.sin(time * 0.001);

    // 主体渐变
    const bodyGrad = ctx.createLinearGradient(rx, ry, rx, ry + bodyH);
    const brightFactor = 0.3 + 0.7 * healthFactor;
    bodyGrad.addColorStop(0, `rgba(${parseInt(color.slice(1,3),16) * brightFactor},${parseInt(color.slice(3,5),16) * brightFactor},${parseInt(color.slice(5,7),16) * brightFactor},0.25)`);
    bodyGrad.addColorStop(0.5, `rgba(${parseInt(color.slice(1,3),16) * 0.5},${parseInt(color.slice(3,5),16) * 0.5},${parseInt(color.slice(5,7),16) * 0.5},0.12)`);
    bodyGrad.addColorStop(1, `rgba(${parseInt(color.slice(1,3),16) * 0.3},${parseInt(color.slice(3,5),16) * 0.3},${parseInt(color.slice(5,7),16) * 0.3},0.08)`);

    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + bodyW - radius, ry);
    ctx.quadraticCurveTo(rx + bodyW, ry, rx + bodyW, ry + radius);
    ctx.lineTo(rx + bodyW, ry + bodyH - radius);
    ctx.quadraticCurveTo(rx + bodyW, ry + bodyH, rx + bodyW - radius, ry + bodyH);
    ctx.lineTo(rx + radius, ry + bodyH);
    ctx.quadraticCurveTo(rx, ry + bodyH, rx, ry + bodyH - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 主体边框（脉冲）
    const pulseWidth = 1.5 + 0.5 * Math.sin(time * 0.002);
    ctx.strokeStyle = color + Math.floor(60 * (0.5 + 0.5 * Math.sin(time * 0.002))).toString(16).padStart(2, '0');
    ctx.lineWidth = pulseWidth;
    ctx.stroke();
    ctx.restore();

    // ── 设备内部细节 ──
    // 屏幕面板
    const screenW = bodyW * 0.6;
    const screenH = bodyH * 0.28;
    const screenX = cx - screenW / 2;
    const screenY = ry + bodyH * 0.12;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenW, screenH, 4);
    const screenGrad = ctx.createLinearGradient(screenX, screenY, screenX, screenY + screenH);
    screenGrad.addColorStop(0, '#0A0E27');
    screenGrad.addColorStop(1, '#070A1A');
    ctx.fillStyle = screenGrad;
    ctx.fill();
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 屏幕上的波形
    ctx.save();
    ctx.beginPath();
    ctx.rect(screenX + 4, screenY + 4, screenW - 8, screenH - 8);
    ctx.clip();

    for (let wave = 0; wave < 3; wave++) {
      ctx.beginPath();
      const waveColor = wave === 0 ? color : wave === 1 ? '#3B82F6' : '#10B981';
      ctx.strokeStyle = waveColor + '50';
      ctx.lineWidth = 1.2;

      for (let x = 0; x <= screenW - 8; x += 1) {
        const t = x / (screenW - 8);
        const y = screenY + screenH / 2
          + (wave === 0 ? 8 : wave === 1 ? 4 : 6) * Math.sin(t * Math.PI * 6 + time * 0.003 + wave * 1.5)
          + (wave === 2 ? 3 : 0) * Math.sin(t * Math.PI * 2 + time * 0.001);
        if (x === 0) ctx.moveTo(screenX + 4 + x, y);
        else ctx.lineTo(screenX + 4 + x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // ── 底部指示灯 ──
    const ledCount = 5;
    const ledGap = bodyW * 0.14;
    const ledStartX = cx - (ledCount - 1) * ledGap / 2;
    const ledY = ry + bodyH * 0.75;

    for (let i = 0; i < ledCount; i++) {
      const ledColor = i < Math.ceil(healthFactor * ledCount) ? color : 'rgba(255,255,255,0.08)';
      const ledPulse = i < Math.ceil(healthFactor * ledCount) ? 0.3 + 0.3 * Math.sin(time * 0.002 + i * 0.5) : 0;
      ctx.save();
      ctx.shadowColor = ledColor;
      ctx.shadowBlur = ledPulse * 10;
      ctx.beginPath();
      ctx.arc(ledStartX + i * ledGap, ledY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = ledColor;
      ctx.fill();
      ctx.restore();
    }

    // ── 设备名称 ──
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = '500 10px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(deviceName, cx, h - 6);
    ctx.restore();
  }, [healthScore, color, deviceName]);

  // 动画循环
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      return { w: rect.width, h: rect.height };
    };

    let { w, h } = resize();
    const ro = new ResizeObserver(() => {
      const s = resize();
      w = s.w;
      h = s.h;
    });
    ro.observe(container);

    let running = true;
    const loop = (time: number) => {
      if (!running) return;
      ctx.save();
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      draw(ctx, w, h, time);
      ctx.restore();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [draw]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   子组件: 健康得分仪表盘
   ═══════════════════════════════════════════════════ */

function HealthGauge({ score, size = 140 }: { score: number; size?: number }) {
  const color = getHealthColor(score);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div style={{
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        {/* 背景环 */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* 进度环 */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease',
            filter: `drop-shadow(0 0 6px ${color}66)`,
          }}
        />
      </svg>
      {/* 中心文字 */}
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1, letterSpacing: -1 }}>
          {score}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          综合健康分
          <Tooltip
            title={
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>什么是综合健康分？</div>
                <div>综合健康分是设备整体状态的量化评分（0~100），基于多维传感器数据的实时融合计算，将复杂的设备状态转化为管理层一目了然的核心指标。</div>
                <div style={{ fontWeight: 600, marginTop: 8, marginBottom: 4 }}>计算方式：</div>
                <div>• 振动状态（权重25%）— 偏离基线越远，得分越低</div>
                <div>• 温度状态（权重15%）— 超出正常运行温度范围扣分</div>
                <div>• 运行稳定性（权重15%）— 参数波动幅度与频率评估</div>
                <div>• 维护及时性（权重15%）— 是否按时保养、校准</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>加权总分经归一化映射到 0~100 分，100 分 = 出厂状态。</div>
              </div>
            }
            color="#0E1230"
            overlayInnerStyle={{
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '12px 14px',
              maxWidth: 300,
            }}
            placement="bottom"
          >
            <QuestionCircleOutlined style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', cursor: 'pointer' }} />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════ */

export default function AuraDeviceProfile() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  /* ── 状态 ── */
  const [selectedDevice, setSelectedDevice] = useState<MockDevice>(MOCK_DEVICES[0]);
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<string>('temperature');

  /* ── 设备种子 ── */
  const deviceSeed = useMemo(() => {
    if (!selectedDevice) return 0;
    let hash = 0;
    for (let i = 0; i < selectedDevice.id.length; i++) {
      hash = ((hash << 5) - hash) + selectedDevice.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }, [selectedDevice]);

  /* ── 模拟健康得分 ── */
  const [healthScore, setHealthScore] = useState(82);
  const healthColor = getHealthColor(healthScore);

  // 实时更新分数
  useEffect(() => {
    if (!selectedDevice) return;
    // 基于设备种子生成基础分数
    const baseScore = 60 + (deviceSeed % 35);
    setHealthScore(baseScore);

    const interval = setInterval(() => {
      setHealthScore((prev) => {
        const delta = (Math.random() - 0.48) * 1.5;
        return Math.max(25, Math.min(100, Math.round((prev + delta) * 10) / 10));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedDevice, deviceSeed]);

  /* ── 模拟参数 ── */
  const baseParams = useMemo(() => ({
    temperature: 68 + (deviceSeed % 10),
    rpm: 1400 + (deviceSeed % 150),
    load: 55 + (deviceSeed % 20),
    pressure: 0.5,
    vibration: 2.5,
  }), [deviceSeed]);

  const metrics = useMemo(
    () => generateMetrics(baseParams.temperature, baseParams.rpm, baseParams.load, healthScore, deviceSeed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [healthScore, deviceSeed, baseParams.temperature, baseParams.rpm, baseParams.load],
  );

  /* ── 时间轴事件 ── */
  const timelineEvents = useMemo(
    () => generateTimelineEvents(deviceSeed, healthScore),
    [deviceSeed, healthScore],
  );

  /* ── 指标配置表（各参数的基础值/波动幅值/标签/单位/颜色） ── */
  const metricConfig: Record<string, { base: number; vol: number; label: string; unit: string; color: string }> = {
    temperature: { base: metrics.temperature, vol: 8, label: '温度', unit: '°C', color: '#EF4444' },
    rpm: { base: metrics.rpm, vol: 60, label: '转速', unit: 'rpm', color: '#3B82F6' },
    load: { base: metrics.load, vol: 10, label: '负载', unit: '%', color: '#F59E0B' },
    vibration: { base: metrics.vibration, vol: 1.5, label: '振动', unit: 'mm/s', color: '#8B5CF6' },
    pressure: { base: metrics.pressure * 100, vol: 5, label: '压力', unit: 'kPa', color: '#06B6D4' },
  };

  /* ── 实时时序图数据（每秒滑动更新） ── */
  const [liveChartValues, setLiveChartValues] = useState<number[]>([]);
  const [liveChartLabels, setLiveChartLabels] = useState<string[]>([]);
  const liveDataRef = useRef<{ values: number[]; labels: string[] }>({ values: [], labels: [] });
  const activeMetricRef = useRef(activeMetric);
  const metricConfigRef = useRef(metricConfig);
  const healthScoreRef = useRef(healthScore);

  // 同步 ref
  useEffect(() => { activeMetricRef.current = activeMetric; }, [activeMetric]);
  useEffect(() => { metricConfigRef.current = metricConfig; }, [metricConfig]);
  useEffect(() => { healthScoreRef.current = healthScore; }, [healthScore]);

  // 指标切换或设备变更时重新初始化数据
  useEffect(() => {
    const cfg = metricConfig[activeMetric] || metricConfig.temperature;
    const initialData = generateTimeSeriesData(cfg.base, cfg.vol, 60, healthScore, deviceSeed);
    const vals = initialData.map(d => d.value);
    const lbls = initialData.map(d => d.time);
    liveDataRef.current = { values: vals, labels: lbls };
    setLiveChartValues([...vals]);
    setLiveChartLabels([...lbls]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMetric, deviceSeed]);

  // 每秒追加一个实时数据点（滑动窗口 60 点）
  useEffect(() => {
    const interval = setInterval(() => {
      const cfg = metricConfigRef.current[activeMetricRef.current] || metricConfigRef.current.temperature;
      const ref = liveDataRef.current;
      const lastVal = ref.values[ref.values.length - 1];
      // 正弦波 + 随机噪声模拟实时波动
      const t = Date.now() * 0.001;
      const wave = Math.sin(t * 0.5) * cfg.vol * 0.15;
      const noise = (Math.random() - 0.5) * cfg.vol * 0.2;
      const drift = ((100 - healthScoreRef.current) / 100) * cfg.vol * 0.05;
      const newVal = Math.round(Math.max(0, lastVal + wave + noise + drift) * 10) / 10;
      const now = new Date();
      const newLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // 滑动窗口：移除最旧一个，追加最新一个
      const newValues = [...ref.values.slice(1), newVal];
      const newLabels = [...ref.labels.slice(1), newLabel];
      ref.values = newValues;
      ref.labels = newLabels;
      setLiveChartValues(newValues);
      setLiveChartLabels(newLabels);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /** 当前活跃指标配置 */
  const activeCfg = metricConfig[activeMetric] || metricConfig.temperature;

  /* ── 图表 ECharts 配置 ── */
  const sparklineOption = useMemo(() => {
    const values = liveChartValues;
    const labels = liveChartLabels;
    // 健康基线 = 均值
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const baseline = Array(60).fill(Math.round(avg * 10) / 10);

    return {
      backgroundColor: 'transparent',
      grid: { left: 50, right: 16, top: 20, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(7,10,26,0.94)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#FFFFFF', fontSize: 11 },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          return `
            <div style="font-size:10px;color:rgba(255,255,255,0.4);margin-bottom:2px;">${labels[idx] || ''}</div>
            <div style="font-size:12px;color:${activeCfg.color};">${activeCfg.label}: <b>${values[idx]}</b> ${activeCfg.unit}</div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
        axisLabel: {
          color: 'rgba(255,255,255,0.2)',
          fontSize: 8,
          interval: 10,
        },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } },
        axisLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 8 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: '基线',
          type: 'line',
          data: baseline,
          lineStyle: { width: 1, color: 'rgba(255,255,255,0.12)', type: 'dashed' },
          symbol: 'none',
          z: 1,
          animation: false,
        },
        {
          name: activeCfg.label,
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: {
            width: 2,
            color: activeCfg.color,
            shadowBlur: 8,
            shadowColor: activeCfg.color + '44',
          },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: activeCfg.color + '30' },
                { offset: 1, color: activeCfg.color + '05' },
              ],
            },
          },
          symbol: 'none',
          z: 2,
          animation: false,
        },
      ],
    };
  }, [liveChartValues, liveChartLabels, activeCfg.color, activeCfg.label, activeCfg.unit]);

  /* ── 指标选择器 ── */
  const metricOptions = [
    { key: 'temperature', label: '温度', icon: <FireOutlined />, color: '#EF4444', value: metrics.temperature, unit: '°C' },
    { key: 'rpm', label: '转速', icon: <SwapOutlined />, color: '#3B82F6', value: metrics.rpm, unit: 'rpm' },
    { key: 'load', label: '负载', icon: <DashboardOutlined />, color: '#F59E0B', value: metrics.load, unit: '%' },
    { key: 'vibration', label: '振动', icon: <NodeIndexOutlined />, color: '#8B5CF6', value: metrics.vibration, unit: 'mm/s' },
    { key: 'pressure', label: '压力', icon: <ApiOutlined />, color: '#06B6D4', value: metrics.pressure, unit: 'MPa' },
  ];

  /* ── 穿透处理 ── */
  const handleDrillThrough = useCallback((event: TimelineEvent) => {
    if (!event.drillTo) return;
    // 关闭当前模态窗，通知外部跳转
    // 这里我们通过自定义事件通知 App.tsx 跳转
    window.dispatchEvent(new CustomEvent('aura-drill', {
      detail: { path: event.drillTo, title: event.drillLabel },
    }));
  }, []);

  /* ═════════════════════════════════════════════════
     渲染
     ═════════════════════════════════════════════════ */

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#070A1A',
        color: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* ═══ 头部 ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          padding: isCompact ? '14px 16px 0' : '18px 24px 0',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, #06B6D4, ${healthColor})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 18,
              boxShadow: `0 4px 12px ${healthColor}44`,
              flexShrink: 0,
              transition: 'all 0.5s ease',
            }}
          >
            <ThunderboltOutlined />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: isCompact ? 16 : 18, fontWeight: 700, color: '#FFFFFF' }}>
                设备全景画像
              </span>
              <Tag
                color="default"
                style={{
                  borderRadius: 4,
                  fontSize: isCompact ? 10 : 11,
                  lineHeight: '22px',
                  padding: '0 10px',
                  background: getHealthBg(healthScore),
                  border: `1px solid ${healthColor}44`,
                  color: healthColor,
                  fontWeight: 600,
                }}
              >
                {getHealthIcon(healthScore)} {getHealthLabel(healthScore)}
              </Tag>
            </div>
            <div style={{ fontSize: isCompact ? 10 : 12, color: 'rgba(255,255,255,0.45)' }}>
              AURA Device Panoramic Profile · 数据资产化 · 一机一档
            </div>
          </div>
        </div>

        {/* 设备选择器（本地模拟数据） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            showSearch
            allowClear
            value={selectedDevice?.id || undefined}
            placeholder="选择设备查看画像"
            onChange={(id) => {
              if (!id) { setSelectedDevice(null); return; }
              const dev = MOCK_DEVICES.find(d => d.id === id) || null;
              setSelectedDevice(dev);
            }}
            variant="borderless"
            className="profile-device-selector"
            style={{ minWidth: isCompact ? 160 : 240 }}
            dropdownMatchSelectWidth={false}
            dropdownStyle={{ minWidth: 360, background: '#0E1230', border: '1px solid rgba(255,255,255,0.08)' }}
            popupClassName="profile-device-dropdown"
            filterOption={(input, option) =>
              (option?.label as string || '').toLowerCase().includes(input.toLowerCase()) ||
              (option?.code as string || '').toLowerCase().includes(input.toLowerCase())
            }
            options={MOCK_DEVICES.map(d => ({
              value: d.id,
              label: d.name,
              code: d.code,
              type: d.type,
              status: d.status,
              area: d.area,
              line: d.line,
              health: d.baseHealth,
            }))}
            optionRender={(opt) => {
              const d = opt.data;
              const statusColor = d.status === 'running' ? '#22C55E' : d.status === 'idle' ? '#9CA3AF' : d.status === 'fault' ? '#EF4444' : d.status === 'maintenance' ? '#3B82F6' : '#F59E0B';
              const statusLabel = { running: '运行中', idle: '待机', fault: '故障', maintenance: '保养中', changeover: '换型中' }[d.status as string] || d.status;
              const healthColor = d.health >= 80 ? '#22C55E' : d.health >= 60 ? '#F59E0B' : '#EF4444';
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#E5E7EB' }}>{d.label as string}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                      {d.code as string} · {d.type as string} · {d.area as string}
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: statusColor, background: `${statusColor}15`, padding: '0 6px', borderRadius: 3, lineHeight: '18px', flexShrink: 0 }}>
                    {statusLabel}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: healthColor, flexShrink: 0, minWidth: 28, textAlign: 'right' }}>
                    {d.health as number}
                  </span>
                </div>
              );
            }}
          />
          <style>{`
            .profile-device-selector.ant-select {
              color: #FFFFFF !important;
            }
            .profile-device-selector.ant-select .ant-select-selector {
              background: rgba(255,255,255,0.08) !important;
              border: 1px solid rgba(255,255,255,0.25) !important;
              border-radius: 8px !important;
              height: 38px !important;
              padding: 0 12px !important;
              box-shadow: 0 1px 4px rgba(0,0,0,0.2) !important;
              transition: all 0.2s !important;
            }
            .profile-device-selector.ant-select:hover .ant-select-selector {
              border-color: rgba(255,255,255,0.45) !important;
              background: rgba(255,255,255,0.12) !important;
            }
            .profile-device-selector.ant-select.ant-select-focused .ant-select-selector {
              border-color: #3B82F6 !important;
              box-shadow: 0 0 0 2px rgba(59,130,246,0.3) !important;
            }
            .profile-device-selector.ant-select .ant-select-selection-placeholder {
              color: rgba(255,255,255,0.45) !important;
              font-size: 13px !important;
            }
            .profile-device-selector.ant-select .ant-select-selection-item {
              color: #FFFFFF !important;
              font-size: 13px !important;
              font-weight: 500 !important;
            }
            .profile-device-selector.ant-select .ant-select-arrow {
              color: rgba(255,255,255,0.45) !important;
              font-size: 12px !important;
            }
            .profile-device-selector.ant-select .ant-select-clear {
              background: rgba(255,255,255,0.1) !important;
              color: rgba(255,255,255,0.5) !important;
              border-radius: 50% !important;
              width: 16px !important;
              height: 16px !important;
              font-size: 10px !important;
            }
            .profile-device-dropdown.ant-select-dropdown {
              background: #0E1230 !important;
              border: 1px solid rgba(255,255,255,0.12) !important;
              border-radius: 8px !important;
              box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
              padding: 4px !important;
            }
            .profile-device-dropdown .ant-select-item {
              color: rgba(255,255,255,0.7) !important;
              border-radius: 6px !important;
              padding: 6px 10px !important;
            }
            .profile-device-dropdown .ant-select-item-option-active {
              background: rgba(59,130,246,0.12) !important;
            }
            .profile-device-dropdown .ant-select-item-option-selected {
              background: rgba(59,130,246,0.18) !important;
              color: #60A5FA !important;
            }
            .profile-device-dropdown .ant-empty-description {
              color: rgba(255,255,255,0.3) !important;
            }
          `}</style>
        </div>
      </div>

      {/* ═══ 主体区域 ═══ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isCompact ? 'column' : 'row',
          gap: isCompact ? 8 : 12,
          padding: isCompact ? '10px 12px 6px' : '14px 20px 8px',
          minHeight: 0,
        }}
      >
        {/* ─── 左列：设备孪生 + 健康得分 ─── */}
        <div
          style={{
            width: isCompact ? '100%' : 320,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* 设备数字孪生 */}
          <div
            style={{
              flex: 1,
              minHeight: isCompact ? 180 : 200,
              background: 'linear-gradient(180deg, rgba(20,24,56,0.4) 0%, transparent 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {selectedDevice ? (
              <DeviceTwin
                healthScore={healthScore}
                deviceName={selectedDevice.name}
                metrics={metrics}
              />
            ) : (
              <div style={{
                height: '100%', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12,
                color: 'rgba(255,255,255,0.2)',
              }}>
                <ThunderboltOutlined style={{ fontSize: 40, opacity: 0.3 }} />
                <span style={{ fontSize: 13 }}>请选择设备</span>
              </div>
            )}
          </div>

          {/* 健康得分 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              background: 'linear-gradient(180deg, rgba(20,24,56,0.4) 0%, transparent 100%)',
              border: `1px solid ${healthColor}22`,
              borderRadius: 12,
              padding: '12px 16px',
              transition: 'border-color 0.5s ease',
            }}
          >
            <HealthGauge score={Math.round(healthScore)} size={isCompact ? 100 : 120} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>评分明细</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[
                  { label: '振动状态', value: Math.min(100, Math.round(healthScore * 0.9 + 5)), color: '#8B5CF6' },
                  { label: '温度状态', value: Math.min(100, Math.round(healthScore * 0.85 + 8)), color: '#EF4444' },
                  { label: '运行稳定性', value: Math.min(100, Math.round(healthScore * 0.95 + 2)), color: '#3B82F6' },
                  { label: '维护及时性', value: Math.min(100, Math.round(healthScore * 0.8 + 12)), color: '#10B981' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', width: 64, flexShrink: 0 }}>{item.label}</span>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${item.value}%`, height: '100%', borderRadius: 2,
                        background: item.color,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: item.color, width: 28, textAlign: 'right' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 右列：指标卡片 + 时序图 ─── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            minWidth: 0,
          }}
        >
          {/* 关键指标卡片行 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isCompact ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
              gap: 8,
              flexShrink: 0,
            }}
          >
            <MetricCard
              icon={<FireOutlined />}
              label="温度"
              value={metrics.temperature.toFixed(1)}
              unit="°C"
              color="#EF4444"
              trend={healthScore < 60 ? 'up' : 'stable'}
              trendLabel={healthScore < 60 ? '偏高' : '正常'}
              active={activeMetric === 'temperature'}
              onClick={() => setActiveMetric('temperature')}
              tooltipTitle={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>轴承温度</div>
                  <div>安装在设备主轴轴承座的 PT100 铂电阻传感器实时采集。</div>
                  <div style={{ marginTop: 4 }}>正常范围：35°C ~ 85°C（依工况负载动态浮动），超过 90°C 触发预警。</div>
                </div>
              }
            />
            <MetricCard
              icon={<SwapOutlined />}
              label="转速"
              value={metrics.rpm.toFixed(0)}
              unit="rpm"
              color="#3B82F6"
              trend={healthScore < 50 ? 'down' : 'stable'}
              trendLabel={healthScore < 50 ? '偏低' : '稳定'}
              active={activeMetric === 'rpm'}
              onClick={() => setActiveMetric('rpm')}
              tooltipTitle={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>主轴转速</div>
                  <div>通过变频器编码器或主轴电机驱动器反馈信号获取。</div>
                  <div style={{ marginTop: 4 }}>单位：rpm（转/分钟）。波动超过 ±5% 基线值时触发基线偏离事件。</div>
                </div>
              }
            />
            <MetricCard
              icon={<DashboardOutlined />}
              label="负载率"
              value={metrics.load.toFixed(1)}
              unit="%"
              color="#F59E0B"
              trend={healthScore < 60 ? 'up' : 'stable'}
              trendLabel={healthScore < 60 ? '偏高' : '正常'}
              active={activeMetric === 'load'}
              onClick={() => setActiveMetric('load')}
              tooltipTitle={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>设备负载率</div>
                  <div>当前实际功率与额定功率的百分比，由 PLC 采集的电流、扭矩参数折算得出。</div>
                  <div style={{ marginTop: 4 }}>长期超过 85% 建议检查冷却与润滑系统，低于 30% 可能存在待机浪费。</div>
                </div>
              }
            />
            <MetricCard
              icon={<NodeIndexOutlined />}
              label="振动"
              value={metrics.vibration.toFixed(1)}
              unit="mm/s"
              color="#8B5CF6"
              trend={healthScore < 55 ? 'up' : 'stable'}
              trendLabel={healthScore < 55 ? '异常' : '正常'}
              active={activeMetric === 'vibration'}
              onClick={() => setActiveMetric('vibration')}
              tooltipTitle={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>振动幅值</div>
                  <div>通过 ICP 加速度传感器采集轴承座径向振动，经 DSP 计算 RMS 有效值。</div>
                  <div style={{ marginTop: 4 }}>单位：mm/s（毫米/秒）。ISO 10816 标准：{'<'}2.3 优秀，2.3~4.5 良好，4.5~11.0 注意，{'>'}11.0 危险。</div>
                </div>
              }
            />
            <MetricCard
              icon={<ApiOutlined />}
              label="油压"
              value={metrics.pressure.toFixed(2)}
              unit="MPa"
              color="#06B6D4"
              trend={healthScore < 50 ? 'down' : 'stable'}
              trendLabel={healthScore < 50 ? '偏低' : '正常'}
              active={activeMetric === 'pressure'}
              onClick={() => setActiveMetric('pressure')}
              tooltipTitle={
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>液压系统油压</div>
                  <div>通过安装在液压站出口的压力变送器（4~20mA）实时采集。</div>
                  <div style={{ marginTop: 4 }}>单位：MPa（兆帕）。偏离设定值 ±10% 时建议检查油路密封性与泵组状态。</div>
                </div>
              }
            />
          </div>

          {/* 时序图 + 指标切换 */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              background: 'linear-gradient(180deg, rgba(20,24,56,0.3) 0%, transparent 100%)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* 图标题 + 指标切换 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px 0',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeCfg.color, display: 'inline-block' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  {activeCfg.label} 实时趋势
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 2 }}>
                {metricOptions.map((opt) => (
                  <div
                    key={opt.key}
                    onClick={() => setActiveMetric(opt.key)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: isCompact ? 9 : 10,
                      cursor: 'pointer',
                      color: activeMetric === opt.key ? opt.color : 'rgba(255,255,255,0.3)',
                      background: activeMetric === opt.key ? `${opt.color}18` : 'transparent',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 10 }}>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 图表 */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ReactECharts
                option={sparklineOption}
                style={{ height: '100%', width: '100%' }}
                notMerge
                lazyUpdate
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ 底部事件时间轴 ═══ */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'linear-gradient(0deg, rgba(7,10,26,0.8) 0%, transparent 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: isCompact ? '8px 16px 4px' : '10px 24px 4px',
          }}
        >
          <ClockCircleOutlined style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>
            事件时间轴
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.05), transparent)' }} />
          <div style={{ display: 'flex', gap: 14 }}>
            {(['anomaly', 'cleaning', 'deviation', 'maintenance'] as const).map((type) => (
              <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: EVENT_TYPE_CONFIG[type].color,
                  display: 'inline-block',
                }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{EVENT_TYPE_CONFIG[type].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 事件列表（水平滚动） */}
        <div
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            padding: isCompact ? '4px 12px 10px' : '6px 20px 12px',
            display: 'flex',
            gap: 0,
            scrollbarWidth: 'thin',
          }}
          className="timeline-scroll"
        >
          {timelineEvents.length === 0 && (
            <div style={{ padding: '8px 0', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
              暂无事件记录
            </div>
          )}
          {timelineEvents.map((event, idx) => {
            const cfg = EVENT_TYPE_CONFIG[event.type];
            const sevDot = SEVERITY_DOT[event.severity];
            const isHovered = hoveredEvent === event.id;

            return (
              <div
                key={event.id}
                onMouseEnter={() => setHoveredEvent(event.id)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => event.drillTo && handleDrillThrough(event)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
                  border: `1px solid ${isHovered ? cfg.color + '22' : 'transparent'}`,
                  cursor: event.drillTo ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  minWidth: 240,
                  maxWidth: 300,
                  padding: '8px 12px',
                  marginRight: 6,
                  position: 'relative',
                  userSelect: 'none',
                }}
              >
                {/* 时间轴竖线（连接点） */}
                {idx > 0 && (
                  <div style={{
                    position: 'absolute', left: -4, top: '50%', width: 4, height: 2,
                    background: 'rgba(255,255,255,0.06)',
                  }} />
                )}

                {/* 事件时间 */}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0, width: 38, textAlign: 'center', fontFamily: 'monospace', fontWeight: 500 }}>
                  {event.time}
                </span>

                {/* 严重度指示点 */}
                <div style={{
                  width: sevDot.size + 2, height: sevDot.size + 2, borderRadius: '50%',
                  background: sevDot.color,
                  flexShrink: 0,
                  boxShadow: isHovered ? `0 0 8px ${sevDot.color}66` : 'none',
                  transition: 'box-shadow 0.2s',
                }} />

                {/* 事件详细信息 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '1px 6px', borderRadius: 4,
                      fontSize: 10, fontWeight: 600,
                      color: cfg.color, background: cfg.bg,
                      whiteSpace: 'nowrap',
                    }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 12, color: 'rgba(255,255,255,0.7)',
                    marginTop: 2, lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {event.title}
                  </div>
                  {isHovered && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'rgba(7,10,26,0.98)',
                      border: `1px solid ${cfg.color}44`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginTop: 6,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                      pointerEvents: 'none',
                    }}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginBottom: 6 }}>
                        {event.description}
                      </div>
                      {event.drillLabel && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 11, color: healthColor,
                          fontWeight: 500,
                        }}>
                          <SearchOutlined style={{ fontSize: 11 }} />
                          <span>{event.drillLabel}</span>
                          <RightOutlined style={{ fontSize: 10 }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 穿透箭头 */}
                {event.drillTo && (
                  <div style={{
                    color: 'rgba(255,255,255,0.2)',
                    fontSize: 11,
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }}>
                    <RightOutlined />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ CSS 动画注入 ═══ */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .timeline-scroll::-webkit-scrollbar {
          height: 3px;
        }
        .timeline-scroll::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.03);
          border-radius: 2px;
        }
        .timeline-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
        .timeline-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
