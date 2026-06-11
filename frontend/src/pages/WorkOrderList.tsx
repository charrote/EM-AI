import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  List, Tag, Button, Segmented, Spin, Empty, Space, Table, Modal, Descriptions,
  Steps, message, Tooltip, Rate, Input, Divider, Timeline,
} from 'antd';
import {
  ClockCircleOutlined, CheckCircleOutlined, ToolOutlined, RobotOutlined, BookOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
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

  // Detail modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailWo, setDetailWo] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [completeData, setCompleteData] = useState({ rootCause: '', resolution: '', satisfactionScore: 5 });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchList = useCallback(() => {
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

  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/work-orders/${id}`);
      setDetailWo(res.data.data);
    } catch {
      message.error('加载工单详情失败');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleStatus = useCallback(async (status: string) => {
    if (!detailWo) return;
    try {
      await api.put(`/work-orders/${detailWo.id}/status`, { status });
      message.success(`状态已更新：${WorkOrderStatusLabels[status]}`);
      fetchDetail(detailWo.id);
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  }, [detailWo, fetchDetail]);

  const handleComplete = useCallback(async () => {
    if (!detailWo) return;
    try {
      await api.post(`/work-orders/${detailWo.id}/complete`, completeData);
      message.success('工单已完成');
      setCompleteModal(false);
      setCompleteData({ rootCause: '', resolution: '', satisfactionScore: 5 });
      fetchDetail(detailWo.id);
      setRefreshKey(k => k + 1);
    } catch {
      message.error('提交失败');
    }
  }, [detailWo, completeData, fetchDetail]);

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailWo(null);
    setRefreshKey(k => k + 1);
  };

  const openDetail = (id: string) => {
    fetchDetail(id);
    setDetailOpen(true);
  };

  const statusSteps = ['pending', 'accepted', 'diagnosing', 'repairing', 'verifying', 'completed'];
  const currentStep = detailWo ? statusSteps.indexOf(detailWo.status) : -1;

  const nextAction = detailWo ? (() => {
    switch (detailWo.status) {
      case 'pending': return { label: '接单', action: () => handleStatus('accepted'), icon: <CheckCircleOutlined /> };
      case 'accepted': return { label: '开始诊断', action: () => handleStatus('diagnosing'), icon: <ToolOutlined /> };
      case 'diagnosing': return { label: '开始维修', action: () => handleStatus('repairing'), icon: <ToolOutlined /> };
      case 'repairing': return { label: '维修完成', action: () => setCompleteModal(true), icon: <CheckCircleOutlined /> };
      default: return null;
    }
  })() : null;

  const columns: ColumnsType<any> = [
    {
      title: '编码', dataIndex: 'code', key: 'code', width: 140,
      render: (v: string, record: any) => <a onClick={() => openDetail(record.id)} style={{ fontWeight: 500 }}>{v}</a>,
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
    fetchList();
  }, [fetchList, refreshKey]);

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
                  onClick={() => openDetail(wo.id)}
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
            scroll={{ x: 'max-content' }}
            pagination={{
              showTotal: t => `共 ${t} 条工单`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              pageSize: 20,
            }}
            onRow={(record) => ({
              onClick: () => openDetail(record.id),
              style: { cursor: 'pointer' },
            })}
            locale={{ emptyText: '暂无工单数据' }}
          />
        )
      }

      {/* Detail Modal */}
      <Modal
        title={detailWo ? `${detailWo.code} - 工单详情` : '工单详情'}
        open={detailOpen}
        onCancel={closeDetail}
        footer={null}
        width={isMobile ? '100%' : 720}
        destroyOnClose
        loading={detailLoading}
      >
        {detailWo && !detailLoading && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 13, color: Colors.gray500 }}>{detailWo.device?.name} · {detailWo.deviceId}</span>
              </div>
              <Space size={4}>
                <Tag color={PriorityColors[detailWo.priority]} style={{ borderRadius: 4, border: 'none' }}>
                  {detailWo.priority}
                </Tag>
                <Tag style={{ borderRadius: 4 }}>
                  {WorkOrderStatusLabels[detailWo.status]}
                </Tag>
              </Space>
            </div>

            <Steps current={currentStep >= 0 ? currentStep : 0} size="small" style={{ marginBottom: 16 }}
              labelPlacement={isMobile ? 'vertical' : 'horizontal'}>
              {statusSteps.map((s) => (
                <Steps.Step key={s} title={WorkOrderStatusLabels[s]} />
              ))}
            </Steps>

            <Descriptions column={isMobile ? 1 : 2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="故障类型">{detailWo.faultType || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源">{detailWo.source || '-'}</Descriptions.Item>
              <Descriptions.Item label="故障描述" span={isMobile ? 1 : 2}>{detailWo.description || '-'}</Descriptions.Item>
              {detailWo.rootCause && (
                <Descriptions.Item label="根本原因" span={isMobile ? 1 : 2}>
                  <span style={{ color: Colors.danger, fontWeight: 500 }}>{detailWo.rootCause}</span>
                </Descriptions.Item>
              )}
              {detailWo.resolution && (
                <Descriptions.Item label="解决方案" span={isMobile ? 1 : 2}>
                  <span style={{ color: Colors.success, fontWeight: 500 }}>{detailWo.resolution}</span>
                </Descriptions.Item>
              )}
              {detailWo.slaDeadline && (
                <Descriptions.Item label="SLA 截止" span={isMobile ? 1 : 2}>
                  <Tag color={new Date(detailWo.slaDeadline) > new Date() ? Colors.successLight : Colors.dangerLight}
                    style={{ borderRadius: 4, border: 'none' }}>
                    {new Date(detailWo.slaDeadline).toLocaleString()}
                  </Tag>
                </Descriptions.Item>
              )}
              {detailWo.actualEndAt && (
                <Descriptions.Item label="完成时间">{new Date(detailWo.actualEndAt).toLocaleString()}</Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {nextAction && (
                <Button type="primary" icon={nextAction.icon} onClick={nextAction.action}
                  style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                  {nextAction.label}
                </Button>
              )}
              {detailWo.status === 'completed' && (
                <Button icon={<BookOutlined />} onClick={() => navigate('/knowledge')}
                  style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                  查看知识库
                </Button>
              )}
            </div>

            {detailWo.workLogs?.length > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: Colors.gray700 }}>维修记录</span>
                <Timeline style={{ marginTop: 8 }}
                  items={detailWo.workLogs.map((log: any) => ({
                    children: (
                      <Space size={4}>
                        <strong>步骤 {log.step}：</strong>
                        <span>{log.content}</span>
                        {log.duration && <Tag style={{ borderRadius: 4 }}>{log.duration}min</Tag>}
                      </Space>
                    ),
                    color: Colors.info,
                  }))}
                />
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Complete Modal */}
      <Modal
        title="维修完成确认"
        open={completeModal}
        onOk={handleComplete}
        onCancel={() => setCompleteModal(false)}
        okText="确认完成"
        okButtonProps={{ style: { borderRadius: 6 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        width={isMobile ? '100%' : 480}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, color: Colors.gray700 }}>根本原因</div>
          <Input.TextArea rows={2} value={completeData.rootCause}
            onChange={(e) => setCompleteData({ ...completeData, rootCause: e.target.value })}
            placeholder="输入故障的根本原因" style={{ borderRadius: 6 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, color: Colors.gray700 }}>解决方案</div>
          <Input.TextArea rows={2} value={completeData.resolution}
            onChange={(e) => setCompleteData({ ...completeData, resolution: e.target.value })}
            placeholder="输入解决方法和维修步骤" style={{ borderRadius: 6 }} />
        </div>
        <div>
          <div style={{ marginBottom: 4, color: Colors.gray700 }}>满意度评分</div>
          <Rate value={completeData.satisfactionScore} onChange={(v) => setCompleteData({ ...completeData, satisfactionScore: v })} />
        </div>
      </Modal>

      {/* Refetch when tab changes and modal closes */}
      {detailOpen === false && detailWo === null && (() => { return null; })()}
    </div>
  );
}
