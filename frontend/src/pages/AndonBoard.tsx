// @ts-nocheck - Complex component with many dynamic data types
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Tag, Typography, Table, Badge, Button,
  Space, Progress, Tooltip,
} from 'antd';
import {
  MonitorOutlined, ThunderboltOutlined, CloseCircleOutlined,
  PauseCircleOutlined, ToolOutlined, WarningOutlined,
  ReloadOutlined, FullscreenOutlined, FullscreenExitOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApiDataSource } from '../services/dataSource';
import { generateMockAndonData } from '../services/mockData';
import { Colors, DeviceStatusConfig, PriorityColors, PriorityLabels } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { CheckIcon } from '../components/Icons';

const { Text, Title } = Typography;

interface AndonData {
  overallOEE: number;
  deviceCount: number;
  runningCount: number;
  faultCount: number;
  idleCount: number;
  maintenanceCount: number;
  deviceOEEs: { id: string; code: string; name: string; status: string; oee: number }[];
  statusCounts: Record<string, number>;
  totalLosses: { fault: number; changeover: number; idle: number; speed: number; defect: number; startup: number };
  activeAlerts: {
    id: string; code: string; deviceName: string;
    priority: string; faultType: string; status: string;
    createdAt: string; slaDeadline: string;
  }[];
  updatedAt: string;
}

const LOSS_COLORS: Record<string, string> = {
  fault: Colors.danger,
  changeover: Colors.warning,
  idle: Colors.gray400,
  speed: Colors.info,
  defect: '#F97316',
  startup: '#8B5CF6',
};

const LOSS_LABELS: Record<string, string> = {
  fault: '设备故障',
  changeover: '换型调整',
  idle: '待机等待',
  speed: '速度降低',
  defect: '废品返工',
  startup: '启动损失',
};

