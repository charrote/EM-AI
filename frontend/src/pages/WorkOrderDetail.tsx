import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Descriptions, Tag, Button, Steps, Timeline, List, Spin, message,
  Modal, Input, Rate, Space, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, ToolOutlined,
  RobotOutlined, BookOutlined, FileTextOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, WorkOrderStatusLabels, PriorityColors } from '../styles/theme';

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [completeData, setCompleteData] = useState({ rootCause: '', resolution: '', satisfactionScore: 5 });

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

  const statusSteps = ['pending', 'accepted', 'diagnosing', 'repairing', 'verifying', 'completed'];
  const currentStep = statusSteps.indexOf(wo.status);

  const nextAction = () => {
    switch (wo.status) {
      case 'pending': return { label: '接单', action: () => handleStatus('accepted'), icon: <CheckCircleOutlined /> };
      case 'accepted': return { label: '开始诊断', action: () => handleStatus('diagnosing'), icon: <ToolOutlined /> };
      case 'diagnosing': return { label: '开始维修', action: () => handleStatus('repairing'), icon: <ToolOutlined /> };
      case 'repairing': return { label: '维修完成', action: () => setCompleteModal(true), icon: <CheckCircleOutlined /> };
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
        style={{ marginBottom: 16, color: Colors.gray600 }}
      >
        返回工单列表
      </Button>

      <PageCard>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: Colors.gray800 }}>{wo.code}</h2>
            <span style={{ color: Colors.gray500, fontSize: 13 }}>{wo.device?.name} · {wo.deviceId}</span>
          </div>
          <Space>
            <Tag
              color={PriorityColors[wo.priority]}
              style={{ borderRadius: 4, border: 'none', padding: '2px 12px' }}
            >
              {wo.priority}
            </Tag>
            <Tag style={{ borderRadius: 4, padding: '2px 12px' }}>
              {WorkOrderStatusLabels[wo.status]}
            </Tag>
          </Space>
        </div>

        {/* Steps */}
        <Steps current={currentStep} size="small" style={{ marginBottom: 20 }}>
          {statusSteps.map((s) => (
            <Steps.Step key={s} title={WorkOrderStatusLabels[s]} />
          ))}
        </Steps>

        {/* Details */}
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="故障类型">{wo.faultType || '-'}</Descriptions.Item>
          <Descriptions.Item label="来源">{wo.source}</Descriptions.Item>
          <Descriptions.Item label="故障描述" span={2}>{wo.description || '-'}</Descriptions.Item>
          {wo.rootCause && <Descriptions.Item label="根本原因" span={2}>{wo.rootCause}</Descriptions.Item>}
          {wo.resolution && <Descriptions.Item label="解决方案" span={2}>{wo.resolution}</Descriptions.Item>}
          {wo.slaDeadline && (
            <Descriptions.Item label="SLA 截止" span={2}>
              <Tag color={new Date(wo.slaDeadline) > new Date() ? Colors.successLight : Colors.dangerLight} style={{ borderRadius: 4, border: 'none' }}>
                {new Date(wo.slaDeadline).toLocaleString()}
              </Tag>
            </Descriptions.Item>
          )}
        </Descriptions>

        {/* Actions */}
        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {action && (
            <Button type="primary" icon={action.icon} size="large" onClick={action.action} style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}>
              {action.label}
            </Button>
          )}
          <Button icon={<RobotOutlined />} onClick={loadDiagnosis} style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            AI 诊断
          </Button>
          {wo.status === 'completed' && (
            <Button icon={<BookOutlined />} onClick={() => navigate('/knowledge')} style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}>
              查看知识库
            </Button>
          )}
        </div>
      </PageCard>

      {/* AI Diagnosis Modal */}
      <Modal
        title={<Space><RobotOutlined style={{ color: Colors.primary }} /><span>AI 辅助诊断</span></Space>}
        open={showDiagnosis}
        onCancel={() => setShowDiagnosis(false)}
        width={700}
        footer={null}
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
                      <Space>
                        <Tag color={Colors.primary} style={{ borderRadius: 4, border: 'none' }}>{item.id}</Tag>
                        <span>相似度：{Math.round(item.similarity * 100)}%</span>
                      </Space>
                    }
                    description={
                      <div style={{ fontSize: 13, color: Colors.gray600 }}>
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
                  <Space>
                    <strong>{d.step}</strong>
                    <span style={{ color: Colors.gray500 }}>概率 {Math.round(d.probability * 100)}%</span>
                    <Tag color={d.priority === 'high' ? Colors.dangerLight : Colors.info} style={{ borderRadius: 4, border: 'none' }}>
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

      {/* Complete Modal */}
      <Modal
        title="维修完成确认"
        open={completeModal}
        onOk={handleComplete}
        onCancel={() => setCompleteModal(false)}
        okText="确认完成"
        okButtonProps={{ style: { borderRadius: 6 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: 13 }}>根本原因</div>
          <Input.TextArea
            rows={2}
            value={completeData.rootCause}
            onChange={(e) => setCompleteData({ ...completeData, rootCause: e.target.value })}
            placeholder="输入故障的根本原因"
            style={{ borderRadius: 6 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: 13 }}>解决方案</div>
          <Input.TextArea
            rows={2}
            value={completeData.resolution}
            onChange={(e) => setCompleteData({ ...completeData, resolution: e.target.value })}
            placeholder="输入解决方法和维修步骤"
            style={{ borderRadius: 6 }}
          />
        </div>
        <div>
          <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: 13 }}>满意度评分</div>
          <Rate value={completeData.satisfactionScore} onChange={(v) => setCompleteData({ ...completeData, satisfactionScore: v })} />
        </div>
      </Modal>

      {/* Work Logs */}
      {wo.workLogs?.length > 0 && (
        <PageCard icon={<FileTextOutlined />} title="维修记录" style={{ marginTop: 16 }}>
          <Timeline
            items={wo.workLogs.map((log: any) => ({
              children: (
                <Space>
                  <strong>步骤 {log.step}：</strong>
                  <span>{log.content}</span>
                  {log.duration && <Tag style={{ borderRadius: 4 }}>{log.duration}min</Tag>}
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
