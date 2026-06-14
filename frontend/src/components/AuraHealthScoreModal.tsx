import { useEffect, useRef, useState } from 'react';
import { Tabs, Tag, Row, Col, Table } from 'antd';
import * as echarts from 'echarts';
import { Colors } from '../styles/theme';
import { useStore } from '../store/useStore';

/* ─── Mock Data ────────────────────────────── */

const MOCK_SUB_SCORES = [
  { key: 'vibration', label: '振动', current: 82, baseline: 90, unit: '分', trend: 'down' as const },
  { key: 'temperature', label: '温度', current: 88, baseline: 85, unit: '分', trend: 'up' as const },
  { key: 'load', label: '负载', current: 75, baseline: 80, unit: '分', trend: 'down' as const },
  { key: 'maintenance', label: '维修历史', current: 70, baseline: 75, unit: '分', trend: 'flat' as const },
];

const MOCK_TREND_HISTORY: Record<string, number[]> = {
  vibration: [85, 84, 83, 82, 81, 80, 82],
  temperature: [82, 83, 84, 85, 86, 87, 88],
  load: [78, 77, 76, 75, 76, 75, 75],
  maintenance: [72, 72, 71, 71, 70, 70, 70],
};

const MOCK_COMPONENTS = [
  { key: 'bearing', name: '轴承', remainingLife: 120, confidenceLower: 90, confidenceUpper: 160, unit: '天' },
  { key: 'motor', name: '电机', remainingLife: 240, confidenceLower: 200, confidenceUpper: 290, unit: '天' },
  { key: 'spindle', name: '主轴', remainingLife: 60, confidenceLower: 45, confidenceUpper: 80, unit: '天' },
  { key: 'belt', name: '传动带', remainingLife: 30, confidenceLower: 20, confidenceUpper: 45, unit: '天' },
  { key: 'bearing2', name: '轴承 B', remainingLife: 200, confidenceLower: 160, confidenceUpper: 250, unit: '天' },
];

const MOCK_RUL_CURVE = Array.from({ length: 365 }, (_, i) => ({
  day: i,
  degradation: 10 + (i / 365) * 70 + (Math.random() - 0.5) * 5,
  lower: 10 + (i / 365) * 70 + (Math.random() - 0.5) * 5 - 8,
  upper: 10 + (i / 365) * 70 + (Math.random() - 0.5) * 5 + 8,
}));

const MOCK_FAILURE_PROB = [
  { period: '30天', probability: 8 },
  { period: '60天', probability: 25 },
  { period: '90天', probability: 55 },
];

const MOCK_HISTORICAL = [
  { name: '同类设备平均', data: Array.from({ length: 365 }, (_, i) => 10 + (i / 365) * 65 + (Math.random() - 0.5) * 3) },
  { name: '最优寿命记录', data: Array.from({ length: 365 }, (_, i) => 10 + (i / 365) * 55 + (Math.random() - 0.5) * 2) },
];

const MOCK_PRIORITY_QUEUE = [
  { key: '1', device: 'CNC-102', urgency: 92, impact: 88, score: 81, level: 'urgent' as const, nextMaintenance: '2026-06-20' },
  { key: '2', device: 'Robot-A3', urgency: 75, impact: 80, score: 60, level: 'urgent' as const, nextMaintenance: '2026-06-25' },
  { key: '3', device: 'Conveyor-B2', urgency: 50, impact: 65, score: 33, level: 'planned' as const, nextMaintenance: '2026-07-10' },
  { key: '4', device: 'Press-P1', urgency: 30, impact: 45, score: 14, level: 'observe' as const, nextMaintenance: '2026-08-01' },
  { key: '5', device: 'Welder-W3', urgency: 20, impact: 30, score: 6, level: 'observe' as const, nextMaintenance: '2026-08-15' },
];

