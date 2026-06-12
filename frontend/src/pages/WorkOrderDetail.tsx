import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions, Tag, Button, Timeline, List, Spin, message,
  Modal, Input, Rate, Space, Divider, Card,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, ToolOutlined,
  RobotOutlined, BookOutlined, FileTextOutlined,
  RightOutlined, DownOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, WorkOrderStatusLabels, PriorityColors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [completeData, setCompleteData] = useState({ rootCause: '', resolution: '', satisfactionScore: 5 });
  const { isMobile } = useResponsive();

  const fetchDetail = () => {
    if (!id) return;
    api.get(`/work-orders/${id}`).then((res) => {
      setWo(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleStatus = async (status: string) => {
    try {
      await api.put(`/work-orders/${id}/status`, { status });
      message.success(`状态已更新：${WorkOrderStatusLabels[status]}`);
      fetchDetail();
    } catch (err: any) {
      message.error(err.response?.data?.error || '操作失败');
    }
  };

  const loadDiagnosis = async () => {
    try {
      const res = await api.get(`/work-orders/${id}/ai-diagnosis`);
      setDiagnosis(res.data.data);
      setShowDiagnosis(true);
    } catch {
      message.error('加载诊断信息失败');
    }
  };

  const handleComplete = async () => {
    try {
      await api.post(`/work-orders/${id}/complete`, completeData);
      message.success('工单已完成，知识条目已自动生成');
      setCompleteModal(false);
      fetchDetail();
    } catch {
      message.error('提交失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!wo) return <div style={{ textAlign: 'center', padding: 40, color: Colors.gray500 }}>工单未找到</div>;

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
  const currentStep = getStepIndex(wo.status);

  const nextAction = () => {
    switch (wo.status) {
      case 'pending': return { label: '接单', action: () => handleStatus('accepted'), icon: <CheckCircleOutlined /> };
      case 'accepted': return { label: '开始诊断', action: () => handleStatus('diagnosing'), icon: <ToolOutlined /> };
      case 'diagnosing': return { label: '开始维修', action: () => handleStatus('repairing'), icon: <ToolOutlined /> };
      case 'repairing': return { label: '提交审核', action: () => handleStatus('verifying'), icon: <CheckCircleOutlined /> };
      case 'verifying': return { label: '确认完成', action: () => setCompleteModal(true), icon: <CheckCircleOutlined /> };
      default: return null;
    }
  };
  const action = nextAction();

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/work-orders')}
        type="text"
        style={{ marginBottom: isMobile ? 8 : 16, color: Colors.gray600, padding: isMobile ? '0 4px' : undefined }}
      >
        返回工单列表
      </Button>

      <PageCard>
        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: isMobile ? 12 : 20,
          gap: isMobile ? 6 : 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 17 : 20, fontWeight: 600, color: Colors.gray800 }}>{wo.code}</h2>
            <span style={{ color: Colors.gray500, fontSize: isMobile ? 12 : 13 }}>{wo.device?.name} · {wo.deviceId}</span>
          </div>
          <Space size={isMobile ? 4 : 8}>
            <Tag
              color={PriorityColors[wo.priority]}
              style={{ borderRadius: 4, border: 'none', padding: '2px 12px', fontSize: isMobile ? 12 : 13 }}
            >
              {wo.priority}
            </Tag>
            <Tag style={{ borderRadius: 4, padding: '2px 12px', fontSize: isMobile ? 12 : 13 }}>
              {WorkOrderStatusLabels[wo.status]}
            </Tag>
          </Space>
        </div>

        {/* 4步流程：接单→处理→审核→完成 */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row' as any,
          alignItems: isMobile ? 'stretch' : 'center',
          marginBottom: isMobile ? 12 : 20,
        }}>
          {flowSteps.map((step, idx) => {
            let user = '';
            let time = '';
            if (step.key === 'accepted') { user = wo.assigneeId; time = wo.respondedAt; }
            if (step.key === 'diagnosing') { user = wo.handlerId; time = wo.actualStartAt; }
            if (step.key === 'verifying') { user = wo.reviewerId; time = wo.verifiedAt; }
            if (step.key === 'completed') { user = wo.completedBy; time = wo.actualEndAt; }
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

        {/* Details — 移动端1列 */}
        <Descriptions column={isMobile ? 1 : 2} bordered size="small">
          <Descriptions.Item label="故障类型">{wo.faultType || '-'}</Descriptions.Item>
          <Descriptions.Item label="来源">{wo.source}</Descriptions.Item>
          <Descriptions.Item label="故障描述" span={isMobile ? 1 : 2}>{wo.description || '-'}</Descriptions.Item>
          {wo.rootCause && <Descriptions.Item label="根本原因" span={isMobile ? 1 : 2}>{wo.rootCause}</Descriptions.Item>}
          {wo.resolution && <Descriptions.Item label="解决方案" span={isMobile ? 1 : 2}>{wo.resolution}</Descriptions.Item>}
          {wo.slaDeadline && (
            <Descriptions.Item label="SLA 截止" span={isMobile ? 1 : 2}>
              <Tag color={new Date(wo.slaDeadline) > new Date() ? Colors.successLight : Colors.dangerLight} style={{ borderRadius: 4, border: 'none' }}>
                {new Date(wo.slaDeadline).toLocaleString()}
              </Tag>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Actions */}
        <div style={{
          marginTop: isMobile ? 12 : 16,
          display: 'flex',
          gap: isMobile ? 6 : 8,
          flexWrap: 'wrap',
        }}>
          {action && (
            <Button type="primary" icon={action.icon} size={isMobile ? 'middle' : 'large'} onClick={action.action}
              style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}>
              {action.label}
            </Button>
          )}
          <Button icon={<RobotOutlined />} onClick={loadDiagnosis}
            style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}
            size={isMobile ? 'middle' : 'middle'}>
            {isMobile ? 'AI诊断' : 'AI 诊断'}
          </Button>
          {wo.status === 'completed' && (
            <Button icon={<BookOutlined />} onClick={() => navigate('/knowledge')}
              style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}
              size={isMobile ? 'middle' : 'middle'}>
              {isMobile ? '知识库' : '查看知识库'}
            </Button>
          )}
        </div>
      </PageCard>

      {/* AI Diagnosis Modal — 移动端全宽 */}
      <Modal
        title={<Space><RobotOutlined style={{ color: Colors.primary }} /><span>AI 辅助诊断</span></Space>}
        open={showDiagnosis}
        onCancel={() => setShowDiagnosis(false)}
        width={isMobile ? '100%' : 700}
        footer={null}
        style={isMobile ? { top: 0, maxWidth: '100%' } : {}}
      >
        {diagnosis ? (
          <>
            <Divider orientation="left" style={{ fontSize: 13, color: Colors.gray500 }}>相似案例</Divider>
            <List
              dataSource={diagnosis.similarCases}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space size={isMobile ? 4 : 8}>
                        <Tag color={Colors.primary} style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 11 : 12 }}>{item.id}</Tag>
                        <span>相似度：{Math.round(item.similarity * 100)}%</span>
                      </Space>
                    }
                    description={
                      <div style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray600 }}>
                        <div><strong>现象：</strong>{item.symptom}</div>
                        <div><strong>原因：</strong>{item.cause}</div>
                        <div><strong>方案：</strong>{item.solution}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />

            <Divider orientation="left" style={{ fontSize: 13, color: Colors.gray500 }}>推荐诊断方案</Divider>
            <Timeline
              items={diagnosis.recommendedDiagnosis.map((d: any) => ({
                children: (
                  <Space size={isMobile ? 4 : 8}>
                    <strong>{d.step}</strong>
                    <span style={{ color: Colors.gray500, fontSize: isMobile ? 12 : 13 }}>概率 {Math.round(d.probability * 100)}%</span>
                    <Tag color={d.priority === 'high' ? Colors.dangerLight : Colors.info} style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 10 : 12 }}>
                      {d.priority}
                    </Tag>
                  </Space>
                ),
                color: d.priority === 'high' ? Colors.dangerLight : Colors.info,
              }))}
            />

            <Divider orientation="left" style={{ fontSize: 13, color: Colors.gray500 }}>推荐备件</Divider>
            <List
              dataSource={diagnosis.recommendedParts}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.name} (${item.code})`}
                    description={`需 ${item.quantity} 件 · 库存 ${item.stock} 件`}
                  />
                </List.Item>
              )}
            />
          </>
        ) : <Spin />}
      </Modal>

      {/* Complete Modal — 移动端全宽 */}
      <Modal
        title="维修完成确认"
        open={completeModal}
        onOk={handleComplete}
        onCancel={() => setCompleteModal(false)}
        okText="确认完成"
        okButtonProps={{ style: { borderRadius: 6 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        width={isMobile ? '100%' : undefined}
        style={isMobile ? { top: 0, maxWidth: '100%' } : {}}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: isMobile ? 13 : 13 }}>根本原因</div>
          <Input.TextArea
            rows={2}
            value={completeData.rootCause}
            onChange={(e) => setCompleteData({ ...completeData, rootCause: e.target.value })}
            placeholder="输入故障的根本原因"
            style={{ borderRadius: 6 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: isMobile ? 13 : 13 }}>解决方案</div>
          <Input.TextArea
            rows={2}
            value={completeData.resolution}
            onChange={(e) => setCompleteData({ ...completeData, resolution: e.target.value })}
            placeholder="输入解决方法和维修步骤"
            style={{ borderRadius: 6 }}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: isMobile ? 13 : 13 }}>满意度评分</div>
          <Rate value={completeData.satisfactionScore} onChange={(v) => setCompleteData({ ...completeData, satisfactionScore: v })} />
        </div>
      </Modal>

      {/* Work Logs */}
      {wo.workLogs?.length > 0 && (
        <PageCard icon={<FileTextOutlined />} title="维修记录" style={{ marginTop: isMobile ? 8 : 16 }}>
          <Timeline
            items={wo.workLogs.map((log: any) => ({
              children: (
                <Space size={isMobile ? 4 : 8}>
                  <strong style={{ fontSize: isMobile ? 12 : 13 }}>步骤 {log.step}：</strong>
                  <span style={{ fontSize: isMobile ? 12 : 13 }}>{log.content}</span>
                  {log.duration && <Tag style={{ borderRadius: 4, fontSize: isMobile ? 10 : 12 }}>{log.duration}min</Tag>}
                </Space>
              ),
              color: Colors.info,
            }))}
          />
        </PageCard>
      )}
    </div>
  );
}
