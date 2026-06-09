import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Table, Spin, Button, Progress, Row, Col, Space, Statistic } from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined, UserOutlined, ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, DeviceStatusConfig } from '../styles/theme';

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/devices/${id}`),
      api.get(`/dashboard/devices/${id}/trend?range=30`),
    ]).then(([devRes, trendRes]) => {
      setDevice(devRes.data.data);
      setTrend(trendRes.data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!device) return <div style={{ textAlign: 'center', padding: 40, color: Colors.gray500 }}>设备未找到</div>;

  const statusCfg = DeviceStatusConfig[device.status];
  const StatusIcon = statusCfg?.icon;
  const activeWo = device.activeWorkOrder;

  // ── OEE 趋势图 ──────────────────────────────
  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 45, right: 15, top: 25, bottom: 25 },
    xAxis: {
      type: 'category',
      data: trend.map((t: any) => t.date.slice(5)),
      axisLabel: { fontSize: 10, color: Colors.gray400 },
    },
    yAxis: { type: 'value', min: 60, max: 100, splitLine: { lineStyle: { color: Colors.gray100 } } },
    series: [
      {
        name: 'OEE',
        type: 'line',
        data: trend.map((t: any) => t.oee),
        smooth: true,
        lineStyle: { color: Colors.primary, width: 2 },
        itemStyle: { color: Colors.primary },
        areaStyle: { opacity: 0.1, color: Colors.primaryLight },
      },
      {
        name: '可用率',
        type: 'line',
        data: trend.map((t: any) => t.availability),
        smooth: true,
        lineStyle: { color: Colors.successLight, width: 1.5, type: 'dashed' },
        itemStyle: { color: Colors.successLight },
        symbol: 'none',
      },
      {
        name: '性能率',
        type: 'line',
        data: trend.map((t: any) => t.performance),
        smooth: true,
        lineStyle: { color: Colors.warningLight, width: 1.5, type: 'dashed' },
        itemStyle: { color: Colors.warningLight },
        symbol: 'none',
      },
    ],
    legend: { data: ['OEE', '可用率', '性能率'], top: 0, right: 0, textStyle: { fontSize: 11, color: Colors.gray500 } },
  };

  // ── 工单列表列 ──────────────────────────────
  const woColumns = [
    { title: '工单号', dataIndex: 'code', key: 'code' },
    { title: '类型', dataIndex: 'faultType', key: 'faultType' },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority',
      render: (p: string) => {
        const colors: Record<string, string> = { P0: Colors.dangerLight, P1: Colors.warningLight, P2: '#EAB308', P3: Colors.gray400 };
        return <Tag color={colors[p] || Colors.gray400} style={{ borderRadius: 4, border: 'none' }}>{p}</Tag>;
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
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/devices')}
        type="text"
        style={{ marginBottom: 16, color: Colors.gray600 }}
      >
        返回设备列表
      </Button>

      {/* ─── 基本信息卡 ─── */}
      <PageCard>
        {/* 头部 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: Colors.gray800 }}>{device.name}</h2>
              {statusCfg && (
                <Tag
                  color={statusCfg.color}
                  style={{ borderRadius: 4, border: 'none', padding: '2px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {StatusIcon && <StatusIcon style={{ fontSize: 12 }} />}
                  {statusCfg.label}
                </Tag>
              )}
            </div>
            <span style={{ color: Colors.gray500, fontSize: 13 }}>{device.code} · {device.type} · {device.area}/{device.line}</span>
          </div>

          {/* 活跃工单（保养/维修中） */}
          {activeWo && (
            <div style={{
              background: Colors.warningLight + '10',
              border: `1px solid ${Colors.warningLight}30`,
              borderRadius: 8, padding: '8px 16px',
            }}>
              <Space>
                <UserOutlined style={{ color: Colors.warningLight }} />
                <div>
                  <div style={{ fontSize: 11, color: Colors.gray500 }}>当前负责人</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: Colors.warningLight }}>{activeWo.assigneeId || '未指派'}</div>
                </div>
                <div style={{ borderLeft: `1px solid ${Colors.gray200}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 11, color: Colors.gray500 }}>工单状态</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800 }}>{activeWo.status}</div>
                </div>
              </Space>
            </div>
          )}
        </div>

        {/* KPI 指标行 */}
        <Row gutter={24} style={{ marginBottom: 20 }}>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Progress type="dashboard" percent={device.healthScore || 0} size={90}
              strokeColor={device.healthScore >= 80 ? Colors.successLight : device.healthScore >= 60 ? Colors.warningLight : Colors.dangerLight}
              trailColor={Colors.gray100}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: Colors.gray500 }}>健康度评分</div>
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: Colors.gray500 }}>OEE</span>}
              value={device.oee || '-'}
              suffix="%"
              valueStyle={{ color: (device.oee || 0) >= 85 ? Colors.successLight : Colors.warningLight, fontSize: 28, fontWeight: 700 }}
            />
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: Colors.gray500 }}>MTBF（平均故障间隔）</span>}
              value={device.mtbf || '-'}
              suffix="h"
              valueStyle={{ color: Colors.gray800, fontSize: 28, fontWeight: 700 }}
            />
          </Col>
          <Col span={6} style={{ textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: 12, color: Colors.gray500 }}>MTTR（平均修复时间）</span>}
              value={device.mttr || '-'}
              suffix="h"
              valueStyle={{ color: Colors.gray800, fontSize: 28, fontWeight: 700 }}
            />
          </Col>
        </Row>

        {/* 设备信息 */}
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="设备类型">{device.type}</Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={device.priority === 'A' ? Colors.dangerLight : device.priority === 'B' ? Colors.info : Colors.gray400} style={{ borderRadius: 4, border: 'none' }}>
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
      </PageCard>

      {/* ─── OEE 趋势图 ─── */}
      {trend.length > 0 && (
        <PageCard icon={<ThunderboltOutlined />} title="OEE 30 日趋势" style={{ marginTop: 16 }}>
          <ReactECharts option={trendChartOption} style={{ height: 240 }} />
        </PageCard>
      )}

      {/* ─── 工单历史 ─── */}
      <PageCard icon={<InfoCircleOutlined />} title="工单历史" style={{ marginTop: 16 }}>
        <Table
          dataSource={device.recentWorkOrders || []}
          columns={woColumns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
          style={{ marginTop: 8 }}
          onRow={(record) => ({
            onClick: () => navigate(`/work-orders/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </PageCard>
    </div>
  );
}