const LEVEL_CFG = {
  urgent: { color: '#EF4444', label: '紧急' },
  planned: { color: '#F59E0B', label: '计划' },
  observe: { color: '#9CA3AF', label: '观察' },
};

const MOCK_CONSTRAINTS = [
  { label: '生产计划冲突', value: '6/18 - 6/22 连续生产', status: 'conflict' as const },
  { label: '备件库存状态', value: '轴承库存充足（3件）', status: 'ok' as const },
  { label: '技术人员可用性', value: '6/20 - 6/21 有维修技师可用', status: 'ok' as const },
];

const MOCK_COST_RISK = [
  { strategy: '立即维护', cost: 45, risk: 5 },
  { strategy: '推荐窗口', cost: 30, risk: 15 },
  { strategy: '继续运行', cost: 8, risk: 65 },
];

const dayLabels = ['06/08', '06/09', '06/10', '06/11', '06/12', '06/13', '06/14'];

/* ─── Sub-component: Health Trend Mini Chart ─── */

function TrendMiniChart({ data, color }: { data: number[]; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { width: 100, height: 28 });
    chartRef.current = chart;
    chart.setOption({
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: { show: false, type: 'category' },
      yAxis: { show: false, min: Math.min(...data) - 2, max: Math.max(...data) + 2 },
      series: [{
        type: 'line', data, smooth: true,
        lineStyle: { color, width: 1.5 },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '40' }, { offset: 1, color: color + '05' }] } },
        symbol: 'none',
        animation: false,
      }],
    });
    return () => { chart.dispose(); };
  }, [data, color]);

  return <div ref={ref} style={{ width: 100, height: 28 }} />;
}

/* ─── Tab: 健康分项目 ─────────────────────── */

