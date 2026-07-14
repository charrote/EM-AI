// @ts-nocheck
import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Table, Button, Tooltip, DatePicker, Space, Row, Col } from 'antd';
import { ArrowLeftOutlined, UserOutlined, ThunderboltOutlined, InfoCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { SpinnerIcon } from '../components/Icons';
import { Colors } from '../styles/theme';
import { useStore } from '../store/useStore';
import { useApiDataSource } from '../services/dataSource';
import { generateMockDevices } from '../services/mockData';

const { RangePicker } = DatePicker;

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

const METRIC_HELP: Record<string, string> = {
  healthScore: '设备健康度评分 (0-100)，基于振动、温度、运行时间等多维度综合评估。≥80优秀，≥60良好，<60需关注。',
  oee: '设备综合效率 (Overall Equipment Effectiveness)，计算方法：可用率 × 性能率 × 质量率。行业标准≥85%为世界级。',
  mtbf: '平均故障间隔时间 (Mean Time Between Failures)，衡量设备可靠性的关键指标，值越大越好。',
  mttr: '平均修复时间 (Mean Time To Repair)，衡量维修效率的关键指标，值越小越好。',
  totalRunningTime: '设备累计运行总时长，反映设备的使用强度和维护周期参考。',
};

function KpiStatWithHelp({ label, value, suffix, color, helpKey }: { label: string; value: string | number; suffix?: string; color?: string; helpKey: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 11, color: '#999', display: 'flex', alignItems: 'center', gap: 3 }}>
        {label}
        <Tooltip title={METRIC_HELP[helpKey] || ''}>
          <QuestionCircleOutlined style={{ fontSize: 11, color: '#bbb', cursor: 'pointer' }} />
        </Tooltip>
      </span>
      <span style={{ fontSize: 20, fontWeight: 700, color: color || '#333' }}>
        {value}
        {suffix && <span style={{ fontSize: 12, fontWeight: 400, color: '#999', marginLeft: 2 }}>{suffix}</span>}
      </span>
    </div>
  );
}

