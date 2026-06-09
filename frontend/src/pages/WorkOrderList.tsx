import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Tag, Button, Segmented, Spin, Empty, Space } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, WorkOrderStatusLabels, WorkOrderStatusColors, PriorityColors } from '../styles/theme';

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
    if (minutes < 0) return { color: Colors.dangerLight, text: `超时 ${Math.abs(minutes)}min` };
    if (minutes < 30) return { color: Colors.warningLight, text: `剩余 ${minutes}min` };
    return { color: Colors.successLight, text: `${Math.floor(minutes / 60)}h${minutes % 60}min` };
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div>
      <Segmented
        value={tab}
        onChange={(v) => setTab(v as string)}
        options={[
          { value: 'pending', label: `待接单 (${pendingCount})` },
          { value: 'accepted', label: '处理中' },
          { value: 'completed', label: '已完成' },
        ]}
        style={{ marginBottom: 16, borderRadius: 6 }}
      />

      {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> :
        !orders.length ? <Empty description="暂无工单" /> :
        <List
          dataSource={orders}
          renderItem={(wo: any) => {
            const sla = getSlaStatus(wo);
            return (
              <PageCard
                hoverable
                size="small"
                style={{
                  marginBottom: 8,
                  cursor: 'pointer',
                  borderLeft: `3px solid ${PriorityColors[wo.priority] || Colors.gray300}`,
                }}
                bodyStyle={{ padding: '12px 16px' }}
                onClick={() => navigate(`/work-orders/${wo.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Space>
                      <strong style={{ fontSize: 14, color: Colors.gray800 }}>{wo.code}</strong>
                      <Tag
                        color={PriorityColors[wo.priority]}
                        style={{ borderRadius: 4, border: 'none', margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 8px' }}
                      >
                        {wo.priority}
                      </Tag>
                      <Tag
                        style={{
                          borderRadius: 4,
                          margin: 0,
                          fontSize: 11,
                          lineHeight: '18px',
                          padding: '0 8px',
                          background: `${WorkOrderStatusColors[wo.status]}15`,
                          color: WorkOrderStatusColors[wo.status],
                          border: `1px solid ${WorkOrderStatusColors[wo.status]}40`,
                        }}
                      >
                        {WorkOrderStatusLabels[wo.status] || wo.status}
                      </Tag>
                    </Space>
                    <div style={{ marginTop: 4, color: Colors.gray500, fontSize: 13 }}>
                      {wo.device?.name || wo.deviceId} · {wo.faultType || '未分类'} · {wo.description?.slice(0, 30)}...
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {sla && (
                      <Tag
                        color={sla.color}
                        icon={<ClockCircleOutlined />}
                        style={{ borderRadius: 4, margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 8px' }}
                      >
                        {sla.text}
                      </Tag>
                    )}
                  </div>
                </div>
              </PageCard>
            );
          }}
        />
      }
    </div>
  );
}
