// @ts-nocheck - Dynamic data types with complex column definitions
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Button, Typography, Tag } from 'antd';
import {
  ThunderboltOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DashboardOutlined,
  BugOutlined,
  FileTextOutlined,
  CameraOutlined,
  TableOutlined,
  ApiOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import ReactECharts from '../components/ReactECharts';
import { useResponsive } from '../hooks/useResponsive';

const { Text } = Typography;

/* ─── 类型定义 ──────────────────────────────── */

interface AnomalyInfo {
  index: number;
  type: 'spike' | 'dropout' | 'flatline' | 'gap';
  x: number;
  y: number;
  fixedY: number;
  description: string;
  label: string;
  /** 关联的数据源场景 */
  sourceKey: string;
}

interface DataSourceInfo {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  examples: string[];
}

/* ─── 工业数据源场景 ────────────────────────── */

const DATA_SOURCES: DataSourceInfo[] = [
  { key: 'device-log', label: '设备日志', icon: <FileTextOutlined />, color: '#3B82F6',
    examples: ['数控机床报警文本', '机器人故障日志', '工控系统报错自由文本'] },
  { key: 'vision-qc', label: '视觉质检', icon: <CameraOutlined />, color: '#8B5CF6',
    examples: ['图片缺陷坐标', 'OCR 钢号/批次号', '手写工单拍照识别'] },
  { key: 'mes-excel', label: 'MES 手工数据', icon: <TableOutlined />, color: '#F59E0B',
    examples: ['手工录入 Excel', '纸质单据扫描', '外协来料填报'] },
  { key: 'edge-sensor', label: '边缘传感器', icon: <NodeIndexOutlined />, color: '#EF4444',
    examples: ['电磁干扰毛刺', '无规律跳变', '漂移噪声'] },
  { key: 'multi-protocol', label: '多协议混采', icon: <ApiOutlined />, color: '#06B6D4',
    examples: ['Modbus/Profinet', '串口/私有协议', '字段错位编码混乱'] },
];

/* ─── 数据生成 ──────────────────────────────── */

const POINTS = 120;

function generateData() {
  const raw: (number | null)[] = [];
  const cleaned: (number | null)[] = [];
  const anomalies: AnomalyInfo[] = [];

  // 1. 基波：模拟电机振动信号（正弦 + 趋势 + 工频噪声）
  for (let i = 0; i < POINTS; i++) {
    const base = 50 + 22 * Math.sin((i / POINTS) * 6 * Math.PI) + i * 0.08;
    const noise = (Math.random() - 0.5) * 4;
    const val = Math.round((base + noise) * 10) / 10;
    raw.push(val);
    cleaned.push(val);
  }

  // 2a. 边缘传感器电磁干扰 → 毛刺跳变（index 18）
  raw[18] = Math.round((raw[17] as number + 48) * 10) / 10;
  anomalies.push({
    index: 18, type: 'spike', x: 18, y: raw[18] as number,
    fixedY: Math.round(((cleaned[17] as number) + (cleaned[19] as number)) / 2 * 10) / 10,
    description: '电磁干扰毛刺：变频器启停导致传感器信号瞬时跃升 +48 单位，AI 通过时序上下文线性插值修复',
    label: '电磁毛刺', sourceKey: 'edge-sensor',
  });
  cleaned[18] = anomalies[anomalies.length - 1].fixedY;

  // 2b. 多协议混采 → 字段错位/编码异常导致数值归零（index 30~31）
  raw[30] = 0;
  raw[31] = 0;
  anomalies.push({
    index: 30, type: 'dropout', x: 30, y: 0,
    fixedY: raw[29] as number,
    description: '协议解析异常：Modbus TCP 报文 CRC 校验失败导致字段错位，AI 依据协议栈重解析修复',
    label: '协议错位', sourceKey: 'multi-protocol',
  });
  cleaned[30] = raw[29] as number;
  cleaned[31] = raw[29] as number;

  // 2c. 设备日志 / 纸单扫描 → 传感器卡滞死值（index 48~53）
  const flatVal = raw[48];
  for (let j = 48; j <= 53; j++) { raw[j] = flatVal; }
  const beforeFlat = cleaned[47] as number;
  const afterFlat = cleaned[54] as number;
  for (let j = 48; j <= 53; j++) {
    const t = (j - 48) / (53 - 48);
    cleaned[j] = Math.round((beforeFlat + (afterFlat - beforeFlat) * t) * 10) / 10;
  }
  anomalies.push({
    index: 50, type: 'flatline', x: 50, y: flatVal as number,
    fixedY: cleaned[50] as number,
    description: '传感器卡滞：振动传感器探针积屑导致 6 个周期数值锁定不变，AI 通过趋势估计恢复动态',
    label: '死值锁定', sourceKey: 'edge-sensor',
  });

  // 2d. 视觉质检 → OCR 误识别导致跳变（index 72）
  raw[72] = Math.round((raw[71] as number - 42) * 10) / 10;
  anomalies.push({
    index: 72, type: 'spike', x: 72, y: raw[72] as number,
    fixedY: Math.round(((cleaned[71] as number) + (cleaned[73] as number)) / 2 * 10) / 10,
    description: 'OCR 误识别：钢号字符反光导致 "8" 误读为 "0"，AI 结合上下文编码规则自动修正',
    label: 'OCR 误读', sourceKey: 'vision-qc',
  });
  cleaned[72] = anomalies[anomalies.length - 1].fixedY;

  // 2e. MES 手工录入 / 纸质单据 → 数据缺失（index 92~94）
  raw[92] = null;
  raw[93] = null;
  raw[94] = null;
  const beforeGap = cleaned[91] as number;
  const afterGap = cleaned[95] as number;
  cleaned[92] = Math.round((beforeGap + (afterGap - beforeGap) * 0.33) * 10) / 10;
  cleaned[93] = Math.round((beforeGap + (afterGap - beforeGap) * 0.50) * 10) / 10;
  cleaned[94] = Math.round((beforeGap + (afterGap - beforeGap) * 0.66) * 10) / 10;
  anomalies.push({
    index: 93, type: 'gap', x: 93, y: NaN,
    fixedY: cleaned[93] as number,
    description: '纸质单据缺失：外协来料质检报告漏填 3 项数据，AI 通过历史批次统计样条插值补全',
    label: '数据缺失', sourceKey: 'mes-excel',
  });

  // 2f. 工控系统日志 → 重复报错死值（index 105~108）
  const flatVal2 = raw[105];
  for (let j = 105; j <= 108; j++) { raw[j] = flatVal2; }
  const beforeFlat2 = cleaned[104] as number;
  const afterFlat2 = cleaned[109] as number;
  for (let j = 105; j <= 108; j++) {
    const t = (j - 105) / (108 - 105);
    cleaned[j] = Math.round((beforeFlat2 + (afterFlat2 - beforeFlat2) * t) * 10) / 10;
  }
  anomalies.push({
    index: 106, type: 'flatline', x: 106, y: flatVal2 as number,
    fixedY: cleaned[106] as number,
    description: '日志缓存溢出：PLC 故障日志重复刷写导致 4 周期数据冻结，AI 通过去重+趋势拟合修复',
    label: '日志死锁', sourceKey: 'device-log',
  });

  return { raw, cleaned, anomalies };
}

/* ─── 异常类型配色 ──────────────────────────── */

const ANOMALY_TYPE_STYLE: Record<string, { color: string; bg: string }> = {
  spike:    { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  dropout:  { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  flatline: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.15)' },
  gap:      { color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
};

/** 获取异常关联的数据源信息 */
function getSourceByKey(key: string): DataSourceInfo {
  return DATA_SOURCES.find(s => s.key === key) || DATA_SOURCES[0];
}

/* ═══════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════ */
export default function AuraDataCleaning() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  /* ── 生成数据 ── */
  const { raw, cleaned, anomalies } = useMemo(() => generateData(), []);

  /* ── 状态 ── */
  const [cleaningState, setCleaningState] = useState<'idle' | 'cleaning' | 'done'>('idle');
  const [bottomData, setBottomData] = useState<(number | null)[]>(raw);
  const [progress, setProgress] = useState(0);
  const [showAnomalyDots, setShowAnomalyDots] = useState(false);

  /* ── refs ── */
  const rawChartRef = useRef<any>(null);
  const cleaningTimerRef = useRef<number>(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  /* ── 异常标记像素位置 ── */
  const [dotPositions, setDotPositions] = useState<
    { left: number; top: number; info: AnomalyInfo }[]
  >([]);
  const [hoveredAnomaly, setHoveredAnomaly] = useState<AnomalyInfo | null>(null);

  /* ── 图表渲染完成后计算标记位置 ── */
  const updateDotPositions = useCallback(() => {
    if (!rawChartRef.current) return;
    const chart = rawChartRef.current.getEchartsInstance();
    const container = chartContainerRef.current;
    if (!chart || !container) return;

    const positions = anomalies
      .filter((a) => a.type !== 'gap' || a.fixedY)
      .map((a) => {
        const yVal = !isNaN(a.y) ? a.y : a.fixedY;
        const pixel = chart.convertToPixel({ seriesIndex: 0 }, [a.x, yVal]);
        if (!pixel || !Array.isArray(pixel) || isNaN(pixel[0]) || isNaN(pixel[1])) return null;
        return { left: pixel[0] - 7, top: pixel[1] - 7, info: a };
      })
      .filter(Boolean) as { left: number; top: number; info: AnomalyInfo }[];

    setDotPositions(positions);
    setShowAnomalyDots(true);
  }, [anomalies]);

  useEffect(() => {
    if (rawChartRef.current) {
      const chart = rawChartRef.current.getEchartsInstance();
      chart.on('finished', updateDotPositions);
      const ro = new ResizeObserver(() => setTimeout(updateDotPositions, 100));
      if (chartContainerRef.current) ro.observe(chartContainerRef.current);
      return () => {
        chart.off('finished', updateDotPositions);
        ro.disconnect();
      };
    }
  }, [updateDotPositions]);

  useEffect(() => {
    window.addEventListener('resize', updateDotPositions);
    return () => window.removeEventListener('resize', updateDotPositions);
  }, [updateDotPositions]);

  /* ── 开始清洗动画 ── */
  const startCleaning = useCallback(() => {
    if (cleaningState !== 'idle') return;
    setCleaningState('cleaning');
    setShowAnomalyDots(false);

    const DURATION = 1600;
    const steps = 40;
    const interval = DURATION / steps;

    let step = 0;
    cleaningTimerRef.current = window.setInterval(() => {
      step++;
      const t = Math.min(step / steps, 1);
      // easeInOut cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const interpolated: (number | null)[] = raw.map((rv, i) => {
        const cv = cleaned[i];
        if (rv === null && cv === null) return null;
        if (rv === null) return cv;
        if (cv === null) return rv;
        return Math.round((rv + (cv - rv) * eased) * 10) / 10;
      });

      setBottomData(interpolated);
      setProgress(Math.round(eased * 100));

      if (step >= steps) {
        clearInterval(cleaningTimerRef.current);
        setBottomData(cleaned);
        setProgress(100);
        setCleaningState('done');
        setShowAnomalyDots(true);
      }
    }, interval);
  }, [cleaningState, raw, cleaned]);

  useEffect(() => {
    return () => {
      if (cleaningTimerRef.current) clearInterval(cleaningTimerRef.current);
    };
  }, []);

  /* ── X 轴标签（时间线） ── */
  const xLabels = useMemo(() => {
    return Array.from({ length: POINTS }, (_, i) => {
      const h = String(Math.floor(i / 12) + 8).padStart(2, '0');
      const m = String((i % 12) * 5).padStart(2, '0');
      return i % 12 === 0 ? `${h}:${m}` : '';
    });
  }, []);

  /* ── 原始数据图表配置 ── */
  const rawChartOption = useMemo(() => {
    const markLineData = anomalies.map((a) => ({
      xAxis: a.x,
      label: { show: false },
      lineStyle: { color: '#EF4444', type: 'dashed' as const, opacity: 0.3 },
    }));

    return {
      backgroundColor: 'transparent',
      grid: { left: 50, right: 20, top: 10, bottom: 25 },
      xAxis: {
        type: 'category' as const,
        data: xLabels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, interval: 0 },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: 110,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        name: '振动 (mm/s)',
        nameTextStyle: { color: 'rgba(255,255,255,0.25)', fontSize: 10 },
      },
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(7,10,26,0.92)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params[0]) return '';
          const idx = params[0].dataIndex;
          const val = params[0].value;
          const anom = anomalies.find((a) => a.index === idx);
          let extra = '';
          if (anom) {
            const src = getSourceByKey(anom.sourceKey);
            extra = `<br/><span style="color:#EF4444;font-size:11px;">⚠ ${anom.description}</span>
                     <br/><span style="color:${src.color};font-size:10px;">● 来源: ${src.label}</span>`;
          }
          return `<span style="color:rgba(255,255,255,0.5);font-size:11px;">时间: ${xLabels[idx] || ''}</span><br/>
                  <span style="color:#F59E0B;font-weight:600;">原始值: ${val !== null && val !== undefined ? val : '—'}</span>${extra}`;
        },
      },
      series: [
        {
          type: 'line' as const,
          data: raw,
          smooth: false,
          connectNulls: false,
          symbol: 'none',
          lineStyle: { color: '#F59E0B', width: 2 },
          areaStyle: {
            color: {
              type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245,158,11,0.2)' },
                { offset: 1, color: 'rgba(245,158,11,0.02)' },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: markLineData,
            lineStyle: { color: '#EF4444', type: 'dashed', opacity: 0.2 },
          },
          animation: false,
        },
      ],
    };
  }, [raw, xLabels, anomalies]);

  /* ── 清洗后图表配置 ── */
  const cleanChartOption = useMemo(() => {
    return {
      backgroundColor: 'transparent',
      grid: { left: 50, right: 20, top: 10, bottom: 25 },
      xAxis: {
        type: 'category' as const,
        data: xLabels,
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
        axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, interval: 0 },
        axisTick: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value' as const,
        min: 0,
        max: 110,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        name: '振动 (mm/s)',
        nameTextStyle: { color: 'rgba(255,255,255,0.25)', fontSize: 10 },
      },
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: 'rgba(7,10,26,0.92)',
        borderColor: 'rgba(255,255,255,0.1)',
        textStyle: { color: '#FFFFFF', fontSize: 12 },
        formatter: (params: any) => {
          if (!params || !params[0]) return '';
          const idx = params[0].dataIndex;
          const val = params[0].value;
          const rawVal = raw[idx];
          const isFixed =
            cleaningState === 'done' &&
            rawVal !== null && rawVal !== undefined &&
            val !== null && val !== undefined &&
            rawVal !== val;
          let fixedInfo = '';
          if (isFixed) {
            fixedInfo = `<br/><span style="color:#10B981;font-size:11px;">✓ 已修复 (${rawVal} → ${val})</span>`;
            // 显示关联异常
            const anom = anomalies.find((a) => a.index === idx);
            if (anom) {
              fixedInfo += `<br/><span style="color:rgba(255,255,255,0.4);font-size:10px;">${anom.description}</span>`;
            }
          }
          return `<span style="color:rgba(255,255,255,0.5);font-size:11px;">时间: ${xLabels[idx] || ''}</span><br/>
                  <span style="color:#10B981;font-weight:600;">清洗值: ${val !== null && val !== undefined ? val : '—'}</span>${fixedInfo}`;
        },
      },
      series: [
        {
          type: 'line' as const,
          data: bottomData,
          smooth: true,
          connectNulls: true,
          symbol: 'none',
          lineStyle: { color: '#10B981', width: 2.5 },
          areaStyle: {
            color: {
              type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16,185,129,0.2)' },
                { offset: 1, color: 'rgba(16,185,129,0.02)' },
              ],
            },
          },
          animation: false,
        },
      ],
    };
  }, [bottomData, xLabels, raw, cleaningState, anomalies]);

  /* ── 统计信息 ── */
  const stats = useMemo(() => {
    const spikeCount = anomalies.filter((a) => a.type === 'spike').length;
    const dropoutCount = anomalies.filter((a) => a.type === 'dropout').length;
    const flatlineCount = anomalies.filter((a) => a.type === 'flatline').length;
    const gapCount = anomalies.filter((a) => a.type === 'gap').length;

    const anomalyPointCount = anomalies.reduce((sum, a) => {
      if (a.type === 'spike' || a.type === 'dropout') return sum + 1;
      if (a.type === 'flatline') return sum + 6;
      if (a.type === 'gap') return sum + 3;
      return sum;
    }, 0);
    const qualityBefore = Math.round((1 - anomalyPointCount / POINTS) * 100);
    const qualityAfter = 98;

    // 按来源统计
    const sourceStats: Record<string, number> = {};
    anomalies.forEach((a) => {
      sourceStats[a.sourceKey] = (sourceStats[a.sourceKey] || 0) + 1;
    });

    return {
      spikeCount,
      dropoutCount,
      flatlineCount,
      gapCount,
      total: anomalies.length,
      qualityBefore,
      qualityAfter,
      fixedCount: cleaningState === 'done' ? anomalies.length : '—',
      sourceStats,
    };
  }, [anomalies, cleaningState]);

  /* ═════════════════════════════════════════════
     渲染
     ═════════════════════════════════════════════ */
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
          gap: 12,
          padding: isCompact ? '14px 16px 0' : '18px 24px 0',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #06B6D4, #10B981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          <ClearOutlined />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: isCompact ? 16 : 18,
              fontWeight: 700,
              lineHeight: 1.3,
              color: '#FFFFFF',
            }}
          >
            AI 数据清洗
          </div>
          <div
            style={{
              fontSize: isCompact ? 11 : 12,
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.3,
              marginTop: 2,
            }}
          >
            AURA Intelligent Data Cleaning · 自动识别并修复工业多源数据质量问题
          </div>
        </div>
        <Tag
          color={cleaningState === 'done' ? 'success' : cleaningState === 'cleaning' ? 'processing' : 'default'}
          style={{ borderRadius: 4, fontSize: isCompact ? 10 : 11, padding: '0 8px', lineHeight: '22px' }}
        >
          {cleaningState === 'idle'
            ? '待清洗'
            : cleaningState === 'cleaning'
              ? `清洗中 ${progress}%`
              : '清洗完成 ✓'}
        </Tag>
      </div>

      {/* ═══ 工业数据源场景标签 ═══ */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: isCompact ? 4 : 6,
          padding: isCompact ? '8px 16px 0' : '10px 24px 0',
          flexShrink: 0,
        }}
      >
        {DATA_SOURCES.map((src) => (
          <div
            key={src.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 4,
              background: `${src.color}10`,
              border: `1px solid ${src.color}25`,
              fontSize: isCompact ? 9 : 10,
              color: src.color,
              lineHeight: '20px',
            }}
          >
            <span style={{ fontSize: isCompact ? 10 : 11 }}>{src.icon}</span>
            <span>{src.label}</span>
          </div>
        ))}
      </div>

      {/* ═══ 统计卡片 ═══ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
          gap: isCompact ? 8 : 10,
          padding: isCompact ? '8px 16px 0' : '10px 24px 0',
          flexShrink: 0,
        }}
      >
        {/* 卡片：检测异常 */}
        <CardSmall
          icon={<WarningOutlined />}
          iconColor="#EF4444"
          label="检测异常"
          value={String(stats.total)}
          unit="处"
          valueColor="#EF4444"
          borderColor="rgba(239,68,68,0.15)"
          bgGradient="rgba(239,68,68,0.08)"
          isCompact={isCompact}
        >
          <div
            style={{
              fontSize: isCompact ? 9 : 10,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            <span>跳变 {stats.spikeCount}</span>
            <span>·</span>
            <span>死值 {stats.flatlineCount}</span>
            <span>·</span>
            <span>缺失 {stats.dropoutCount + stats.gapCount}</span>
          </div>
        </CardSmall>

        {/* 卡片：修复异常 */}
        <CardSmall
          icon={<CheckCircleOutlined />}
          iconColor={cleaningState === 'done' ? '#10B981' : 'rgba(255,255,255,0.3)'}
          label="修复异常"
          value={String(stats.fixedCount)}
          unit="处"
          valueColor={cleaningState === 'done' ? '#10B981' : 'rgba(255,255,255,0.3)'}
          borderColor={cleaningState === 'done' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)'}
          bgGradient={cleaningState === 'done' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)'}
          isCompact={isCompact}
        >
          <div
            style={{
              fontSize: isCompact ? 9 : 10,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
            }}
          >
            {cleaningState === 'done' ? '修复率 100%' : '等待清洗'}
          </div>
        </CardSmall>

        {/* 卡片：数据质量 */}
        <CardSmall
          icon={<DashboardOutlined />}
          iconColor={cleaningState === 'done' ? '#06B6D4' : 'rgba(255,255,255,0.3)'}
          label="数据质量"
          value={cleaningState === 'done' ? `${stats.qualityAfter}%` : `${stats.qualityBefore}%`}
          unit=""
          valueColor={cleaningState === 'done' ? '#06B6D4' : 'rgba(255,255,255,0.3)'}
          borderColor={cleaningState === 'done' ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.06)'}
          bgGradient={cleaningState === 'done' ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.03)'}
          isCompact={isCompact}
        >
          <div
            style={{
              fontSize: isCompact ? 9 : 10,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
            }}
          >
            {cleaningState === 'done'
              ? `提升 ${stats.qualityAfter - stats.qualityBefore}%`
              : '原始质量'}
          </div>
        </CardSmall>

        {/* 卡片：清洗耗时 */}
        <CardSmall
          icon={<ThunderboltOutlined />}
          iconColor={cleaningState === 'done' ? '#8B5CF6' : 'rgba(255,255,255,0.3)'}
          label="清洗耗时"
          value={cleaningState === 'done' ? '1.6' : '—'}
          unit={cleaningState === 'done' ? 's' : ''}
          valueColor={cleaningState === 'done' ? '#8B5CF6' : 'rgba(255,255,255,0.3)'}
          borderColor={cleaningState === 'done' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)'}
          bgGradient={cleaningState === 'done' ? 'rgba(139,92,246,0.08)' : 'rgba(255,255,255,0.03)'}
          isCompact={isCompact}
        >
          <div
            style={{
              fontSize: isCompact ? 9 : 10,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 2,
            }}
          >
            {cleaningState === 'done' ? '实时处理' : '等待清洗'}
          </div>
        </CardSmall>
      </div>

      {/* ═══ 图表区域 ═══ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: isCompact ? 4 : 6,
          padding: isCompact ? '6px 12px 6px' : '8px 20px 6px',
          minHeight: 0,
        }}
      >
        {/* ── Raw Data 标题 ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#F59E0B',
              }}
            />
            <span
              style={{
                fontSize: isCompact ? 11 : 13,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              原始数据（Raw Data）
            </span>
            {cleaningState !== 'done' && (
              <span
                style={{
                  fontSize: isCompact ? 9 : 10,
                  color: 'rgba(239,68,68,0.7)',
                  marginLeft: 4,
                }}
              >
                <BugOutlined style={{ marginRight: 2 }} />
                {stats.total} 处异常
              </span>
            )}
          </div>
          {cleaningState === 'done' && (
            <Tag
              color="success"
              style={{
                borderRadius: 4,
                fontSize: isCompact ? 9 : 10,
                lineHeight: '20px',
                padding: '0 6px',
              }}
            >
              <CheckCircleOutlined /> 已检测并修复
            </Tag>
          )}
        </div>

        {/* ── 原始图表容器（含闪烁定位标记） ── */}
        <div
          ref={chartContainerRef}
          style={{ position: 'relative', flex: 1, minHeight: 0 }}
        >
          <ReactECharts
            ref={rawChartRef}
            option={rawChartOption}
            style={{ height: '100%', width: '100%' }}
            notMerge
            lazyUpdate
          />

          {/* 闪烁异常标记点 */}
          {showAnomalyDots &&
            cleaningState !== 'cleaning' &&
            dotPositions.map((pos, idx) => {
              const src = getSourceByKey(pos.info.sourceKey);
              return (
                <div key={idx}>
                  <div
                    className="anomaly-dot"
                    style={{
                      position: 'absolute',
                      left: pos.left,
                      top: pos.top,
                      width: cleaningState === 'done' ? 10 : 14,
                      height: cleaningState === 'done' ? 10 : 14,
                      borderRadius: '50%',
                      background:
                        cleaningState === 'done' ? '#10B981' : '#EF4444',
                      border:
                        cleaningState === 'done'
                          ? '2px solid rgba(16,185,129,0.4)'
                          : `2px solid ${src.color}`,
                      boxShadow:
                        cleaningState === 'done'
                          ? '0 0 6px rgba(16,185,129,0.4)'
                          : `0 0 10px ${src.color}66`,
                      cursor: 'pointer',
                      zIndex: 10,
                      opacity: cleaningState === 'done' ? 0.8 : 1,
                      transition: 'all 0.3s ease',
                      animation:
                        cleaningState !== 'done'
                          ? 'anomaly-blink 1.2s ease-in-out infinite'
                          : 'none',
                    }}
                    onMouseEnter={() => setHoveredAnomaly(pos.info)}
                    onMouseLeave={() => setHoveredAnomaly(null)}
                  />
                  {/* 悬浮 Tooltip */}
                  {hoveredAnomaly === pos.info && (
                    <div
                      className="anomaly-tooltip"
                      style={{
                        position: 'absolute',
                        left: Math.max(
                          4,
                          Math.min(
                            pos.left - 90,
                            (chartContainerRef.current?.offsetWidth || 400) -
                              260,
                          ),
                        ),
                        top: pos.top - 56,
                        width: 260,
                        background: 'rgba(7,10,26,0.96)',
                        border: `1px solid ${src.color}44`,
                        borderRadius: 6,
                        padding: '8px 10px',
                        zIndex: 100,
                        pointerEvents: 'none',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: src.color,
                            fontWeight: 600,
                          }}
                        >
                          {src.icon} {src.label}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            color: ANOMALY_TYPE_STYLE[pos.info.type]?.color,
                            fontWeight: 600,
                          }}
                        >
                          · {pos.info.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.7)',
                          lineHeight: 1.4,
                        }}
                      >
                        {pos.info.description}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {/* ── 分隔线 + 操作按钮 ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
            padding: '0',
          }}
        >
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            }}
          />
          {cleaningState === 'idle' && (
            <Button
              type="primary"
              icon={<ClearOutlined />}
              onClick={startCleaning}
              size={isCompact ? 'small' : 'middle'}
              style={{
                background: 'linear-gradient(135deg, #06B6D4, #10B981)',
                border: 'none',
                boxShadow: '0 2px 12px rgba(6,182,212,0.3)',
                fontWeight: 600,
                fontSize: isCompact ? 12 : 13,
                height: isCompact ? 30 : 34,
                borderRadius: 6,
                paddingInline: isCompact ? 14 : 20,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 4px 20px rgba(6,182,212,0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  '0 2px 12px rgba(6,182,212,0.3)';
              }}
            >
              开始清洗
            </Button>
          )}
          {cleaningState === 'cleaning' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(6,182,212,0.1)',
                border: '1px solid rgba(6,182,212,0.2)',
                borderRadius: 6,
                padding: '4px 14px',
              }}
            >
              <div
                className="cleaning-spinner"
                style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(6,182,212,0.3)',
                  borderTopColor: '#06B6D4',
                  borderRadius: '50%',
                }}
              />
              <span
                style={{
                  fontSize: isCompact ? 11 : 12,
                  color: '#06B6D4',
                  fontWeight: 500,
                }}
              >
                AI 清洗中 {progress}%
              </span>
            </div>
          )}
          {cleaningState === 'done' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 6,
                padding: '4px 14px',
              }}
            >
              <CheckCircleOutlined
                style={{ color: '#10B981', fontSize: 14 }}
              />
              <span
                style={{
                  fontSize: isCompact ? 11 : 12,
                  color: '#10B981',
                  fontWeight: 500,
                }}
              >
                清洗完成 · 数据质量提升 {stats.qualityAfter - stats.qualityBefore}%
              </span>
            </div>
          )}
          <div
            style={{
              flex: 1,
              height: 1,
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            }}
          />
        </div>

        {/* ── Cleaned Data 标题 ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10B981',
            }}
          />
          <span
            style={{
              fontSize: isCompact ? 11 : 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            清洗数据（Cleaned Data）
          </span>
          {cleaningState === 'done' && (
            <Tag
              color="success"
              style={{
                borderRadius: 4,
                fontSize: isCompact ? 9 : 10,
                lineHeight: '20px',
                padding: '0 6px',
              }}
            >
              平滑连续 · 逻辑一致
            </Tag>
          )}
          {cleaningState === 'idle' && (
            <span
              style={{
                fontSize: isCompact ? 9 : 10,
                color: 'rgba(255,255,255,0.3)',
                marginLeft: 4,
              }}
            >
              （点击"开始清洗"查看效果）
            </span>
          )}
        </div>

        {/* ── 清洗图表 ── */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <ReactECharts
            option={cleanChartOption}
            style={{ height: '100%', width: '100%' }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>

      {/* ═══ 底部信息栏 ═══ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isCompact ? '6px 16px 10px' : '8px 24px 12px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexWrap: 'wrap',
          }}
        >
          {(['spike', 'dropout', 'flatline', 'gap'] as const).map((type) => (
            <span
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                marginRight: 6,
                fontSize: isCompact ? 9 : 10,
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: ANOMALY_TYPE_STYLE[type].color,
                }}
              />
              {type === 'spike'
                ? '毛刺/跳变'
                : type === 'dropout'
                  ? '归零/丢失'
                  : type === 'flatline'
                    ? '死值/卡滞'
                    : '缺失/断点'}
            </span>
          ))}
        </div>
        <Text
          style={{
            fontSize: isCompact ? 9 : 10,
            color: 'rgba(255,255,255,0.2)',
          }}
        >
          基于 AURA AI 引擎 · 支持工业多源异构数据清洗
        </Text>
      </div>

      {/* ═══ CSS 动画 ═══ */}
      <style>{`
        @keyframes anomaly-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(0.7); }
        }
        .anomaly-dot {
          transition: opacity 0.2s ease, transform 0.15s ease;
        }
        .anomaly-dot:hover {
          transform: scale(1.5) !important;
          opacity: 1 !important;
        }
        @keyframes cleaning-spin {
          to { transform: rotate(360deg); }
        }
        .cleaning-spinner {
          animation: cleaning-spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
}

/* ─── 统计卡片子组件 ────────────────────────── */

function CardSmall({
  icon,
  iconColor,
  label,
  value,
  unit,
  valueColor,
  borderColor,
  bgGradient,
  isCompact,
  children,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
  valueColor: string;
  borderColor: string;
  bgGradient: string;
  isCompact: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: `linear-gradient(180deg, ${bgGradient} 0%, transparent 100%)`,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: isCompact ? '10px 12px' : '12px 14px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span style={{ color: iconColor, fontSize: isCompact ? 12 : 14 }}>
          {icon}
        </span>
        <span
          style={{
            fontSize: isCompact ? 11 : 12,
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: isCompact ? 22 : 28,
          fontWeight: 700,
          color: valueColor,
          lineHeight: 1.2,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: isCompact ? 11 : 13,
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 400,
              marginLeft: 4,
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
