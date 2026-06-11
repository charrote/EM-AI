import { useEffect, useState } from 'react';
import {
  List, Tag, Progress, Button, Modal, Form, Input, InputNumber,
  Select, DatePicker, Row, Col, Statistic, message, Space, Steps,
  Card, Empty, Divider, Tabs, Descriptions, Typography,
} from 'antd';
import {
  PlusOutlined, BulbOutlined, CheckCircleOutlined,
  PlayCircleOutlined, ExperimentOutlined, AuditOutlined,
  FlagOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { StatCol } from '../styles/responsive';

const { Text, TextArea } = Typography;

const PDCA_STEPS = ['plan', 'do', 'check', 'act'];
const PDCA_LABELS: Record<string, string> = {
  plan: '计划 (Plan)',
  do: '执行 (Do)',
  check: '检查 (Check)',
  act: '处理 (Act)',
};
const PDCA_ICONS: Record<string, React.ReactNode> = {
  plan: <ExperimentOutlined />,
  do: <PlayCircleOutlined />,
  check: <AuditOutlined />,
  act: <FlagOutlined />,
};

export default function ImprovementProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
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
        effectData: { pdca: { plan: {}, do: {}, check: {}, act: {} } },
      });
      message.success('改善项目已创建');
      setModalOpen(false);
      form.resetFields();
      fetchProjects();
    } catch {
      message.error('创建失败');
    }
  };

  const updateProject = async (id: string, data: any) => {
    try {
      await api.put(`/improvements/${id}`, data);
      message.success('更新成功');
      fetchProjects();
      if (selectedProject?.id === id) {
        setSelectedProject({ ...selectedProject, ...data });
      }
    } catch {
      message.error('更新失败');
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

  const openDetail = (project: any) => {
    setSelectedProject(project);
    setDetailOpen(true);
  };

  const renderPDCA = () => {
    if (!selectedProject) return null;
    const pdca = selectedProject.effectData?.pdca || {};
    const currentStepIdx = PDCA_STEPS.findIndex(s => {
      const step = pdca[s] || {};
      return !step.completed;
    });
    const currentStep = currentStepIdx >= 0 ? PDCA_STEPS[currentStepIdx] : 'act';

    return (
      <div>
        <Steps
          current={currentStepIdx >= 0 ? currentStepIdx : 3}
          size="small"
          style={{ marginBottom: 16 }}
          items={PDCA_STEPS.map(s => ({
            title: PDCA_LABELS[s],
            status: (pdca[s]?.completed) ? 'finish' : s === currentStep ? 'process' : 'wait',
          }))}
        />

        <Tabs
          activeKey={currentStep}
          items={PDCA_STEPS.map(s => ({
            key: s,
            label: <span>{PDCA_ICONS[s]} {PDCA_LABELS[s]}</span>,
            children: (
              <Card size="small" style={{ minHeight: 200 }}>
                {s === 'plan' && (
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><TextArea rows={2} placeholder="现状分析" value={pdca.plan?.analysis || ''} onChange={e => {
                        const newPdca = { ...pdca, plan: { ...pdca.plan, analysis: e.target.value } };
                        updateProject(selectedProject.id, { effectData: { pdca: newPdca } });
                      }} style={{ borderRadius: 6 }} /></div>
                      <div><TextArea rows={2} placeholder="改善目标" value={pdca.plan?.target || ''} onChange={e => {
                        const newPdca = { ...pdca, plan: { ...pdca.plan, target: e.target.value } };
                        updateProject(selectedProject.id, { effectData: { pdca: newPdca } });
                      }} style={{ borderRadius: 6 }} /></div>
                      <div><TextArea rows={2} placeholder="实施计划" value={pdca.plan?.actionPlan || ''} onChange={e => {
                        const newPdca = { ...pdca, plan: { ...pdca.plan, actionPlan: e.target.value } };
                        updateProject(selectedProject.id, { effectData: { pdca: newPdca } });
                      }} style={{ borderRadius: 6 }} /></div>
                      {!pdca.plan?.completed && (
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => {
                          const newPdca = { ...pdca, plan: { ...pdca.plan, completed: true } };
                          updateProject(selectedProject.id, { effectData: { pdca: newPdca }, progress: 25 });
                        }}>完成计划阶段</Button>
                      )}
                    </Space>
                  </div>
                )}
                {s === 'do' && (
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><TextArea rows={3} placeholder="执行过程记录" value={pdca.do?.execution || ''} onChange={e => {
                        const newPdca = { ...pdca, do: { ...pdca.do, execution: e.target.value } };
                        updateProject(selectedProject.id, { effectData: { pdca: newPdca } });
                      }} style={{ borderRadius: 6 }} /></div>
                      <div><TextArea rows={2} placeholder="遇到的问题" value={pdca.do?.issues || ''} onChange={e => {
                        const newPdca = { ...pdca, do: { ...pdca.do, issues: e.target.value } };
                        updateProject(selectedProject.id, { effectData: { pdca: newPdca } });
                      }} style={{ borderRadius: 6 }} /></div>
                      <Row gutter={12}>
                        <Col span={12}>
                          <InputNumber style={{ width: '100%' }} placeholder="当前进度 %" min={0} max={100}
                            value={selectedProject.progress || 0}
                            onChange={v => updateProject(selectedProject.id, { progress: v })} />
                        </Col>
                        <Col span={12}>
                          <Progress percent={selectedProject.progress || 0} size="small" />
                        </Col>
                      </Row>
                      {!pdca.do?.completed && (
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => {
                          const newPdca = { ...pdca, do: { ...pdca.do, completed: true } };
                          updateProject(selectedProject.id, { effectData: { pdca: newPdca }, progress: 75 });
                        }}>完成执行阶段</Button>
                      )}
                    </Space>
                  </div>
                )}
                {s === 'check' && (
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><TextArea rows={2} placeholder="效果验证" value={pdca.check?.result || ''} onChange={e => {
                        const newPdca = { ...pdca, check: { ...pdca.check, result: e.target.value } };
                        updateProject(selectedProject.id, { effectData: { pdca: newPdca } });
                      }} style={{ borderRadius: 6 }} /></div>
                      <Row gutter={12}>
                        <Col span={12}>
                          <InputNumber style={{ width: '100%' }} placeholder="改善前" value={selectedProject.currentValue || 0}
                            onChange={v => updateProject(selectedProject.id, { currentValue: v })} />
                        </Col>
                        <Col span={12}>
                          <InputNumber style={{ width: '100%' }} placeholder="改善后" value={selectedProject.targetValue || 0}
                            onChange={v => updateProject(selectedProject.id, { targetValue: v })} />
                        </Col>
                      </Row>
                      {selectedProject.currentValue && selectedProject.targetValue && (
                        <Tag color={selectedProject.targetValue < selectedProject.currentValue ? Colors.success : Colors.danger}
                          style={{ borderRadius: 4, border: 'none', fontSize: 14, padding: '4px 12px' }}>
                          改善幅度: {Math.round(Math.abs((selectedProject.currentValue - selectedProject.targetValue) / selectedProject.currentValue) * 100)}%
                        </Tag>
                      )}
                      {!pdca.check?.completed && (
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => {
                          const newPdca = { ...pdca, check: { ...pdca.check, completed: true } };
                          updateProject(selectedProject.id, { effectData: { pdca: newPdca }, progress: 90 });
                        }}>完成检查阶段</Button>
                      )}
                    </Space>
                  </div>
                )}
                {s === 'act' && (
                  <div>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><TextArea rows={2} placeholder="标准化/固化措施" value={pdca.act?.standardization || ''} onChange={e => {
                        const newPdca = { ...pdca, act: { ...pdca.act, standardization: e.target.value } };
                        updateProject(selectedProject.id, { effectData: { pdca: newPdca } });
                      }} style={{ borderRadius: 6 }} /></div>
                      <div><TextArea rows={2} placeholder="横向推广计划" value={pdca.act?.promotion || ''} onChange={e => {
                        const newPdca = { ...pdca, act: { ...pdca.act, promotion: e.target.value } };
                        updateProject(selectedProject.id, { effectData: { pdca: newPdca } });
                      }} style={{ borderRadius: 6 }} /></div>
                      {!pdca.act?.completed && (
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />} onClick={() => {
                          const newPdca = { ...pdca, act: { ...pdca.act, completed: true } };
                          updateProject(selectedProject.id, { effectData: { pdca: newPdca }, progress: 100, status: 'completed' });
                          message.success('改善项目已完成!');
                        }}>完成项目</Button>
                      )}
                    </Space>
                  </div>
                )}
              </Card>
            ),
          }))}
        />
      </div>
    );
  };

  return (
    <div>
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
          <Button type="primary" icon={<PlusOutlined />} size={isMobile ? 'middle' : 'large'}
            onClick={() => setModalOpen(true)}
            style={{ borderRadius: 8, height: isMobile ? 40 : 44, width: isMobile ? '100%' : undefined }}>
            创建改善项目
          </Button>
        </StatCol>
      </Row>

      <PageCard icon={<BulbOutlined />} title="进行中" style={{ marginTop: isMobile ? 8 : 16 }}>
        {projectGroups.active.length === 0 ? (
          <Empty description="暂无进行中的项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={projectGroups.active}
            renderItem={(project: any) => (
              <PageCard size="small" hoverable style={{ marginBottom: isMobile ? 6 : 8 }}
                bodyStyle={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
                onClick={() => openDetail(project)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? 8 : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={isMobile ? 4 : 8} wrap>
                      <BulbOutlined style={{ color: Colors.warningLight, fontSize: isMobile ? 14 : 16 }} />
                      <strong style={{ fontSize: isMobile ? 13 : 14, color: Colors.gray800 }}>{project.title}</strong>
                      <Tag style={{ borderRadius: 4, fontSize: isMobile ? 11 : 12 }}>{project.lossType}</Tag>
                    </Space>
                    <div style={{ marginTop: isMobile ? 2 : 4, color: Colors.gray500, fontSize: isMobile ? 12 : 13 }}>
                      {project.currentValue}{project.unit} → {project.targetValue}{project.unit}
                      {!isMobile && ` · 负责人：${project.assignee}`}
                      {!isMobile && project.deadline && ` · 截止：${new Date(project.deadline).toLocaleDateString()}`}
                    </div>
                  </div>
                  <Progress type="circle" percent={project.progress || 0} size={isMobile ? 40 : 52}
                    strokeColor={Colors.warningLight} trailColor={Colors.gray100} />
                </div>
              </PageCard>
            )}
          />
        )}
      </PageCard>

      <PageCard icon={<CheckCircleOutlined />} title="已完成" style={{ marginTop: isMobile ? 8 : 16 }}>
        {projectGroups.completed.length === 0 ? (
          <Empty description="暂无已完成的项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={projectGroups.completed}
            renderItem={(project: any) => (
              <PageCard size="small" hoverable style={{ marginBottom: isMobile ? 6 : 8 }}
                bodyStyle={{ padding: isMobile ? '10px 12px' : '12px 16px' }}
                onClick={() => openDetail(project)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: isMobile ? 8 : 0 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={isMobile ? 4 : 8} wrap>
                      <CheckCircleOutlined style={{ color: Colors.successLight, fontSize: isMobile ? 14 : 16 }} />
                      <strong style={{ fontSize: isMobile ? 13 : 14, color: Colors.gray800 }}>{project.title}</strong>
                      <Tag color={Colors.successLight} style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 11 : 12 }}>已完成</Tag>
                    </Space>
                    <div style={{ marginTop: isMobile ? 2 : 4, color: Colors.gray500, fontSize: isMobile ? 12 : 13 }}>
                      {project.currentValue}{project.unit} → {project.targetValue}{project.unit}
                      {project.currentValue && project.targetValue && (
                        <Tag color={Colors.successLight} style={{ marginLeft: 8, borderRadius: 4, border: 'none', fontSize: isMobile ? 11 : 12 }}>
                          改善 {Math.round(Math.abs((project.currentValue - project.targetValue) / project.currentValue) * 100)}%
                        </Tag>
                      )}
                    </div>
                  </div>
                  <Progress type="circle" percent={100} size={isMobile ? 40 : 52} strokeColor={Colors.successLight} trailColor={Colors.gray100} />
                </div>
              </PageCard>
            )}
          />
        )}
      </PageCard>

      <Modal title={<Space><BulbOutlined style={{ color: Colors.primary }} /><span>创建改善项目</span></Space>}
        open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}
        okText="创建" okButtonProps={{ style: { borderRadius: 6 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        width={isMobile ? '100%' : 520}
        style={isMobile ? { top: 0, maxWidth: '100%' } : {}}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="例如：SMED 换型优化" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="lossType" label="损失类型" rules={[{ required: true }]}>
            <Select options={lossTypeOptions} style={{ borderRadius: 6 }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="currentValue" label="当前值" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%', borderRadius: 6 }} placeholder="当前损失值" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetValue" label="目标值" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%', borderRadius: 6 }} placeholder="改善目标值" />
              </Form.Item>
            </Col>
          </Row>
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

      <Modal title={<Space><BulbOutlined style={{ color: Colors.primary }} /><span>{selectedProject?.title || '改善项目'}</span></Space>}
        open={detailOpen} onCancel={() => setDetailOpen(false)}
        footer={null} width={720} destroyOnClose>
        {selectedProject && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="损失类型">{selectedProject.lossType}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedProject.status === 'completed' ? Colors.success : Colors.warning}>
                  {selectedProject.status === 'completed' ? '已完成' : '进行中'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="当前值">{selectedProject.currentValue}{selectedProject.unit}</Descriptions.Item>
              <Descriptions.Item label="目标值">{selectedProject.targetValue}{selectedProject.unit}</Descriptions.Item>
              <Descriptions.Item label="负责人">{selectedProject.assignee || '-'}</Descriptions.Item>
              <Descriptions.Item label="截止日期">
                {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : '-'}
              </Descriptions.Item>
            </Descriptions>
            <Divider style={{ margin: '12px 0' }} />
            <Text strong>PDCA 改善循环</Text>
            {renderPDCA()}
          </div>
        )}
      </Modal>
    </div>
  );
}