function HealthScoreTab() {
  return (
    <div>
      <Row gutter={[12, 12]}>
        {MOCK_SUB_SCORES.map((item) => {
          const barColor = item.current >= item.baseline ? '#22C55E' : item.current >= item.baseline * 0.85 ? '#F59E0B' : '#EF4444';
          const trendColor = item.trend === 'up' ? '#22C55E' : item.trend === 'down' ? '#EF4444' : '#9CA3AF';
          const trendIcon = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→';
          return (
            <Col xs={24} sm={12} key={item.key}>
              <div style={{
                background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937',
                padding: '14px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ color: '#E5E7EB', fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                    <span style={{ color: '#9CA3AF', fontSize: 11, marginLeft: 6 }}>基线 {item.baseline}{item.unit}</span>
                  </div>
                  <span style={{ color: barColor, fontSize: 18, fontWeight: 700 }}>{item.current}<span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>{item.unit}</span></span>
                </div>
                <div style={{
                  height: 8, background: '#1F2937', borderRadius: 4, overflow: 'hidden', marginBottom: 8,
                }}>
                  <div style={{
                    width: `${(item.current / 100) * 100}%`, height: '100%',
                    background: `linear-gradient(90deg, ${barColor}80, ${barColor})`,
                    borderRadius: 4, transition: 'width 0.6s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>
                    较基线 <span style={{ color: trendColor, fontWeight: 600 }}>{trendIcon} {Math.abs(item.current - item.baseline)}{item.unit}</span>
                  </span>
                  <TrendMiniChart data={MOCK_TREND_HISTORY[item.key]} color={trendColor} />
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
      <div style={{ marginTop: 16 }}>
        <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>近7天各维度健康趋势</div>
        <div style={{
          background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937', padding: 12,
        }}>
          <HealthTrendChart />
        </div>
      </div>
    </div>
  );
}

function HealthTrendChart() {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chartRef.current = chart;
    const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: MOCK_SUB_SCORES.map(s => s.label), textStyle: { color: '#9CA3AF', fontSize: 11 }, bottom: 0 },
      grid: { left: 40, right: 10, top: 10, bottom: 35 },
      xAxis: { type: 'category', data: dayLabels, axisLabel: { color: '#6B7280', fontSize: 10 }, axisLine: { lineStyle: { color: '#1F2937' } } },
      yAxis: { type: 'value', min: 60, max: 100, splitLine: { lineStyle: { color: '#1F2937' } }, axisLabel: { color: '#6B7280', fontSize: 10 } },
      series: MOCK_SUB_SCORES.map((s, i) => ({
        name: s.label,
        type: 'line',
        data: MOCK_TREND_HISTORY[s.key],
        smooth: true,
        lineStyle: { color: colors[i], width: 2 },
        itemStyle: { color: colors[i] },
        symbol: 'circle',
        symbolSize: 4,
      })),
    });
    return () => { chart.dispose(); };
  }, []);

  return <div ref={ref} style={{ width: '100%', height: 200 }} />;
}

/* ─── Tab: RUL寿命预测 ────────────────────── */

function RULPredictionTab() {
  const [selectedComponent, setSelectedComponent] = useState(MOCK_COMPONENTS[0]);

  return (
    <div>
      <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>关键部件列表</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {MOCK_COMPONENTS.map((comp) => {
          const isSelected = selectedComponent.key === comp.key;
          const lifeColor = comp.remainingLife <= 60 ? '#EF4444' : comp.remainingLife <= 180 ? '#F59E0B' : '#22C55E';
          return (
            <div
              key={comp.key}
              onClick={() => setSelectedComponent(comp)}
              style={{
                background: isSelected ? '#1F2937' : '#0D1117',
                borderRadius: 8, border: `1px solid ${isSelected ? '#3B82F6' : '#1F2937'}`,
                padding: '10px 14px', cursor: 'pointer', minWidth: 140,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ color: '#E5E7EB', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{comp.name}</div>
              <div style={{ color: lifeColor, fontSize: 16, fontWeight: 700 }}>
                {comp.remainingLife}
                <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF', marginLeft: 2 }}>{comp.unit}</span>
              </div>
              <div style={{ color: '#6B7280', fontSize: 10 }}>
                置信区间 {comp.confidenceLower}-{comp.confidenceUpper}{comp.unit}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>
        RUL 衰减曲线 — {selectedComponent.name}（95% 置信区间）
      </div>
      <div style={{
        background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937', padding: 12, marginBottom: 12,
      }}>
        <RULDecayCurve component={selectedComponent} />
      </div>

      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>失效概率</div>
          <div style={{
            background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937', padding: 12,
          }}>
            <FailureProbChart />
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>历史对比</div>
          <div style={{
            background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937', padding: 12,
          }}>
            <HistoricalCompareChart />
          </div>
        </Col>
      </Row>
    </div>
  );
}

function RULDecayCurve({ component }: { component: typeof MOCK_COMPONENTS[0] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const predictedDegradation = Array.from({ length: component.remainingLife }, (_, i) => ({
      day: i, value: 10 + (i / component.remainingLife) * 70 + (Math.random() - 0.5) * 3,
    }));
    const xData = predictedDegradation.map(d => `第${d.day}天`);
    const yData = predictedDegradation.map(d => d.value);
    const lower = yData.map(v => Math.max(0, v - 8 - Math.random() * 4));
    const upper = yData.map(v => Math.min(100, v + 8 + Math.random() * 4));
    chart.setOption({
      tooltip: { trigger: 'axis', formatter: (params: any) => `${params[0]?.axisValue}<br/>退化程度: ${params[0]?.value?.toFixed(1)}%` },
      grid: { left: 45, right: 10, top: 10, bottom: 25 },
      xAxis: { type: 'category', data: xData, axisLabel: { color: '#6B7280', fontSize: 9, interval: Math.max(1, Math.floor(xData.length / 6)) }, axisLine: { lineStyle: { color: '#1F2937' } } },
      yAxis: { type: 'value', min: 0, max: 100, name: '退化程度 (%)', nameTextStyle: { color: '#6B7280', fontSize: 10 }, splitLine: { lineStyle: { color: '#1F2937' } }, axisLabel: { color: '#6B7280', fontSize: 10 } },
      series: [
        {
          name: '预测曲线', type: 'line', data: yData, smooth: true,
          lineStyle: { color: '#3B82F6', width: 2 },
          symbol: 'none',
        },
        {
          name: '95% 置信区间', type: 'line', data: lower, smooth: true,
          lineStyle: { opacity: 0 }, symbol: 'none',
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3B82F640' }, { offset: 1, color: '#3B82F610' }] } },
        },
        {
          name: '', type: 'line', data: upper, smooth: true,
          lineStyle: { opacity: 0 }, symbol: 'none',
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#3B82F610' }, { offset: 1, color: '#3B82F640' }] } },
        },
      ],
    });
    return () => { chart.dispose(); };
  }, [component]);

  return <div ref={ref} style={{ width: '100%', height: 220 }} />;
}

function FailureProbChart() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 35, right: 10, top: 10, bottom: 25 },
      xAxis: { type: 'category', data: MOCK_FAILURE_PROB.map(d => d.period), axisLabel: { color: '#6B7280', fontSize: 11 }, axisLine: { lineStyle: { color: '#1F2937' } } },
      yAxis: { type: 'value', max: 100, name: '%', nameTextStyle: { color: '#6B7280', fontSize: 10 }, splitLine: { lineStyle: { color: '#1F2937' } }, axisLabel: { color: '#6B7280', fontSize: 10 } },
      series: [{
        type: 'bar', data: MOCK_FAILURE_PROB.map(d => ({
          value: d.probability,
          itemStyle: { color: d.probability >= 50 ? '#EF4444' : d.probability >= 20 ? '#F59E0B' : '#22C55E', borderRadius: [4, 4, 0, 0] },
        })),
        barWidth: 40,
      }],
    });
    return () => { chart.dispose(); };
  }, []);

  return <div ref={ref} style={{ width: '100%', height: 180 }} />;
}

function HistoricalCompareChart() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const currentData = MOCK_RUL_CURVE.slice(0, 120).map(d => d.degradation);
    const xData = MOCK_RUL_CURVE.slice(0, 120).map((_, i) => `第${i}天`);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['当前预测', '同类设备平均', '最优寿命记录'], textStyle: { color: '#9CA3AF', fontSize: 10 }, bottom: 0 },
      grid: { left: 40, right: 10, top: 10, bottom: 35 },
      xAxis: { type: 'category', data: xData, axisLabel: { color: '#6B7280', fontSize: 9, interval: Math.max(1, Math.floor(xData.length / 5)) }, axisLine: { lineStyle: { color: '#1F2937' } } },
      yAxis: { type: 'value', min: 0, max: 100, name: '退化程度 (%)', nameTextStyle: { color: '#6B7280', fontSize: 10 }, splitLine: { lineStyle: { color: '#1F2937' } }, axisLabel: { color: '#6B7280', fontSize: 10 } },
      series: [
        { name: '当前预测', type: 'line', data: currentData, smooth: true, lineStyle: { color: '#3B82F6', width: 2 }, symbol: 'none' },
        { name: '同类设备平均', type: 'line', data: MOCK_HISTORICAL[0].data.slice(0, 120), smooth: true, lineStyle: { color: '#9CA3AF', width: 1.5, type: 'dashed' }, symbol: 'none' },
        { name: '最优寿命记录', type: 'line', data: MOCK_HISTORICAL[1].data.slice(0, 120), smooth: true, lineStyle: { color: '#22C55E', width: 1.5, type: 'dotted' }, symbol: 'none' },
      ],
    });
    return () => { chart.dispose(); };
  }, []);

  return <div ref={ref} style={{ width: '100%', height: 180 }} />;
}

