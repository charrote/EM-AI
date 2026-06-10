import { useEffect, useRef, useState, useCallback } from 'react';
import { Table, Tag, Select, Space, Typography } from 'antd';
import * as echarts from 'echarts';
import { SpinnerIcon } from '../components/Icons';

const { Text } = Typography;

const SCOPE_LABELS: Record<string, string> = {
  plant: '全厂',
  product: '产品',
  device: '设备',
  team: '班组',
};

export default function LossAnalysis() {
  const [pareto, setPareto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<string>('plant');
  const [deviceId, setDeviceId] = useState<string>('');
  const [product, setProduct] = useState<string>('');
  const [team, setTeam] = useState<string>('');
  const [devices, setDevices] = useState<any[]>([]);
  const [chartReady, setChartReady] = useState(false);
  const chartDomRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  // Fetch devices for filter dropdown
  useEffect(() => {
    fetch('/api/devices').then(r => r.json()).then(res => setDevices(res.data || [])).catch(() => {});
  }, []);

  // Init chart
  useEffect(() => {
    const dom = chartDomRef.current;
    if (!dom || chartRef.current) return;
    const chart = echarts.init(dom);
    chartRef.current = chart;
    setChartReady(true);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      chart.dispose();
      chartRef.current = null;
      window.removeEventListener('resize', handleResize);
      setChartReady(false);
    };
  }, []);

  // Build query params
  const buildQuery = useCallback(() => {
    const params = new URLSearchParams({ scope });
    if (scope === 'device' && deviceId) params.set('deviceId', deviceId);
    if (scope === 'product' && product) params.set('product', product);
    if (scope === 'team' && team) params.set('team', team);
    return params.toString();
  }, [scope, deviceId, product, team]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/pareto?${buildQuery()}`)
      .then(r => r.json())
      .then(res => { setPareto(res.data || []); setLoading(false); })
      .catch(() => { setPareto([]); setLoading(false); });
  }, [buildQuery]);

  // Update chart when data changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || pareto.length === 0 || !chartReady) return;

    try {
      const causes = pareto.map(p => p.cause);
      const durations = pareto.map(p => p.duration);
      const cumulatives = pareto.map(p => p.cumulative);

      const top80Idx = cumulatives.findIndex(c => c >= 80);
      const mark80 = top80Idx >= 0 ? top80Idx + 0.5 : null;

      chart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: (params: any[]) => {
            const bar = params.find((p: any) => p.seriesName === '停机时长');
            const line = params.find((p: any) => p.seriesName === '累计占比');
            let html = `<strong>${bar?.axisValue || ''}</strong><br/>`;
            if (bar) html += `停机时长: ${bar.value} min<br/>`;
            if (line) html += `累计占比: ${line.value}%`;
            return html;
          },
        },
        legend: {
          data: ['停机时长', '累计占比'],
          top: 0, right: 0, itemWidth: 12, itemHeight: 8,
          textStyle: { fontSize: 12 },
        },
        grid: { left: 50, right: 50, top: 30, bottom: 30 },
        xAxis: {
          type: 'category',
          data: causes,
          axisLabel: { fontSize: 11, interval: 0, rotate: causes.length > 6 ? 25 : 0 },
        },
        yAxis: [
          {
            type: 'value', name: '停机时长 (min)',
            nameTextStyle: { fontSize: 11 },
            axisLabel: { fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } },
          },
          {
            type: 'value', name: '累计占比 (%)',
            nameTextStyle: { fontSize: 11 },
            axisLabel: { fontSize: 10, formatter: '{value}%' },
            min: 0, max: 100, splitLine: { show: false },
          },
        ],
        series: [
          {
            name: '停机时长', type: 'bar',
            data: durations.map((v, i) => ({
              value: v,
              itemStyle: {
                color: (cumulatives[i] || 0) <= 80 ? '#EF4444' : (cumulatives[i] || 0) <= 90 ? '#F59E0B' : '#3B82F6',
                borderRadius: [2, 2, 0, 0],
              },
            })),
            barMaxWidth: 40,
          },
          {
            name: '累计占比', type: 'line', yAxisIndex: 1,
            data: cumulatives,
            smooth: false, symbol: 'circle', symbolSize: 6,
            lineStyle: { color: '#8B5CF6', width: 2 },
            itemStyle: { color: '#8B5CF6' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(139, 92, 246, 0.2)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0.02)' },
              ]),
            },
            ...(mark80 !== null ? {
              markLine: {
                silent: true,
                data: [{
                  xAxis: mark80,
                  label: { formatter: '80% 关键线', color: '#EF4444', fontSize: 11, fontWeight: 600, position: 'end' },
                  lineStyle: { color: '#EF4444', type: 'dashed', width: 2 },
                }],
              },
            } : {}),
          },
        ],
      });
    } catch (e) {
      console.error('Chart render error:', e);
    }
  }, [pareto, chartReady]);

  const handleScopeChange = (val: string) => {
    setScope(val);
    setDeviceId('');
    setProduct('');
    setTeam('');
  };

  const columns = [
    { title: '原因', dataIndex: 'cause', key: 'cause' },
    {
      title: '次数', dataIndex: 'count', key: 'count',
      sorter: (a: any, b: any) => b.count - a.count,
    },
    {
      title: '停机时长 (min)', dataIndex: 'duration', key: 'duration',
      sorter: (a: any, b: any) => b.duration - a.duration,
      render: (v: number) => <strong>{v}</strong>,
    },
    { title: '占比', dataIndex: 'percentage', key: 'percentage', render: (v: number) => `${v}%` },
    {
      title: '累计', dataIndex: 'cumulative', key: 'cumulative',
      render: (v: number) => (
        <Tag color={v <= 80 ? '#EF4444' : v <= 90 ? '#F59E0B' : '#3B82F6'}>{v.toFixed(1)}%</Tag>
      ),
    },
  ];

  return (
    <div style={{ padding: 4, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* ─── Filter bar ─── */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>分析维度</span>
          <Select
            value={scope}
            onChange={handleScopeChange}
            style={{ width: 120 }}
            size="small"
            options={[
              { value: 'plant', label: '全厂' },
              { value: 'device', label: '设备' },
              { value: 'product', label: '产品' },
              { value: 'team', label: '班组' },
            ]}
          />
          {scope === 'device' && (
            <Select
              showSearch
              value={deviceId || undefined}
              placeholder="选择设备"
              onChange={setDeviceId}
              style={{ width: 200 }}
              size="small"
              filterOption={(input, option) =>
                (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
              }
              options={devices.map((d: any) => ({ value: d.id, label: `${d.name} (${d.code})` }))}
            />
          )}
          {scope === 'product' && (
            <Select
              value={product || undefined}
              placeholder="选择产品"
              onChange={setProduct}
              style={{ width: 200 }}
              size="small"
              options={[
                { value: 'A', label: '产品 A - 精密轴承' },
                { value: 'B', label: '产品 B - 传动轴' },
                { value: 'C', label: '产品 C - 壳体' },
              ]}
            />
          )}
          {scope === 'team' && (
            <Select
              value={team || undefined}
              placeholder="选择班组"
              onChange={setTeam}
              style={{ width: 140 }}
              size="small"
              options={[
                { value: '甲班', label: '甲班' },
                { value: '乙班', label: '乙班' },
                { value: '丙班', label: '丙班' },
              ]}
            />
          )}
          {scope !== 'plant' && (
            <Tag color="#1677ff">{SCOPE_LABELS[scope]} 维度</Tag>
          )}
        </div>
      </div>

      {/* ─── ECharts Pareto 柏拉图 ─── */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#333', margin: '0 0 4px 0' }}>
          帕累托分析 — TOP 损失原因 ({SCOPE_LABELS[scope]})
        </h3>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
          柱状图=各原因停机时长 · 折线=累计占比 · 红色虚线=80% 关键分界线
        </div>
        <div style={{ position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)', zIndex: 10, borderRadius: 8, color: '#999', fontSize: 14 }}>
              <SpinnerIcon size={16} style={{ marginRight: 4 }} />加载中...
            </div>
          )}
          {!loading && pareto.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', zIndex: 10, borderRadius: 8, color: '#999', fontSize: 14 }}>
              暂无数据
            </div>
          )}
          <div ref={chartDomRef} style={{ width: '100%', height: 340 }} />
        </div>
      </div>

      {/* ─── 损失明细表 ─── */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #eee', padding: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#333', margin: '0 0 12px 0' }}>损失明细</h3>
        <Table
          dataSource={pareto}
          columns={columns}
          rowKey="cause"
          pagination={false}
          size="small"
            summary={() => pareto.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><strong>TOP 3 占总量</strong></Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + (p.count || 0), 0)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + (p.duration || 0), 0)} min</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3}>
                <strong>{pareto.slice(0, 3).reduce((s, p) => s + (p.percentage || 0), 0).toFixed(1)}%</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4}>
                <Tag color="#EF4444">{pareto[2] ? (Number(pareto[2]?.cumulative) || 0).toFixed(1) : 0}%</Tag>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          ) : null}
        />
      </div>
    </div>
  );
}
