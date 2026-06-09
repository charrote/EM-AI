import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Table, Button } from 'antd';
import { ArrowLeftOutlined, UserOutlined, ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { SpinnerIcon } from '../components/Icons';

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  running: { color: '#22C55E', label: '运行中' },
  idle: { color: '#9CA3AF', label: '待机' },
  fault: { color: '#EF4444', label: '故障' },
  maintenance: { color: '#F59E0B', label: '保养中' },
  repair: { color: '#F97316', label: '检修中' },
  changeover: { color: '#F59E0B', label: '换型中' },
  retired: { color: '#6B7280', label: '已报废' },
};

const PRIORITY_COLORS: Record<string, string> = {
  A: '#EF4444', B: '#3B82F6', C: '#9CA3AF',
};

function HealthDonut({ score }: { score: number }) {
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 68, height: 68, borderRadius: '50%', position: 'relative',
        background: `conic-gradient(${color} ${score}%, #F3F4F6 ${score}%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, color: '#999' }}>健康度</span>
    </div>
  );
}

function KpiStat({ label, value, suffix, color }: { label: string; value: string | number; suffix?: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 11, color: '#999' }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: color || '#333' }}>
        {value}
        {suffix && <span style={{ fontSize: 12, fontWeight: 400, color: '#999', marginLeft: 2 }}>{suffix}</span>}
      </span>
    </div>
  );
}

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const trendChartDomRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/devices/${id}`).then(r => r.json()),
      fetch(`/api/dashboard/devices/${id}/trend?range=30`).then(r => r.json()),
    ]).then(([devRes, trendRes]) => {
      setDevice(devRes.data);
      setTrend(trendRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  // Init trend chart (retry until DOM is ready)
  useEffect(() => {
    if (!trendChartDomRef.current || trendChartRef.current) return;
    trendChartRef.current = echarts.init(trendChartDomRef.current);
    return () => {
      trendChartRef.current?.dispose();
      trendChartRef.current = null;
    };
  });

  // Update trend chart
  useEffect(() => {
    const chart = trendChartRef.current;
    if (!chart || trend.length === 0) return;

    chart.setOption({
      tooltip: { trigger: 'axis' },
      legend: {
        data: ['OEE', '可用率', '性能率'],
        top: 0, right: 0,
        textStyle: { fontSize: 12 },
      },
      grid: { left: 45, right: 10, top: 30, bottom: 25 },
      xAxis: {
        type: 'category',
        data: trend.map(t => t.date.slice(5)),
        axisLabel: { fontSize: 10, color: '#999' },
      },
      yAxis: {
        type: 'value', min: 60, max: 100,
        splitLine: { lineStyle: { color: '#F3F4F6' } },
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: 'OEE', type: 'line',
          data: trend.map(t => t.oee),
          smooth: true,
          lineStyle: { color: '#3B82F6', width: 2 },
          itemStyle: { color: '#3B82F6' },
          areaStyle: { opacity: 0.08, color: '#3B82F6' },
          symbol: 'circle', symbolSize: 4,
        },
        {
          name: '可用率', type: 'line',
          data: trend.map(t => t.availability),
          smooth: true,
          lineStyle: { color: '#22C55E', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#22C55E' },
          symbol: 'none',
        },
        {
          name: '性能率', type: 'line',
          data: trend.map(t => t.performance),
          smooth: true,
          lineStyle: { color: '#F59E0B', width: 1.5, type: 'dashed' },
          itemStyle: { color: '#F59E0B' },
          symbol: 'none',
        },
      ],
    });
  }, [trend]);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0', color: '#999', fontSize: 16 }}><SpinnerIcon size={20} style={{ marginRight: 6 }} />加载中...</div>;
  if (!device) return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>设备未找到</div>;

  const statusCfg = STATUS_CFG[device.status];
  const activeWo = device.activeWorkOrder;
  const oeeColor = (device.oee || 0) >= 85 ? '#22C55E' : '#F59E0B';

  const woColumns = [
    { title: '工单号', dataIndex: 'code', key: 'code', render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span> },
    { title: '类型', dataIndex: 'faultType', key: 'faultType' },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority',
      render: (p: string) => {
        const colors: Record<string, string> = { P0: '#EF4444', P1: '#F59E0B', P2: '#EAB308', P3: '#9CA3AF' };
        return <Tag color={colors[p] || '#9CA3AF'} style={{ borderRadius: 4, border: 'none' }}>{p}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const labels: Record<string, string> = { pending: '待接单', accepted: '已接单', diagnosing: '诊断中', repairing: '维修中', completed: '已完成' };
        return <Tag style={{ borderRadius: 4 }}>{labels[s] || s}</Tag>;
      },
    },
    { title: '负责人', dataIndex: 'assigneeId', key: 'assigneeId', render: (v: string) => v || '-' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString() },
  ];

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* ─── 返回按钮 ─── */}
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/devices')}
        type="text"
        style={{ marginBottom: 12, color: '#6B7280', padding: '4px 8px' }}
      >
        返回设备列表
      </Button>

      {/* ─── 基本信息卡 ─── */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 16, marginBottom: 12 }}>
        {/* 头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#1F2937' }}>{device.name}</h2>
              {statusCfg && (
                <span style={{
                  background: statusCfg.color + '20', color: statusCfg.color, borderRadius: 4,
                  padding: '1px 10px', fontSize: 12, fontWeight: 500,
                }}>
                  {statusCfg.label}
                </span>
              )}
            </div>
            <span style={{ color: '#999', fontSize: 12 }}>{device.code} · {device.type} · {device.area}/{device.line}</span>
          </div>

          {/* 活跃工单 */}
          {activeWo && (
            <div style={{
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6,
              padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <UserOutlined style={{ color: '#F59E0B' }} />
              <div>
                <div style={{ fontSize: 10, color: '#999' }}>当前负责人</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>{activeWo.assigneeId || '未指派'}</div>
              </div>
              <div style={{ borderLeft: '1px solid #FDE68A', paddingLeft: 12 }}>
                <div style={{ fontSize: 10, color: '#999' }}>工单状态</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{activeWo.status}</div>
              </div>
            </div>
          )}
        </div>

        {/* KPI 行 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 16 }}>
          <HealthDonut score={device.healthScore || 0} />
          <KpiStat label="OEE" value={device.oee || '-'} suffix="%" color={oeeColor} />
          <KpiStat label="MTBF" value={device.mtbf || '-'} suffix="h" />
          <KpiStat label="MTTR" value={device.mttr || '-'} suffix="h" />
        </div>

        {/* 设备信息 */}
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
          <Descriptions.Item label="设备类型">{device.type}</Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={PRIORITY_COLORS[device.priority] || '#999'} style={{ borderRadius: 4, border: 'none' }}>
              {device.priority}类
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="区域/产线">{device.area} / {device.line}</Descriptions.Item>
          <Descriptions.Item label="编码">{device.code}</Descriptions.Item>
          {device.config?.tempRange && (
            <Descriptions.Item label="温度范围">{device.config.tempRange[0]} - {device.config.tempRange[1]} °C</Descriptions.Item>
          )}
          {device.config?.pressureRange && (
            <Descriptions.Item label="压力范围">{device.config.pressureRange[0]} - {device.config.pressureRange[1]} MPa</Descriptions.Item>
          )}
        </Descriptions>
      </div>

      {/* ─── OEE 趋势图 ─── */}
      {trend.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 16, marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ThunderboltOutlined /> OEE 30 日趋势
          </h3>
          <div ref={trendChartDomRef} style={{ width: '100%', height: 240 }} />
        </div>
      )}

      {/* ─── 工单历史 ─── */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 16 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
          <InfoCircleOutlined /> 工单历史
        </h3>
        <Table
          dataSource={device.workOrders || []}
          columns={woColumns}
          rowKey="id"
          pagination={{ pageSize: 5, size: 'small' }}
          size="small"
          onRow={(record) => ({
            onClick: () => navigate(`/work-orders/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </div>
    </div>
  );
}