/* ─── Tab: 维护时机优化 ────────────────────── */

function MaintenanceOptimizeTab() {
  return (
    <div>
      {/* 维护优先级队列 */}
      <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>维护优先级队列（紧迫度 × 影响度）</div>
      <div style={{
        background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937', padding: 12, marginBottom: 12,
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MOCK_PRIORITY_QUEUE.map((item) => {
            const cfg = LEVEL_CFG[item.level];
            return (
              <div key={item.key} style={{
                background: '#111827', borderRadius: 6, padding: '10px 12px',
                minWidth: 140, flex: 1, borderLeft: `3px solid ${cfg.color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: '#E5E7EB', fontSize: 13, fontWeight: 600 }}>{item.device}</span>
                  <Tag color={cfg.color} style={{ borderRadius: 4, border: 'none', fontSize: 10, lineHeight: '18px', padding: '0 6px' }}>{cfg.label}</Tag>
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>
                  紧迫度 {item.urgency} · 影响度 {item.impact} · <span style={{ color: '#F59E0B', fontWeight: 600 }}>综合 {item.score}</span>
                </div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>
                  建议维护 {item.nextMaintenance}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 推荐维护窗口 */}
      <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>推荐维护窗口</div>
      <div style={{
        background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937', padding: 12, marginBottom: 12,
      }}>
        <MaintenanceWindowChart />
      </div>

      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>约束条件</div>
          <div style={{
            background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937', padding: 12, marginBottom: 12,
          }}>
            {MOCK_CONSTRAINTS.map((c, i) => {
              const statusColor = c.status === 'conflict' ? '#EF4444' : '#22C55E';
              const statusIcon = c.status === 'conflict' ? '⚠' : '✓';
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: i < MOCK_CONSTRAINTS.length - 1 ? '1px solid #1F2937' : 'none',
                }}>
                  <span style={{ color: '#D1D5DB', fontSize: 12 }}>{c.label}</span>
                  <span style={{ color: statusColor, fontSize: 12 }}>
                    {statusIcon} {c.value}
                  </span>
                </div>
              );
            })}
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div style={{ color: '#9CA3AF', fontSize: 12, marginBottom: 8 }}>成本-风险对比</div>
          <div style={{
            background: '#0D1117', borderRadius: 8, border: '1px solid #1F2937', padding: 12,
          }}>
            <CostRiskChart />
          </div>
        </Col>
      </Row>
    </div>
  );
}

function MaintenanceWindowChart() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const days = ['06/15', '06/16', '06/17', '06/18', '06/19', '06/20', '06/21', '06/22', '06/23', '06/24', '06/25', '06/26', '06/27', '06/28'];
    const colors = days.map(d => {
      if (d === '06/20' || d === '06/21') return '#22C55E';
      if (d === '06/18' || d === '06/19') return '#EF4444';
      return '#374151';
    });
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 30, right: 10, top: 10, bottom: 25 },
      xAxis: { type: 'category', data: days, axisLabel: { color: '#6B7280', fontSize: 10, rotate: 45 }, axisLine: { lineStyle: { color: '#1F2937' } } },
      yAxis: { show: false, min: 0, max: 1 },
      series: [{
        type: 'bar', data: days.map((d, i) => ({
          value: 1,
          itemStyle: {
            color: colors[i],
            borderRadius: d === '06/20' || d === '06/21' ? [4, 4, 0, 0] : [2, 2, 0, 0],
            opacity: d === '06/20' || d === '06/21' ? 1 : d === '06/18' || d === '06/19' ? 0.7 : 0.3,
          },
        })),
        barWidth: 20,
        label: {
          show: true,
          position: 'top',
          formatter: (p: any) => {
            const d = days[p.dataIndex];
            if (d === '06/20' || d === '06/21') return '推荐';
            if (d === '06/18' || d === '06/19') return '占用';
            return '';
          },
          color: '#9CA3AF', fontSize: 9,
        },
      }, {
        type: 'bar', data: days.map((d) => {
          if (d === '06/22') return { value: 0.5, itemStyle: { color: '#F59E0B', borderRadius: [4, 4, 0, 0] } };
          return { value: 0 };
        }),
        barWidth: 20,
        label: { show: true, position: 'top', formatter: d === days.find(x => x === '06/22') ? '备件未到' : '', color: '#F59E0B', fontSize: 9 },
      }],
    });
    return () => { chart.dispose(); };
  }, []);

  return <div ref={ref} style={{ width: '100%', height: 80 }} />;
}

function CostRiskChart() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    const labels = MOCK_COST_RISK.map(d => d.strategy);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['成本 (千元)', '风险指数'], textStyle: { color: '#9CA3AF', fontSize: 10 }, bottom: 0 },
      grid: { left: 40, right: 10, top: 10, bottom: 35 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#D1D5DB', fontSize: 11 }, axisLine: { lineStyle: { color: '#1F2937' } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1F2937' } }, axisLabel: { color: '#6B7280', fontSize: 10 } },
      series: [
        { name: '成本 (千元)', type: 'bar', data: MOCK_COST_RISK.map(d => d.cost), barWidth: 20, itemStyle: { color: '#3B82F6', borderRadius: [4, 4, 0, 0] } },
        { name: '风险指数', type: 'bar', data: MOCK_COST_RISK.map(d => d.risk), barWidth: 20, itemStyle: { color: '#EF4444', borderRadius: [4, 4, 0, 0] } },
      ],
    });
    return () => { chart.dispose(); };
  }, []);

  return <div ref={ref} style={{ width: '100%', height: 200 }} />;
}

/* ─── Main Component ──────────────────────── */

export default function AuraHealthScoreModal() {
  const healthScoreModalOpen = useStore((s) => s.healthScoreModalOpen);
  const setHealthScoreModalOpen = useStore((s) => s.setHealthScoreModalOpen);

  if (!healthScoreModalOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1050,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
      }}
      onClick={() => setHealthScoreModalOpen(false)}
    >
      <div
        style={{
          width: '94vw', maxWidth: 960, height: '85vh',
          background: '#070A1A', borderRadius: 12,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid #1F2937', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF', fontSize: 14,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span style={{ color: '#E5E7EB', fontSize: 15, fontWeight: 600 }}>健康评分详情</span>
          </div>
          <div
            onClick={() => setHealthScoreModalOpen(false)}
            style={{
              width: 28, height: 28, borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#9CA3AF', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#1F2937'; e.currentTarget.style.color = '#E5E7EB'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </div>
        </div>

        {/* Device Info */}
        <div style={{
          padding: '10px 20px', background: '#0D1117',
          borderBottom: '1px solid #1F2937', flexShrink: 0,
        }}>
          <div style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 2 }}>设备信息</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ color: '#E5E7EB', fontSize: 13, fontWeight: 600 }}>CNC-102 数控机床</span>
            <span style={{ color: '#6B7280', fontSize: 12 }}>加工中心 · 产线-A</span>
            <span style={{ color: '#22C55E', fontSize: 12 }}>● 运行中</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          <Tabs
            defaultActiveKey="health-score"
            items={[
              { key: 'health-score', label: <span style={{ fontSize: 13 }}>健康分项目</span>, children: <HealthScoreTab /> },
              { key: 'rul', label: <span style={{ fontSize: 13 }}>RUL寿命预测</span>, children: <RULPredictionTab /> },
              { key: 'maintenance-optimize', label: <span style={{ fontSize: 13 }}>维护时机优化</span>, children: <MaintenanceOptimizeTab /> },
            ]}
            style={{ color: '#E5E7EB' }}
            tabBarStyle={{ borderBottom: '1px solid #1F2937', marginBottom: 16 }}
          />
        </div>
      </div>
    </div>
  );
}