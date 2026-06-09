import { useEffect, useState } from 'react';
import {
  List, Tag, Progress, Button, Modal, Form, Input, InputNumber,
  Select, DatePicker, Row, Col, Statistic, message, Space,
} from 'antd';
import { PlusOutlined, BulbOutlined, CheckCircleOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { StatCol } from '../styles/responsive';

export default function ImprovementProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { isMobile } = useResponsive();

  const fetchProjects = () => {
    api.get('/improvements').then((res) => {
      setProjects(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async (values: any) => {
    try {
      await api.post('/improvements', {
        ...values,
        status: 'active',
        progress: 0,
        deadline: values.deadline?.toISOString(),
      });
      message.success('改善项目已创建');
      setModalOpen(false);
      form.resetFields();
      fetchProjects();
    } catch {
      message.error('创建失败');
    }
  };

  const projectGroups = {
    active: projects.filter((p) => p.status === 'active'),
    completed: projects.filter((p) => p.status === 'completed'),
  };

  const lossTypeOptions = [
    { value: '设备故障', label: '设备故障' },
    { value: '换型/调整', label: '换型/调整' },
    { value: '短暂停机', label: '短暂停机' },
    { value: '速度降低', label: '速度降低' },
    { value: '废品/返工', label: '废品/返工' },
    { value: '启动损失', label: '启动损失' },
  ];

  const completionRate = projects.length
    ? Math.round(projectGroups.completed.length / projects.length * 100)
    : 0;

  return (
    <div>
      {/* Stats Row — 响应式：桌面4列，平板2列，移动2列 */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
        <StatCol>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>进行中</span>}
              value={projectGroups.active.length}
              valueStyle={{ color: Colors.warningLight, fontSize: isMobile ? 24 : 28, fontWeight: 700 }}
            />
          </PageCard>
        </StatCol>
        <StatCol>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>已完成</span>}
              value={projectGroups.completed.length}
              valueStyle={{ color: Colors.successLight, fontSize: isMobile ? 24 : 28, fontWeight: 700 }}
            />
          </PageCard>
        </StatCol>
        <StatCol>
          <PageCard bodyStyle={{ padding: isMobile ? '14px 16px' : '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: isMobile ? 12 : 13, color: Colors.gray500 }}>完成率</span>}
              value={completionRate}
              suffix="%"
              valueStyle={{ color: Colors.primary, fontSize: isMobile ? 24 : 28, fontWeight: 700 }}
            />
          </PageCard>
        </StatCol>
        <StatCol style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size={isMobile ? 'middle' : 'large'}
            onClick={() => setModalOpen(true)}
            style={{
              borderRadius: 8,
              height: isMobile ? 40 : 44,
              display: 'flex',
              alignItems: 'center',
              width: isMobile ? '100%' : undefined,
            }}
          >
            创建改善项目
          </Button>
        </StatCol>
      </Row>

      {/* Active Projects */}
      <PageCard icon={<BulbOutlined />} title="进行中" style={{ marginTop: isMobile ? 8 : 16 }}>
        <List
          dataSource={projectGroups.active}
          renderItem={(project: any) => (
            <PageCard
              size="small"
              style={{ marginBottom: isMobile ? 6 : 8 }}
              bodyStyle={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: isMobile ? 8 : 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Space size={isMobile ? 4 : 8} wrap>
                    <BulbOutlined style={{ color: Colors.warningLight, fontSize: isMobile ? 14 : 16 }} />
                    <strong style={{ fontSize: isMobile ? 13 : 14, color: Colors.gray800 }}>{project.title}</strong>
                    <Tag style={{ borderRadius: 4, fontSize: isMobile ? 11 : 12 }}>{project.lossType}</Tag>
                  </Space>
                  <div style={{
                    marginTop: isMobile ? 2 : 4,
                    color: Colors.gray500,
                    fontSize: isMobile ? 12 : 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: isMobile ? 'nowrap' : undefined,
                  }}>
                    {project.currentValue}{project.unit} → {project.targetValue}{project.unit}
                    {!isMobile && ` · 负责人：${project.assignee}`}
                    {!isMobile && project.deadline && ` · 截止：${new Date(project.deadline).toLocaleDateString()}`}
                  </div>
                </div>
                <Progress
                  type="circle"
                  percent={project.progress || 0}
                  size={isMobile ? 40 : 52}
                  strokeColor={Colors.warningLight}
                  trailColor={Colors.gray100}
                />
              </div>
            </PageCard>
          )}
        />
      </PageCard>

      {/* Completed Projects */}
      <PageCard icon={<CheckCircleOutlined />} title="已完成" style={{ marginTop: isMobile ? 8 : 16 }}>
        <List
          dataSource={projectGroups.completed}
          renderItem={(project: any) => (
            <PageCard
              size="small"
              style={{ marginBottom: isMobile ? 6 : 8 }}
              bodyStyle={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: isMobile ? 8 : 0,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Space size={isMobile ? 4 : 8} wrap>
                    <CheckCircleOutlined style={{ color: Colors.successLight, fontSize: isMobile ? 14 : 16 }} />
                    <strong style={{ fontSize: isMobile ? 13 : 14, color: Colors.gray800 }}>{project.title}</strong>
                    <Tag color={Colors.successLight} style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 11 : 12 }}>已完成</Tag>
                  </Space>
                  <div style={{
                    marginTop: isMobile ? 2 : 4,
                    color: Colors.gray500,
                    fontSize: isMobile ? 12 : 13,
                  }}>
                    {project.currentValue}{project.unit} → {project.targetValue}{project.unit}
                    {project.currentValue && project.targetValue && (
                      <Tag color={Colors.successLight} style={{ marginLeft: 8, borderRadius: 4, border: 'none', fontSize: isMobile ? 11 : 12 }}>
                        改善 {Math.round(((project.currentValue - project.targetValue) / project.currentValue) * 100)}%
                      </Tag>
                    )}
                  </div>
                </div>
                <Progress type="circle" percent={100} size={isMobile ? 40 : 52} strokeColor={Colors.successLight} trailColor={Colors.gray100} />
              </div>
            </PageCard>
          )}
        />
      </PageCard>

      {/* Create Modal — 移动端全宽 */}
      <Modal
        title={<Space><BulbOutlined style={{ color: Colors.primary }} /><span>创建改善项目</span></Space>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="创建"
        okButtonProps={{ style: { borderRadius: 6 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        width={isMobile ? '100%' : undefined}
        style={isMobile ? { top: 0, maxWidth: '100%' } : {}}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="例如：SMED 换型优化" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="lossType" label="损失类型" rules={[{ required: true }]}>
            <Select options={lossTypeOptions} style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="currentValue" label="当前值" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%', borderRadius: 6 }} placeholder="当前损失值" />
          </Form.Item>
          <Form.Item name="targetValue" label="目标值" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%', borderRadius: 6 }} placeholder="改善目标值" />
          </Form.Item>
          <Form.Item name="unit" label="单位">
            <Input placeholder="min / % / 次/月" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="assignee" label="负责人">
            <Input placeholder="负责人姓名" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="deadline" label="截止日期">
            <DatePicker style={{ width: '100%', borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="改善项目描述" style={{ borderRadius: 6 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
