import { useState, useCallback, useMemo } from 'react';
import {
  Table, Card, Button, Space, Typography, Badge, Tag, message,
  Row, Col, Modal, Steps, Descriptions, Result, Input, InputNumber,
  Form, Upload, Image, List, Divider, Alert,
} from 'antd';
import {
  PlayCircleOutlined, CheckCircleOutlined, ExperimentOutlined,
  ReloadOutlined, FileTextOutlined, ClockCircleOutlined, ToolOutlined,
  CameraOutlined, DeleteOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import api from '../services/api';
import { useApiDataSource } from '../services/dataSource';
import { Colors } from '../styles/theme';

const { Text, Title } = Typography;

interface MaintenanceRecord {
  id: string;
  planId: string | null;
  deviceId: string;
  title: string;
  type: string;
  operatorId: string | null;
  status: string;
  steps: any[];
  partsUsed: any[];
  result: string | null;
  duration: number | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
}

const RECORD_STATUS: Record<string, { color: string; label: string }> = {
  in_progress: { color: Colors.primary, label: '执行中' },
  completed: { color: Colors.success, label: '已完成' },
  skipped: { color: Colors.gray400, label: '已跳过' },
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  daily: '日常保养',
  level1: '一级保养',
  level2: '二级保养',
  overhaul: '大修保养',
};

export default function MaintenanceExecute() {
  // Memoize mock data to prevent infinite re-render loops
  const mockRecords = useMemo(() => [] as MaintenanceRecord[], []);
  const mockPlans = useMemo(() => [] as any[], []);

  const { data: records, loading: recordsLoading, refresh: refreshRecords } = useApiDataSource(
    '/maintenance/records',
    mockRecords
  );
  const { data: plans, loading: plansLoading, refresh: refreshPlans } = useApiDataSource(
    '/maintenance/plans?active=true',
    mockPlans
  );
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [currentExec, setCurrentExec] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState<any[]>([]);
  const [completing, setCompleting] = useState(false);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(0);

  // ── 开始执行 ──────────────────────────────────
  const handleStartExecute = async (plan: any) => {
    try {
      const res = await api.post('/maintenance/records', {
        planId: plan.id,
        deviceId: plan.deviceId || 'unknown',
        title: plan.title,
        type: plan.type,
        action: 'start',
      });
      const record = res.data.data;
      const items = plan.items || [];
      setCurrentExec({ ...record, plan });
      setStepResults(items.map((item: any) => ({
        name: item.name || item,
        result: 'normal',
        value: '',
        note: '',
        photos: [] as string[],
      })));
      setCurrentStep(0);
      setDuration(0);
      setNotes('');
      setExecModalOpen(true);
    } catch {
      message.error('启动执行失败');
    }
  };

  // ── 完成执行 ──────────────────────────────────
  const handleComplete = async () => {
    if (!currentExec) return;
    setCompleting(true);
    try {
      await api.post('/maintenance/records', {
        action: 'complete',
        recordId: currentExec.id,
        planId: currentExec.plan?.id,
        steps: stepResults,
        duration,
        notes,
        result: stepResults.some(s => s.result === 'abnormal') ? 'abnormal' : 'normal',
      });
      message.success('保养完成');
      setExecModalOpen(false);
      refreshRecords();
      refreshPlans();
    } catch {
      message.error('提交失败');
    } finally {
      setCompleting(false);
    }
  };

  // ── 分步修改结果 ──────────────────────────────
  const updateStepResult = (index: number, field: string, value: any) => {
    const updated = [...stepResults];
    (updated[index] as any)[field] = value;
    setStepResults(updated);
  };

  const columns: ColumnsType<MaintenanceRecord> = [
    {
      title: '保养任务', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (v: string, r: MaintenanceRecord) => (
        <Space>
          <ExperimentOutlined style={{ color: Colors.primary }} />
          <Text strong>{v}</Text>
          <Tag>{MAINTENANCE_TYPE_LABELS[r.type] || r.type}</Tag>
        </Space>
      ),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => {
        const cfg = RECORD_STATUS[v];
        return <Badge color={cfg?.color} text={cfg?.label || v} />;
      },
    },
    {
      title: '步骤数', key: 'steps', width: 70,
      render: (_: unknown, r: MaintenanceRecord) => <Tag>{Array.isArray(r.steps) ? r.steps.length : 0}</Tag>,
    },
    {
      title: '耗时(分)', dataIndex: 'duration', key: 'duration', width: 80,
      render: (v: number | null) => v != null ? <Text>{v}分</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '结果', dataIndex: 'result', key: 'result', width: 70,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">-</Text>;
        return v === 'normal'
          ? <Badge color={Colors.success} text="正常" />
          : <Badge color={Colors.danger} text="异常" />;
      },
    },
    {
      title: '完成时间', dataIndex: 'completedAt', key: 'completedAt', width: 120,
      render: (v: string | null) => v ? new Date(v).toLocaleString() : <Text type="secondary">-</Text>,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <ExperimentOutlined style={{ marginRight: 8 }} />
            保养执行与记录
          </Title>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => { refreshRecords(); refreshPlans(); }}>刷新</Button>
        </Col>
      </Row>

      {/* ─── 待执行的保养计划 ─── */}
      {plans.filter(p => p.active).length > 0 && (
        <Card
          title={<Space><PlayCircleOutlined style={{ color: Colors.primary }} /> 待执行保养</Space>}
          size="small"
          style={{ marginBottom: 12 }}
          styles={{ body: { padding: '8px 16px' } }}
        >
          <Row gutter={[8, 8]}>
            {plans.filter(p => p.active).map(plan => (
              <Col key={plan.id}>
                <Button
                  type="primary"
                  ghost
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleStartExecute(plan)}
                  style={{ marginBottom: 4 }}
                >
                  {plan.title}
                </Button>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* ─── 执行记录列表 ─── */}
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={recordsLoading || plansLoading}
          scroll={{ x: 700 }}
          size="small"
          pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        />
      </Card>

      {/* ─── 执行 Modal ─── */}
      <Modal
        title={<Space><ToolOutlined /> {currentExec?.title || '保养执行'}</Space>}
        open={execModalOpen}
        onCancel={() => setExecModalOpen(false)}
        width={700}
        footer={null}
        destroyOnClose
      >
        {currentExec && (
          <div>
            {/* 步骤进度 */}
            <Steps
              current={currentStep}
              size="small"
              style={{ marginBottom: 24 }}
              items={stepResults.map((s, i) => ({
                title: `步骤 ${i + 1}`,
                status: i < currentStep ? 'finish' : i === currentStep ? 'process' : 'wait',
              }))}
            />

            {/* 当前步骤 */}
            {currentStep < stepResults.length ? (
              <div>
                <Alert
                  type="info"
                  showIcon
                  title={`步骤 ${currentStep + 1}: ${stepResults[currentStep].name}`}
                  style={{ marginBottom: 16 }}
                />

                <div style={{ padding: '0 8px' }}>
                  <Form layout="vertical">
                    <Form.Item label="检查结果">
                      <Space>
                        <Button
                          type={stepResults[currentStep].result === 'normal' ? 'primary' : 'default'}
                          onClick={() => updateStepResult(currentStep, 'result', 'normal')}
                          icon={<CheckCircleOutlined />}
                        >
                          正常
                        </Button>
                        <Button
                          type={stepResults[currentStep].result === 'abnormal' ? 'primary' : 'default'}
                          danger
                          onClick={() => updateStepResult(currentStep, 'result', 'abnormal')}
                        >
                          异常
                        </Button>
                      </Space>
                    </Form.Item>
                    <Form.Item label="检测值">
                      <Input
                        placeholder="输入检测值（如: 45°C）"
                        value={stepResults[currentStep].value}
                        onChange={e => updateStepResult(currentStep, 'value', e.target.value)}
                      />
                    </Form.Item>
                    <Form.Item label="备注">
                      <Input.TextArea
                        rows={2}
                        placeholder="备注信息..."
                        value={stepResults[currentStep].note}
                        onChange={e => updateStepResult(currentStep, 'note', e.target.value)}
                      />
                    </Form.Item>

                    {/* ═══ Photo Upload ═══ */}
                    <Form.Item label="现场照片">
                      <Upload
                        listType="picture-card"
                        showUploadList={false}
                        multiple
                        beforeUpload={async (file) => {
                          const formData = new FormData();
                          formData.append('files', file);
                          try {
                            const res = await api.post('/upload', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' },
                            });
                            const urls: string[] = res.data.data || [];
                            const current = [...(stepResults[currentStep].photos || [])];
                            updateStepResult(currentStep, 'photos', [...current, ...urls]);
                          } catch {
                            message.error('上传失败');
                          }
                          return false; // prevent default upload
                        }}
                      >
                        <div style={{ textAlign: 'center' }}>
                          <CameraOutlined style={{ fontSize: 20 }} />
                          <div style={{ marginTop: 4, fontSize: 12, color: Colors.gray500 }}>拍照</div>
                        </div>
                      </Upload>

                      {/* Photo previews */}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {(stepResults[currentStep].photos || []).map((url: string, i: number) => (
                          <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                            <Image
                              src={url}
                              width={72}
                              height={72}
                              style={{ borderRadius: 6, objectFit: 'cover' }}
                              preview={{ mask: <span style={{ fontSize: 11 }}>预览</span> }}
                            />
                            <DeleteOutlined
                              style={{
                                position: 'absolute', top: -4, right: -4,
                                color: Colors.danger, background: '#fff',
                                borderRadius: '50%', padding: 2, fontSize: 12,
                                cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                              onClick={() => {
                                const current = [...(stepResults[currentStep].photos || [])];
                                current.splice(i, 1);
                                updateStepResult(currentStep, 'photos', current);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </Form.Item>
                  </Form>

                  <div style={{ textAlign: 'right', marginTop: 16 }}>
                    {currentStep > 0 && (
                      <Button style={{ marginRight: 8 }} onClick={() => setCurrentStep(s => s - 1)}>
                        上一步
                      </Button>
                    )}
                    <Button
                      type="primary"
                      onClick={() => setCurrentStep(s => s + 1)}
                    >
                      {currentStep === stepResults.length - 1 ? '查看汇总' : '下一步'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── 完成汇总 ── */
              <div>
                <Result
                  status={stepResults.some(s => s.result === 'abnormal') ? 'warning' : 'success'}
                  title={stepResults.some(s => s.result === 'abnormal') ? '部分项目异常，请关注' : '所有项目正常'}
                />

                <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="总步骤">{stepResults.length}</Descriptions.Item>
                  <Descriptions.Item label="正常项">{stepResults.filter(s => s.result === 'normal').length}</Descriptions.Item>
                  <Descriptions.Item label="异常项">{stepResults.filter(s => s.result === 'abnormal').length}</Descriptions.Item>
                  <Descriptions.Item label="耗时(分钟)">
                    <InputNumber
                      min={0}
                      value={duration}
                      onChange={v => setDuration(v || 0)}
                      style={{ width: 120 }}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="备注">
                    <Input.TextArea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                  </Descriptions.Item>
                </Descriptions>

                <div style={{ textAlign: 'right' }}>
                  <Button style={{ marginRight: 8 }} onClick={() => setCurrentStep(stepResults.length - 1)}>
                    返回修改
                  </Button>
                  <Button type="primary" onClick={handleComplete} loading={completing} icon={<CheckCircleOutlined />}>
                    完成保养
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
