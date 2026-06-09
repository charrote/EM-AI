import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Steps, Timeline, List, Spin, message,
  Modal, Input, Rate, Space, Collapse, Divider, Badge,
} from 'antd';
import {
  ArrowLeftOutlined, CheckCircleOutlined, ToolOutlined,
  RobotOutlined, BookOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const statusLabels: Record<string, string> = {
  pending: '待接单', accepted: '已接单', diagnosing: '诊断中',
  repairing: '维修中', verifying: '验证中', completed: '已完成', cancelled: '已取消',
};

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
      message.success(`状态已更新: ${statusLabels[status]}`);
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
      message.success('工单已完成！知识条目已自动生成');
      setCompleteModal(false);
      fetchDetail();
    } catch {
      message.error('提交失败');
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!wo) return <div>工单未找到</div>;

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
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/work-orders')} style={{ marginBottom: 16 }}>
        返回工单列表
      </Button>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0 }}>{wo.code}</h2>
            <span style={{ color: '#999' }}>{wo.device?.name} · {wo.deviceId}</span>
          </div>
          <Space>
            <Tag color={wo.priority === 'P0' ? 'red' : wo.priority === 'P1' ? 'orange' : wo.priority === 'P2' ? 'gold' : 'default'}>
              {wo.priority}
            </Tag>
            <Tag>{statusLabels[wo.status]}</Tag>
          </Space>
        </div>

        <Steps current={currentStep} size="small" style={{ marginBottom: 16 }}>
          {statusSteps.map(s => ({ title: statusLabels[s] })).map((s, i) => (
            <Steps.Step key={i} {...s} />
          ))}
        </Steps>

        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="故障类型">{wo.faultType || '-'}</Descriptions.Item>
          <Descriptions.Item label="来源">{wo.source}</Descriptions.Item>
          <Descriptions.Item label="故障描述" span={2}>{wo.description || '-'}</Descriptions.Item>
          {wo.rootCause && <Descriptions.Item label="根本原因" span={2}>{wo.rootCause}</Descriptions.Item>}
          {wo.resolution && <Descriptions.Item label="解决方案" span={2}>{wo.resolution}</Descriptions.Item>}
          {wo.slaDeadline && (
            <Descriptions.Item label="SLA 截止" span={2}>
              <Tag color={new Date(wo.slaDeadline) > new Date() ? 'green' : 'red'}>
                {new Date(wo.slaDeadline).toLocaleString()}
              </Tag>
            </Descriptions.Item>
          )}
        </Descriptions>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          {action && (
            <Button type="primary" icon={action.icon} size="large" onClick={action.action}>
              {action.label}
            </Button>
          )}
          <Button icon={<RobotOutlined />} onClick={loadDiagnosis}>AI 诊断</Button>
          {wo.status === 'completed' && (
            <Button icon={<BookOutlined />} onClick={() => navigate('/knowledge')}>查看知识库</Button>
          )}
        </div>
      </Card>

      {/* AI Diagnosis Modal */}
      <Modal
        title={<><RobotOutlined /> AI 辅助诊断</>}
        open={showDiagnosis}
        onCancel={() => setShowDiagnosis(false)}
        width={700}
        footer={null}
      >
        {diagnosis ? (
          <>
            <Divider>相似案例</Divider>
            <List
              dataSource={diagnosis.similarCases}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="blue">{item.id}</Tag>
                        <span>相似度: {Math.round(item.similarity * 100)}%</span>
                      </Space>
                    }
                    description={
                      <div>
                        <div><strong>现象：</strong>{item.symptom}</div>
                        <div><strong>原因：</strong>{item.cause}</div>
                        <div><strong>方案：</strong>{item.solution}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />

            <Divider>推荐诊断方案</Divider>
            <Timeline
              items={diagnosis.recommendedDiagnosis.map((d: any) => ({
                children: <><strong>{d.step}</strong> — 概率: {Math.round(d.probability * 100)}% <Tag>{d.priority}</Tag></>,
                color: d.priority === 'high' ? 'red' : 'blue',
              }))}
            />

            <Divider>推荐备件</Divider>
            <List
              dataSource={diagnosis.recommendedParts}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta title={`${item.name} (${item.code})`} description={`需 ${item.quantity} 件 · 库存 ${item.stock} 件`} />
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
      >
        <div style={{ marginBottom: 12 }}>
          <div>根本原因</div>
          <Input.TextArea
            rows={2}
            value={completeData.rootCause}
            onChange={(e) => setCompleteData({ ...completeData, rootCause: e.target.value })}
            placeholder="输入故障的根本原因"
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div>解决方案</div>
          <Input.TextArea
            rows={2}
            value={completeData.resolution}
            onChange={(e) => setCompleteData({ ...completeData, resolution: e.target.value })}
            placeholder="输入解决方法和维修步骤"
          />
        </div>
        <div>
          <div>满意度评分</div>
          <Rate value={completeData.satisfactionScore} onChange={(v) => setCompleteData({ ...completeData, satisfactionScore: v })} />
        </div>
      </Modal>

      {/* Work Logs */}
      {wo.workLogs?.length > 0 && (
        <Card title="维修记录" style={{ marginTop: 16 }}>
          <Timeline
            items={wo.workLogs.map((log: any) => ({
              children: <><strong>步骤 {log.step}:</strong> {log.content} {log.duration && <Tag>{log.duration}min</Tag>}</>,
              color: 'blue',
            }))}
          />
        </Card>
      )}
    </div>
  );
}
