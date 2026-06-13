import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tag, Button, Segmented, Space, Table, Modal, Descriptions,
  message, Rate, Input, Divider, Timeline, Card,
} from 'antd';
import {
  CheckCircleOutlined, ToolOutlined, BookOutlined,
  RightOutlined, DownOutlined, NodeIndexOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import { Colors, WorkOrderStatusLabels, WorkOrderStatusColors, PriorityColors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useStore } from '../store/useStore';

export default function WorkOrderList() {
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { knowledgeMiningEnabled, setKnowledgeMiningWorkOrder, setKnowledgeMiningModalOpen } = useStore();

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

  const flowSteps = [
    { title: '接单', key: 'accepted' as const },
    { title: '处理', key: 'diagnosing' as const },
    { title: '审核', key: 'verifying' as const },
    { title: '完成', key: 'completed' as const },
  ];
  const getStepIndex = (status: string) => {
    if (['accepted', 'diagnosing', 'repairing'].includes(status)) return 1;
    if (status === 'verifying') return 2;
    if (status === 'completed') return 3;
    return 0;
  };
  const currentStep = detailWo ? getStepIndex(detailWo.status) : -1;

  const nextAction = detailWo ? (() => {
    switch (detailWo.status) {
      case 'pending': return { label: '接单', action: () => handleStatus('accepted'), icon: <CheckCircleOutlined /> };
      case 'accepted': return { label: '开始诊断', action: () => handleStatus('diagnosing'), icon: <ToolOutlined /> };
      case 'diagnosing': return { label: '开始维修', action: () => handleStatus('repairing'), icon: <ToolOutlined /> };
      case 'repairing': return { label: '提交审核', action: () => handleStatus('verifying'), icon: <CheckCircleOutlined /> };
      case 'verifying': return { label: '确认完成', action: () => setCompleteModal(true), icon: <CheckCircleOutlined /> };
      default: return null;
    }
  })() : null;

  const columns: ColumnsType<any> = [
    {
      title: '编码', dataIndex: 'code', key: 'code', width: isMobile ? 140 : 140,
      render: (v: string, record: any) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 0' }}>
          <a onClick={() => openDetail(record.id)} style={{ fontWeight: 600, fontSize: isMobile ? 16 : 14 }}>{v}</a>
          <span style={{ color: Colors.gray500, fontSize: isMobile ? 14 : 12 }}>{record.device?.name || record.deviceId} · {record.faultType || '未分类'}</span>
        </div>
      ),
    },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: isMobile ? 80 : 80,
      render: (v: string) => <Tag color={PriorityColors[v]} style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 15 : 12, padding: '2px 10px' }}>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: isMobile ? 80 : 80,
      render: (v: string) => (
        <Tag style={{ borderRadius: 4, fontSize: isMobile ? 15 : 12, padding: '2px 10px', background: `${WorkOrderStatusColors[v]}15`, color: WorkOrderStatusColors[v], border: `1px solid ${WorkOrderStatusColors[v]}40` }}>
          {WorkOrderStatusLabels[v] || v}
        </Tag>
      ),
    },
    ...(isMobile ? [] : [
      {
        title: '设备', dataIndex: 'device', key: 'device', width: 120,
        render: (device: any) => device?.name || '-',
      },
      {
        title: '故障类型', dataIndex: 'faultType', key: 'faultType', width: 100,
        render: (v: string) => v || '-',
      },
      {
        title: '接单人', dataIndex: 'assigneeId', key: 'assigneeId', width: 80,
        render: (v: string) => v ? <Tag style={{ borderRadius: 4, border: 'none', margin: 0 }}>{v}</Tag> : '-',
      },
      {
        title: '处理人', dataIndex: 'handlerId', key: 'handlerId', width: 80,
        render: (v: string) => v ? <Tag style={{ borderRadius: 4, border: 'none', margin: 0 }}>{v}</Tag> : '-',
      },
      {
        title: '审核人', dataIndex: 'reviewerId', key: 'reviewerId', width: 80,
        render: (v: string) => v ? <Tag style={{ borderRadius: 4, border: 'none', margin: 0 }}>{v}</Tag> : '-',
      },
      {
        title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 168,
        render: (v: string) => v ? new Date(v).toLocaleString() : '-',
      },
    ] as ColumnsType<any>),
    ...(tab === 'completed' && knowledgeMiningEnabled ? [
      {
        title: '操作',
        key: 'action',
        width: 100,
        render: (_: any, record: any) => (
          <Button
            size="small"
            icon={<NodeIndexOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              setKnowledgeMiningWorkOrder(record);
              setKnowledgeMiningModalOpen(true);
            }}
            style={{
              borderRadius: 6,
              background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
              border: 'none',
              color: '#fff',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            知识沉淀
          </Button>
        ),
      },
    ] as ColumnsType<any> : []),
  ];

  const statusFilterMap: Record<string, string> = {
    pending: 'pending',
    accepted: 'accepted,diagnosing,repairing',
    verifying: 'verifying',
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
    accepted: allOrders.filter(o => ['accepted', 'diagnosing', 'repairing'].includes(o.status)).length,
    verifying: allOrders.filter(o => o.status === 'verifying').length,
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
          { value: 'verifying', label: `待审核 (${counts.verifying})` },
          { value: 'completed', label: `已完成 (${counts.completed})` },
        ]}
        style={{ marginBottom: isMobile ? 12 : 16, borderRadius: 6 }}
        size={isMobile ? 'small' : 'middle'}
      />

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="id"
          loading={loading}
          size={isMobile ? 'middle' : 'small'}
          scroll={{ x: isMobile ? 400 : 'max-content' }}
          pagination={{
            showTotal: t => `共 ${t} 条工单`,
            showSizeChanger: !isMobile,
            pageSizeOptions: ['10', '20', '50'],
            pageSize: isMobile ? 50 : 20,
            simple: isMobile,
          }}
          onRow={(record) => ({
            onClick: () => openDetail(record.id),
            style: { cursor: 'pointer' },
          })}
          locale={{ emptyText: '暂无工单数据' }}
        />
      </Card>

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

            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row' as any,
              alignItems: isMobile ? 'stretch' : 'center',
              marginBottom: isMobile ? 12 : 16,
            }}>
              {flowSteps.map((step, idx) => {
                let user = '';
                let time = '';
                if (step.key === 'accepted') { user = detailWo.assigneeId; time = detailWo.respondedAt; }
                if (step.key === 'diagnosing') { user = detailWo.handlerId; time = detailWo.actualStartAt; }
                if (step.key === 'verifying') { user = detailWo.reviewerId; time = detailWo.verifiedAt; }
                if (step.key === 'completed') { user = detailWo.completedBy; time = detailWo.actualEndAt; }
                const hasData = !!(user || time);
                const isDone = idx < currentStep;
                const isCurrent = idx === currentStep;
                const borderColor = isDone ? Colors.success : isCurrent ? Colors.primary : Colors.gray300;
                const bgColor = isDone ? '#F0FFF4' : isCurrent ? '#EFF6FF' : Colors.gray50;
                const titleColor = isDone ? Colors.success : isCurrent ? Colors.primary : Colors.gray400;
                return (
                  <div key={step.key} style={{
                    flex: isMobile ? 'none' : 1,
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row' as any,
                    alignItems: 'center',
                    width: isMobile ? '100%' : 'auto',
                  }}>
                    <div style={{
                      flex: 1,
                      width: '100%',
                      height: 78,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      border: `2px solid ${borderColor}`,
                      borderRadius: 8,
                      padding: '10px 14px',
                      background: bgColor,
                      textAlign: 'center',
                    }}>
                      <div style={{ fontWeight: 600, color: titleColor, fontSize: 14, marginBottom: hasData ? 4 : 0 }}>
                        {step.title}
                      </div>
                      {hasData && (
                        <div style={{ fontSize: 12, color: Colors.gray500, lineHeight: 1.5 }}>
                          <div>{user || '-'}</div>
                          <div>{time ? new Date(time).toLocaleString() : '-'}</div>
                        </div>
                      )}
                      {!hasData && !isDone && !isCurrent && (
                        <div style={{ fontSize: 12, color: Colors.gray400, lineHeight: 1.5 }}>等待中</div>
                      )}
                    </div>
                    {idx < flowSteps.length - 1 && (
                      <div style={{
                        color: Colors.gray400,
                        fontSize: 16,
                        padding: isMobile ? '4px 0' : '0 6px',
                        lineHeight: 1,
                        flexShrink: 0,
                      }}>
                        {isMobile ? <DownOutlined /> : <RightOutlined />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

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
