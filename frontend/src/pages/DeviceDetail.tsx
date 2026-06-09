import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Descriptions, Tag, Table, Spin, Button, Progress, Row, Col } from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, DeviceStatusConfig } from '../styles/theme';

export default function DeviceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.get(`/devices/${id}`).then((res) => {
      setDevice(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!device) return <div style={{ textAlign: 'center', padding: 40, color: Colors.gray500 }}>设备未找到</div>;

  const statusCfg = DeviceStatusConfig[device.status];
  const StatusIcon = statusCfg?.icon;

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

      {/* 基本信息 */}
      <PageCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: Colors.gray800 }}>{device.name}</h2>
            <span style={{ color: Colors.gray500, fontSize: 13 }}>{device.code}</span>
          </div>
          {statusCfg && (
            <Tag
              color={statusCfg.color}
              style={{ borderRadius: 4, border: 'none', padding: '4px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {StatusIcon && <StatusIcon />}
              {statusCfg.label}
            </Tag>
          )}
        </div>

        <Row gutter={32} style={{ marginBottom: 20 }}>
          <Col span={8} style={{ textAlign: 'center' }}>
            <Progress type="dashboard" percent={device.healthScore || 0} size={100}
              strokeColor={device.healthScore >= 80 ? Colors.successLight : device.healthScore >= 60 ? Colors.warningLight : Colors.dangerLight}
              trailColor={Colors.gray100}
            />
            <div style={{ marginTop: 6, fontSize: 13, color: Colors.gray500 }}>健康度评分</div>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: (device.oee || 0) >= 85 ? Colors.successLight : Colors.warningLight }}>
              {device.oee || '-'}%
            </div>
            <div style={{ color: Colors.gray500, fontSize: 13 }}>OEE</div>
          </Col>
          <Col span={8} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: Colors.gray800 }}>{device.mtbf || '-'}h</div>
            <div style={{ color: Colors.gray500, fontSize: 13 }}>MTBF</div>
          </Col>
        </Row>

        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="设备类型">{device.type}</Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={device.priority === 'A' ? Colors.dangerLight : device.priority === 'B' ? Colors.info : Colors.gray400} style={{ borderRadius: 4, border: 'none' }}>
              {device.priority}类
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="区域/产线">{device.area} / {device.line}</Descriptions.Item>
          <Descriptions.Item label="MTTR">{device.mttr || '-'}h</Descriptions.Item>
        </Descriptions>
      </PageCard>

      {/* 近期工单 */}
      <PageCard icon={<InfoCircleOutlined />} title="近期工单" style={{ marginTop: 16 }}>
        <Table
          dataSource={device.workOrders || []}
          columns={woColumns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
          style={{ marginTop: 8 }}
        />
      </PageCard>
    </div>
  );
}