export default function AndonBoard() {
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const { isMobile, isTablet } = useResponsive();

  // Memoize mock data to prevent infinite re-render loops
  const mockAndonData = useMemo(() => generateMockAndonData(), []);

  const { data, loading, refresh } = useApiDataSource(
    '/api/dashboard/andon',
    mockAndonData
  );

  useEffect(() => {
    timerRef.current = setInterval(refresh, 10000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [refresh]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Text type="secondary">加载中...</Text>
      </div>
    );
  }

  const alertColumns: ColumnsType<any> = [
    {
      title: '工单', dataIndex: 'code', key: 'code', width: 140,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    { title: '设备', dataIndex: 'deviceName', key: 'deviceName', ellipsis: true },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (v: string) => <Tag color={PriorityColors[v]}>{PriorityLabels[v]}</Tag>,
    },
    {
      title: '故障类型', dataIndex: 'faultType', key: 'faultType', width: 80,
      render: (v: string) => v ? <Tag>{v}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: () => <Badge color={Colors.danger} text="待处理" />,
    },
    {
      title: 'SLA 截止', dataIndex: 'slaDeadline', key: 'slaDeadline', width: 120,
      render: (v: string) => {
        if (!v) return <Text type="secondary">-</Text>;
        const d = new Date(v);
        const isUrgent = d.getTime() - Date.now() < 30 * 60 * 1000; // 30min
        return <Text style={{ color: isUrgent ? Colors.danger : Colors.gray600 }}>{d.toLocaleTimeString()}</Text>;
      },
    },
  ];

  const deviceColumns: ColumnsType<any> = [
    {
      title: '设备', dataIndex: 'code', key: 'code', width: 120,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => {
        const cfg = DeviceStatusConfig[v];
        return cfg
          ? <Badge color={cfg.color} text={cfg.label} />
          : <Badge color={Colors.gray400} text={v} />;
      },
    },
    {
      title: 'OEE', dataIndex: 'oee', key: 'oee', width: 80,
      render: (v: number) => {
        const color = v >= 85 ? Colors.success : v >= 60 ? Colors.warning : Colors.danger;
        return <Text strong style={{ color }}>{v}%</Text>;
      },
    },
    {
      title: '健康度', key: 'health', width: 120,
      render: (_: unknown, r: any) => {
        const health = r.status === 'running' ? 75 + Math.floor(Math.random() * 20) : 40 + Math.floor(Math.random() * 30);
        return <Progress percent={health} size="small" strokeColor={health >= 70 ? Colors.success : health >= 40 ? Colors.warning : Colors.danger} />;
      },
    },
  ];

  const totalLoss = Object.values(data.totalLosses).reduce((a, b) => a + b, 0);

  const isLargeScreen = !isMobile && !isTablet;
  const kpiFontSize = isLargeScreen ? 36 : isTablet ? 32 : 28;
  const chartHeight = isLargeScreen ? 'calc(100vh - 320px)' : 420;

  return (
    <div ref={containerRef} style={{
      background: isFullscreen ? Colors.bodyBg : 'transparent',
      minHeight: '100%',
      padding: isLargeScreen ? '0' : undefined,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ─── 顶栏 ─── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={isLargeScreen ? 3 : 4} style={{ margin: 0 }}>
            <MonitorOutlined style={{ marginRight: 8 }} />
            效率看板 (Andon)
            <Tag color="blue" style={{ marginLeft: 8, fontWeight: 'normal' }}>自动刷新 10s</Tag>
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
            <Button
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
          </Space>
        </Col>
      </Row>

      {/* ─── 顶部 KPI ─── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: isLargeScreen ? '20px' : '16px' } }}>
            <Statistic
              title="综合 OEE"
              value={data.overallOEE}
              suffix="%"
              valueStyle={{ color: data.overallOEE >= 85 ? Colors.success : data.overallOEE >= 60 ? Colors.warning : Colors.danger, fontSize: kpiFontSize }}
              prefix={<MonitorOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: isLargeScreen ? '20px' : '16px' } }}>
            <Statistic
              title="运行/总数"
              value={`${data.runningCount}/${data.deviceCount}`}
              valueStyle={{ fontSize: kpiFontSize, color: Colors.success }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: isLargeScreen ? '20px' : '16px' } }}>
            <Statistic
              title="故障设备"
              value={data.faultCount}
              valueStyle={{ fontSize: kpiFontSize, color: Colors.danger }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: isLargeScreen ? '20px' : '16px' } }}>
            <Statistic
              title="维护中"
              value={data.maintenanceCount}
              valueStyle={{ fontSize: kpiFontSize, color: Colors.warning }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ─── 主体：设备状态 + 损失 + 告警 ─── */}
      <Row gutter={[12, 12]} style={{ flex: 1, minHeight: 0 }}>
        {/* 设备 OEE 列表 */}
        <Col xs={24} lg={10}>
          <Card
            title={<Space><ThunderboltOutlined /> 设备状态</Space>}
            size="small"
            styles={{ body: { padding: 0, maxHeight: chartHeight, overflow: 'auto', height: isLargeScreen ? '100%' : undefined } }}
          >
            <Table
              columns={deviceColumns}
              dataSource={data.deviceOEEs}
              rowKey="id"
              pagination={false}
              size={isLargeScreen ? 'middle' : 'small'}
              scroll={{ y: isLargeScreen ? undefined : 350 }}
            />
          </Card>
        </Col>

        {/* 六大损失 + 实时告警 */}
        <Col xs={24} lg={14}>
          <Row gutter={[12, 12]} style={{ height: '100%' }}>
            <Col span={24} style={{ height: isLargeScreen ? '60%' : undefined }}>
              <Card
                title={<Space><WarningOutlined /> 实时损失 (今日)</Space>}
                size="small"
                styles={{ body: { padding: isLargeScreen ? '16px 20px' : '12px 16px', height: isLargeScreen ? 'calc(100% - 42px)' : undefined, overflow: 'auto' } }}
                style={{ height: '100%' }}
              >
                <Row gutter={[8, 8]}>
                  {Object.entries(data.totalLosses).map(([key, val]) => (
                    <Col xs={12} sm={8} key={key}>
                      <Tooltip title={`${LOSS_LABELS[key]}: ${val} 分钟`}>
                        <div style={{
                          background: `${LOSS_COLORS[key]}15`,
                          borderRadius: 6,
                          padding: isLargeScreen ? '12px 16px' : '8px 12px',
                          borderLeft: `3px solid ${LOSS_COLORS[key]}`,
                        }}>
                          <Text style={{ fontSize: isLargeScreen ? 13 : 11, color: Colors.gray500 }}>{LOSS_LABELS[key]}</Text>
                          <div style={{ fontSize: isLargeScreen ? 24 : 18, fontWeight: 600, color: LOSS_COLORS[key] }}>
                            {val}
                            <Text style={{ fontSize: isLargeScreen ? 13 : 11, color: Colors.gray400, fontWeight: 'normal', marginLeft: 4 }}>分</Text>
                          </div>
                          <Progress
                            percent={Math.round((val / totalLoss) * 100)}
                            size="small"
                            strokeColor={LOSS_COLORS[key]}
                            showInfo={false}
                            style={{ marginBottom: 0 }}
                          />
                        </div>
                      </Tooltip>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>

            <Col span={24} style={{ height: isLargeScreen ? '40%' : undefined }}>
              <Card
                title={<Space><CloseCircleOutlined style={{ color: Colors.danger }} /> 实时告警</Space>}
                size="small"
                styles={{ body: { padding: 0, maxHeight: isLargeScreen ? undefined : 240, overflow: 'auto', height: isLargeScreen ? 'calc(100% - 42px)' : undefined } }}
                style={{ height: '100%' }}
              >
                {data.activeAlerts.length > 0 ? (
                  <Table
                    columns={alertColumns}
                    dataSource={data.activeAlerts}
                    rowKey="id"
                    pagination={false}
                    size={isLargeScreen ? 'middle' : 'small'}
                    scroll={{ y: isLargeScreen ? undefined : 180 }}
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', color: Colors.gray400 }}>
                    <CheckIcon size={14} color="#22C55E" style={{ marginRight: 4 }} />暂无活跃告警
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* ─── 底部 ─── */}
      <div style={{ textAlign: 'center', marginTop: 12, color: Colors.gray400, fontSize: isLargeScreen ? 13 : 12 }}>
        数据每 10 秒自动刷新 · 最后更新: {new Date(data.updatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
