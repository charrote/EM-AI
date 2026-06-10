import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Tag, Button, Segmented, Spin, Empty, Space, Table } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
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

  const columns: ColumnsType<any> = [
    {
      title: '编码', dataIndex: 'code', key: 'code', width: 140,
      render: (v: string, record: any) => <a onClick={() => navigate(`/work-orders/${record.id}`)} style={{ fontWeight: 500 }}>{v}</a>,
    },
    {
      title: '设备', dataIndex: 'device', key: 'device', width: 120,
      render: (device: any) => device?.name || '-',
    },
    {
      title: '故障类型', dataIndex: 'faultType', key: 'faultType', width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (v: string) => <Tag color={PriorityColors[v]} style={{ borderRadius: 4, border: 'none' }}>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => (
        <Tag style={{ borderRadius: 4, background: `${WorkOrderStatusColors[v]}15`, color: WorkOrderStatusColors[v], border: `1px solid ${WorkOrderStatusColors[v]}40` }}>
          {WorkOrderStatusLabels[v] || v}
        </Tag>
      ),
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 140,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
  ];

  const statusFilterMap: Record<string, string> = {
    pending: 'pending',
    accepted: 'accepted,diagnosing,repairing,verifying',
    completed: 'completed',
  };

  useEffect(() => {
    setLoading(true);
    const statusFilter = statusFilterMap[tab] || tab;
    Promise.all([
      api.get('/work-orders?limit=200'),
      api.get(`/work-orders?status=${statusFilter}&limit=50`),
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
        isMobile ? (
          <List
            dataSource={filteredOrders}
            renderItem={(wo: any) => {
              const sla = getSlaStatus(wo);
              return (
                <PageCard
                  hoverable
                  size="small"
                  style={{
                    marginBottom: 6,
                    cursor: 'pointer',
                    borderLeft: `3px solid ${PriorityColors[wo.priority] || Colors.gray300}`,
                  }}
                  bodyStyle={{ padding: '10px 12px' }}
                  onClick={() => navigate(`/work-orders/${wo.id}`)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Space size={4} wrap>
                        <strong style={{ fontSize: 13, color: Colors.gray800 }}>{wo.code}</strong>
                        <Tag color={PriorityColors[wo.priority]} style={{ borderRadius: 4, border: 'none', margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 8px' }}>
                          {wo.priority}
                        </Tag>
                        <Tag style={{ borderRadius: 4, margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 8px', background: `${WorkOrderStatusColors[wo.status]}15`, color: WorkOrderStatusColors[wo.status], border: `1px solid ${WorkOrderStatusColors[wo.status]}40` }}>
                          {WorkOrderStatusLabels[wo.status] || wo.status}
                        </Tag>
                      </Space>
                      <div style={{ marginTop: 2, color: Colors.gray500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {wo.device?.name || wo.deviceId} · {wo.faultType || '未分类'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {sla && (
                        <Tag color={sla.color} icon={<ClockCircleOutlined />} style={{ borderRadius: 4, margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 8px' }}>
                          {sla.text.replace(/^(剩余|超时)/, '')}
                        </Tag>
                      )}
                    </div>
                  </div>
                </PageCard>
              );
            }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredOrders}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 660 }}
            pagination={{
              showTotal: t => `共 ${t} 条工单`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              pageSize: 20,
            }}
            onRow={(record) => ({
              onClick: () => navigate(`/work-orders/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            locale={{ emptyText: '暂无工单数据' }}
          />
        )
      }
    </div>
  );
}