function HealthDonut({ score, onClick }: { score: number; onClick?: () => void }) {
  const predictiveMaintenanceEnabled = useStore((s) => s.predictiveMaintenanceEnabled);
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative' }} onClick={onClick}>
        <Tooltip title={METRIC_HELP.healthScore}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%', position: 'relative', cursor: onClick ? 'pointer' : 'default',
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
        </Tooltip>
        {predictiveMaintenanceEnabled && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
            borderRadius: '50%', width: 20, height: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(6, 182, 212, 0.4)',
          }}>
            <ThunderboltOutlined style={{ color: '#fff', fontSize: 10 }} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#999', display: 'flex', alignItems: 'center', gap: 3 }}>
        健康度
        <Tooltip title={METRIC_HELP.healthScore}>
          <QuestionCircleOutlined style={{ fontSize: 10, color: '#bbb', cursor: 'pointer' }} />
        </Tooltip>
        {predictiveMaintenanceEnabled && (
          <span style={{
            fontSize: 9, fontWeight: 600, color: '#06B6D4',
            background: '#06B6D415', padding: '0 5px', borderRadius: 3,
            lineHeight: '16px', letterSpacing: 0.5,
          }}>
            Aura
          </span>
        )}
      </span>
    </div>
  );
}

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trend, setTrend] = useState<any[]>([]);
  const [trendType, setTrendType] = useState<'24h' | 'range'>('24h');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const trendChartDomRef = useRef<HTMLDivElement>(null);
  const trendChartRef = useRef<echarts.ECharts | null>(null);
  const predictiveMaintenanceEnabled = useStore((s) => s.predictiveMaintenanceEnabled);
  const setHealthScoreModalOpen = useStore((s) => s.setHealthScoreModalOpen);
  const setHealthScoreDeviceId = useStore((s) => s.setHealthScoreDeviceId);

  const { data: device, loading } = useApiDataSource(
    `/api/devices/${id || ''}`,
    generateMockDevices(1)[0]
  );

  const handleHealthScoreClick = () => {
    if (predictiveMaintenanceEnabled && id) {
      setHealthScoreDeviceId(id);
      setHealthScoreModalOpen(true);
    }
  };

  useEffect(() => {
    if (id && device) {
      fetch(`/api/dashboard/devices/${id}/trend?range=24h`)
        .then(r => r.json())
        .then(res => { setTrend(res.data || []); })
        .catch(() => setTrend([]));
    }
  }, [id, device]);

  // Init trend chart
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

    const is24h = trendType === '24h';

    if (is24h) {
      // ── 当日每小时产量 ──
      const outputVals = trend.map(t => t.output);
      const defectVals = trend.map(t => t.defect);
      const allVals = [...outputVals, ...defectVals];
      const dataMin = Math.min(...allVals);
      const dataMax = Math.max(...allVals);
      const pad = Math.max(2, (dataMax - dataMin) * 0.15);

      chart.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: (params: any[]) => {
            const label = params[0]?.axisValue || '';
            let html = `<strong>${label}</strong><br/>`;
            let outputVal = 0, defectVal = 0;
            params.forEach((p: any) => {
              html += `${p.marker} ${p.seriesName}: ${p.value}<br/>`;
              if (p.seriesName === '产量') outputVal = p.value;
              if (p.seriesName === '不良') defectVal = p.value;
            });
            if (outputVal > 0) {
              html += `不良率: ${(defectVal / outputVal * 100).toFixed(1)}%`;
            }
            return html;
          },
        },
        legend: {
          data: ['产量', '不良'],
          top: 0, right: 0,
          textStyle: { fontSize: 12 },
        },
        grid: { left: 50, right: 10, top: 30, bottom: 25 },
        xAxis: {
          type: 'category',
          data: trend.map(t => t.hour),
          axisLabel: { fontSize: 10, color: '#999', rotate: 45 },
        },
        yAxis: {
          type: 'value',
          min: Math.max(0, Math.floor(dataMin - pad)),
          max: Math.ceil(dataMax + pad),
          splitLine: { lineStyle: { color: '#F3F4F6' } },
          axisLabel: { fontSize: 10 },
        },
        series: [
          {
            name: '产量', type: 'bar',
            data: outputVals,
            itemStyle: { color: '#3B82F6', borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 24,
          },
          {
            name: '不良', type: 'line',
            data: defectVals,
            smooth: true,
            lineStyle: { color: '#EF4444', width: 2 },
            itemStyle: { color: '#EF4444' },
            symbol: 'diamond', symbolSize: 6,
          },
        ],
      });
    } else {
      // ── OEE 趋势 (date range) ──
      const allVals = trend.flatMap(t => [t.oee, t.availability, t.performance]);
      const dataMin = Math.min(...allVals);
      const dataMax = Math.max(...allVals);
      const pad = Math.max(5, (dataMax - dataMin) * 0.15);
      const yMin = Math.max(0, Math.floor(dataMin - pad));
      const yMax = Math.min(100, Math.ceil(dataMax + pad));

      chart.setOption({
        tooltip: {
          trigger: 'axis',
          formatter: (params: any[]) => {
            const label = params[0]?.axisValue || '';
            let html = `<strong>${label}</strong><br/>`;
            params.forEach((p: any) => {
              html += `${p.marker} ${p.seriesName}: ${p.value}%<br/>`;
            });
            return html;
          },
        },
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
          type: 'value',
          min: yMin,
          max: yMax,
          splitLine: { lineStyle: { color: '#F3F4F6' } },
          axisLabel: { fontSize: 10, formatter: '{value}%' },
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
    }
  }, [trend]);

  const handleRangeChange = (dates: any) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
      setTrendType('range');
      fetch(`/api/dashboard/devices/${id}/trend?range=range&start=${dates[0].format('YYYY-MM-DD')}&end=${dates[1].format('YYYY-MM-DD')}`)
        .then(r => r.json())
        .then(res => { setTrend(res.data || []); })
        .catch(() => setTrend([]));
    }
  };

  if (loading && !device) return <div style={{ textAlign: 'center', padding: '100px 0', color: '#999', fontSize: 16 }}><SpinnerIcon size={20} style={{ marginRight: 6 }} />加载中...</div>;
  if (!device) return <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>设备未找到</div>;

  const statusCfg = STATUS_CFG[device.status];
  const activeWo = device.activeWorkOrder;
  const oeeColor = (device.oee || 0) >= 85 ? '#22C55E' : '#F59E0B';

  // Production stats (mock)
  const prodStats = {
    output: Math.round(300 + Math.random() * 200),
    defect: Math.round(5 + Math.random() * 15),
    capacity: Math.round(500 + Math.random() * 100),
    theoreticalPerHour: Math.round(50 + Math.random() * 20),
    actualPerHour: Math.round(40 + Math.random() * 15),
    capacityRate: Math.round((60 + Math.random() * 25) * 10) / 10,
    defectRate: 0,
  };
  prodStats.defectRate = Math.round((prodStats.defect / prodStats.output) * 1000) / 10;
  prodStats.capacityRate = Math.round((prodStats.actualPerHour / prodStats.theoreticalPerHour) * 1000) / 10;

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

        {/* KPI 行 - 指标 + 产量 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 12 }}>
          <HealthDonut score={device.healthScore || 0} onClick={handleHealthScoreClick} />
          <KpiStatWithHelp label="OEE" value={device.oee || '-'} suffix="%" color={oeeColor} helpKey="oee" />
          <KpiStatWithHelp label="总运行时间" value={device.totalRunningTime ?? '-'} suffix="h" helpKey="totalRunningTime" />
          <KpiStatWithHelp label="MTBF" value={device.mtbf || '-'} suffix="h" helpKey="mtbf" />
          <KpiStatWithHelp label="MTTR" value={device.mttr || '-'} suffix="h" helpKey="mttr" />
        </div>

        {/* 生产数据行 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8, marginBottom: 16, padding: '12px', background: Colors.gray50, borderRadius: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999' }}>产量</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{prodStats.output}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999' }}>不良</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: prodStats.defect > 10 ? '#EF4444' : '#333' }}>{prodStats.defect}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999' }}>产能</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{prodStats.capacity}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999' }}>理论产能/h</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{prodStats.theoreticalPerHour}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999' }}>实际产能/h</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>{prodStats.actualPerHour}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999' }}>产能达成率</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: prodStats.capacityRate >= 80 ? '#22C55E' : '#F59E0B' }}>{prodStats.capacityRate}%</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#999' }}>不良率</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: prodStats.defectRate > 5 ? '#EF4444' : '#22C55E' }}>{prodStats.defectRate}%</div>
          </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#333', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ThunderboltOutlined /> {trendType === '24h' ? '当日每小时产量' : 'OEE 趋势'}
            </h3>
            <Space size={8}>
              <Button size="small" type={trendType === '24h' ? 'primary' : 'default'} onClick={() => { setTrendType('24h'); fetch(`/api/dashboard/devices/${id}/trend?range=24h`).then(r => r.json()).then(res => { setTrend(res.data || []); }).catch(() => setTrend([])); }}>
                近24小时
              </Button>
              <RangePicker size="small" onChange={handleRangeChange} />
            </Space>
          </div>
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
