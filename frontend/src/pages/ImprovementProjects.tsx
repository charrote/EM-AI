import { useEffect, useState } from 'react';
import {
  Tag, Progress, Button, Modal, Form, Input, InputNumber,
  Select, DatePicker, Row, Col, Statistic, message, Space, Steps,
  Card, Empty, Divider, Tabs, Descriptions, Typography, Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, BulbOutlined, CheckCircleOutlined,
  PlayCircleOutlined, ExperimentOutlined, AuditOutlined,
  FlagOutlined, AimOutlined, FileTextOutlined,
  ReadOutlined, ToolOutlined, ReloadOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

const { Text } = Typography;
const { TextArea } = Input;

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

const lossTypeOptions = [
  { value: '设备故障', label: '设备故障' },
  { value: '换型/调整', label: '换型/调整' },
  { value: '短暂停机', label: '短暂停机' },
  { value: '速度降低', label: '速度降低' },
  { value: '废品/返工', label: '废品/返工' },
  { value: '启动损失', label: '启动损失' },
];

type Opportunity = {
  id: string; lossType: string; title: string;
  currentValue: number; targetValue: number; unit: string; reason: string;
};

export default function ImprovementProjects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [form] = Form.useForm();
  const { isMobile } = useResponsive();

  const [fetchError, setFetchError] = useState('');

  const fetchData = () => {
    setFetchError('');
    Promise.all([
      api.get('/improvements'),
      api.get('/improvements/opportunities'),
    ]).then(([projRes, oppRes]) => {
      const p = projRes.data?.data || [];
      const o = oppRes.data?.data || [];
      setProjects(p);
      setOpportunities(o);
      setLoading(false);
    }).catch((err: any) => {
      setFetchError(err?.message || '请求失败');
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const projectGroups = {
    active: projects.filter((p) => p.status === 'active'),
    completed: projects.filter((p) => p.status === 'completed'),
  };

  const completionRate = projects.length
    ? Math.round(projectGroups.completed.length / projects.length * 100) : 0;

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
      fetchData();
    } catch { message.error('创建失败'); }
  };

  const updateProject = async (id: string, data: any) => {
    try {
      await api.put(`/improvements/${id}`, data);
      message.success('更新成功');
      fetchData();
      if (selectedProject?.id === id) {
        setSelectedProject({ ...selectedProject, ...data });
      }
    } catch { message.error('更新失败'); }
  };

  const openDetail = (project: any) => {
    setSelectedProject(project);
    setDetailOpen(true);
  };

  const createFromOpportunity = (opp: Opportunity) => {
    form.setFieldsValue({
      title: opp.title,
      lossType: opp.lossType,
      currentValue: opp.currentValue,
      targetValue: opp.targetValue,
      unit: opp.unit,
    });
    setModalOpen(true);
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
            status: pdca[s]?.completed ? 'finish' : s === currentStep ? 'process' : 'wait',
          }))}
        />

        <Tabs
          activeKey={currentStep}
          items={[
            ...PDCA_STEPS.map(s => ({
              key: s,
              label: <span style={{ fontSize: 13 }}>{PDCA_ICONS[s]} {PDCA_LABELS[s]}</span>,
              children: (
                <Card size="small" style={{ minHeight: 200, borderRadius: 8 }}>
                  {s === 'plan' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>现状分析</label>
                        <TextArea rows={2} value={pdca.plan?.analysis || ''}
                          onChange={e => { const n = { ...pdca, plan: { ...pdca.plan, analysis: e.target.value } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}
                          placeholder="描述当前问题和数据" style={{ borderRadius: 6 }} /></div>
                      <div><label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>改善目标</label>
                        <TextArea rows={2} value={pdca.plan?.target || ''}
                          onChange={e => { const n = { ...pdca, plan: { ...pdca.plan, target: e.target.value } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}
                          placeholder="设定可量化的改善目标" style={{ borderRadius: 6 }} /></div>
                      <div><label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>实施计划</label>
                        <TextArea rows={2} value={pdca.plan?.actionPlan || ''}
                          onChange={e => { const n = { ...pdca, plan: { ...pdca.plan, actionPlan: e.target.value } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}
                          placeholder="制定具体实施步骤" style={{ borderRadius: 6 }} /></div>
                      {!pdca.plan?.completed && (
                        <Button type="primary" icon={<CheckCircleOutlined />}
                          onClick={() => { const n = { ...pdca, plan: { ...pdca.plan, completed: true } }; updateProject(selectedProject.id, { effectData: { pdca: n }, progress: 25 }); }}>
                          完成计划阶段
                        </Button>
                      )}
                    </Space>
                  )}
                  {s === 'do' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>执行过程记录</label>
                        <TextArea rows={3} value={pdca.do?.execution || ''}
                          onChange={e => { const n = { ...pdca, do: { ...pdca.do, execution: e.target.value } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}
                          placeholder="记录执行过程和关键数据" style={{ borderRadius: 6 }} /></div>
                      <div><label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>遇到的问题</label>
                        <TextArea rows={2} value={pdca.do?.issues || ''}
                          onChange={e => { const n = { ...pdca, do: { ...pdca.do, issues: e.target.value } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}
                          placeholder="记录执行中遇到的问题和解决方法" style={{ borderRadius: 6 }} /></div>
                      <Row gutter={12}>
                        <Col span={12}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>当前进度</label>
                          <InputNumber style={{ width: '100%', borderRadius: 6 }} min={0} max={100}
                            value={selectedProject.progress || 0}
                            onChange={v => updateProject(selectedProject.id, { progress: v })} />
                        </Col>
                        <Col span={12}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>完成度</label>
                          <Progress percent={selectedProject.progress || 0} />
                        </Col>
                      </Row>
                      {!pdca.do?.completed && (
                        <Button type="primary" icon={<CheckCircleOutlined />}
                          onClick={() => { const n = { ...pdca, do: { ...pdca.do, completed: true } }; updateProject(selectedProject.id, { effectData: { pdca: n }, progress: 75 }); }}>
                          完成执行阶段
                        </Button>
                      )}
                    </Space>
                  )}
                  {s === 'check' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>效果验证</label>
                        <TextArea rows={2} value={pdca.check?.result || ''}
                          onChange={e => { const n = { ...pdca, check: { ...pdca.check, result: e.target.value } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}
                          placeholder="验证改善效果，对比改善前后数据" style={{ borderRadius: 6 }} /></div>
                      <Row gutter={12}>
                        <Col span={12}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>改善前</label>
                          <InputNumber style={{ width: '100%', borderRadius: 6 }}
                            value={selectedProject.currentValue || 0}
                            onChange={v => updateProject(selectedProject.id, { currentValue: v })} />
                        </Col>
                        <Col span={12}>
                          <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>改善后</label>
                          <InputNumber style={{ width: '100%', borderRadius: 6 }}
                            value={selectedProject.targetValue || 0}
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
                        <Button type="primary" icon={<CheckCircleOutlined />}
                          onClick={() => { const n = { ...pdca, check: { ...pdca.check, completed: true } }; updateProject(selectedProject.id, { effectData: { pdca: n }, progress: 90 }); }}>
                          完成检查阶段
                        </Button>
                      )}
                    </Space>
                  )}
                  {s === 'act' && (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div><label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>标准化 / 固化措施</label>
                        <TextArea rows={2} value={pdca.act?.standardization || ''}
                          onChange={e => { const n = { ...pdca, act: { ...pdca.act, standardization: e.target.value } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}
                          placeholder="将改善措施写入标准作业流程" style={{ borderRadius: 6 }} /></div>
                      <div><label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>横向推广计划</label>
                        <TextArea rows={2} value={pdca.act?.promotion || ''}
                          onChange={e => { const n = { ...pdca, act: { ...pdca.act, promotion: e.target.value } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}
                          placeholder="计划推广到其他设备/产线" style={{ borderRadius: 6 }} /></div>

                      <Divider style={{ margin: '8px 0' }} />
                      <Text strong style={{ fontSize: 14 }}>📋 成果标准化</Text>
                      <div style={{ background: Colors.gray50, padding: 12, borderRadius: 6 }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileTextOutlined style={{ color: Colors.primary }} />
                            <Text>SOP 更新</Text>
                            <Tag color={pdca.act?.sopUpdated ? 'success' : 'default'}
                              style={{ borderRadius: 4, cursor: 'pointer', marginLeft: 'auto' }}
                              onClick={() => { const n = { ...pdca, act: { ...pdca.act, sopUpdated: !pdca.act?.sopUpdated } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}>
                              {pdca.act?.sopUpdated ? '✓ 已更新' : '标记已更新'}
                            </Tag>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ReadOutlined style={{ color: Colors.primary }} />
                            <Text>点检标准更新</Text>
                            <Tag color={pdca.act?.inspectionUpdated ? 'success' : 'default'}
                              style={{ borderRadius: 4, cursor: 'pointer', marginLeft: 'auto' }}
                              onClick={() => { const n = { ...pdca, act: { ...pdca.act, inspectionUpdated: !pdca.act?.inspectionUpdated } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}>
                              {pdca.act?.inspectionUpdated ? '✓ 已更新' : '标记已更新'}
                            </Tag>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ToolOutlined style={{ color: Colors.primary }} />
                            <Text>保养计划更新</Text>
                            <Tag color={pdca.act?.maintenanceUpdated ? 'success' : 'default'}
                              style={{ borderRadius: 4, cursor: 'pointer', marginLeft: 'auto' }}
                              onClick={() => { const n = { ...pdca, act: { ...pdca.act, maintenanceUpdated: !pdca.act?.maintenanceUpdated } }; updateProject(selectedProject.id, { effectData: { pdca: n } }); }}>
                              {pdca.act?.maintenanceUpdated ? '✓ 已更新' : '标记已更新'}
                            </Tag>
                          </div>
                        </Space>
                      </div>

                      {!pdca.act?.completed && (
                        <Button type="primary" icon={<CheckCircleOutlined />}
                          onClick={() => { const n = { ...pdca, act: { ...pdca.act, completed: true } }; updateProject(selectedProject.id, { effectData: { pdca: n }, progress: 100, status: 'completed' }); message.success('改善项目已完成!'); }}>
                          完成项目
                        </Button>
                      )}
                    </Space>
                  )}
                </Card>
              ),
            })),
          ]}
        />
      </div>
    );
  };

  // ── PDCA step indicator ──
  const PDCA_STEP_LABELS_SHORT = ['P', 'D', 'C', 'A'];
  const PDCA_STEP_COLORS = [Colors.primary, Colors.warningLight, Colors.info, Colors.successLight];

  const renderPDCASteps = (record: any, onClick?: () => void) => {
    const pdca = record.effectData?.pdca || {};
    return (
      <Space size={4} style={{ cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
        {PDCA_STEPS.map((step, idx) => {
          const completed = pdca[step]?.completed;
          return (
            <span key={step} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: '50%',
              background: completed ? PDCA_STEP_COLORS[idx] : Colors.gray200,
              color: completed ? '#fff' : Colors.gray500,
              fontSize: 11, fontWeight: 600, lineHeight: '22px',
              transition: 'all 0.2s',
            }}>
              {PDCA_STEP_LABELS_SHORT[idx]}
            </span>
          );
        })}
      </Space>
    );
  };

  // ── Table columns for opportunities ──
  const opportunityColumns: ColumnsType<Opportunity> = [
    {
      title: '损失类型', dataIndex: 'lossType', key: 'lossType', width: 100,
      render: (v: string) => <Tag color={Colors.info} style={{ borderRadius: 4, border: 'none' }}>{v}</Tag>,
    },
    {
      title: '改善机会', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    ...(isMobile ? [] : [
      {
        title: '改善幅度', key: 'range', width: 140,
        render: (_: any, record: Opportunity) => (
          <Text style={{ color: Colors.gray500, fontSize: 13 }}>
            {record.currentValue}{record.unit} → <Text style={{ color: Colors.success, fontWeight: 600 }}>{record.targetValue}{record.unit}</Text>
          </Text>
        ),
      },
      {
        title: '原因分析', dataIndex: 'reason', key: 'reason', ellipsis: true,
        render: (v: string) => <Text style={{ color: Colors.gray400, fontSize: 12 }}>{v}</Text>,
      },
    ] as ColumnsType<Opportunity>),
    {
      title: '操作', key: 'action', width: 90, fixed: 'right',
      render: (_: any, record: Opportunity) => (
        <Button type="primary" size="small" icon={<PlusOutlined />}
          onClick={() => createFromOpportunity(record)}
          style={{ borderRadius: 4 }}>
          创建项目
        </Button>
      ),
    },
  ];

  // ── Table columns for active projects ──
  const activeColumns: ColumnsType<any> = [
    {
      title: '项目名称', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (v: string) => (
        <Space size={6}>
          <BulbOutlined style={{ color: Colors.warningLight }} />
          <Text strong>{v}</Text>
        </Space>
      ),
    },
    {
      title: '损失类型', dataIndex: 'lossType', key: 'lossType', width: 100,
      render: (v: string) => <Tag style={{ borderRadius: 4, fontSize: 11 }}>{v}</Tag>,
    },
    ...(isMobile ? [] : [
      {
        title: '改善目标', key: 'target', width: 140,
        render: (_: any, record: any) => (
          <Text>{record.currentValue}{record.unit} → {record.targetValue}{record.unit}</Text>
        ),
      },
      {
        title: '负责人', dataIndex: 'assignee', key: 'assignee', width: 80,
        render: (v: string) => v || '-',
      },
      {
        title: '截止日期', dataIndex: 'deadline', key: 'deadline', width: 100,
        render: (v: string) => v ? new Date(v).toLocaleDateString() : '-',
      },
    ] as ColumnsType<any>),
    {
      title: 'PDCA', key: 'pdcaSteps', width: 130,
      render: (_: any, record: any) => renderPDCASteps(record, () => openDetail(record)),
    },
  ];

  // ── Table columns for completed projects ──
  const completedColumns: ColumnsType<any> = [
    {
      title: '项目名称', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (v: string) => (
        <Space size={6}>
          <CheckCircleOutlined style={{ color: Colors.successLight }} />
          <Text strong>{v}</Text>
        </Space>
      ),
    },
    {
      title: '改善效果', key: 'effect', width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Text>{record.currentValue}{record.unit} → {record.targetValue}{record.unit}</Text>
          {record.currentValue && record.targetValue && (
            <Tag color={Colors.successLight} style={{ borderRadius: 4, border: 'none', fontSize: 11 }}>
              改善 {Math.round(Math.abs((record.currentValue - record.targetValue) / record.currentValue) * 100)}%
            </Tag>
          )}
        </Space>
      ),
    },
    ...(isMobile ? [] : [
      {
        title: '标准化', key: 'std', width: 160,
        render: (_: any, record: any) => {
          const pdca = record.effectData?.pdca || {};
          return (
            <Space>
              <Tag color={pdca.act?.sopUpdated ? 'success' : 'default'} style={{ borderRadius: 4, fontSize: 11 }}>SOP</Tag>
              <Tag color={pdca.act?.inspectionUpdated ? 'success' : 'default'} style={{ borderRadius: 4, fontSize: 11 }}>点检</Tag>
              <Tag color={pdca.act?.maintenanceUpdated ? 'success' : 'default'} style={{ borderRadius: 4, fontSize: 11 }}>保养</Tag>
            </Space>
          );
        },
      },
      {
        title: 'PDCA', key: 'pdcaSteps', width: 130,
        render: (_: any, record: any) => renderPDCASteps(record, () => openDetail(record)),
      },
    ] as ColumnsType<any>),
  ];

  return (
    <div>
      <Row gutter={[isMobile ? 8 : 16, 12]}>
        <Col xs={12} sm={6}>
          <PageCard bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 14, color: Colors.gray500 }}>改善机会</span>}
              value={opportunities.length}
              valueStyle={{ color: Colors.info, fontSize: 30, fontWeight: 700 }}
            />
          </PageCard>
        </Col>
        <Col xs={12} sm={6}>
          <PageCard bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 14, color: Colors.gray500 }}>进行中</span>}
              value={projectGroups.active.length}
              valueStyle={{ color: Colors.warningLight, fontSize: 30, fontWeight: 700 }}
            />
          </PageCard>
        </Col>
        <Col xs={12} sm={6}>
          <PageCard bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 14, color: Colors.gray500 }}>已完成</span>}
              value={projectGroups.completed.length}
              valueStyle={{ color: Colors.successLight, fontSize: 30, fontWeight: 700 }}
            />
          </PageCard>
        </Col>
        <Col xs={12} sm={6}>
          <PageCard bodyStyle={{ padding: '16px 20px' }}>
            <Statistic
              title={<span style={{ fontSize: 14, color: Colors.gray500 }}>完成率</span>}
              value={completionRate}
              suffix="%"
              valueStyle={{ color: Colors.primary, fontSize: 30, fontWeight: 700 }}
            />
          </PageCard>
        </Col>
      </Row>

      {fetchError && (
        <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '8px 16px', borderRadius: 6, marginTop: 8 }}>
          ⚠ 数据加载失败: {fetchError}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            { key: 'opportunities', label: <span><AimOutlined /> 改善机会 ({opportunities.length})</span> },
            { key: 'active', label: <span><BulbOutlined /> 进行中 ({projectGroups.active.length})</span> },
            { key: 'completed', label: <span><CheckCircleOutlined /> 已完成 ({projectGroups.completed.length})</span> },
          ]}
          style={{ marginBottom: 0 }}
        />
        <Space size={4}>
          <Button icon={<ReloadOutlined />} onClick={fetchData} size={isMobile ? 'small' : 'middle'} />
          <Button type="primary" icon={<PlusOutlined />} size={isMobile ? 'small' : 'middle'}
            onClick={() => { form.resetFields(); setModalOpen(true); }}
            style={{ borderRadius: 6 }}>
            创建改善项目
          </Button>
        </Space>
      </div>

      {activeTab === 'opportunities' && (
        <Card size="small" style={{ marginTop: 4 }} styles={{ body: { padding: 0 } }}>
          <Table
            columns={opportunityColumns}
            dataSource={opportunities}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            size="small"
            pagination={false}
            locale={{ emptyText: <Empty description="暂无改善机会" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Card>
      )}

      {activeTab === 'active' && (
        <Card size="small" style={{ marginTop: 4 }} styles={{ body: { padding: 0 } }}>
          <Table
            columns={activeColumns}
            dataSource={projectGroups.active}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            size="small"
            pagination={false}
            locale={{ emptyText: <Empty description="暂无进行中的改善项目" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Card>
      )}

      {activeTab === 'completed' && (
        <Card size="small" style={{ marginTop: 4 }} styles={{ body: { padding: 0 } }}>
          <Table
            columns={completedColumns}
            dataSource={projectGroups.completed}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            size="small"
            pagination={false}
            locale={{ emptyText: <Empty description="暂无已完成的改善项目" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        </Card>
      )}

      <Modal title={<Space><BulbOutlined style={{ color: Colors.primary }} /><span>创建改善项目</span></Space>}
        open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}
        okText="创建" okButtonProps={{ style: { borderRadius: 6 } }}
        cancelButtonProps={{ style: { borderRadius: 6 } }}
        width={isMobile ? '100%' : 560}
        style={isMobile ? { top: 0, maxWidth: '100%' } : {}}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="例如：SMED 换型优化" style={{ borderRadius: 6 }} />
          </Form.Item>
          <Form.Item name="lossType" label="损失类型" rules={[{ required: true }]}>
            <Select options={lossTypeOptions} style={{ borderRadius: 6 }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="currentValue" label="当前值" rules={[{ required: true, message: '请输入当前值' }]}>
                <InputNumber style={{ width: '100%', borderRadius: 6 }} placeholder="当前损失值" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetValue" label="目标值" rules={[{ required: true, message: '请输入目标值' }]}>
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
            <TextArea rows={3} placeholder="改善项目描述" style={{ borderRadius: 6 }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={<Space><BulbOutlined style={{ color: Colors.primary }} /><span>{selectedProject?.title || '改善项目'}</span></Space>}
        open={detailOpen} onCancel={() => setDetailOpen(false)}
        footer={null} width={760} destroyOnClose>
        {selectedProject && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 12 }}>
              <Descriptions.Item label="损失类型">{selectedProject.lossType}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={selectedProject.status === 'completed' ? Colors.success : Colors.warning}
                  style={{ borderRadius: 4, border: 'none' }}>
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
            <Progress percent={selectedProject.progress || 0}
              strokeColor={selectedProject.status === 'completed' ? Colors.successLight : Colors.warningLight}
              trailColor={Colors.gray100} style={{ marginBottom: 16 }} />

            <Divider style={{ margin: '12px 0' }} />
            <Text strong style={{ fontSize: 15 }}>PDCA 改善循环</Text>
            {renderPDCA()}
          </div>
        )}
      </Modal>
    </div>
  );
}