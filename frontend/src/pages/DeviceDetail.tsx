import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Table, Spin, Button, Progress, Row, Col, Space, Statistic } from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined, UserOutlined, ClockCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, DeviceStatusConfig } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isMobile, isTablet } = useResponsive();

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
  const chartHeight = isMobile ? 200 : isTablet ? 220 : 240;
  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 10, top: 30, bottom: 25 },
    xAxis: {
      type: 'category',
      data: trend.map((t: any) => t.date.slice(5)),
      axisLabel: { fontSize: isMobile ? 9 : 10, color: Colors.gray400 },
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
    legend: {
      data: ['OEE', '可用率', '性能率'],
      top: 0, right: 0,
      textStyle: { fontSize: isMobile ? 10 : 11, color: Colors.gray500 },
    },
  };

  // ── 工单列表列 ──────────────────────────────
  const woColumns = [
    { title: '工单号', dataIndex: 'code', key: 'code' },
    ...(isMobile ? [] : [{ title: '类型', dataIndex: 'faultType', key: 'faultType' }]),
    {
      title: '优先级', dataIndex: 'priority', key: 'priority',
      render: (p: string) => {
        const colors: Record<string, string> = { P0: Colors.dangerLight, P1: Colors.warningLight, P2: '#EAB308', P3: Colors.gray400 };
        return <Tag color={colors[p] || Colors.gray400} style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 11 : 12 }}>{p}</Tag>;
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status',
      render: (s: string) => {
        const labels: Record<string, string> = { pending: '待接单', accepted: '已接单', diagnosing: '诊断中', repairing: '维修中', completed: '已完成' };
        return <Tag style={{ borderRadius: 4, fontSize: isMobile ? 11 : 12, lineHeight: '18px', padding: '0 6px' }}>{(isMobile ? ({ pending: '待接', accepted: '已接', diagnosing: '诊断', repairing: '维修', completed: '完成' }) as any : labels)[s] || s}</Tag>;
      },
    },
    ...(isMobile ? [] : [
      { title: '负责人', dataIndex: 'assigneeId', key: 'assigneeId', render: (v: string) => v || '-' },
      { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString() },
    ]),
  ];

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/devices')}
        type="text"
        style={{ marginBottom: isMobile ? 8 : 16, color: Colors.gray600, padding: isMobile ? '0 4px' : undefined }}
      >
        返回设备列表
      </Button>

      {/* ─── 基本信息卡 ─── */}
      <PageCard>
        {/* 头部 */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: isMobile ? 12 : 20,
          gap: isMobile ? 8 : 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 600, color: Colors.gray800 }}>{device.name}</h2>
              {statusCfg && (
                <Tag
                  color={statusCfg.color}
                  style={{ borderRadius: 4, border: 'none', padding: '2px 12px', fontSize: isMobile ? 12 : 13, display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {StatusIcon && <StatusIcon style={{ fontSize: isMobile ? 11 : 12 }} />}
                  {statusCfg.label}
                </Tag>
              )}
            </div>
            <span style={{ color: Colors.gray500, fontSize: isMobile ? 12 : 13 }}>{device.code} · {device.type} · {device.area}/{device.line}</span>
          </div>

          {/* 活跃工单（保养/维修中） */}
          {activeWo && (
            <div style={{
              background: Colors.warningLight + '10',
              border: `1px solid ${Colors.warningLight}30`,
              borderRadius: 8, padding: isMobile ? '6px 12px' : '8px 16px',
            }}>
              <Space size={isMobile ? 8 : 16}>
                <UserOutlined style={{ color: Colors.warningLight }} />
                <div>
                  <div style={{ fontSize: isMobile ? 10 : 11, color: Colors.gray500 }}>当前负责人</div>
                  <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: Colors.warningLight }}>{activeWo.assigneeId || '未指派'}</div>
                </div>
                <div style={{ borderLeft: `1px solid ${Colors.gray200}`, paddingLeft: isMobile ? 8 : 12 }}>
                  <div style={{ fontSize: isMobile ? 10 : 11, color: Colors.gray500 }}>工单状态</div>
                  <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: Colors.gray800 }}>{activeWo.status}</div>
                </div>
              </Space>
            </div>
          )}
        </div>

        {/* KPI 指标行 — 响应式：桌面4列，平板2列，移动2列 */}
        <Row gutter={[isMobile ? 8 : 24, isMobile ? 8 : 0]} style={{ marginBottom: isMobile ? 12 : 20 }}>
          <Col xs={12} sm={12} md={6} style={{ textAlign: 'center' }}>
            <Progress type="dashboard" percent={device.healthScore || 0} size={isMobile ? 60 : 90}
              strokeColor={device.healthScore >= 80 ? Colors.successLight : device.healthScore >= 60 ? Colors.warningLight : Colors.dangerLight}
              trailColor={Colors.gray100}
            />
            <div style={{ marginTop: 4, fontSize: isMobile ? 11 : 12, color: Colors.gray500 }}>健康度</div>
          </Col>
          <Col xs={12} sm={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray500 }}>OEE</span>}
              value={device.oee || '-'}
              suffix="%"
              valueStyle={{ color: (device.oee || 0) >= 85 ? Colors.successLight : Colors.warningLight, fontSize: isMobile ? 22 : 28, fontWeight: 700 }}
            />
          </Col>
          <Col xs={12} sm={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray500 }}>MTBF</span>}
              value={device.mtbf || '-'}
              suffix="h"
              valueStyle={{ color: Colors.gray800, fontSize: isMobile ? 22 : 28, fontWeight: 700 }}
            />
          </Col>
          <Col xs={12} sm={12} md={6} style={{ textAlign: 'center' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray500 }}>MTTR</span>}
              value={device.mttr || '-'}
              suffix="h"
              valueStyle={{ color: Colors.gray800, fontSize: isMobile ? 22 : 28, fontWeight: 700 }}
            />
          </Col>
        </Row>

        {/* 设备信息 — 移动端用1列 */}
        <Descriptions column={isMobile ? 1 : 2} bordered size={isMobile ? 'small' : 'small'}>
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
        <PageCard icon={<ThunderboltOutlined />} title="OEE 30 日趋势" style={{ marginTop: isMobile ? 8 : 16 }}>
          <ReactECharts option={trendChartOption} style={{ height: chartHeight }} />
        </PageCard>
      )}

      {/* ─── 工单历史 ─── */}
      <PageCard icon={<InfoCircleOutlined />} title="工单历史" style={{ marginTop: isMobile ? 8 : 16 }}>
        <div className={isMobile ? 'responsive-table' : ''}>
          <Table
            dataSource={device.recentWorkOrders || []}
            columns={woColumns}
            rowKey="id"
            pagination={isMobile ? { pageSize: 5, size: 'small' } : { pageSize: 5 }}
            size="small"
            style={{ marginTop: 8 }}
            onRow={(record) => ({
              onClick: () => navigate(`/work-orders/${record.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </PageCard>
    </div>
  );
}
