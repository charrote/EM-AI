import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  ApiOutlined,
  ArrowUpOutlined,
  MinusOutlined,
  SettingOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Tooltip, Tag, Select, Button, Modal, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useResponsive } from '../hooks/useResponsive';
import DeviceSelector from '../components/DeviceSelector';
import type { DeviceInfo } from '../components/DeviceSelector';

/* ═══════════════════════════════════════════════════
   类型定义
   ═══════════════════════════════════════════════════ */

interface BaselineDataPoint {
  time: string;
  mean: number;
  upper: number;
  lower: number;
  realtime: number;
  deviation: number; // 0~100, 偏离百分比
}

interface DimensionMetric {
  name: string;
  unit: string;
  baseline: number;
  current: number;
  deviation: number; // 0~100
  status: 'normal' | 'warning' | 'critical';
  icon: React.ReactNode;
}

interface FreqBin {
  freq: number;
  normalAmp: number;
  currentAmp: number;
  label: string;
}

/* ─── 工况系统 ────────────────────────────────── */

type WorkingCondition = 'idle' | 'normal' | 'full-load' | 'high-speed';

interface SimConfig {
  /** 噪声幅值倍率 (0=无噪声, 1=标准) */
  noiseScale: number;
  /** 漂移敏感度 (0~1) — 对 driftFactor 的跟随程度 */
  driftGain: number;
  /** 单侧漂移偏置 (0=居中, 正值=偏向一侧) */
  driftBias: number;
  /** 超出基线概率 (0~1) */
  outlierProb: number;
  /** 超出幅度倍率 (1=刚好触线, 2=大幅跃出) */
  outlierMag: number;
}

interface WorkingConditionConfig {
  key: WorkingCondition;
  label: string;
  desc: string;
  color: string;
  /** 振动基线幅值基数 (mm/s) */
  baseAmplitude: number;
  /** P95 (90% 置信) 包络宽度系数：envelope = base * factor */
  envelopeWidth95: number;
  /** P99 (98% 置信) 包络宽度系数 */
  envelopeWidth99: number;
  /** 各维度基线倍率（相对 normal 工况） */
  dimensionFactors: Record<string, number>;
  /** 仿真行为参数（控制数据点的平稳度/漂移/异常） */
  sim: SimConfig;
}

/** 工况定义：不同负载/转速下基线参数不同，不能共用同一套基线 */
const WORKING_CONDITIONS: Record<WorkingCondition, WorkingConditionConfig> = {
  'idle': {
    key: 'idle', label: '空载', desc: '设备启动/待机，振动幅值低', color: '#3B82F6',
    baseAmplitude: 25, envelopeWidth95: 6, envelopeWidth99: 10,
    dimensionFactors: { 振动: 0.4, 温度: 0.7, 电流: 0.3, 电压: 0.95, 转速: 0.1, 功率: 0.1 },
    sim: { noiseScale: 0.05, driftGain: 0.02, driftBias: 0, outlierProb: 0, outlierMag: 0 },
  },
  'normal': {
    key: 'normal', label: '正常运行', desc: '稳态生产，基线基于历史 P95/P99 分位数', color: '#22C55E',
    baseAmplitude: 50, envelopeWidth95: 12, envelopeWidth99: 20,
    dimensionFactors: { 振动: 1.0, 温度: 1.0, 电流: 1.0, 电压: 1.0, 转速: 1.0, 功率: 1.0 },
    sim: { noiseScale: 0.08, driftGain: 0.03, driftBias: 0, outlierProb: 0.0005, outlierMag: 0.58 },
  },
  'full-load': {
    key: 'full-load', label: '满载运行', desc: '高负载工况，基线幅值升高', color: '#F59E0B',
    baseAmplitude: 70, envelopeWidth95: 16, envelopeWidth99: 26,
    dimensionFactors: { 振动: 1.6, 温度: 1.3, 电流: 1.8, 电压: 0.98, 转速: 1.0, 功率: 2.0 },
    sim: { noiseScale: 1.0, driftGain: 0.28, driftBias: 0, outlierProb: 0.01, outlierMag: 1.6 },
  },
  'high-speed': {
    key: 'high-speed', label: '高速运转', desc: '高转速工况，振动频率升高', color: '#8B5CF6',
    baseAmplitude: 60, envelopeWidth95: 18, envelopeWidth99: 28,
    dimensionFactors: { 振动: 1.4, 温度: 1.1, 电流: 1.3, 电压: 0.96, 转速: 1.8, 功率: 1.5 },
    sim: { noiseScale: 1.2, driftGain: 0.5, driftBias: 0.65, outlierProb: 0.12, outlierMag: 2.0 },
  },
};

/** 基线生命周期元信息 */
interface BaselineMeta {
  version: number;
  lastUpdated: string;
  dataPoints: number;
  /** 分位数方法：选 P95（90% 置信区间）还是 P99（98% 置信区间） */
  percentileMethod: 95 | 99;
  autoUpdatePeriod: 'daily' | 'weekly' | 'monthly' | 'manual';
  isStable: boolean; // 筛选的时段是否稳态
  /** 设备大修/部件更换后需重置基线 */
  isPostOverhaul: boolean;
}

/* ═══════════════════════════════════════════════════
    颜色系统
    ═══════════════════════════════════════════════════ */

const HEALTH_COLORS = {
  normal: '#22C55E',
  normalBg: 'rgba(34,197,94,0.2)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.2)',
  critical: '#EF4444',
  criticalBg: 'rgba(239,68,68,0.2)',
  baseline: 'rgba(59,130,246,0.6)',
  realtime: '#3B82F6',
  gridLine: 'rgba(255,255,255,0.06)',
  textDim: 'rgba(255,255,255,0.35)',
  textMid: 'rgba(255,255,255,0.6)',
  textBright: 'rgba(255,255,255,0.85)',
};

/** 根据偏离百分比获取颜色 */
function getDeviationColor(devPct: number): string {
  if (devPct < 8) return HEALTH_COLORS.normal;
  if (devPct < 20) return HEALTH_COLORS.warning;
  return HEALTH_COLORS.critical;
}

