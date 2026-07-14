import { useState } from 'react';
import { Card, Button, Form, Input, Select, message, Steps, Result, Row, Col, Descriptions, Badge, Tag, Table, Space, Typography } from 'antd';
import { ScanOutlined, DesktopOutlined, ToolOutlined, CheckCircleOutlined, ArrowRightOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useDeviceManageDataSource, useToolingDataSource } from '../services/dataSource';

const { Text } = Typography;

interface Device {
  id: string;
  code: string;
  name: string;
  type: string;
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
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [toolingCode, setToolingCode] = useState('');
  const [toolingSearch, setToolingSearch] = useState('');
  const [selectedToolingIds, setSelectedToolingIds] = useState<string[]>([]);
  const [selectedToolings, setSelectedToolings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // ── Unified data source hooks ──────────────────────────────
  const { data: devices } = useDeviceManageDataSource(deviceSearch || undefined);
  const { data: toolingsData } = useToolingDataSource();
  const toolings = toolingsData as unknown as any[];

  const handleDeviceSelect = (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    setSelectedDevice(device || null);
    if (device) setStep(1);
  };

  const handleManualToolingCode = async () => {
    if (!toolingCode) return;
    setLoading(true);
    try {
      const found = (toolings || []).find(
        (t: any) => t.code === toolingCode || t.name.includes(toolingCode)
      );
      if (found) {
        if (found.status === 'in_stock') {
          setSelectedToolingIds(prev =>
            prev.includes(found.id) ? prev : [...prev, found.id]
          );
          setSelectedToolings(prev =>
            prev.some(t => t.id === found.id) ? prev : [...prev, found]
          );
          message.success(`已添加工治具: ${found.code} - ${found.name}`);
        } else {
          message.warning('该工治具不在"在库"状态，无法上机');
        }
      } else {
        message.warning('未找到匹配的工治具');
      }
    } catch {
      message.error('查询失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (keys: React.Key[], rows: any[]) => {
    setSelectedToolingIds(keys as string[]);
    setSelectedToolings(rows);
  };

  const handleRemoveSelected = (id: string) => {
    setSelectedToolingIds(prev => prev.filter(k => k !== id));
    setSelectedToolings(prev => prev.filter(t => t.id !== id));
  };

  const handleSubmit = async () => {
    if (!selectedDevice || selectedToolingIds.length === 0) {
      message.warning('请选择设备和至少一个工治具');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/toolings/batch-mount', {
        deviceId: selectedDevice.id,
        toolingIds: selectedToolingIds,
      });
      const count = res.data.data?.count || selectedToolingIds.length;
      setResult({ success: true, message: `${count} 个工治具已成功上机到设备 ${selectedDevice.name}` });
      setStep(2);
    } catch {
      setResult({ success: false, message: '批量上机操作失败，请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setSelectedDevice(null);
    setSelectedToolingIds([]);
    setSelectedToolings([]);
    setDeviceSearch('');
    setToolingSearch('');
    setToolingCode('');
    setResult(null);
  };

  const columns: any = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 140, render: (v: string) => <Text code>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Badge color={STATUS_CONFIG[v]?.color} text={STATUS_CONFIG[v]?.label} />,
    },
  ];

  const selectedColumns: any = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 140, render: (v: string) => <Text code>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, r: any) => (
        <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemoveSelected(r.id)} />
      ),
    },
  ];

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Steps current={step} size="small" items={[
          { title: '选择设备', icon: <DesktopOutlined /> },
          { title: '选择工治具（可多选）', icon: <ToolOutlined /> },
          { title: '完成', icon: <CheckCircleOutlined /> },
        ]} />
      </Card>

      {step === 0 && (
        <Card title={<span><DesktopOutlined /> 扫描或选择设备</span>} size="small">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
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
            <Col xs={24} sm={12}>
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
        <Card title={<span><ToolOutlined /> 选择工治具（可多选）</span>} size="small">
          <Row gutter={16} style={{ marginBottom: 12 }}>
            <Col xs={24} sm={12}>
              <Form layout="vertical">
                <Form.Item label="扫描工治具编码">
                  <Input.Search
                    placeholder="扫描或输入编码后回车"
                    prefix={<ScanOutlined />}
                    value={toolingCode}
                    onChange={e => setToolingCode(e.target.value)}
                    onSearch={handleManualToolingCode}
                    enterButton="添加"
                    allowClear
                  />
                </Form.Item>
              </Form>
            </Col>
            <Col xs={24} sm={12}>
              <Form layout="vertical">
                <Form.Item label="搜索在库工治具">
                  <Input
                    placeholder="输入名称/编码筛选"
                    value={toolingSearch}
                    onChange={e => setToolingSearch(e.target.value)}
                    allowClear
                  />
                </Form.Item>
              </Form>
            </Col>
          </Row>

          <Table
            rowKey="id"
            columns={columns as any}
            dataSource={toolings as unknown as any}
            rowSelection={{
              type: 'checkbox',
              selectedRowKeys: selectedToolingIds,
              onChange: handleSelectionChange as any,
              getCheckboxProps: (r: any) => ({ disabled: r.status !== 'in_stock' }),
            }}
            size="small"
            scroll={{ y: 260 }}
            pagination={false}
            locale={{ emptyText: '暂无在库工治具' }}
          />

          {selectedToolings.length > 0 && (
            <Card
              size="small"
              type="inner"
              title={<span style={{ color: Colors.primary }}>已选择 {selectedToolings.length} 个工治具</span>}
              style={{ marginTop: 12 }}
              styles={{ body: { padding: 0 } }}
            >
              <Table
                rowKey="id"
                columns={selectedColumns}
                dataSource={selectedToolings}
                size="small"
                pagination={false}
                style={{ marginTop: 0 }}
              />
            </Card>
          )}

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Button onClick={() => setStep(0)}>上一步</Button>
              <Text style={{ color: Colors.gray500 }}>
                {selectedToolingIds.length > 0
                  ? `已选 ${selectedToolingIds.length} 个工治具，将上机到 ${selectedDevice?.name}`
                  : '请至少选择一个工治具'}
              </Text>
            </Space>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              disabled={selectedToolingIds.length === 0}
              loading={submitting}
              onClick={handleSubmit}
            >
              批量上机 ({selectedToolingIds.length})
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