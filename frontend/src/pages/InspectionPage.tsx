import { useEffect, useState } from 'react';
import { Card, Button, Select, InputNumber, Radio, Upload, message, List, Tag, Divider, Modal, Result } from 'antd';
import { CameraOutlined, CheckCircleOutlined, CloseCircleOutlined, ScanOutlined } from '@ant-design/icons';
import api from '../services/api';

interface InspectionItem {
  id: string;
  name: string;
  method: string;
  value: string;
  result: 'pass' | 'fail';
  normalRange?: string;
}

const presetItems: InspectionItem[] = [
  { id: 'item-1', name: '润滑油位', method: '目视', value: '', result: 'pass', normalRange: '油位在上下刻度之间' },
  { id: 'item-2', name: '温度检查', method: '测温枪', value: '', result: 'pass', normalRange: '30-60°C' },
  { id: 'item-3', name: '振动检测', method: '振动仪', value: '', result: 'pass', normalRange: '<5.0mm/s' },
  { id: 'item-4', name: '紧固件检查', method: '目视+扳手', value: '', result: 'pass', normalRange: '无松动' },
  { id: 'item-5', name: '清洁度', method: '目视', value: '', result: 'pass', normalRange: '无油污/异物' },
];

export default function InspectionPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [items, setItems] = useState<InspectionItem[]>(presetItems);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'inspect' | 'result'>('select');

  useEffect(() => {
    api.get('/devices').then((res) => setDevices(res.data.data));
  }, []);

  const handleValueChange = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newResult = value ? 'pass' : 'fail'; // simplified check
        return { ...item, value, result: newResult };
      })
    );
  };

  const handleSubmit = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    try {
      const res = await api.post('/inspections', {
        deviceId: selectedDevice,
        level: 'daily',
        operatorId: 'demo-operator',
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          method: item.method,
          value: item.value,
          result: item.value ? 'pass' : 'fail',
        })),
      });
      setResult(res.data);
      setStep('result');
      if (res.data.triggeredWorkOrderId) {
        message.warning('点检发现异常，已自动创建维修工单！');
      } else {
        message.success('点检完成，所有项目正常！');
      }
    } catch {
      message.error('提交失败，请重试');
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setItems(presetItems);
    setSelectedDevice('');
    setStep('select');
    setResult(null);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {step === 'select' && (
        <Card title="📋 选择设备" style={{ borderRadius: 12 }}>
          <div style={{ marginBottom: 16 }}>
            <Button icon={<ScanOutlined />} size="large" block style={{ height: 48, marginBottom: 12 }}>
              点击模拟扫码
            </Button>
          </div>
          <Select
            showSearch
            placeholder="选择设备"
            value={selectedDevice || undefined}
            onChange={setSelectedDevice}
            style={{ width: '100%' }}
            size="large"
            options={devices.map((d) => ({
              value: d.id,
              label: `${d.code} - ${d.name}`,
            }))}
          />
          <Divider />
          <Button
            type="primary"
            size="large"
            block
            disabled={!selectedDevice}
            onClick={() => setStep('inspect')}
          >
            开始点检
          </Button>
        </Card>
      )}

      {step === 'inspect' && (
        <Card title="🔍 点检执行" style={{ borderRadius: 12 }}>
          <div style={{ marginBottom: 12, color: '#666' }}>
            设备: {devices.find(d => d.id === selectedDevice)?.name}
          </div>
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>{item.name}</strong>
                    <Tag>{item.method}</Tag>
                  </div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>正常范围: {item.normalRange}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <InputNumber
                      style={{ flex: 1 }}
                      placeholder="输入数值或留空"
                      value={item.value ? parseFloat(item.value) : undefined}
                      onChange={(v) => handleValueChange(item.id, v ? String(v) : '')}
                    />
                    <Upload beforeUpload={() => false} showUploadList={false}>
                      <Button icon={<CameraOutlined />} />
                    </Upload>
                  </div>
                </div>
              </List.Item>
            )}
          />
          <Button type="primary" size="large" block onClick={handleSubmit} loading={submitting} style={{ marginTop: 16 }}>
            提交点检结果
          </Button>
          <Button block onClick={handleReset} style={{ marginTop: 8 }}>取消</Button>
        </Card>
      )}

      {step === 'result' && (
        <Card style={{ borderRadius: 12 }}>
          <Result
            status={result?.triggeredWorkOrderId ? 'warning' : 'success'}
            title={result?.triggeredWorkOrderId ? '发现异常，已自动创建工单' : '点检完成，一切正常'}
            subTitle={result?.triggeredWorkOrderId ? `异常项目已自动生成维修工单 (${result.triggeredWorkOrderId.slice(0, 8)}...)` : '所有点检项目均在正常范围内'}
            extra={[
              <Button type="primary" key="back" onClick={handleReset}>继续点检</Button>,
              <Button key="list" onClick={() => window.location.hash = '#/work-orders'}>查看工单</Button>,
            ]}
          />
        </Card>
      )}
    </div>
  );
}