/** 根据偏离百分比获取带透明度的颜色 */
function getDeviationColorWithAlpha(devPct: number, alpha: number): string {
  const base = getDeviationColor(devPct);
  // parse hex to rgb and add alpha
  const r = parseInt(base.slice(1, 3), 16);
  const g = parseInt(base.slice(3, 5), 16);
  const b = parseInt(base.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 在两种颜色之间线性插值 */
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

/** 根据偏离百分比获取渐变色（绿→黄→红） */
function gradientDeviationColor(devPct: number): string {
  if (devPct < 8) return lerpColor('#22C55E', '#F59E0B', devPct / 8);
  if (devPct < 20) return lerpColor('#F59E0B', '#EF4444', (devPct - 8) / 12);
  return '#EF4444';
}

/* ═══════════════════════════════════════════════════
   数据生成
   ═══════════════════════════════════════════════════ */

const POINTS = 120;

function generateTimeLabels(): string[] {
  const labels: string[] = [];
  const now = new Date();
  // 每个点间隔 300ms，60 个点覆盖 18s 滑动窗口
  for (let i = POINTS - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 300);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    labels.push(`${hh}:${mm}:${ss}`);
  }
  return labels;
}

/**
 * 简易种子随机数生成器 (Mulberry32) — 保证同 deviceSeed 产生相同基线
 */
function seededRandom(seed: number): () => number {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * 分位数计算（模拟 — 真实场景从历史数据查询）
 * 工业标准：筛选无故障、稳态运行时段的 N 个样本，
 * 升序排序后取第 P 百分位的值作为包络边界。
 * 不使用 min/max，避免把偶然波动纳入正常区间。
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

/**
 * 生成基线包络（仅固定包络，不含实时值）
 * - 模拟 60 分钟时序，每分钟一个点
 * - 包络边界由历史稳态数据的 P1/P99 或 P5/P95 分位数决定
 * - 使用种子随机数，同 deviceSeed 生成完全相同的包络
 * - 包络一经生成即固定不变，只有实时值滑动窗口会更新
 */
function generateBaselineEnvelope(
  condition: WorkingCondition = 'normal',
  pMethod: 95 | 99 = 95,
  deviceSeed: number = 0,
): { mean: number[]; upper: number[]; lower: number[] } {
  const labels = generateTimeLabels();
  const cfg = WORKING_CONDITIONS[condition];
  const pLow = pMethod === 95 ? 5 : 1;
  const pHigh = pMethod === 95 ? 95 : 99;
  const rng = seededRandom(deviceSeed + 1); // 用 deviceSeed 播种，保证可复现

  // ── 设备特有偏移量 ──
  const deviceOffset = deviceSeed * 0.3;
  const deviceTrendOffset = deviceSeed * 0.0005; // 微妙趋势差异，不导致越界
  const deviceNoiseFactor = 1 + (deviceSeed % 5) * 0.1;

  // ── 模拟"历史稳态数据池"：各时间点 500 个样本 → 算分位数 ──
  const HISTORICAL_SAMPLES = 500;
  const historicalPools: number[][] = labels.map((_, i) => {
    const pool: number[] = [];
    for (let s = 0; s < HISTORICAL_SAMPLES; s++) {
      const base = (cfg.baseAmplitude + deviceOffset)
        + (12 + deviceSeed * 0.1) * Math.sin((i / POINTS) * 4 * Math.PI + s * 0.01 + deviceSeed * 0.02)
        + i * (0.08 + deviceTrendOffset);
      const noise = (rng() - 0.5) * 3 * deviceNoiseFactor;
      pool.push(base + noise);
    }
    pool.sort((a, b) => a - b);
    return pool;
  });

  const mean: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];

  labels.forEach((_, i) => {
    const pool = historicalPools[i];
    const median = percentile(pool, 50);
    const lowerBound = percentile(pool, pLow);
    const upperBound = percentile(pool, pHigh);
    const pWidth = Math.max(upperBound - lowerBound, cfg.envelopeWidth95 * deviceNoiseFactor);
    mean.push(Math.round(median * 10) / 10);
    lower.push(Math.round((median - pWidth * 0.5) * 10) / 10);
    upper.push(Math.round((median + pWidth * 0.5) * 10) / 10);
  });

  return { mean, upper, lower };
}

/**
 * 根据当前漂移因子和工况计算单个实时值 + 偏离度
 * - idle:      噪声极低，几乎无漂移，无异常点 → 数据紧贴基线
 * - normal:    低噪声，偶尔小漂移，极少异常 → 基本平稳
 * - full-load: 中等噪声，漂移敏感度大，偶有大幅偏移 → 数据在基线上下摆动
 * - high-speed:噪声大，持续单侧偏移，偶发越界异常 → 大幅偏向一侧
 */
function computeRealtimePoint(
  idx: number,
  driftFactor: number,
  envelope: { mean: number[]; upper: number[]; lower: number[] },
  condition: WorkingCondition,
  deviceSeed: number = 0,
): { realtime: number; deviation: number } {
  const mean = envelope.mean[idx];
  const upper = envelope.upper[idx];
  const lower = envelope.lower[idx];
  const pWidth = upper - lower;
  const sim = WORKING_CONDITIONS[condition].sim;
  const deviceNoiseFactor = 1 + (deviceSeed % 5) * 0.1;

  // 漂移分量：gain 控制灵敏性，bias 控制单侧偏置
  const effectiveDrift = driftFactor * sim.driftGain + sim.driftBias;
  const driftOffset = (pWidth * 0.45) * Math.min(1, effectiveDrift);

  // 噪声分量
  const noise = (Math.random() - 0.5) * 1.8 * deviceNoiseFactor * sim.noiseScale;

  let realtime = mean + driftOffset + noise;

  // 异常点：概率触发越界
  if (sim.outlierProb > 0 && Math.random() < sim.outlierProb) {
    const dir = sim.driftBias > 0.3 ? 1 : (Math.random() > 0.5 ? 1 : -1);
    realtime += dir * pWidth * (sim.outlierMag - 0.5) * (0.5 + Math.random() * 0.5);
  }

  // 软钳制（允许轻微越界展示异常点，但不无限发散）
  const softMargin = pWidth * 0.4;
  if (realtime > upper + softMargin) realtime = upper + softMargin;
  if (realtime < lower - softMargin) realtime = lower - softMargin;

  realtime = Math.round(realtime * 10) / 10;
  const halfWidth = (upper - lower) / 2;
  const distToMedian = Math.abs(realtime - mean);
  const deviation = Math.min(100, Math.round((distToMedian / halfWidth) * 100));
  return { realtime, deviation };
}

/**
 * 生成雷达图维度数据（工况感知）
 * - 各维度基线值根据工况系数缩放
 * - 偏离程度受 driftFactor 和维度权重共同影响
 */
function generateRadarData(
  driftFactor: number = 0,
  condition: WorkingCondition = 'normal',
  deviceSeed: number = 0,
): DimensionMetric[] {
  const cfg = WORKING_CONDITIONS[condition];
  const sim = cfg.sim;

  // 各维度在 normal 工况下的基线值（设备特有偏移：每台设备出厂参数不同）
  const deviceDimFactor = 1 + (deviceSeed % 20 - 10) * 0.02; // 0.8~1.2
  const baseDimensions: Record<string, { value: number; unit: string }> = {
    振动: { value: Math.round(4.2 * deviceDimFactor * 10) / 10, unit: 'mm/s' },
    温度: { value: Math.round(72 * (1 + (deviceSeed % 10 - 5) * 0.01) * 10) / 10, unit: '°C' },
    电流: { value: Math.round(15.6 * deviceDimFactor * 10) / 10, unit: 'A' },
    电压: { value: 380, unit: 'V' },
    转速: { value: 1450, unit: 'rpm' },
    功率: { value: Math.round(7.5 * deviceDimFactor * 10) / 10, unit: 'kW' },
  };

  // 各维度受漂移影响的敏感度（仅振动高敏感，其余真实环境下变动极小）
  const dimSensitivity: Record<string, number> = {
    振动: 1.0, 温度: 0.18, 电流: 0.08, 电压: 0.03, 转速: 0.06, 功率: 0.15,
  };

  return Object.entries(baseDimensions).map(([name, info]) => {
    // 工况系数调整基线
    const factor = cfg.dimensionFactors[name] || 1.0;
    const baseline = Math.round(info.value * factor * 10) / 10;

    // 有效漂移 = 全局漂移周期 × 工况漂移敏感度 + 工况单侧偏置
    const rawDrift = driftFactor * sim.driftGain + sim.driftBias;
    const effectiveDrift = Math.min(0.8, Math.max(0, rawDrift));

    // 偏离度：漂移贡献 + 噪声贡献
    const sensitivity = dimSensitivity[name] || 0.5;
    const driftDev = effectiveDrift * sensitivity * 50;
    const noiseDev = (Math.random() - 0.5) * 6 * sim.noiseScale;
    const devPct = Math.min(65, Math.max(1, Math.round(driftDev + noiseDev + 2)));

    // 偏离方向：有偏置时一致偏上，否则随机
    const dir = effectiveDrift > 0.05 ? 1 : (Math.random() > 0.5 ? 1 : -1);
    const change = baseline * (devPct / 100) * 0.4 * dir;
    const current = Math.round(Math.max(0, baseline + change) * 10) / 10;

    let status: 'normal' | 'warning' | 'critical';
    if (devPct < 8) status = 'normal';
    else if (devPct < 22) status = 'warning';
    else status = 'critical';

    return { name, unit: info.unit, baseline, current, deviation: devPct, status, icon: <ApiOutlined /> };
  });
}

/** 生成频谱数据（隐性故障强度连续演化，工况感知） */
function generateFreqData(
  faultIntensity: number = 0,
  condition: WorkingCondition = 'normal',
  deviceSeed: number = 0,
): FreqBin[] {
  const sim = WORKING_CONDITIONS[condition].sim;

  // 工况幅值缩放：不同工况下频谱基线不同
  const ampScale: Record<WorkingCondition, number> = {
    'idle': 0.25,
    'normal': 1.0,
    'full-load': 1.4,
    'high-speed': 1.15,
  };
  const scale = ampScale[condition] || 1.0;

  // 设备特有频谱偏移（不同设备的共振频率和幅值不同）
  const seedShift = (deviceSeed % 10) * 0.08;
  const baseAmps = [12, 8, 15, 6, 10, 4, 7, 3, 5, 2, 4, 1.5, 3, 1, 2].map((a) =>
    Math.round((a + seedShift) * scale * 10) / 10,
  );
  const freqs = [10, 25, 50, 60, 100, 120, 150, 180, 200, 250, 300, 350, 400, 450, 500];
  const labels = ['1X', '', '2X', '', '3X', '', '4X', '', '5X', '', '6X', '', '7X', '', '8X'];

  return freqs.map((freq, i) => {
    // 工况感知的频谱噪声（随强度微增，模拟热噪声）
    const noiseScale = Math.max(0.3, sim.noiseScale) * (1 + faultIntensity * 0.3);
    const noise = (Math.random() - 0.5) * 1.5 * noiseScale;
    const normalAmp = Math.round((baseAmps[i] + noise) * 10) / 10;

    // 故障可见度：强度 × 工况漂移敏感度
    const faultVisibility = faultIntensity * (0.3 + sim.driftGain * 0.7);

    // 隐性故障：频率特征随强度连续渐变，3X~5X 谐波能量转移
    const faultShift = i >= 3 && i <= 7
      ? faultVisibility * (0.4 + Math.random() * 1.6 * faultIntensity)
      : i >= 8 && i <= 11
        ? faultVisibility * (0.15 + Math.random() * 0.8 * faultIntensity)
        : (Math.random() - 0.5) * 0.6 * faultIntensity;

    const currentAmp = Math.round(
      Math.max(0.3, Math.min(baseAmps[i] * 1.8, normalAmp + faultShift)) * 10 / 10,
    );

    return { freq, normalAmp, currentAmp, label: labels[i] };
  });
}

/* ═══════════════════════════════════════════════════
   子组件: 统计卡片
   ═══════════════════════════════════════════════════ */

function StatCard({
  icon, iconColor, label, value, unit, valueColor, subLabel,
}: {
  icon: React.ReactNode; iconColor: string; label: string;
  value: string; unit: string; valueColor: string; subLabel: string;
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(20,24,56,0.5) 0%, transparent 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ color: iconColor, fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: valueColor, lineHeight: 1.2 }}>
        {value}
        {unit && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{subLabel}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   子组件: 配置字段
   ═══════════════════════════════════════════════════ */

function ConfigField({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: valueColor || 'rgba(255,255,255,0.8)' }}>{value}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   子组件: 偏离度指示器
   ═══════════════════════════════════════════════════ */

function DeviationBadge({ value }: { value: number }) {
  const color = getDeviationColor(value);
  const label = value < 8 ? '正常' : value < 20 ? '偏离' : '严重偏离';
  const arrow = value < 8 ? <MinusOutlined /> : <ArrowUpOutlined />;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        background: `${color}18`,
        border: `1px solid ${color}35`,
        fontSize: 11,
        fontWeight: 600,
        color,
      }}
    >
      {arrow}
      <span>{label} {value}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   子组件: 维度状态条
   ═══════════════════════════════════════════════════ */

function DimensionBar({ dim, maxDeviation }: { dim: DimensionMetric; maxDeviation: number }) {
  const barWidth = maxDeviation > 0 ? (dim.deviation / maxDeviation) * 100 : 0;
  const barColor = getDeviationColor(dim.deviation);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ width: 48, fontSize: 11, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>{dim.name}</span>
      <span style={{ width: 52, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'right', flexShrink: 0 }}>
        {dim.unit}
      </span>
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
          minWidth: 40,
        }}
      >
        <div
          style={{
            width: `${Math.min(barWidth, 100)}%`,
            height: '100%',
            borderRadius: 3,
            background: barColor,
            transition: 'width 0.5s ease, background 0.5s ease',
          }}
        />
      </div>
      <span style={{ width: 36, fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'right', flexShrink: 0 }}>
        {dim.deviation}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════════ */

