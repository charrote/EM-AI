import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Select, Input, Upload, Tag, message, Steps, Result,
  Descriptions, Space, Divider, List,
} from 'antd';
import { ScanOutlined, CameraOutlined, SoundOutlined, HistoryOutlined } from '@ant-design/icons';
import api from '../services/api';

const faultTypeOptions = [
  { value: '机械', label: '🔧 机械故障' },
  { value: '电气', label: '⚡ 电气故障' },
  { value: '液压', label: '💧 液压故障' },
  { value: '气动', label: '🌬️ 气动故障' },
  { value: '软件', label: '💻 软件故障' },
  { value: '其他', label: '❓ 其他' },
];

const priorityOptions = [
  { value: 'P0', label: 'P0 - 紧急停产', color: 'red' },
  { value: 'P1', label: 'P1 - 严重降速', color: 'orange' },
  { value: 'P2', label: 'P2 - 轻微异常', color: 'gold' },
  { value: 'P3', label: 'P3 - 观察项', color: 'default' },
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
    // Load recent faults
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
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {step === 'scan' && (
        <Card title="📸 扫码报修" style={{ borderRadius: 12 }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Button
              type="primary"
              icon={<ScanOutlined />}
              size="large"
              style={{ height: 80, width: 200, fontSize: 18, borderRadius: 12 }}
              onClick={() => setStep('scan')}
            >
              模拟扫码
            </Button>
            <div style={{ marginTop: 12, color: '#999' }}>点击按钮模拟扫描设备二维码</div>
          </div>
          <Divider>或选择设备</Divider>
          <Select
            showSearch
            placeholder="搜索并选择设备..."
            style={{ width: '100%' }}
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
            <Button icon={<SoundOutlined />} size="large" block>
              语音报修（说故障描述）
            </Button>
          </div>
        </Card>
      )}

      {step === 'report' && selectedDevice && (
        <Card
          title="📝 填写报修信息"
          style={{ borderRadius: 12 }}
          extra={
            <Button type="link" onClick={() => setStep('scan')}>换设备</Button>
          }
        >
          <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="设备">
              <Tag color="blue">{selectedDevice.code}</Tag> {selectedDevice.name}
            </Descriptions.Item>
            <Descriptions.Item label="位置">{selectedDevice.area} / {selectedDevice.line}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Tag>{selectedDevice.status}</Tag>
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4 }}>故障类型 *</div>
            <Select
              value={form.faultType}
              onChange={(v) => setForm({ ...form, faultType: v })}
              options={faultTypeOptions}
              placeholder="选择故障类型"
              style={{ width: '100%' }}
              size="large"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4 }}>故障等级</div>
            <Select
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
              options={priorityOptions}
              style={{ width: '100%' }}
              size="large"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4 }}>故障描述</div>
            <Input.TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="请描述故障现象（支持语音输入）"
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4 }}>现场照片/视频</div>
            <Upload beforeUpload={() => false} showUploadList={{ limit: 3 }}>
              <Button icon={<CameraOutlined />}>拍照上传</Button>
            </Upload>
          </div>

          {/* Recent faults for this device */}
          {recentFaults.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Divider>
                <Space><HistoryOutlined /> 近 30 天故障记录</Space>
              </Divider>
              <List
                size="small"
                dataSource={recentFaults}
                renderItem={(fault: any) => (
                  <List.Item>
                    <Space>
                      <Tag color={fault.priority === 'P0' ? 'red' : fault.priority === 'P1' ? 'orange' : 'gold'}>
                        {fault.priority}
                      </Tag>
                      <span>{fault.faultType}</span>
                      <span style={{ color: '#999', fontSize: 12 }}>
                        {new Date(fault.createdAt).toLocaleDateString()}
                      </span>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          )}

          <Space style={{ width: '100%' }} direction="vertical">
            <Button type="primary" size="large" block onClick={handleSubmit} loading={submitting}>
              提交报修
            </Button>
            <Button block onClick={handleReset}>取消</Button>
          </Space>
        </Card>
      )}

      {step === 'result' && result && (
        <Card style={{ borderRadius: 12 }}>
          <Result
            status="success"
            title="报修成功！"
            subTitle={`工单 ${result.code} 已创建，已推送至维修工程师`}
            extra={[
              <Button type="primary" key="view" onClick={() => navigate(`/work-orders/${result.id}`)}>
                查看工单
              </Button>,
              <Button key="new" onClick={handleReset}>继续报修</Button>,
              <Button key="list" onClick={() => navigate('/work-orders')}>工单列表</Button>,
            ]}
          >
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="工单号">{result.code}</Descriptions.Item>
              <Descriptions.Item label="设备">{selectedDevice?.name}</Descriptions.Item>
              <Descriptions.Item label="故障类型">{form.faultType}</Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag color={result.priority === 'P0' ? 'red' : result.priority === 'P1' ? 'orange' : 'gold'}>
                  {result.priority}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="SLA 截止">
                {new Date(result.slaDeadline).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Result>
        </Card>
      )}
    </div>
  );
}
