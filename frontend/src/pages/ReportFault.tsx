import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Select, Input, Upload, Tag, message, Steps, Result,
  Descriptions, Space, Divider, List,
} from 'antd';
import {
  ScanOutlined, CameraOutlined, SoundOutlined,
  HistoryOutlined, BugOutlined, FormOutlined,
  ThunderboltOutlined, ToolOutlined, ExperimentOutlined,
  FireOutlined, CloudOutlined, QuestionCircleOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, PriorityColors, PriorityLabels } from '../styles/theme';

const faultTypeOptions = [
  { value: '机械', label: '机械故障', icon: <ToolOutlined /> },
  { value: '电气', label: '电气故障', icon: <ThunderboltOutlined /> },
  { value: '液压', label: '液压故障', icon: <ExperimentOutlined /> },
  { value: '气动', label: '气动故障', icon: <FireOutlined /> },
  { value: '软件', label: '软件故障', icon: <CloudOutlined /> },
  { value: '其他', label: '其他', icon: <QuestionCircleOutlined /> },
];

const priorityOptions = [
  { value: 'P0', label: 'P0 - 紧急停产', color: Colors.dangerLight },
  { value: 'P1', label: 'P1 - 严重降速', color: Colors.warningLight },
  { value: 'P2', label: 'P2 - 轻微异常', color: '#EAB308' },
  { value: 'P3', label: 'P3 - 观察项', color: Colors.gray400 },
];

