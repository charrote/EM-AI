// @ts-nocheck - Complex component with many dynamic data types
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Modal, Form, Input, Select, InputNumber,
  message, Tag, Typography, Row, Col, Divider, Descriptions, Upload,
  Badge, Alert, Statistic, Result,
} from 'antd';
import {
  ScanOutlined, CameraOutlined, SoundOutlined,
  HistoryOutlined, FormOutlined, ThunderboltOutlined,
  ToolOutlined, ExperimentOutlined, FireOutlined,
  CloudOutlined, QuestionCircleOutlined, ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import { Colors, PriorityColors, PriorityLabels } from '../styles/theme';
import { useDeviceDataSource } from '../services/dataSource';

const { Text, Title } = Typography;

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

  // ── Unified data source hook ───────────────────────────────
  const {
    data: devices,
    loading: devicesLoading,
    refresh: refreshDevices,
  } = useDeviceDataSource('default');
  const loading = devicesLoading;

  // State
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    faultType: undefined as string | undefined,
    priority: 'P1' as string,
    description: '',
    images: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [globalRecentFaults, setGlobalRecentFaults] = useState<any[]>([]);
  const [deviceRecentFaults, setDeviceRecentFaults] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');

  // 设备搜索过滤（仅搜索时展示列表）
  const filteredDevices = useMemo(() => {
    if (!searchText) return [];
    return devices.filter((d: any) =>
      d.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      d.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      d.area?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [devices, searchText]);

  // 加载全局最近报修记录
  useEffect(() => {
    api.get('/work-orders?days=7&limit=10')
      .then((res) => setGlobalRecentFaults(res.data.data || []))
      .catch(() => setGlobalRecentFaults([]));
  }, []);

  const handleSelectDevice = async (deviceId: string) => {
    // ① 优先从已加载的 devices 列表中查找（兼容 real 模式下 API 回退到 mock 数据的场景）
    const cachedDevice = devices?.find((d: any) => d.id === deviceId);

    try {
      // ② 尝试从真实 API 获取设备详情
      const res = await api.get(`/devices/${deviceId}`);
      const device = res.data.data || res.data;
      setSelectedDevice(device);
      // 获取近 30 天故障记录
      try {
        const faultsRes = await api.get(`/devices/${deviceId}/work-orders?days=30`);
        setDeviceRecentFaults(faultsRes.data.data?.slice(0, 10) || []);
      } catch {
        setDeviceRecentFaults([]);
      }
      setFormOpen(true);
    } catch (apiErr: any) {
      console.warn('[ReportFault] 设备详情 API 不可用，使用本地缓存数据:', apiErr.message);
      // ③ API 不可用时，回退到本地已加载的设备数据
      if (cachedDevice) {
        setSelectedDevice(cachedDevice);
        setDeviceRecentFaults([]);
        setFormOpen(true);
        message.warning('使用本地数据，设备详情暂不可用');
      } else {
        message.error('设备加载失败，请刷新设备列表后重试');
      }
    }
  };

  // 模拟扫码
  const handleScan = () => {
    setTimeout(() => {
      const randomDevice = devices[Math.floor(Math.random() * devices.length)];
      handleSelectDevice(randomDevice.id);
    }, 1500);
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
      setFormOpen(false);
      setSearchText('');
      setSelectedDevice(null);
      setForm({ faultType: undefined, priority: 'P1', description: '', images: [] });
      message.success('报修工单已创建！');
      refreshDevices();
    } catch {
      message.error('提交失败');
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setFormOpen(false);
    setSelectedDevice(null);
    setDeviceRecentFaults([]);
    setForm({ faultType: undefined, priority: 'P1', description: '', images: [] });
    setResult(null);
    setSearchText('');
  };

  // 设备列表列
  const deviceColumns: ColumnsType<any> = [
    {
      title: '设备编码', dataIndex: 'code', key: 'code', width: 120,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: '设备名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '设备类型', dataIndex: 'type', key: 'type', width: 100 },
    { title: '所在区域', dataIndex: 'area', key: 'area', width: 100 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, r: any) => (
        <Button size="small" type="primary" icon={<FormOutlined />} onClick={() => handleSelectDevice(r.id)}>
          报修
        </Button>
      ),
    },
  ];

  // 最近故障列
  const recentColumns: ColumnsType<any> = [
    {
      title: '工单号', dataIndex: 'code', key: 'code', width: 140,
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: '故障类型', dataIndex: 'faultType', key: 'faultType', width: 90,
      render: (v: string) => <Tag>{v || '-'}</Tag>,
    },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 80,
      render: (v: string) => <Tag color={PriorityColors[v]}>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => <Badge color={v === 'completed' ? Colors.success : Colors.danger} text={v} />,
    },
    {
      title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 160,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
  ];

  return (
    <div>
      {/* ─── 顶栏 ─── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <FormOutlined style={{ marginRight: 8, color: Colors.primary }} />
            快捷报修
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refreshDevices}>刷新设备</Button>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* ─── 设备选择 ─── */}
        <Col span={24}>
          <Card title="选择设备" size="small" styles={{ body: { padding: 24 } }}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 扫码按钮 */}
              <Button
                type="primary"
                icon={<ScanOutlined />}
                block
                size="large"
                style={{ borderRadius: 8, height: 48, fontSize: 16 }}
                onClick={handleScan}
              >
                扫描设备二维码
              </Button>

              <Divider plain>或搜索设备</Divider>

              {/* 设备搜索 */}
              <Input
                placeholder="输入设备编码/名称搜索..."
                size="large"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ borderRadius: 8 }}
              />

              {/* 设备列表 */}
              <Table
                columns={deviceColumns}
                dataSource={filteredDevices}
                rowKey="id"
                loading={loading}
                size="small"
                locale={{ emptyText: searchText ? '未找到匹配设备' : '请输入设备编码/名称搜索' }}
                scroll={{ x: 800 }}
              />
            </Space>
          </Card>
        </Col>

        {/* ─── 最近报修记录 ─── */}
        <Col span={24}>
          <Card
            title={<Space><HistoryOutlined /> 最近报修记录</Space>}
            size="small"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              columns={recentColumns}
              dataSource={globalRecentFaults}
              rowKey="id"
              pagination={false}
              size="small"
              locale={{ emptyText: '暂无报修记录' }}
              scroll={{ y: 400 }}
            />
          </Card>
        </Col>
      </Row>

      {/* ─── 选中设备信息 ─── */}
      {selectedDevice && (
        <Card style={{ marginTop: 16 }} size="small">
          <Alert
            message={`已选择设备：${selectedDevice.name}`}
            description={
              <Descriptions column={4} size="small">
                <Descriptions.Item label="编码">{selectedDevice.code}</Descriptions.Item>
                <Descriptions.Item label="类型">{selectedDevice.type}</Descriptions.Item>
                <Descriptions.Item label="区域">{selectedDevice.area}</Descriptions.Item>
                <Descriptions.Item label="状态">
                  <Tag>{selectedDevice.status}</Tag>
                </Descriptions.Item>
              </Descriptions>
            }
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />

          {deviceRecentFaults.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Title level={5} style={{ margin: 0 }}>该设备近 30 天故障</Title>
              <Table
                columns={recentColumns}
                dataSource={deviceRecentFaults}
                rowKey="id"
                pagination={false}
                size="small"
                style={{ marginTop: 8 }}
              />
            </>
          )}

          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
              立即报修
            </Button>
          </div>
        </Card>
      )}

      {/* ─── 报修表单 ─── */}
      <Modal
        title="快捷报修"
        open={formOpen}
        onCancel={() => { setFormOpen(false); setForm({ faultType: undefined, priority: 'P1', description: '', images: [] }); }}
        onOk={() => handleSubmit()}
        width={720}
        destroyOnClose
        okText="提交报修"
        cancelText="取消"
        confirmLoading={submitting}
      >
        {selectedDevice && (
          <Alert
            message={`设备：${selectedDevice.name}（${selectedDevice.code}）`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="故障类型" rules={[{ required: true, message: '请选择故障类型' }]}>
              <Select
                value={form.faultType}
                onChange={(v) => setForm({ ...form, faultType: v })}
                placeholder="选择故障类型"
                options={faultTypeOptions.map(opt => ({
                  value: opt.value,
                  label: <Space>{opt.icon}{opt.label}</Space>,
                }))}
                style={{ width: '100%', borderRadius: 6 }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="故障等级" rules={[{ required: true, message: '请选择故障等级' }]}>
              <Select
                value={form.priority}
                onChange={(v) => setForm({ ...form, priority: v })}
                placeholder="选择故障等级"
                options={priorityOptions.map(opt => ({
                  value: opt.value,
                  label: (
                    <Space>
                      <Tag color={opt.color} style={{ borderRadius: 4, border: 'none', margin: 0, fontSize: 11 }}>{opt.value}</Tag>
                      <span>{opt.label}</span>
                    </Space>
                  ),
                }))}
                style={{ width: '100%', borderRadius: 6 }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="故障描述" rules={[{ required: true, message: '请输入故障描述' }]}>
          <Input.TextArea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="请详细描述故障现象（支持语音输入）"
            style={{ borderRadius: 6 }}
          />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="现场照片">
              <Upload beforeUpload={() => false} showUploadList={{ limit: 4 }}>
                <Button icon={<CameraOutlined />} style={{ borderRadius: 6, width: '100%' }}>拍照上传（≤4 张）</Button>
              </Upload>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="语音报修">
              <Button icon={<SoundOutlined />} style={{ borderRadius: 6, width: '100%' }}>语音识别输入</Button>
            </Form.Item>
          </Col>
        </Row>
      </Modal>
    </div>
  );
}