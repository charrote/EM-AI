import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Form, Input, Select, message, Radio, Row, Col, Descriptions, Tag, Badge, Table, Space, Typography } from 'antd';
import { ScanOutlined, DesktopOutlined, ToolOutlined, SwapOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import { Colors } from '../styles/theme';

const { Text } = Typography;

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
  device?: { id: string; code: string; name: string } | null;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  in_stock: { color: Colors.success, label: '在库' },
  in_use: { color: Colors.primary, label: '在用' },
  maintenance: { color: Colors.warning, label: '保养中' },
  repair: { color: '#F97316', label: '维修中' },
  retired: { color: Colors.gray500, label: '已报废' },
  pending_inspect: { color: Colors.info, label: '待检' },
};

export default function ToolingDismount() {
  const [method, setMethod] = useState<'method1' | 'method2'>('method1');

  // Method 1: scan device → load toolings → select → dismount
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceToolings, setDeviceToolings] = useState<Tooling[]>([]);
  const [deviceToolingsLoading, setDeviceToolingsLoading] = useState(false);
  const [selectedDismountIds, setSelectedDismountIds] = useState<string[]>([]);

  // Method 2: scan tooling → dismount
  const [toolingCode, setToolingCode] = useState('');
  const [scannedTooling, setScannedTooling] = useState<Tooling | null>(null);

  // Common
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Method 1: Device search ─────────────────────────────
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

  const handleDeviceSelect = async (deviceId: string) => {
    const device = devices.find(d => d.id === deviceId);
    setSelectedDevice(device || null);
    setSelectedDismountIds([]);
    if (device) {
      setDeviceToolingsLoading(true);
      try {
        const res = await api.get(`/toolings/by-device/${device.id}`);
        setDeviceToolings(res.data.data || []);
      } catch {
        message.error('加载设备工治具失败');
        setDeviceToolings([]);
      } finally {
        setDeviceToolingsLoading(false);
      }
    } else {
      setDeviceToolings([]);
    }
  };

  const columns: ColumnsType<Tooling> = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 140, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v];
        return <Badge color={cfg?.color} text={cfg?.label || v} />;
      },
    },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: unknown, r: Tooling) => (
        <Button
          size="small"
          type="primary"
          icon={<SwapOutlined />}
          onClick={() => handleDismount(r.id, r.code)}
          disabled={r.status !== 'in_use'}
        >
          单个下机
        </Button>
      ),
    },
  ];

  // ── Method 2: Scan tooling ──────────────────────────────
  const handleScanTooling = async () => {
    if (!toolingCode) return;
    setLoading(true);
    try {
      const res = await api.get('/toolings', { params: { search: toolingCode } });
      const found = (res.data.data || []).find(
        (t: Tooling) => t.code === toolingCode || t.name.includes(toolingCode)
      );
      if (found) {
        setScannedTooling(found);
        message.success(`已找到工治具: ${found.code} - ${found.name}`);
      } else {
        message.warning('未找到匹配的工治具');
        setScannedTooling(null);
      }
    } catch {
      message.error('查询失败');
    } finally {
      setLoading(false);
    }
  };

  // ── Dismount ────────────────────────────────────────────
  const refreshDeviceToolings = async () => {
    if (!selectedDevice) return;
    try {
      const res = await api.get(`/toolings/by-device/${selectedDevice.id}`);
      setDeviceToolings(res.data.data || []);
    } catch {
      message.error('刷新设备工治具列表失败');
    }
  };

  const handleDismount = async (toolingId: string, toolingCode: string) => {
    setSubmitting(true);
    try {
      await api.put(`/toolings/${toolingId}/dismount`);
      message.success(`工治具 ${toolingCode} 已成功下机`);
      await refreshDeviceToolings();
      setSelectedDismountIds(prev => prev.filter(id => id !== toolingId));
    } catch {
      message.error('下机操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchDismount = async () => {
    if (selectedDismountIds.length === 0) {
      message.warning('请至少选择一个工治具');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/toolings/batch-dismount', { toolingIds: selectedDismountIds });
      const count = res.data.data?.count || selectedDismountIds.length;
      message.success(`${count} 个工治具已成功下机`);
      await refreshDeviceToolings();
      setSelectedDismountIds([]);
    } catch {
      message.error('批量下机操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMethod2Dismount = async () => {
    if (!scannedTooling) {
      message.warning('请先扫描工治具');
      return;
    }
    if (scannedTooling.status !== 'in_use') {
      message.warning('该工治具不在使用中，无需下机');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/toolings/${scannedTooling.id}/dismount`);
      message.success(`工治具 ${scannedTooling.code} 已成功下机`);
      setScannedTooling(null);
      setToolingCode('');
    } catch {
      message.error('下机操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedDevice(null);
    setDeviceToolings([]);
    setDeviceSearch('');
    setToolingCode('');
    setScannedTooling(null);
    setSelectedDismountIds([]);
  };

  return (
    <div>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Radio.Group
          value={method}
          onChange={e => { setMethod(e.target.value); setSelectedDevice(null); setDeviceToolings([]); setScannedTooling(null); setToolingCode(''); setSelectedDismountIds([]); }}
          optionType="button"
          buttonStyle="solid"
        >
          <Radio.Button value="method1">扫描设备下机</Radio.Button>
          <Radio.Button value="method2">扫描工治具下机</Radio.Button>
        </Radio.Group>
      </Card>

      {method === 'method1' && (
        <>
          <Card title={<span><DesktopOutlined /> 扫描设备</span>} size="small" style={{ marginBottom: 12 }}>
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
          </Card>

          {selectedDevice && (
            <Card
              title={<span><ToolOutlined /> {selectedDevice.name} - 设备上的工治具</span>}
              size="small"
              styles={{ body: { padding: 0 } }}
              extra={
                <Space>
                  <Text style={{ color: Colors.gray500 }}>
                    {selectedDismountIds.length > 0 ? `已选 ${selectedDismountIds.length} 个` : ''}
                  </Text>
                  <Button
                    type="primary"
                    icon={<DeleteOutlined />}
                    onClick={handleBatchDismount}
                    disabled={selectedDismountIds.length === 0}
                    loading={submitting}
                    size="small"
                  >
                    批量下机 ({selectedDismountIds.length})
                  </Button>
                </Space>
              }
            >
              <Table
                rowKey="id"
                columns={columns}
                dataSource={deviceToolings}
                loading={deviceToolingsLoading}
                size="small"
                scroll={{ x: 'max-content' }}
                pagination={false}
                locale={{ emptyText: '该设备上暂无工治具' }}
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedDismountIds,
                  onChange: (keys) => setSelectedDismountIds(keys as string[]),
                  getCheckboxProps: (r: Tooling) => ({ disabled: r.status !== 'in_use' }),
                }}
              />
            </Card>
          )}
        </>
      )}

      {method === 'method2' && (
        <Card title={<span><ScanOutlined /> 扫描工治具</span>} size="small">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form layout="vertical">
                <Form.Item label="工治具编码">
                  <Input.Search
                    placeholder="扫描或输入工治具编码"
                    prefix={<ScanOutlined />}
                    value={toolingCode}
                    onChange={e => setToolingCode(e.target.value)}
                    onSearch={handleScanTooling}
                    enterButton="查询"
                    allowClear
                  />
                </Form.Item>
              </Form>
            </Col>
          </Row>
          {scannedTooling && (
            <Card size="small" type="inner" style={{ marginTop: 12, background: Colors.sidebarActive }}>
              <Descriptions size="small" column={3}>
                <Descriptions.Item label="工治具编码">{scannedTooling.code}</Descriptions.Item>
                <Descriptions.Item label="工治具名称">{scannedTooling.name}</Descriptions.Item>
                <Descriptions.Item label="类型">{scannedTooling.type}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Badge color={STATUS_CONFIG[scannedTooling.status]?.color} text={STATUS_CONFIG[scannedTooling.status]?.label} />
                </Descriptions.Item>
                <Descriptions.Item label="关联设备">{scannedTooling.device?.name || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={handleMethod2Dismount}
              disabled={!scannedTooling || scannedTooling.status !== 'in_use'}
              loading={submitting}
            >
              工治具下机
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}