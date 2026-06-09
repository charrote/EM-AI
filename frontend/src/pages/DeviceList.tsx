import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Tag, Statistic, Spin, Empty, Progress } from 'antd';
import {
  ThunderboltOutlined,
  PauseCircleOutlined,
  SwapOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  running: { color: '#22C55E', label: '运行中', icon: <ThunderboltOutlined /> },
  idle: { color: '#9CA3AF', label: '待机', icon: <PauseCircleOutlined /> },
  changeover: { color: '#F59E0B', label: '换型中', icon: <SwapOutlined /> },
  fault: { color: '#EF4444', label: '故障', icon: <CloseCircleOutlined /> },
  maintenance: { color: '#3B82F6', label: '保养中', icon: <ToolOutlined /> },
  repair: { color: '#F97316', label: '检修中', icon: <WarningOutlined /> },
  retired: { color: '#6B7280', label: '已报废', icon: <CloseCircleOutlined /> },
};

export default function DeviceList() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/devices').then((res) => {
      setDevices(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!devices.length) return <Empty description="暂无设备数据" />;

  return (
    <div>
      <Row gutter={[16, 16]}>
        {/* Status summary */}
        <Col span={24}>
          <Row gutter={[12, 12]}>
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const count = devices.filter(d => d.status === key).length;
              if (!count) return null;
              return (
                <Col key={key}>
                  <Tag color={cfg.color} style={{ padding: '4px 16px', fontSize: 14 }}>
                    {cfg.icon} {cfg.label}: {count}
                  </Tag>
                </Col>
              );
            })}
          </Row>
        </Col>

        {/* Device cards */}
        {devices.map((device) => {
          const cfg = statusConfig[device.status] || statusConfig.idle;
          const oeeColor = (device.oee || 0) >= 85 ? '#22C55E' : (device.oee || 0) >= 75 ? '#F59E0B' : '#EF4444';
          return (
            <Col key={device.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                onClick={() => navigate(`/devices/${device.id}`)}
                style={{ borderLeft: `4px solid ${cfg.color}` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>{device.name}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{device.code}</div>
                  </div>
                  <Tag color={cfg.color}>{cfg.label}</Tag>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#999' }}>OEE</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: oeeColor }}>
                      {device.oee || '-'}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#999' }}>健康度</div>
                    <Progress
                      type="circle"
                      percent={device.healthScore || 0}
                      size={50}
                      strokeColor={device.healthScore >= 80 ? '#22C55E' : device.healthScore >= 60 ? '#F59E0B' : '#EF4444'}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                  {device.area} / {device.line} · {device.type}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
