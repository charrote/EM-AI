import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Tag, Button, Segmented, Spin, Empty, Space } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, WorkOrderStatusLabels, WorkOrderStatusColors, PriorityColors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

export default function WorkOrderList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/work-orders?limit=200'),
      api.get(`/work-orders?status=${tab}&limit=50`),
    ]).then(([allRes, filteredRes]) => {
      setAllOrders(allRes.data.data || []);
      setOrders(filteredRes.data.data || []);
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

  const counts = {
    pending: allOrders.filter(o => o.status === 'pending').length,
    accepted: allOrders.filter(o => ['accepted', 'diagnosing', 'repairing', 'verifying'].includes(o.status)).length,
    completed: allOrders.filter(o => o.status === 'completed').length,
  };

  const filteredOrders = orders;

  return (
    <div>
      <Segmented
        value={tab}
        onChange={(v) => setTab(v as string)}
        options={[
          { value: 'pending', label: `待接单 (${counts.pending})` },
          { value: 'accepted', label: `处理中 (${counts.accepted})` },
          { value: 'completed', label: `已完成 (${counts.completed})` },
        ]}
        style={{ marginBottom: isMobile ? 12 : 16, borderRadius: 6 }}
        size={isMobile ? 'middle' : 'middle'}
      />

      {loading ? <Spin style={{ display: 'block', margin: '40px auto' }} /> :
        !filteredOrders.length ? <Empty description="暂无工单" /> :
        <List
          dataSource={filteredOrders}
          renderItem={(wo: any) => {
            const sla = getSlaStatus(wo);
            return (
              <PageCard
                hoverable
                size="small"
                style={{
                  marginBottom: isMobile ? 6 : 8,
                  cursor: 'pointer',
                  borderLeft: `3px solid ${PriorityColors[wo.priority] || Colors.gray300}`,
                }}
                bodyStyle={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
                onClick={() => navigate(`/work-orders/${wo.id}`)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: isMobile ? 8 : 0,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={isMobile ? 4 : 8} wrap>
                      <strong style={{ fontSize: isMobile ? 13 : 14, color: Colors.gray800 }}>{wo.code}</strong>
                      <Tag
                        color={PriorityColors[wo.priority]}
                        style={{ borderRadius: 4, border: 'none', margin: 0, fontSize: isMobile ? 10 : 11, lineHeight: '18px', padding: '0 8px' }}
                      >
                        {wo.priority}
                      </Tag>
                      <Tag
                        style={{
                          borderRadius: 4,
                          margin: 0,
                          fontSize: isMobile ? 10 : 11,
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
                    <div style={{
                      marginTop: isMobile ? 2 : 4,
                      color: Colors.gray500,
                      fontSize: isMobile ? 12 : 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {wo.device?.name || wo.deviceId} · {wo.faultType || '未分类'}
                      {!isMobile && ` · ${wo.description?.slice(0, 30)}...`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {sla && (
                      <Tag
                        color={sla.color}
                        icon={<ClockCircleOutlined />}
                        style={{ borderRadius: 4, margin: 0, fontSize: isMobile ? 10 : 11, lineHeight: '18px', padding: '0 8px' }}
                      >
                        {isMobile ? sla.text.replace(/^(剩余|超时)/, '') : sla.text}
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