export default function ReportFault() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'scan' | 'report' | 'result'>('scan');
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [form, setForm] = useState({
    faultType: undefined as string | undefined,
    priority: 'P1' as string,
    description: '',
    images: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [recentFaults, setRecentFaults] = useState<any[]>([]);

  useEffect(() => {
    api.get('/devices').then((res) => setDevices(res.data.data));
  }, []);

  const handleSelectDevice = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    setSelectedDevice(device);
    api.get(`/devices/${deviceId}/work-orders?days=30`).then((res) => {
      setRecentFaults(res.data.data.slice(0, 5));
    });
    setStep('report');
  };

  const handleSubmit = async () => {
    if (!selectedDevice || !form.faultType) {
      message.warning('请选择设备和故障类型');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/work-orders', {
        deviceId: selectedDevice.id,
        type: 'repair',
        source: 'scan',
        priority: form.priority,
        faultType: form.faultType,
        description: form.description,
      });
      setResult(res.data.data);
      setStep('result');
      message.success('报修工单已创建！');
    } catch {
      message.error('提交失败');
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setStep('scan');
    setSelectedDevice(null);
    setForm({ faultType: undefined, priority: 'P1', description: '', images: [] });
    setResult(null);
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {step === 'scan' && (
        <PageCard icon={<ScanOutlined />} title="扫码报修" bodyStyle={{ padding: 24 }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Button
              type="primary"
              icon={<ScanOutlined />}
              size="large"
              style={{
                height: 80, width: 200, fontSize: 16, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto',
              }}
              onClick={() => setStep('scan')}
            >
              模拟扫码
            </Button>
            <div style={{ marginTop: 12, color: Colors.gray400, fontSize: 13 }}>
              点击按钮模拟扫描设备二维码
            </div>
          </div>

          <Divider style={{ color: Colors.gray400, fontSize: 12 }}>或选择设备</Divider>

          <Select
            showSearch
            placeholder="搜索并选择设备..."
            style={{ width: '100%', borderRadius: 6 }}
            size="large"
            onChange={handleSelectDevice}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={devices.map((d) => ({
              value: d.id,
              label: `${d.code} - ${d.name} [${d.area}/${d.line}]`,
            }))}
          />

          <div style={{ marginTop: 16 }}>
            <Button
              icon={<SoundOutlined />}
              size="large"
              block
              style={{ borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              语音报修
            </Button>
          </div>
        </PageCard>
      )}

      {step === 'report' && selectedDevice && (
        <PageCard
          icon={<FormOutlined />}
          title="填写报修信息"
          bodyStyle={{ padding: 24 }}
          extra={
            <Button type="link" onClick={() => setStep('scan')} style={{ padding: 0 }}>
              换设备
            </Button>
          }
        >
          {/* Device Info */}
          <Descriptions column={1} size="small" style={{ marginBottom: 20 }}>
            <Descriptions.Item label="设备">
              <Tag color={Colors.primary} style={{ borderRadius: 4, border: 'none', marginRight: 8 }}>{selectedDevice.code}</Tag>
              {selectedDevice.name}
            </Descriptions.Item>
            <Descriptions.Item label="位置">{selectedDevice.area} / {selectedDevice.line}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Tag style={{ borderRadius: 4 }}>{selectedDevice.status}</Tag>
            </Descriptions.Item>
          </Descriptions>

          {/* Fault Type */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: 13 }}>故障类型 *</div>
            <Select
              value={form.faultType}
              onChange={(v) => setForm({ ...form, faultType: v })}
              options={faultTypeOptions.map(opt => ({
                value: opt.value,
                label: (
                  <Space>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </Space>
                ),
              }))}
              placeholder="选择故障类型"
              style={{ width: '100%', borderRadius: 6 }}
              size="large"
            />
          </div>

          {/* Priority */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: 13 }}>故障等级</div>
            <Select
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
              options={priorityOptions.map(opt => ({
                value: opt.value,
                label: (
                  <Space>
                    <Tag color={opt.color} style={{ borderRadius: 4, border: 'none', margin: 0, fontSize: 11, lineHeight: '18px' }}>
                      {opt.value}
                    </Tag>
                    <span>{opt.label}</span>
                  </Space>
                ),
              }))}
              style={{ width: '100%', borderRadius: 6 }}
              size="large"
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: 13 }}>故障描述</div>
            <Input.TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="请描述故障现象（支持语音输入）"
              style={{ borderRadius: 6 }}
            />
          </div>

          {/* Photo Upload */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, color: Colors.gray700, fontSize: 13 }}>现场照片</div>
            <Upload beforeUpload={() => false} showUploadList={{ limit: 3 }}>
              <Button icon={<CameraOutlined />} style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}>
                拍照上传
              </Button>
            </Upload>
          </div>

          {/* Recent Faults */}
          {recentFaults.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Divider orientation="left" style={{ fontSize: 12, color: Colors.gray500 }}>
                <Space size={6}>
                  <HistoryOutlined />
                  <span>近 30 天故障记录</span>
                </Space>
              </Divider>
              <List
                size="small"
                dataSource={recentFaults}
                renderItem={(fault: any) => (
                  <List.Item>
                    <Space>
                      <Tag
                        color={PriorityColors[fault.priority] || Colors.gray400}
                        style={{ borderRadius: 4, border: 'none', margin: 0 }}
                      >
                        {fault.priority}
                      </Tag>
                      <span style={{ color: Colors.gray600 }}>{fault.faultType}</span>
                      <span style={{ color: Colors.gray400, fontSize: 12 }}>
                        {new Date(fault.createdAt).toLocaleDateString()}
                      </span>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}

          <Space style={{ width: '100%' }} direction="vertical">
            <Button
              type="primary"
              size="large"
              block
              onClick={handleSubmit}
              loading={submitting}
              style={{ borderRadius: 8, height: 44 }}
            >
              提交报修
            </Button>
            <Button block onClick={handleReset} style={{ borderRadius: 8 }}>取消</Button>
          </Space>
        </PageCard>
      )}

      {step === 'result' && result && (
        <PageCard>
          <Result
            status="success"
            title="报修成功！"
            subTitle={`工单 ${result.code} 已创建，已推送至维修工程师`}
            extra={[
              <Button type="primary" key="view" onClick={() => navigate(`/work-orders/${result.id}`)} style={{ borderRadius: 6 }}>
                查看工单
              </Button>,
              <Button key="new" onClick={handleReset} style={{ borderRadius: 6 }}>继续报修</Button>,
              <Button key="list" onClick={() => navigate('/work-orders')} style={{ borderRadius: 6 }}>工单列表</Button>,
            ]}
          >
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="工单号">{result.code}</Descriptions.Item>
              <Descriptions.Item label="设备">{selectedDevice?.name}</Descriptions.Item>
              <Descriptions.Item label="故障类型">{form.faultType}</Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag
                  color={PriorityColors[result.priority]}
                  style={{ borderRadius: 4, border: 'none' }}
                >
                  {result.priority}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="SLA 截止">
                {new Date(result.slaDeadline).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Result>
        </PageCard>
      )}
    </div>
  );
}