export default function AuraDeviceHealth() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  /* ── 状态 ── */
  const [playMode, setPlayMode] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  /* ── 实时流状态（滑动窗口） ── */
  const MAX_TRACE = 120;
  const driftRef = useRef(0.15);            // 当前漂移因子 0→1→0
  const pointSeqRef = useRef(0);             // 已生成的总点数
  const faultIntensityRef = useRef(0);       // 隐性故障强度 0~1（连续演化）
  const [faultIntensity, setFaultIntensity] = useState(0); // 触发 freqData 重算
  const [realtimeTrace, setRealtimeTrace] = useState<number[]>([]);
  const [deviationTrace, setDeviationTrace] = useState<number[]>([]);

  /* ── 设备选择 ── */
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);

  /* ── 工况与基线配置 ── */
  const [currentCondition, setCurrentCondition] = useState<WorkingCondition>('normal');
  const [percentileMethod, setPercentileMethod] = useState<95 | 99>(95);
  const [baselineConfigOpen, setBaselineConfigOpen] = useState(false);

  /* ── 基线生命周期元信息 ── */
  const [baselineMeta, setBaselineMeta] = useState<BaselineMeta>({
    version: 3,
    lastUpdated: '2026-06-10 08:30',
    dataPoints: 24800,
    percentileMethod: 95,
    autoUpdatePeriod: 'weekly',
    isStable: true,
    isPostOverhaul: false,
  });

  /* ── 设备标识种子（不同设备生成不同基线形态） ── */
  const deviceSeed = useMemo(() => {
    if (!selectedDevice) return 0;
    // 用设备 ID 的哈希值作为随机种子，同一设备始终生成一致的基线
    let hash = 0;
    for (let i = 0; i < selectedDevice.id.length; i++) {
      hash = ((hash << 5) - hash) + selectedDevice.id.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }, [selectedDevice]);

  /* ── 数据 ── */
  // 时间标签：每次新点产生时刷新，保持最新时间在右端
  const [timeLabels, setTimeLabels] = useState<string[]>(() => generateTimeLabels());

  // 固定基线包络（deviceSeed / 工况 / 分位数方法 不变时永不重新计算）
  // 将 60 个时间点的包络坍缩为固定水平范围（均线 + 上下阈值带）
  const baselineEnvelope = useMemo(() => {
    const env = generateBaselineEnvelope(currentCondition, percentileMethod, deviceSeed);
    // 全时段均值 ≈ 基线中值
    const mean = Math.round(env.mean.reduce((a, b) => a + b, 0) / env.mean.length);
    // 取整体最高上界 / 最低下界作为固定包络边界
    const upper = Math.round(Math.max(...env.upper));
    const lower = Math.round(Math.min(...env.lower));
    return {
      mean: Array(MAX_TRACE).fill(mean) as number[],
      upper: Array(MAX_TRACE).fill(upper) as number[],
      lower: Array(MAX_TRACE).fill(lower) as number[],
    };
  }, [currentCondition, percentileMethod, deviceSeed]);

  const radarData = useMemo(
    () => generateRadarData(driftRef.current, currentCondition, deviceSeed),
    // 雷达图暂用 driftRef.current 当前值（每次重渲染读取最新 ref）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentCondition, deviceSeed, realtimeTrace.length],
  );
  const freqData = useMemo(() => generateFreqData(faultIntensity, currentCondition, deviceSeed), [faultIntensity, currentCondition, deviceSeed]);

  // ── chart 数组：将滑动实时值右对齐到 60 点 ──
  const realtimeChartData = useMemo<number[]>((() => {
    const arr: number[] = new Array(MAX_TRACE).fill(null);
    const trace = realtimeTrace;
    const start = MAX_TRACE - trace.length;
    for (let i = 0; i < trace.length; i++) {
      arr[start + i] = trace[i];
    }
    return arr;
  }) as () => number[], [realtimeTrace]);

  const deviationChartData = useMemo<number[]>((() => {
    const arr: number[] = new Array(MAX_TRACE).fill(0);
    const trace = deviationTrace;
    const start = MAX_TRACE - trace.length;
    for (let i = 0; i < trace.length; i++) {
      arr[start + i] = trace[i];
    }
    return arr;
  }) as () => number[], [deviationTrace]);

  /* ── 初始化/切换工况/设备/方法时，生成暖机数据 ── */
  useEffect(() => {
    if (!selectedDevice) return;
    const env = baselineEnvelope;
    const WARMUP = 15;
    const trace: number[] = [];
    const devs: number[] = [];
    for (let i = 0; i < WARMUP; i++) {
      const idx = i % MAX_TRACE;
      const { realtime, deviation } = computeRealtimePoint(idx, 0.15, env, currentCondition, deviceSeed);
      trace.push(realtime);
      devs.push(deviation);
    }
    setRealtimeTrace(trace);
    setDeviationTrace(devs);
    setTimeLabels(generateTimeLabels());
    driftRef.current = 0.15;
    pointSeqRef.current = WARMUP;
    faultIntensityRef.current = 0;
    setFaultIntensity(0);
  }, [baselineEnvelope, selectedDevice]);

  /* ── 实时流推送（每次只追加一个点，历史数据不再变化） ── */
  useEffect(() => {
    if (!playMode || !selectedDevice) return;
    const env = baselineEnvelope;

    const interval = setInterval(() => {
      // 1. 更新漂移因子
      driftRef.current += 0.008;
      if (driftRef.current > 1.0) driftRef.current = 0;

      // 2. 生成一个新数据点
      const idx = pointSeqRef.current % MAX_TRACE;
      pointSeqRef.current++;
      const { realtime, deviation } = computeRealtimePoint(idx, driftRef.current, env, currentCondition, deviceSeed);

      // 3. 追加到滑动窗口
      setRealtimeTrace((prev) => {
        const next = [...prev, realtime];
        return next.length > MAX_TRACE ? next.slice(-MAX_TRACE) : next;
      });
      setDeviationTrace((prev) => {
        const next = [...prev, deviation];
        return next.length > MAX_TRACE ? next.slice(-MAX_TRACE) : next;
      });

      // 4. 演化隐性故障强度（工况感知，连续变化）
      const sim = WORKING_CONDITIONS[currentCondition].sim;
      const target = Math.min(1, Math.max(0,
        driftRef.current * sim.driftGain * 0.8 + sim.driftBias * 0.7 + 0.05
      ));
      faultIntensityRef.current += (target - faultIntensityRef.current) * 0.03;
      faultIntensityRef.current += (Math.random() - 0.5) * 0.025 * sim.noiseScale;
      faultIntensityRef.current = Math.max(0, Math.min(1, faultIntensityRef.current));

      // 5. 每隔 5 点刷新一次界面（时间标签 + 频谱状态）
      if (pointSeqRef.current % 5 === 0) {
        setTimeLabels(generateTimeLabels());
        setFaultIntensity(faultIntensityRef.current);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [playMode, selectedDevice, baselineEnvelope, deviceSeed, currentCondition]);

  /* ── 当前最大偏离度（来自滑动窗口） ── */
  const maxDeviation = useMemo(() => {
    if (deviationTrace.length === 0) return 0;
    return Math.max(...deviationTrace);
  }, [deviationTrace]);

  /* ── 当前漂移趋势描述 ── */
  const trendInfo = useMemo(() => {
    if (maxDeviation < 8) {
      return { label: '设备健康', color: HEALTH_COLORS.normal, icon: <CheckCircleOutlined /> };
    }
    if (maxDeviation < 20) {
      return { label: '偏离基线 ' + maxDeviation + '% | 潜在趋势异常', color: HEALTH_COLORS.warning, icon: <WarningOutlined /> };
    }
    return { label: '严重偏离基线 ' + maxDeviation + '% | 建议检修', color: HEALTH_COLORS.critical, icon: <WarningOutlined /> };
  }, [maxDeviation]);

  /* ── 整体状态 ── */
  const overallStatus = useMemo(() => {
    if (maxDeviation < 8) return { text: '健康', color: HEALTH_COLORS.normal, bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.2)' };
    if (maxDeviation < 20) return { text: '注意', color: HEALTH_COLORS.warning, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.2)' };
    return { text: '预警', color: HEALTH_COLORS.critical, bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.2)' };
  }, [maxDeviation]);

  /* ── 当前包络颜色（基于最大偏离） ── */
  const envelopeColor = useMemo(() => gradientDeviationColor(maxDeviation), [maxDeviation]);

  /* ── 基线重置处理函数 ── */
  const handleResetBaseline = useCallback(() => {
    setBaselineMeta((prev) => ({
      ...prev,
      version: prev.version + 1,
      lastUpdated: new Date().toLocaleString('zh-CN', { hour12: false }),
      dataPoints: Math.round(prev.dataPoints * 1.1),
      isStable: true,
      isPostOverhaul: false,
    }));
  }, []);

  const handleSimulateOverhaul = useCallback(() => {
    setBaselineMeta((prev) => ({
      ...prev,
      isPostOverhaul: true,
      isStable: false,
      version: prev.version + 1,
      lastUpdated: new Date().toLocaleString('zh-CN', { hour12: false }),
      dataPoints: 800,
      autoUpdatePeriod: 'manual',
    }));
    driftRef.current = 0;
    pointSeqRef.current = 0;
    setRealtimeTrace([]);
    setDeviationTrace([]);
  }, []);

  /* ═════════════════════════════════════════════════
     图表: 阴影区包络线 (Shadow Zone Envelope)
     ═════════════════════════════════════════════════ */

  const shadowZoneOption = useMemo(() => {
    const meanData = baselineEnvelope.mean;
    const upperData = baselineEnvelope.upper;
    const lowerData = baselineEnvelope.lower;
    const realtimeData = realtimeChartData;
    const driftData = deviationChartData;

    // 包络线颜色数组（每个数据点一个颜色，实现渐变效果）
    const envelopeColors = driftData.map((dev) => gradientDeviationColor(dev));
    const envelopeColorStr = envelopeColors[envelopeColors.length - 1] || envelopeColor;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(7,10,26,0.94)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const p = params[0];
          const idx = p.dataIndex;
          const t = timeLabels[idx] || '';
          const mean = meanData[idx];
          const low = lowerData[idx];
          const high = upperData[idx];
          const rt = realtimeData[idx];
          const dev = driftData[idx];
          if (mean === undefined) return '';
          return `
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:4px;">${t}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="color:#22C55E;font-size:11px;">● 基线范围: ${low} ~ ${high}</span>
              ${rt !== null ? `<span style="color:#3B82F6;font-size:11px;">● 实时值: <b>${rt}</b></span>` : '<span style="color:rgba(255,255,255,0.2);font-size:11px;">● 待采集</span>'}
            </div>
            ${rt !== null ? `<div style="margin-top:4px;padding:2px 6px;border-radius:3px;background:${getDeviationColor(dev)}22;color:${getDeviationColor(dev)};font-size:11px;">
              偏离基线 ${dev}%${dev > 8 ? ' | 潜在趋势异常' : ''}
            </div>` : ''}
          `;
        },
      },
      grid: {
        left: isCompact ? 40 : 56,
        right: isCompact ? 12 : 20,
        top: isCompact ? 20 : 30,
        bottom: isCompact ? 28 : 35,
      },
      xAxis: {
        type: 'category',
        data: timeLabels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: {
          color: 'rgba(255,255,255,0.3)',
          fontSize: isCompact ? 8 : 10,
          interval: isCompact ? 10 : 8,
        },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 0,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
        axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: isCompact ? 8 : 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        name: '振动幅值 (mm/s)',
        nameTextStyle: { color: 'rgba(255,255,255,0.2)', fontSize: isCompact ? 8 : 10 },
      },
      series: [
        // 包络底线（不可见，用于堆叠）
        {
          name: '包络底',
          type: 'line',
          data: lowerData,
          stack: 'envelope',
          lineStyle: { opacity: 0 },
          areaStyle: { opacity: 0 },
          symbol: 'none',
          z: 1,
          animation: false,
        },
        // 包络填充（堆叠在底线之上）
        {
          name: '正常范围',
          type: 'line',
          data: upperData.map((u, i) => {
            const range = u - lowerData[i];
            return Math.round(range * 10) / 10;
          }),
          stack: 'envelope',
          lineStyle: {
            width: 0,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: getDeviationColorWithAlpha(maxDeviation, 0.35) },
                { offset: 1, color: getDeviationColorWithAlpha(maxDeviation, 0.08) },
              ],
            },
          },
          symbol: 'none',
          z: 1,
          animation: false,
        },
        // 上包络线
        {
          name: '上边界',
          type: 'line',
          data: upperData,
          lineStyle: {
            width: 1,
            color: getDeviationColorWithAlpha(maxDeviation, 0.25),
            type: 'dashed',
          },
          symbol: 'none',
          z: 2,
          animation: false,
        },
        // 下包络线
        {
          name: '下边界',
          type: 'line',
          data: lowerData,
          lineStyle: {
            width: 1,
            color: getDeviationColorWithAlpha(maxDeviation, 0.25),
            type: 'dashed',
          },
          symbol: 'none',
          z: 2,
          animation: false,
        },
        // 均值基线
        {
          name: '均值基线',
          type: 'line',
          data: meanData,
          lineStyle: {
            width: 1.5,
            color: 'rgba(255,255,255,0.2)',
            type: 'dashed',
          },
          symbol: 'none',
          z: 2,
          animation: false,
        },
        // 实时数据曲线（纯线，无填充蒙层）
        {
          name: '实时数据',
          type: 'line',
          data: realtimeData,
          connectNulls: false,
          lineStyle: {
            width: 2.5,
            color: '#3B82F6',
            shadowBlur: 8,
            shadowColor: 'rgba(59,130,246,0.3)',
          },
          symbol: 'none',
          z: 3,
          animation: false,
        },
      ],
    };
  }, [baselineEnvelope, realtimeChartData, deviationChartData, timeLabels, envelopeColor, maxDeviation, isCompact]);

  /* ═════════════════════════════════════════════════
     图表: 多维雷达图
     ═════════════════════════════════════════════════ */

  const radarOption = useMemo(() => {
    const indicator = radarData.map((dim) => ({
      name: `${dim.name}\n(${dim.unit})`,
      max: dim.baseline * 1.8,
    }));

    const baselineValues = radarData.map((dim) => dim.baseline);
    const currentValues = radarData.map((dim) => Math.max(0, dim.current));

    // 根据偏离度调整雷达填充颜色
    const avgDev = radarData.reduce((s, d) => s + d.deviation, 0) / radarData.length;
    const radarFillColor = gradientDeviationColor(avgDev);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(7,10,26,0.94)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const dimIdx = params.dataIndex;
          const dim = radarData[dimIdx];
          if (!dim) return '';
          return `
            <div style="font-size:12px;font-weight:600;margin-bottom:4px;">${dim.name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);">基线值: ${dim.baseline} ${dim.unit}</div>
            <div style="font-size:11px;color:${getDeviationColor(dim.deviation)};">实时值: ${dim.current} ${dim.unit}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);">偏离度: ${dim.deviation}%</div>
          `;
        },
      },
      radar: {
        indicator,
        radius: isCompact ? '60%' : '68%',
        axisName: {
          color: 'rgba(255,255,255,0.5)',
          fontSize: isCompact ? 8 : 10,
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)'],
          },
        },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)' },
        },
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)' },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: baselineValues,
              name: '基线',
              lineStyle: { color: 'rgba(255,255,255,0.3)', width: 1.5, type: 'dashed' },
              areaStyle: { color: 'rgba(255,255,255,0.04)' },
              itemStyle: { color: 'rgba(255,255,255,0.3)' },
            },
            {
              value: currentValues,
              name: '实时',
              lineStyle: { color: radarFillColor, width: 2.5 },
              areaStyle: { color: radarFillColor + '30' },
              itemStyle: { color: radarFillColor },
            },
          ],
          symbol: 'circle',
          symbolSize: isCompact ? 2 : 3,
          animation: false,
        },
      ],
    };
  }, [radarData, isCompact]);

  /* ═════════════════════════════════════════════════
     图表: 隐性故障频谱
     ═════════════════════════════════════════════════ */

  const freqOption = useMemo(() => {
    const freqLabels = freqData.map((f) => f.label || String(f.freq) + 'Hz');

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(7,10,26,0.94)',
        borderColor: 'rgba(255,255,255,0.08)',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const idx = params[0].dataIndex;
          const f = freqData[idx];
          if (!f) return '';
          const diff = Math.round((f.currentAmp - f.normalAmp) * 10) / 10;
          return `
            <div style="font-size:11px;font-weight:600;margin-bottom:4px;">${f.freq} Hz</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);">正常幅值: ${f.normalAmp}</div>
            <div style="font-size:11px;color:${faultIntensity > 0.15 ? '#EF4444' : faultIntensity > 0.05 ? '#F59E0B' : '#22C55E'};">当前幅值: ${f.currentAmp}${faultIntensity > 0.15 ? ' ⚠' : faultIntensity > 0.05 ? ' △' : ''}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.3);">差值: ${diff > 0 ? '+' : ''}${diff}</div>
          `;
        },
      },
      grid: {
        left: isCompact ? 36 : 50,
        right: isCompact ? 8 : 16,
        top: isCompact ? 12 : 20,
        bottom: isCompact ? 24 : 32,
      },
      xAxis: {
        type: 'category',
        data: freqLabels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        axisLabel: {
          color: 'rgba(255,255,255,0.35)',
          fontSize: isCompact ? 8 : 10,
          interval: 1,
        },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '幅值',
        nameTextStyle: { color: 'rgba(255,255,255,0.2)', fontSize: isCompact ? 8 : 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)', type: 'dashed' } },
        axisLabel: { color: 'rgba(255,255,255,0.25)', fontSize: isCompact ? 8 : 10 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: '正常频谱',
          type: 'bar',
          data: freqData.map((f) => ({
            value: f.normalAmp,
            itemStyle: {
              color: 'rgba(255,255,255,0.15)',
              borderRadius: [2, 2, 0, 0],
            },
          })),
          barWidth: isCompact ? 8 : 12,
          barGap: '30%',
          animation: false,
        },
        {
          name: '当前频谱',
          type: 'bar',
          data: freqData.map((f) => {
            // 根据故障强度渐变：绿→黄→红
            const fc = faultIntensity < 0.08 ? ['#22C55E', 'rgba(34,197,94,0.3)']
                     : faultIntensity < 0.3  ? ['#F59E0B', 'rgba(245,158,11,0.3)']
                     :                          ['#EF4444', 'rgba(239,68,68,0.3)'];
            return {
              value: f.currentAmp,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: fc[0] },
                  { offset: 1, color: fc[1] },
                ]),
                borderRadius: [2, 2, 0, 0],
              },
            };
          }),
          barWidth: isCompact ? 8 : 12,
          animation: false,
        },
      ],
    };
  }, [freqData, faultIntensity, isCompact]);

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
              background: 'linear-gradient(135deg, #06B6D4, #22C55E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
              flexShrink: 0,
            }}
          >
            <DashboardOutlined />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: isCompact ? 16 : 18, fontWeight: 700, color: '#FFFFFF' }}>
                设备健康基线
              </span>
              {/* 工况选择器 */}
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: 2 }}>
                {(Object.entries(WORKING_CONDITIONS) as [WorkingCondition, WorkingConditionConfig][]).map(([key, cfg]) => (
                  <div
                    key={key}
                    onClick={() => setCurrentCondition(key)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: isCompact ? 9 : 10,
                      fontWeight: 500,
                      color: currentCondition === key ? cfg.color : 'rgba(255,255,255,0.35)',
                      background: currentCondition === key ? `${cfg.color}18` : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      whiteSpace: 'nowrap',
                    }}
                    title={cfg.desc}
                  >
                    {cfg.label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ fontSize: isCompact ? 10 : 12, color: 'rgba(255,255,255,0.45)' }}>
              AURA Device Health Baseline · 从被动报警到主动感知
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* 分位数方法切换 */}
          <Tooltip title={`当前使用 P${percentileMethod}（${percentileMethod === 95 ? '90%' : '98%'} 置信区间）构建包络边界`}>
            <div
              onClick={() => setPercentileMethod(percentileMethod === 95 ? 99 : 95)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: isCompact ? 9 : 10,
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              P{percentileMethod}
            </div>
          </Tooltip>

          {/* 整体状态标签 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 10px',
              borderRadius: 6,
              background: overallStatus.bg,
              border: `1px solid ${overallStatus.border}`,
              fontSize: isCompact ? 11 : 12,
              fontWeight: 600,
              color: overallStatus.color,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: overallStatus.color,
                display: 'inline-block',
                animation: 'pulse-dot 1.2s ease-in-out infinite',
              }}
            />
            {overallStatus.text}
          </div>

          {/* 基线配置入口 */}
          <Tooltip title="基线生命周期管理">
            <div
              onClick={() => setBaselineConfigOpen(true)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: isCompact ? 10 : 11,
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                userSelect: 'none',
              }}
            >
              <SettingOutlined style={{ fontSize: isCompact ? 10 : 11 }} />
              基线管理
            </div>
          </Tooltip>

          {/* 播放控制 */}
          <div
            onClick={() => setPlayMode(!playMode)}
            style={{
              padding: '3px 10px',
              borderRadius: 6,
              background: playMode
                ? 'rgba(59,130,246,0.12)'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${playMode ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.1)'}`,
              fontSize: isCompact ? 10 : 11,
              color: playMode ? '#3B82F6' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              userSelect: 'none',
            }}
          >
            {playMode ? '⏸ 暂停' : '▶ 播放'}
          </div>
        </div>
      </div>

      {/* ═══ 设备选择条（暗色低调） ═══ */}
      <div
        style={{
          margin: isCompact ? '6px 16px 0' : '8px 24px 0',
          padding: isCompact ? '5px 10px' : '6px 14px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        <ToolOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, flexShrink: 0 }} />
        <span style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.4)', flexShrink: 0, whiteSpace: 'nowrap' }}>
          设备
        </span>
        <div style={{ flex: 1, minWidth: isCompact ? 120 : 180, maxWidth: 380 }}>
          <DeviceSelector
            value={selectedDevice}
            onChange={(device) => {
              setSelectedDevice(device);
              // 设备切换后重置实时流，基线会通过 warm-up effect 重新初始化
              setRealtimeTrace([]);
              setDeviationTrace([]);
              driftRef.current = 0.15;
              pointSeqRef.current = 0;
            }}
            placeholder="搜索设备名称或编号..."
            compact={isCompact}
            dark
          />
        </div>
        {selectedDevice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>{selectedDevice.code}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>{selectedDevice.type}</span>
          </div>
        )}
      </div>

      {/* ═══ 趋势警告条 ═══ */}
      {selectedDevice && maxDeviation > 8 && (
        <div
          style={{
            margin: isCompact ? '10px 16px 0' : '12px 24px 0',
            padding: '8px 14px',
            borderRadius: 8,
            background: `${trendInfo.color}12`,
            border: `1px solid ${trendInfo.color}25`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            animation: 'fadeSlideIn 0.4s ease-out',
          }}
        >
          <span style={{ color: trendInfo.color, fontSize: 14 }}>{trendInfo.icon}</span>
          <span style={{ fontSize: isCompact ? 11 : 12, color: trendInfo.color, fontWeight: 500 }}>
            {trendInfo.label}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.3)' }}>
            AI 主动感知 · 预测性维护建议
          </span>
        </div>
      )}

      {!selectedDevice ? (
        /* ═══ 未选择设备：占位提示 ═══ */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 40,
            color: 'rgba(255,255,255,0.15)',
            userSelect: 'none',
          }}
        >
          <ToolOutlined style={{ fontSize: 40, opacity: 0.3 }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.2)' }}>
            请先选择一台设备
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.1)', textAlign: 'center', maxWidth: 320 }}>
            在上方搜索框中输入设备名称或编号，选择后自动加载该设备的健康基线数据
          </div>
        </div>
      ) : (
        <>
      {/* ═══ 统计卡片行 ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isCompact ? 6 : 8,
          padding: isCompact ? '10px 16px 0' : '14px 24px 0',
          flexShrink: 0,
        }}
      >
        <StatCard
          icon={<DatabaseOutlined />}
          iconColor="#3B82F6"
          label="基线版本"
          value={`v${baselineMeta.version}`}
          unit=""
          valueColor="#3B82F6"
          subLabel={`${baselineMeta.dataPoints.toLocaleString()} 个稳态样本 · P${baselineMeta.percentileMethod}`}
        />
        <StatCard
          icon={<WarningOutlined />}
          iconColor={getDeviationColor(maxDeviation)}
          label="最大偏离度"
          value={String(maxDeviation)}
          unit="%"
          valueColor={getDeviationColor(maxDeviation)}
          subLabel={maxDeviation < 8 ? '设备运行稳定' : maxDeviation < 20 ? '建议关注趋势' : '建议立即检修'}
        />
        <StatCard
          icon={<ApiOutlined />}
          iconColor="#22C55E"
          label="监测维度"
          value={String(radarData.length)}
          unit="个"
          valueColor="#22C55E"
          subLabel={`${radarData.filter(d => d.status === 'normal').length} 正常 · ${radarData.filter(d => d.status === 'warning').length} 注意 · ${radarData.filter(d => d.status === 'critical').length} 异常`}
        />
        <StatCard
          icon={<ClockCircleOutlined />}
          iconColor={baselineMeta.isStable ? '#22C55E' : '#F59E0B'}
          label="基线更新"
          value={baselineMeta.lastUpdated.split(' ')[1] || baselineMeta.lastUpdated}
          unit=""
          valueColor={baselineMeta.isStable ? '#22C55E' : '#F59E0B'}
          subLabel={`${baselineMeta.autoUpdatePeriod === 'daily' ? '每日' : baselineMeta.autoUpdatePeriod === 'weekly' ? '每周' : baselineMeta.autoUpdatePeriod === 'monthly' ? '每月' : '手动'}更新${baselineMeta.isPostOverhaul ? ' · 大修后已重置' : ''}`}
        />
      </div>

      {/* ═══ 主体区域 ═══ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isCompact ? 'column' : 'row',
          gap: isCompact ? 8 : 10,
          padding: isCompact ? '8px 12px 6px' : '12px 20px 8px',
          minHeight: 0,
        }}
      >
        {/* ── 左/上: 阴影区包络线图表 ── */}
        <div
          style={{
            flex: isCompact ? '0 0 50%' : '0 0 58%',
            minHeight: isCompact ? 200 : 0,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(180deg, rgba(20,24,56,0.3) 0%, transparent 100%)',
            overflow: 'hidden',
          }}
        >
          {/* 图表标题 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isCompact ? '8px 12px 0' : '10px 16px 0',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6' }} />
              <span style={{ fontSize: isCompact ? 11 : 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                振动基线 · 阴影区包络
              </span>
              <span style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.25)' }}>
                Shadow Zone Envelope
              </span>
            </div>
            <DeviationBadge value={maxDeviation} />
          </div>

          {/* 图例 */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              padding: isCompact ? '4px 12px 0' : '6px 16px 0',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {[
              { color: 'rgba(255,255,255,0.2)', label: '均值基线', type: 'dashed' },
              { color: getDeviationColorWithAlpha(maxDeviation, 0.5), label: '正常范围', type: 'solid' },
              { color: '#3B82F6', label: '实时数据', type: 'solid' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)' }}>
                <span
                  style={{
                    width: 14, height: 2,
                    background: item.color,
                    borderTop: item.type === 'dashed' ? '1px dashed ' + item.color : 'none',
                    display: 'inline-block',
                  }}
                />
                {item.label}
              </div>
            ))}
          </div>

          {/* ECharts */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ReactECharts
              option={shadowZoneOption}
              style={{ height: '100%', width: '100%' }}
              notMerge
              lazyUpdate
            />
          </div>
        </div>

        {/* ── 右/下: 雷达图 + 维度列表 ── */}
        <div
          style={{
            flex: isCompact ? '0 0 50%' : '1',
            minHeight: isCompact ? 200 : 0,
            display: 'flex',
            flexDirection: 'column',
            gap: isCompact ? 6 : 8,
          }}
        >
          {/* 雷达图 */}
          <div
            style={{
              flex: 1,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(180deg, rgba(20,24,56,0.3) 0%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: isCompact ? '8px 12px 0' : '10px 16px 0',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
                <span style={{ fontSize: isCompact ? 11 : 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
                  多维偏离度
                </span>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <ReactECharts
                option={radarOption}
                style={{ height: '100%', width: '100%' }}
                notMerge
                lazyUpdate
              />
            </div>
          </div>

          {/* 维度偏差明细 */}
          <div
            style={{
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(180deg, rgba(20,24,56,0.3) 0%, transparent 100%)',
              padding: isCompact ? '8px 12px' : '10px 16px',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
              维度偏离明细
            </div>
            {radarData.map((dim) => (
              <DimensionBar key={dim.name} dim={dim} maxDeviation={Math.max(...radarData.map(d => d.deviation))} />
            ))}
          </div>
        </div>
      </div>

      {/* ═══ 底部: 隐性故障捕捉 ═══ */}
      <div
        style={{
          flexShrink: 0,
          padding: isCompact ? '0 12px 10px' : '0 20px 14px',
        }}
      >
          <div
            style={{
              borderRadius: 10,
              border: `1px solid ${faultIntensity < 0.08 ? 'rgba(255,255,255,0.06)' : faultIntensity < 0.3 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
              background: faultIntensity < 0.08
                ? 'linear-gradient(180deg, rgba(20,24,56,0.3) 0%, transparent 100%)'
                : faultIntensity < 0.3
                  ? 'linear-gradient(180deg, rgba(245,158,11,0.06) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, transparent 100%)',
              transition: 'all 0.8s ease',
              display: 'flex',
              flexDirection: isCompact ? 'column' : 'row',
              overflow: 'hidden',
            }}
          >
            {/* 频谱图 */}
            <div
              style={{
                flex: 1,
                minHeight: isCompact ? 120 : 90,
                minWidth: 0,
              }}
            >
              <ReactECharts
                option={freqOption}
                style={{ height: '100%', width: '100%' }}
                notMerge
                lazyUpdate
              />
            </div>

            {/* 状态描述 */}
            <div
              style={{
                width: isCompact ? '100%' : 280,
                flexShrink: 0,
                padding: isCompact ? '0 12px 10px' : '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                borderLeft: isCompact ? 'none' : '1px solid rgba(255,255,255,0.04)',
                borderTop: isCompact ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: faultIntensity < 0.08 ? '#22C55E' : faultIntensity < 0.3 ? '#F59E0B' : '#EF4444',
                    transition: 'background 0.5s ease',
                    animation: faultIntensity > 0.15 ? 'pulse-dot 1s ease-in-out infinite' : 'none',
                  }}
                />
                <span style={{ fontSize: isCompact ? 12 : 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                  隐性故障捕捉
                </span>
              </div>
              <div style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {faultIntensity < 0.08 ? (
                  <>
                    <span style={{ color: '#22C55E' }}>✓ 频谱模式正常</span>
                    <br />
                    各频段幅值在预期范围内，频率特征稳定。
                    <br />
                    基线持续学习设备正常运行模式。
                  </>
                ) : faultIntensity < 0.3 ? (
                  <>
                    <span style={{ color: '#F59E0B' }}>△ 频谱轻微偏移</span>
                    <br />
                    部分频段幅值略有变化，频谱分布出现微小偏移。
                    <br />
                    <span style={{ color: '#F59E0B' }}>建议关注</span> — 持续观察趋势变化。
                  </>
                ) : (
                  <>
                    <span style={{ color: '#EF4444', fontWeight: 600 }}>⚠ 频率特征异常</span>
                    <br />
                    幅值未超阈值，但频谱分布发生偏移（3X~5X 谐波能量转移）。
                    <br />
                    <span style={{ color: '#EF4444' }}>基线色彩变红</span> — 潜在轴承磨损迹象。
                  </>
                )}
              </div>
              {faultIntensity > 0.15 && (
                <div
                  style={{
                    marginTop: 6,
                    padding: '4px 10px',
                    borderRadius: 4,
                    background: faultIntensity < 0.3 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${faultIntensity < 0.3 ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    fontSize: isCompact ? 10 : 11,
                    color: faultIntensity < 0.3 ? '#F59E0B' : '#EF4444',
                  }}
                >
                  预防性价值：提前 72h 预警，避免非计划停机
                </div>
              )}
            </div>
          </div>
      </div>
      </>
      )}

      {/* ═══ 基线生命周期管理模态窗 ═══ */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFFFFF' }}>
            <DatabaseOutlined style={{ color: '#3B82F6' }} />
            <span>基线生命周期管理</span>
          </div>
        }
        open={baselineConfigOpen}
        onCancel={() => setBaselineConfigOpen(false)}
        footer={null}
        width={520}
        centered
        styles={{
          content: { background: '#0E1230', border: '1px solid rgba(255,255,255,0.08)' },
          mask: { background: 'rgba(0,0,0,0.6)' },
          header: { background: '#0E1230', borderBottom: '1px solid rgba(255,255,255,0.06)' },
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'rgba(255,255,255,0.8)' }}>
          {/* ── 基线元信息 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ConfigField label="基线版本" value={`v${baselineMeta.version}`} />
            <ConfigField label="分位数方法" value={`P${baselineMeta.percentileMethod}（${baselineMeta.percentileMethod === 95 ? '90%' : '98%'} 置信区间）`} />
            <ConfigField label="样本数据量" value={`${baselineMeta.dataPoints.toLocaleString()} 个`} />
            <ConfigField label="最后更新" value={baselineMeta.lastUpdated} />
            <ConfigField label="工况适配" value={WORKING_CONDITIONS[currentCondition].label} />
            <ConfigField
              label="稳态筛选"
              value={baselineMeta.isStable ? '已筛选 ✅' : '未筛选 ⚠️'}
              valueColor={baselineMeta.isStable ? '#22C55E' : '#F59E0B'}
            />
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* ── 自动更新周期 ── */}
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>基线自动更新周期</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['daily', 'weekly', 'monthly', 'manual'] as const).map((period) => (
                <div
                  key={period}
                  onClick={() => setBaselineMeta((prev) => ({ ...prev, autoUpdatePeriod: period }))}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    color: baselineMeta.autoUpdatePeriod === period ? '#3B82F6' : 'rgba(255,255,255,0.35)',
                    background: baselineMeta.autoUpdatePeriod === period ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${baselineMeta.autoUpdatePeriod === period ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {period === 'daily' ? '每日' : period === 'weekly' ? '每周' : period === 'monthly' ? '每月' : '手动'}
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

          {/* ── 基线操作 ── */}
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>基线操作</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetBaseline}
                style={{
                  background: 'rgba(59,130,246,0.12)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  color: '#3B82F6',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                立即更新基线
              </Button>
              <Button
                icon={<WarningOutlined />}
                onClick={handleSimulateOverhaul}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#EF4444',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                模拟大修后重置
              </Button>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 6 }}>
              * 设备大修或关键部件更换后，原有基线数据已失效，必须重置基线
            </div>
          </div>

          {baselineMeta.isPostOverhaul && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.2)',
                fontSize: 11,
                color: '#F59E0B',
              }}
            >
              ⚠️ 大修标记已设置。当前基线版本 v{baselineMeta.version} 正在重新采集稳态数据，
              达到足够样本量后将自动切换为新基线。建议在设备稳定运行 72h 后手动确认基线生效。
            </div>
          )}
        </div>
      </Modal>

      {/* ═══ 注入样式 ═══ */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
