import { useEffect, useState } from 'react';
import {
  List, Tag, Progress, Button, Modal, Form, Input, InputNumber,
  Select, DatePicker, Row, Col, Statistic, message, Space,
} from 'antd';
import { PlusOutlined, BulbOutlined, CheckCircleOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';

export default function ImprovementProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

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
      {/* Stats Row */}
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>进行中</span>}
              value={projectGroups.active.length}
              valueStyle={{ color: Colors.warningLight, fontSize: 28, fontWeight: 700 }}
            />
          </PageCard>
        </Col>
        <Col span={6}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>已完成</span>}
              value={projectGroups.completed.length}
              valueStyle={{ color: Colors.successLight, fontSize: 28, fontWeight: 700 }}
            />
          </PageCard>
        </Col>
        <Col span={6}>
          <PageCard bodyStyle={{ padding: '20px 24px' }}>
            <Statistic
              title={<span style={{ fontSize: 13, color: Colors.gray500 }}>完成率</span>}
              value={completionRate}
              suffix="%"
              valueStyle={{ color: Colors.primary, fontSize: 28, fontWeight: 700 }}
            />
          </PageCard>
        </Col>
        <Col span={6} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => setModalOpen(true)}
            style={{ borderRadius: 8, height: 44, display: 'flex', alignItems: 'center' }}
          >
            创建改善项目
          </Button>
        </Col>
      </Row>

      {/* Active Projects */}
      <PageCard icon={<BulbOutlined />} title="进行中" style={{ marginTop: 16 }}>
        <List
          dataSource={projectGroups.active}
          renderItem={(project: any) => (
            <PageCard
              size="small"
              style={{ marginBottom: 8 }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Space>
                    <BulbOutlined style={{ color: Colors.warningLight, fontSize: 16 }} />
                    <strong style={{ fontSize: 14, color: Colors.gray800 }}>{project.title}</strong>
                    <Tag style={{ borderRadius: 4, fontSize: 12 }}>{project.lossType}</Tag>
                  </Space>
                  <div style={{ marginTop: 4, color: Colors.gray500, fontSize: 13 }}>
                    目标：{project.currentValue}{project.unit} → {project.targetValue}{project.unit}
                    · 负责人：{project.assignee}
                    · 截止：{project.deadline ? new Date(project.deadline).toLocaleDateString() : '-'}
                  </div>
                </div>
                <Progress
                  type="circle"
                  percent={project.progress || 0}
                  size={52}
                  strokeColor={Colors.warningLight}
                  trailColor={Colors.gray100}
                />
              </div>
            </PageCard>
          )}
        />
      </PageCard>

      {/* Completed Projects */}
      <PageCard icon={<CheckCircleOutlined />} title="已完成" style={{ marginTop: 16 }}>
        <List
          dataSource={projectGroups.completed}
          renderItem={(project: any) => (
            <PageCard
              size="small"
              style={{ marginBottom: 8 }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Space>
                    <CheckCircleOutlined style={{ color: Colors.successLight, fontSize: 16 }} />
                    <strong style={{ fontSize: 14, color: Colors.gray800 }}>{project.title}</strong>
                    <Tag color={Colors.successLight} style={{ borderRadius: 4, border: 'none' }}>已完成</Tag>
                  </Space>
                  <div style={{ marginTop: 4, color: Colors.gray500, fontSize: 13 }}>
                    改善效果：{project.currentValue}{project.unit} → {project.targetValue}{project.unit}
                    {project.currentValue && project.targetValue && (
                      <Tag color={Colors.successLight} style={{ marginLeft: 8, borderRadius: 4, border: 'none' }}>
                        改善 {Math.round(((project.currentValue - project.targetValue) / project.currentValue) * 100)}%
                      </Tag>
                    )}
                  </div>
                </div>
                <Progress type="circle" percent={100} size={52} strokeColor={Colors.successLight} trailColor={Colors.gray100} />
              </div>
            </PageCard>
          )}
        />
      </PageCard>

      {/* Create Modal */}
      <Modal
        title={<Space><BulbOutlined style={{ color: Colors.primary }} /><span>创建改善项目</span></Space>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="创建"
        okButtonProps={{ style: { borderRadius: 6 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
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
