import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Table, Spin, Button, Timeline, Progress, Row, Col } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../services/api';

const statusColor: Record<string, string> = {
  running: '#22C55E', idle: '#9CA3AF', changeover: '#F59E0B',
  fault: '#EF4444', maintenance: '#3B82F6', repair: '#F97316', retired: '#6B7280',
};

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
  if (!device) return <div>设备未找到</div>;

  const woColumns = [
    { title: '工单号', dataIndex: 'code', key: 'code' },
    { title: '类型', dataIndex: 'faultType', key: 'faultType' },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: string) => {
        const colors: Record<string, string> = { P0: 'red', P1: 'orange', P2: 'gold', P3: 'default' };
        return <Tag color={colors[p] || 'default'}>{p}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        const labels: Record<string, string> = { pending: '待接单', accepted: '已接单', diagnosing: '诊断中', repairing: '维修中', completed: '已完成' };
        return <Tag>{labels[s] || s}</Tag>;
      },
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString() },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/devices')} style={{ marginBottom: 16 }}>
        返回设备列表
      </Button>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>{device.name}</h2>
            <span style={{ color: '#999' }}>{device.code}</span>
          </div>
          <Tag color={statusColor[device.status]} style={{ padding: '4px 16px', fontSize: 14 }}>
            {device.status}
          </Tag>
        </div>

        <Row gutter={24}>
          <Col span={8}>
            <Progress type="dashboard" percent={device.healthScore || 0} size={120}
              strokeColor={device.healthScore >= 80 ? '#22C55E' : device.healthScore >= 60 ? '#F59E0B' : '#EF4444'} />
            <div style={{ textAlign: 'center', marginTop: 8 }}>健康度评分</div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: (device.oee || 0) >= 85 ? '#22C55E' : '#F59E0B' }}>{device.oee || '-'}%</div>
              <div style={{ color: '#999' }}>OEE</div>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700 }}>{device.mtbf || '-'}h</div>
              <div style={{ color: '#999' }}>MTBF</div>
            </div>
          </Col>
        </Row>

        <Descriptions column={2} style={{ marginTop: 24 }} bordered size="small">
          <Descriptions.Item label="设备类型">{device.type}</Descriptions.Item>
          <Descriptions.Item label="优先级">
            <Tag color={device.priority === 'A' ? 'red' : device.priority === 'B' ? 'blue' : 'default'}>{device.priority}类</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="区域/产线">{device.area} / {device.line}</Descriptions.Item>
          <Descriptions.Item label="MTTR">{device.mttr || '-'}h</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="近期工单" style={{ marginTop: 16 }}>
        <Table dataSource={device.workOrders || []} columns={woColumns} rowKey="id" pagination={{ pageSize: 5 }} size="small" />
      </Card>
    </div>
  );
}
