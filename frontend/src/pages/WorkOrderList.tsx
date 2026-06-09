import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Tag, Button, Segmented, Badge, Spin, Empty, Space, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const statusLabels: Record<string, string> = {
  pending: '待接单', accepted: '已接单', diagnosing: '诊断中',
  repairing: '维修中', verifying: '验证中', completed: '已完成', cancelled: '已取消',
};

const statusColors: Record<string, string> = {
  pending: 'red', accepted: 'orange', diagnosing: 'blue',
  repairing: 'geekblue', verifying: 'cyan', completed: 'green', cancelled: 'default',
};

const priorityColors: Record<string, string> = { P0: 'red', P1: 'orange', P2: 'gold', P3: 'default' };

export default function WorkOrderList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    api.get(`/work-orders?status=${tab}&limit=50`).then((res) => {
      setOrders(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tab]);

  const getSlaStatus = (wo: any) => {
    if (!wo.slaDeadline || wo.status === 'completed') return null;
    const remaining = new Date(wo.slaDeadline).getTime() - Date.now();
    const minutes = Math.floor(remaining / 60000);
    if (minutes < 0) return { color: 'red', text: `超时 ${Math.abs(minutes)}min` };
    if (minutes < 30) return { color: 'orange', text: `剩余 ${minutes}min` };
    return { color: 'green', text: `${Math.floor(minutes / 60)}h${minutes % 60}min` };
  };

  return (
    <div>
      <Segmented
        value={tab}
        onChange={(v) => setTab(v as string)}
        options={[
          { value: 'pending', label: `待接单 ${orders.filter(o => o.status === 'pending').length}` },
          { value: 'accepted', label: '处理中' },
          { value: 'completed', label: '已完成' },
        ]}
        style={{ marginBottom: 16 }}
      />

      {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> :
        !orders.length ? <Empty description="暂无工单" /> :
        <List
          dataSource={orders}
          renderItem={(wo: any) => {
            const sla = getSlaStatus(wo);
            return (
              <Card
                hoverable
                size="small"
                style={{ marginBottom: 8, borderLeft: `4px solid ${priorityColors[wo.priority] || '#d9d9d9'}` }}
                onClick={() => navigate(`/work-orders/${wo.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Space>
                      <strong>{wo.code}</strong>
                      <Tag color={priorityColors[wo.priority]}>{wo.priority}</Tag>
                      <Tag color={statusColors[wo.status]}>{statusLabels[wo.status] || wo.status}</Tag>
                    </Space>
                    <div style={{ marginTop: 4, color: '#666' }}>
                      {wo.device?.name || wo.deviceId} · {wo.faultType || '未分类'} · {wo.description?.slice(0, 30)}...
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {sla && (
                      <Tag color={sla.color} icon={<ClockCircleOutlined />}>{sla.text}</Tag>
                    )}
                  </div>
                </div>
              </Card>
            );
          }}
        />
      }
    </div>
  );
}
