import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Input, Select, message, Steps, Result, Row, Col, Descriptions, Badge } from 'antd';
import { ScanOutlined, DesktopOutlined, ToolOutlined, CheckCircleOutlined, ArrowRightOutlined } from '@ant-design/icons';
import api from '../services/api';
import { Colors } from '../styles/theme';

interface Device {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface Tooling {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  deviceId: string | null;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  in_stock: { color: Colors.success, label: '在库' },
  in_use: { color: Colors.primary, label: '在用' },
  maintenance: { color: Colors.warning, label: '保养中' },
  repair: { color: '#F97316', label: '维修中' },
  retired: { color: Colors.gray500, label: '已报废' },
  pending_inspect: { color: Colors.info, label: '待检' },
};

export default function ToolingMount() {
  const [step, setStep] = useState(0);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [toolingCode, setToolingCode] = useState('');
  const [toolingSearch, setToolingSearch] = useState('');
  const [toolingOptions, setToolingOptions] = useState<Tooling[]>([]);
  const [selectedTooling, setSelectedTooling] = useState<Tooling | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (deviceSearch) params.keyword = deviceSearch;
      const res = await api.get('/devices/manage', { params });
      setDevices(res.data.data || []);
    } catch {
      message.error('加载设备数据失败');
    } finally {
      setLoading(false);
    }
  }, [deviceSearch]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    setSelectedDevice(device || null);
  };

  const fetchToolings = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { status: 'in_stock' };
      if (toolingSearch) params.search = toolingSearch;
      const res = await api.get('/toolings', { params });
      setToolingOptions(res.data.data || []);
    } catch {
      message.error('加载工治具数据失败');
    } finally {
      setLoading(false);
    }
  }, [toolingSearch]);

  useEffect(() => { fetchToolings(); }, [fetchToolings]);

  const handleToolingSelect = (toolingId: string) => {
    const tooling = toolingOptions.find(t => t.id === toolingId);
    setSelectedTooling(tooling || null);
  };

  const handleManualToolingCode = async () => {
    if (!toolingCode) return;
    setLoading(true);
    try {
      const res = await api.get('/toolings', { params: { search: toolingCode } });
      const found = (res.data.data || []).find(
        (t: Tooling) => t.code === toolingCode || t.name.includes(toolingCode)
      );
      if (found) {
        setSelectedTooling(found);
        message.success(`已找到工治具: ${found.code} - ${found.name}`);
      } else {
        message.warning('未找到匹配的工治具');
      }
    } catch {
      message.error('查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDevice || !selectedTooling) {
      message.warning('请选择设备和工治具');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/toolings/${selectedTooling.id}/mount`, { deviceId: selectedDevice.id });
      setResult({ success: true, message: `工治具 ${selectedTooling.code} 已成功上机到设备 ${selectedDevice.name}` });
      setStep(2);
    } catch {
      setResult({ success: false, message: '上机操作失败，请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setSelectedDevice(null);
    setSelectedTooling(null);
    setDeviceSearch('');
    setToolingSearch('');
    setToolingCode('');
    setResult(null);
  };

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Steps current={step} size="small" items={[
          { title: '选择设备', icon: <DesktopOutlined /> },
          { title: '选择工治具', icon: <ToolOutlined /> },
          { title: '完成', icon: <CheckCircleOutlined /> },
        ]} />
      </Card>

      {step === 0 && (
        <Card title={<span><DesktopOutlined /> 扫描或选择设备</span>} size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form layout="vertical">
                <Form.Item label="设备编码 / 名称">
                  <Input
                    placeholder="扫描条码或输入设备编码/名称搜索"
                    prefix={<ScanOutlined />}
                    value={deviceSearch}
                    onChange={e => setDeviceSearch(e.target.value)}
                    allowClear
                  />
                </Form.Item>
              </Form>
            </Col>
            <Col span={12}>
              <Form layout="vertical">
                <Form.Item label="选择设备">
                  <Select
                    placeholder={loading ? '加载中...' : '请选择设备'}
                    showSearch
                    value={selectedDevice?.id || undefined}
                    onChange={handleDeviceSelect}
                    style={{ width: '100%' }}
                    loading={loading}
                    filterOption={(input, option) =>
                      (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={devices.map(d => ({
                      value: d.id,
                      label: `[${d.code}] ${d.name} (${d.type})`,
                    }))}
                    notFoundContent="暂无匹配设备"
                  />
                </Form.Item>
              </Form>
            </Col>
          </Row>
          {selectedDevice && (
            <Card size="small" type="inner" style={{ marginTop: 12, background: Colors.sidebarActive }}>
              <Descriptions size="small" column={3}>
                <Descriptions.Item label="设备编码">{selectedDevice.code}</Descriptions.Item>
                <Descriptions.Item label="设备名称">{selectedDevice.name}</Descriptions.Item>
                <Descriptions.Item label="设备类型">{selectedDevice.type}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              disabled={!selectedDevice}
              onClick={() => setStep(1)}
            >
              下一步
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card title={<span><ToolOutlined /> 扫描或选择工治具</span>} size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form layout="vertical">
                <Form.Item label="扫描工治具编码（支持手写输入）">
                  <Input.Search
                    placeholder="扫描或输入工治具编码"
                    prefix={<ScanOutlined />}
                    value={toolingCode}
                    onChange={e => setToolingCode(e.target.value)}
                    onSearch={handleManualToolingCode}
                    enterButton="查询"
                    allowClear
                  />
                </Form.Item>
              </Form>
            </Col>
            <Col span={12}>
              <Form layout="vertical">
                <Form.Item label="或在列表中选择（仅显示在库工治具）">
                  <Select
                    placeholder="请选择工治具"
                    showSearch
                    value={selectedTooling?.id || undefined}
                    onChange={handleToolingSelect}
                    style={{ width: '100%' }}
                    loading={loading}
                    filterOption={(input, option) =>
                      (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={toolingOptions.map(t => ({
                      value: t.id,
                      label: `[${t.code}] ${t.name} (${t.type})`,
                      disabled: t.status !== 'in_stock',
                    }))}
                    notFoundContent={loading ? '加载中...' : '暂无在库工治具'}
                  />
                </Form.Item>
              </Form>
            </Col>
          </Row>
          {selectedTooling && (
            <Card size="small" type="inner" style={{ marginTop: 12, background: Colors.sidebarActive }}>
              <Descriptions size="small" column={3}>
                <Descriptions.Item label="工治具编码">{selectedTooling.code}</Descriptions.Item>
                <Descriptions.Item label="工治具名称">{selectedTooling.name}</Descriptions.Item>
                <Descriptions.Item label="类型">{selectedTooling.type}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Badge color={STATUS_CONFIG[selectedTooling.status]?.color} text={STATUS_CONFIG[selectedTooling.status]?.label} />
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setStep(0)}>上一步</Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={!selectedTooling || selectedTooling.status !== 'in_stock'}
              loading={submitting}
              onClick={handleSubmit}
            >
              保存 - 上机
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && result && (
        <Card>
          <Result
            status={result.success ? 'success' : 'error'}
            title={result.success ? '上机成功' : '上机失败'}
            subTitle={result.message}
            extra={[
              <Button type="primary" key="again" onClick={handleReset}>
                继续上机
              </Button>,
            ]}
          />
        </Card>
      )}
    </div>
  );
}
