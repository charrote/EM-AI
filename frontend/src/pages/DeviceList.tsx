import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Tag, Spin, Empty, Progress } from 'antd';
import { DashboardOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, DeviceStatusConfig } from '../styles/theme';

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
      {/* 状态汇总条 */}
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        {Object.entries(DeviceStatusConfig).map(([key, cfg]) => {
          const count = devices.filter(d => d.status === key).length;
          if (!count) return null;
          const Icon = cfg.icon;
          return (
            <Col key={key}>
              <Tag
                color={cfg.color}
                style={{
                  padding: '4px 14px',
                  fontSize: 13,
                  borderRadius: 6,
                  border: 'none',
                  margin: 0,
                }}
              >
                <Icon style={{ marginRight: 4 }} />
                {cfg.label} {count}
              </Tag>
            </Col>
          );
        })}
      </Row>

      {/* 设备卡片网格 */}
      <Row gutter={[16, 16]}>
        {devices.map((device) => {
          const StatusIcon = DeviceStatusConfig[device.status]?.icon || DashboardOutlined;
          const statusCfg = DeviceStatusConfig[device.status];
          const oeeColor = (device.oee || 0) >= 85 ? Colors.successLight : (device.oee || 0) >= 75 ? Colors.warningLight : Colors.dangerLight;

          return (
            <Col key={device.id} xs={24} sm={12} md={8} lg={6}>
              <PageCard
                hoverable
                onClick={() => navigate(`/devices/${device.id}`)}
                style={{
                  cursor: 'pointer',
                  borderLeft: `3px solid ${statusCfg?.color || Colors.gray400}`,
                }}
                bodyStyle={{ padding: 16 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: Colors.gray800 }}>{device.name}</div>
                    <div style={{ fontSize: 12, color: Colors.gray500, marginTop: 2 }}>{device.code}</div>
                  </div>
                  <Tag
                    color={statusCfg?.color}
                    style={{
                      borderRadius: 4, border: 'none', margin: 0, fontSize: 12,
                      display: 'flex', alignItems: 'center', gap: 4, padding: '2px 10px',
                    }}
                  >
                    <StatusIcon style={{ fontSize: 12 }} />
                    {statusCfg?.label || device.status}
                  </Tag>
                </div>

                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: Colors.gray500, marginBottom: 2 }}>OEE</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: oeeColor }}>
                      {device.oee || '-'}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: Colors.gray500, marginBottom: 2 }}>健康度</div>
                    <Progress
                      type="circle"
                      percent={device.healthScore || 0}
                      size={44}
                      strokeColor={device.healthScore >= 80 ? Colors.successLight : device.healthScore >= 60 ? Colors.warningLight : Colors.dangerLight}
                      trailColor={Colors.gray100}
                    />
                  </div>
                </div>

                <div style={{ fontSize: 12, color: Colors.gray400, marginTop: 10 }}>
                  {device.area} / {device.line} · {device.type}
                </div>
              </PageCard>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
