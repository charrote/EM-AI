import { useState, useCallback, useEffect } from 'react';
import {
  Card, Button, Space, Typography, Row, Col, Table, Input, Select, Tag,
  message, Modal, Form, Descriptions, Divider, Popconfirm, Badge, DatePicker,
  InputNumber, Empty, Tooltip, Tabs, List, Upload as AntUpload,
} from 'antd';
import {
  PlusOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
  SearchOutlined, DownloadOutlined, UploadOutlined,
  DatabaseOutlined, SettingOutlined, FileOutlined, LinkOutlined,
  InboxOutlined, MinusCircleOutlined, ToolOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useApiDataSource } from '../services/dataSource';
import api from '../services/api';
import { generateMockDevices } from '../services/mockData';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

const { Text, Title } = Typography;
const { Dragger } = AntUpload;

// ── Document types ─────────────────────────────
interface DocRecord {
  id: string;
  name: string;
  fileName: string;
  url: string;
  type: 'manual' | 'inspection' | 'operation' | 'other';
  size: number;
  uploadedAt: string;
}

const DOC_TYPE_OPTIONS = [
  { value: 'manual', label: '保养手册' },
  { value: 'inspection', label: '点检手册' },
  { value: 'operation', label: '操作说明' },
  { value: 'other', label: '其他' },
];

const DOC_TYPE_MAP: Record<string, string> = {
  manual: '保养手册', inspection: '点检手册', operation: '操作说明', other: '其他',
};

// ── Status & Priority ──────────────────────────
const STATUS_OPTIONS = [
  { value: 'running', label: '运行中', color: Colors.success },
  { value: 'idle', label: '待机', color: Colors.gray400 },
  { value: 'fault', label: '故障', color: Colors.danger },
  { value: 'maintenance', label: '保养中', color: Colors.warning },
  { value: 'repair', label: '维修中', color: Colors.warning },
  { value: 'changeover', label: '换型中', color: '#8B5CF6' },
  { value: 'retired', label: '已报废', color: Colors.gray500 },
];

const PRIORITY_OPTIONS = [
  { value: 'A', label: 'A - 关键', color: Colors.danger },
  { value: 'B', label: 'B - 重要', color: Colors.warning },
  { value: 'C', label: 'C - 普通', color: Colors.info },
];

// ── Component ──────────────────────────────────
export default function DeviceManagePage() {
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterWorkshop, setFilterWorkshop] = useState<string>('');
  const [keyword, setKeyword] = useState('');

  // Org tree for cascading selects
  const [orgTree, setOrgTree] = useState<any[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);

  // ── Create/Edit Modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [form] = Form.useForm();

  // Detail modal
  const [detailModal, setDetailModal] = useState(false);
  const [detailDevice, setDetailDevice] = useState<any>(null);

  // ── Tab 3: Document management ──
  const [typeDocs, setTypeDocs] = useState<DocRecord[]>([]);
  const [deviceDocs, setDeviceDocs] = useState<DocRecord[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<'manual' | 'inspection' | 'operation' | 'other'>('manual');
  const [uploading, setUploading] = useState(false);

  const { isMobile } = useResponsive();

  // ── Data fetching ──
  const { data: devices, loading, refresh: fetchDevices } = useApiDataSource(
    '/api/devices/manage?page=' + page + '&pageSize=' + pageSize + (filterType ? '&type=' + filterType : '') + (filterStatus ? '&status=' + filterStatus : '') + (filterWorkshop ? '&workshopId=' + filterWorkshop : '') + (keyword ? '&keyword=' + keyword : ''),
    generateMockDevices(20)
  );

  const fetchMeta = useCallback(async () => {
    try {
      const [orgRes, typesRes] = await Promise.all([
        api.get('/organizations/tree'),
        api.get('/devices/manage/types'),
      ]);
      setOrgTree(orgRes.data.data || []);
      setDeviceTypes((typesRes.data.data || []).map((t: any) => t.name));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchMeta(); }, []);

  // Fetch device type documents when editing
  useEffect(() => {
    if (editingDevice?.type) {
      api.get('/devices/manage/types').then(res => {
        const types = res.data.data || [];
        const match = types.find((t: any) => t.name === editingDevice.type);
        setTypeDocs(match?.documents || []);
      }).catch(() => setTypeDocs([]));
    } else {
      setTypeDocs([]);
    }
  }, [editingDevice?.type]);

  // Get org list for cascading
  const getOrgByLevel = (level: string) => {
    const result: { id: string; name: string }[] = [];
    const walk = (nodes: any[]) => {
      nodes.forEach(n => {
        if (n.level === level) result.push({ id: n.id, name: n.name });
        if (n.children) walk(n.children);
      });
    };
    walk(orgTree);
    return result;
  };

  const workshops = getOrgByLevel('workshop');
  const lines = getOrgByLevel('line');

  // ── CRUD ──
  const openCreate = () => {
    setModalMode('create');
    setEditingDevice(null);
    setDeviceDocs([]);
    setTypeDocs([]);
    setActiveTab('basic');
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setModalMode('edit');
    setEditingDevice(record);
    setDeviceDocs(record.documents || []);
    setActiveTab('basic');
    form.setFieldsValue({
      ...record,
      installDate: record.installDate ? record.installDate.split('T')[0] : undefined,
      warrantyUntil: record.warrantyUntil ? record.warrantyUntil.split('T')[0] : undefined,
      specifications: record.specifications ? JSON.stringify(record.specifications, null, 2) : '',
      onlineParams: (() => {
        // 兼容旧格式: 数组 → 转换为新结构
        const raw = record.onlineParams;
        if (Array.isArray(raw)) {
          return { ip: '', port: undefined, protocol: '', driverName: '', driverVersion: '', driverFile: '', customParams: raw };
        }
        return raw || { ip: '', port: undefined, protocol: '', driverName: '', driverVersion: '', driverFile: '', customParams: [] };
      })(),
      programList: record.programList || [],
      theoreticalCapacity: record.theoreticalCapacity ?? undefined,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        // Parse specifications JSON
        specifications: values.specifications
          ? (() => { try { return JSON.parse(values.specifications); } catch { return { raw: values.specifications }; } })()
          : null,
        // Include device documents
        documents: deviceDocs.length > 0 ? deviceDocs : undefined,
      };

      if (modalMode === 'create') {
        await api.post('/devices/manage', payload);
        message.success('设备已创建');
      } else if (editingDevice) {
        await api.put(`/devices/manage/${editingDevice.id}`, payload);
        message.success('设备已更新');
      }
      setModalOpen(false);
      fetchDevices();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '操作失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await api.delete(`/devices/manage/${record.id}`);
      message.success('已删除');
      fetchDevices();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '删除失败';
      message.error(msg);
    }
  };

  // ── Document upload handlers ──
  const handleDocUpload = async () => {
    if (!uploadFile || !uploadName.trim()) {
      message.warning('请填写文档名称并选择文件');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', uploadFile);
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls: string[] = uploadRes.data.data || [];
      if (urls.length === 0) throw new Error('Upload failed');

      const newDoc: DocRecord = {
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        name: uploadName.trim(),
        fileName: uploadFile.name,
        url: urls[0],
        type: uploadType,
        size: uploadFile.size,
        uploadedAt: new Date().toISOString(),
      };

      setDeviceDocs(prev => [...prev, newDoc]);
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadName('');
      setUploadType('manual');
      message.success('文档已上传');
    } catch (err: any) {
      const msg = err?.response?.data?.error || '上传失败';
      message.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDocDelete = (docId: string) => {
    setDeviceDocs(prev => prev.filter(d => d.id !== docId));
    message.success('文档已删除');
  };

  // ── Columns ──
  const columns: ColumnsType<any> = [
    {
      title: '编码', dataIndex: 'code', key: 'code', width: 90,
      fixed: 'left',
      render: (v: string) => <Text code>{v}</Text>,
    },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true, width: 140 },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (v: string) => <Tag style={{ borderRadius: 4, border: 'none' }}>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 70,
      render: (v: string) => {
        const cfg = STATUS_OPTIONS.find(s => s.value === v);
        return <Badge color={cfg?.color} text={cfg?.label || v} />;
      },
    },
    ...(isMobile ? [] : [
      { title: '品牌', dataIndex: 'brand', key: 'brand', width: 80, render: (v: string) => v || '-' },
      {
        title: '所属车间', dataIndex: 'workshopName', key: 'workshopName', width: 100,
        render: (v: string) => v || '-',
      },
      {
        title: '所属产线', dataIndex: 'lineName', key: 'lineName', width: 100,
        render: (v: string) => v || '-',
      },
      {
        title: '优先级', dataIndex: 'priority', key: 'priority', width: 60,
        render: (v: string) => {
          const cfg = PRIORITY_OPTIONS.find(p => p.value === v);
          return <Tag color={cfg?.color} style={{ borderRadius: 4, border: 'none' }}>{v}</Tag>;
        },
      },
      {
        title: (
          <Space size={4}>
            <span>健康度</span>
            <Tooltip title={
              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                <b>健康度</b> 是设备综合健康评分（0-100），综合评估 OEE、MTBF、MTTR、故障频率等维度：<br />
                <span style={{ color: Colors.success }}>≥ 75</span> 优秀 · <span style={{ color: Colors.warning }}>≥ 60</span> 一般 · <span style={{ color: Colors.danger }}>&lt; 60</span> 较差
              </div>
            }>
              <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', color: Colors.gray400, fontSize: 14 }}>?</span>
            </Tooltip>
          </Space>
        ),
        dataIndex: 'healthScore', key: 'healthScore', width: 70,
        render: (v: number) => v != null
          ? <Text strong style={{ color: v >= 75 ? Colors.success : v >= 60 ? Colors.warning : Colors.danger }}>{v}</Text>
          : '-',
      },
    ] as ColumnsType<any>),
    {
      title: '操作', key: 'action', width: 80, fixed: 'right',
      render: (_: any, record: any) => (
        <Space size={0}>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="确定删除此设备？"
            description="有工单关联时无法删除"
            onConfirm={() => handleDelete(record)}
          >
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ── Filter bar ──
  const renderFilters = () => (
    <Card size="small" style={{ marginBottom: 12 }} styles={{ body: { padding: '8px 12px' } }}>
      <Row gutter={[8, 8]} align="middle">
        <Col xs={12} sm={8} md={5}>
          <Select
            placeholder="设备类型"
            value={filterType || undefined}
            onChange={setFilterType}
            allowClear
            style={{ width: '100%' }}
            size={isMobile ? 'small' : 'middle'}
            options={deviceTypes.map(t => ({ value: t, label: t }))}
          />
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Select
            placeholder="状态"
            value={filterStatus || undefined}
            onChange={setFilterStatus}
            allowClear
            style={{ width: '100%' }}
            size={isMobile ? 'small' : 'middle'}
            options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
          />
        </Col>
        <Col xs={12} sm={8} md={5}>
          <Select
            placeholder="所属车间"
            value={filterWorkshop || undefined}
            onChange={setFilterWorkshop}
            allowClear
            style={{ width: '100%' }}
            size={isMobile ? 'small' : 'middle'}
            options={workshops.map(w => ({ value: w.id, label: w.name }))}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Input
            placeholder="搜索编码/名称/品牌..."
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            allowClear
            size={isMobile ? 'small' : 'middle'}
            onPressEnter={() => { setPage(1); fetchDevices(); }}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Space size={4}>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => { setPage(1); fetchDevices(); }} size={isMobile ? 'small' : 'middle'}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => { setFilterType(''); setFilterStatus(''); setFilterWorkshop(''); setKeyword(''); setPage(1); }} size={isMobile ? 'small' : 'middle'} />
          </Space>
        </Col>
      </Row>
    </Card>
  );

  // ── Form Tabs ──
  const formContent = (
    <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" style={{ minHeight: 400 }}>
      {/* ════ Tab 1: 设备档案 ════ */}
      <Tabs.TabPane tab="设备档案" key="basic" forceRender>
        <Divider plain style={{ fontSize: 12, color: Colors.gray500, marginTop: 0 }}>基本信息</Divider>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="设备编码" name="code" rules={[{ required: true, message: '必填' }]}>
              <Input placeholder="如: CNC-01" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="设备名称" name="name" rules={[{ required: true, message: '必填' }]}>
              <Input placeholder="如: 三轴加工中心" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="设备类型" name="type" rules={[{ required: true, message: '必填' }]}>
              <Select placeholder="选择类型" options={deviceTypes.map(t => ({ value: t, label: t }))} />
            </Form.Item>
          </Col>
        </Row>

        <Divider plain style={{ fontSize: 12, color: Colors.gray500 }}>设备参数</Divider>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="品牌" name="brand">
              <Input placeholder="如: 海天" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="型号" name="modelName">
              <Input placeholder="如: HT-300" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="序列号" name="serialNo">
              <Input placeholder="如: SN20240001" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="供应商" name="supplier">
              <Input placeholder="如: 海天精工" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="安装日期" name="installDate">
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="保修至" name="warrantyUntil">
              <Input type="date" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider plain style={{ fontSize: 12, color: Colors.gray500 }}>归属与运行</Divider>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="所属车间" name="workshopId">
              <Select allowClear placeholder="选择车间" options={workshops.map(w => ({ value: w.id, label: w.name }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="所属产线" name="lineId">
              <Select allowClear placeholder="选择产线" options={lines.map(l => ({ value: l.id, label: l.name }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="区域" name="area">
              <Input placeholder="如: A区-3号位" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item label="状态" name="status">
              <Select options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="优先级" name="priority">
              <Select options={PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }))} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="功率 (kW)" name="powerRating">
              <InputNumber min={0} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="健康度" name="healthScore">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="OEE 目标 (%)" name="oeeTarget">
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item label="技术参数" name="specifications">
              <Input.TextArea rows={1} placeholder='JSON 格式，如 {"主轴转速": 12000}' />
            </Form.Item>
          </Col>
        </Row>
      </Tabs.TabPane>

      {/* ════ Tab 2: 参数与程序 ════ */}
      <Tabs.TabPane tab="参数与程序" key="params" forceRender>
        <Divider plain style={{ fontSize: 12, color: Colors.gray500, marginTop: 0 }}>理论产能</Divider>
        <Row gutter={12}>
          <Col span={8}>
            <Form.Item label="理论产能 (件/小时)" name="theoreticalCapacity">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="如: 120" />
            </Form.Item>
          </Col>
        </Row>

        <Divider plain style={{ fontSize: 12, color: Colors.gray500 }}>联机要素</Divider>
        <Row gutter={12}>
          <Col xs={12} sm={8}>
            <Form.Item label="IP 地址" name={['onlineParams', 'ip']}>
              <Input placeholder="如: 192.168.1.100" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={4}>
            <Form.Item label="端口号" name={['onlineParams', 'port']}>
              <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="如: 502" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="通讯协议" name={['onlineParams', 'protocol']}>
              <Select placeholder="选择协议" allowClear
                options={[
                  { value: 'Modbus TCP', label: 'Modbus TCP' },
                  { value: 'Modbus RTU', label: 'Modbus RTU' },
                  { value: 'OPC UA', label: 'OPC UA' },
                  { value: 'Siemens S7', label: 'Siemens S7' },
                  { value: 'Mitsubishi MC', label: 'Mitsubishi MC' },
                  { value: 'EtherNet/IP', label: 'EtherNet/IP' },
                  { value: 'PROFINET', label: 'PROFINET' },
                  { value: 'BACnet', label: 'BACnet' },
                  { value: '自定义', label: '自定义' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider plain style={{ fontSize: 12, color: Colors.gray500 }}>驱动程序</Divider>
        <Row gutter={12}>
          <Col xs={24} sm={8}>
            <Form.Item label="驱动名称" name={['onlineParams', 'driverName']}>
              <Input placeholder="如: Siemens S7 Driver" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={4}>
            <Form.Item label="版本" name={['onlineParams', 'driverVersion']}>
              <Input placeholder="如: 2.1.0" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item label="驱动文件" name={['onlineParams', 'driverFile']}>
              <Input placeholder="选择文件或输入URL" addonAfter={
                <span style={{ cursor: 'pointer' }} onClick={() => {
                  // Trigger file input
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.zip,.exe,.msi,.dll,.tar.gz';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      form.setFieldValue(['onlineParams', 'driverFile'], file.name);
                      message.info(`已选择: ${file.name}`);
                    }
                  };
                  input.click();
                }}>浏览</span>
              } />
            </Form.Item>
          </Col>
        </Row>

        <Divider plain style={{ fontSize: 12, color: Colors.gray500 }}>自定义参数</Divider>
        <Form.List name={['onlineParams', 'customParams']}>
          {(fields, { add, remove }) => (
            <div>
              {fields.map(({ key, name, ...restField }, index) => (
                <Row gutter={8} key={key} align="middle" style={{ marginBottom: 8 }}>
                  <Col span={8}>
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: '参数名' }]} noStyle>
                      <Input placeholder="参数名" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item {...restField} name={[name, 'value']} rules={[{ required: true, message: '值' }]} noStyle>
                      <Input placeholder="值" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item {...restField} name={[name, 'unit']} noStyle>
                      <Input placeholder="单位" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} size="small" />
                  </Col>
                </Row>
              ))}
              {fields.length === 0 && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>暂无自定义参数</Text>
              )}
              <Button type="dashed" onClick={() => add({ name: '', value: '', unit: '' })} size="small" icon={<PlusOutlined />} style={{ width: '100%' }}>
                添加自定义参数
              </Button>
            </div>
          )}
        </Form.List>

        <Divider plain style={{ fontSize: 12, color: Colors.gray500, marginTop: 16 }}>设备程序清单</Divider>
        <Form.List name="programList">
          {(fields, { add, remove }) => (
            <div>
              {fields.map(({ key, name, ...restField }, index) => (
                <Row gutter={8} key={key} align="middle" style={{ marginBottom: 8 }}>
                  <Col span={6}>
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: '程序名' }]} noStyle>
                      <Input placeholder="程序名称" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item {...restField} name={[name, 'version']} noStyle>
                      <Input placeholder="版本" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={5}>
                    <Form.Item {...restField} name={[name, 'date']} noStyle>
                      <Input type="date" style={{ width: '100%' }} size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item {...restField} name={[name, 'description']} noStyle>
                      <Input placeholder="说明" size="small" />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} size="small" />
                  </Col>
                </Row>
              ))}
              {fields.length === 0 && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>暂无设备程序</Text>
              )}
              <Button type="dashed" onClick={() => add({ name: '', version: '', date: '', description: '' })} size="small" icon={<PlusOutlined />} style={{ width: '100%' }}>
                添加程序
              </Button>
            </div>
          )}
        </Form.List>
      </Tabs.TabPane>

      {/* ════ Tab 3: 设备文档 ════ */}
      <Tabs.TabPane tab="设备文档" key="docs" forceRender>
        <Divider plain style={{ fontSize: 12, color: Colors.gray500, marginTop: 0 }}>设备类型文档</Divider>
        {editingDevice && typeDocs.length > 0 ? (
          <List
            size="small"
            dataSource={typeDocs}
            renderItem={(doc) => (
              <List.Item
                actions={[
                  <Button type="text" size="small" icon={<LinkOutlined />} onClick={() => window.open(doc.url, '_blank')} />,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileOutlined style={{ fontSize: 18, color: Colors.primary }} />}
                  title={
                    <Space size={4}>
                      <Text style={{ fontSize: 13 }}>{doc.name}</Text>
                      <Tag style={{ fontSize: 10, borderRadius: 4, border: 'none', lineHeight: '18px' }}>
                        {DOC_TYPE_MAP[doc.type] || doc.type}
                      </Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
            {editingDevice ? '该设备类型暂无关联文档' : '保存设备并选择类型后自动加载'}
          </Text>
        )}

        <Divider plain style={{ fontSize: 12, color: Colors.gray500, marginTop: 16 }}>自定义文档</Divider>
        {deviceDocs.length > 0 ? (
          <List
            size="small"
            dataSource={deviceDocs}
            renderItem={(doc) => (
              <List.Item
                actions={[
                  <Button type="text" size="small" icon={<LinkOutlined />} onClick={() => window.open(doc.url, '_blank')} />,
                  <Popconfirm title="确定删除此文档？" onConfirm={() => handleDocDelete(doc.id)}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={<FileOutlined style={{ fontSize: 18, color: Colors.primary }} />}
                  title={
                    <Space size={4}>
                      <Text style={{ fontSize: 13 }}>{doc.name}</Text>
                      <Tag style={{ fontSize: 10, borderRadius: 4, border: 'none', lineHeight: '18px' }}>
                        {DOC_TYPE_MAP[doc.type] || doc.type}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {doc.fileName} · {(doc.size / 1024 / 1024).toFixed(1)}MB
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>暂无自定义文档</Text>
        )}
        <Button type="dashed" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)} size="small" style={{ width: '100%' }}>
          上传文档
        </Button>
      </Tabs.TabPane>
    </Tabs>
  );

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            设备基础数据
          </Title>
        </Col>
        <Col>
          <Space size={4}>
            <Button icon={<UploadOutlined />} size={isMobile ? 'small' : 'middle'} disabled>导入</Button>
            <Button icon={<DownloadOutlined />} size={isMobile ? 'small' : 'middle'} disabled>导出</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} size={isMobile ? 'small' : 'middle'}>
              新增设备
            </Button>
          </Space>
        </Col>
      </Row>

      {renderFilters()}

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total,
            showTotal: t => `共 ${t} 台设备`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          locale={{ emptyText: <Empty description="暂无设备数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          onRow={(record) => ({
            onClick: () => { setDetailDevice(record); setDetailModal(true); },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      {/* ── Detail Modal ── */}
      <Modal
        title={<Space><DatabaseOutlined /> {detailDevice?.name || '设备详情'}</Space>}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={640}
        destroyOnClose
      >
        {detailDevice && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="编码">{detailDevice.code}</Descriptions.Item>
            <Descriptions.Item label="名称">{detailDevice.name}</Descriptions.Item>
            <Descriptions.Item label="类型">{detailDevice.type}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={STATUS_OPTIONS.find(s => s.value === detailDevice.status)?.color}
                style={{ borderRadius: 4, border: 'none' }}>
                {STATUS_OPTIONS.find(s => s.value === detailDevice.status)?.label || detailDevice.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="品牌">{detailDevice.brand || '-'}</Descriptions.Item>
            <Descriptions.Item label="型号">{detailDevice.modelName || '-'}</Descriptions.Item>
            <Descriptions.Item label="序列号">{detailDevice.serialNo || '-'}</Descriptions.Item>
            <Descriptions.Item label="区域/产线">{detailDevice.area || '-'} / {detailDevice.line || '-'}</Descriptions.Item>
            <Descriptions.Item label="健康度">
              {detailDevice.healthScore != null
                ? <Text strong style={{ color: detailDevice.healthScore >= 75 ? Colors.success : detailDevice.healthScore >= 60 ? Colors.warning : Colors.danger }}>{detailDevice.healthScore}</Text>
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="OEE">{detailDevice.oee != null ? `${detailDevice.oee}%` : '-'}</Descriptions.Item>
            <Descriptions.Item label="MTBF">{detailDevice.mtbf ? `${detailDevice.mtbf}h` : '-'}</Descriptions.Item>
            <Descriptions.Item label="MTTR">{detailDevice.mttr ? `${detailDevice.mttr}h` : '-'}</Descriptions.Item>
            <Descriptions.Item label="供应商">{detailDevice.supplier || '-'}</Descriptions.Item>
            <Descriptions.Item label="安装日期">{detailDevice.installDate ? new Date(detailDevice.installDate).toLocaleDateString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="功率">{detailDevice.powerRating ? `${detailDevice.powerRating}kW` : '-'}</Descriptions.Item>
            <Descriptions.Item label="OEE目标">{detailDevice.oeeTarget != null ? `${detailDevice.oeeTarget}%` : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* ── Create/Edit Modal ── */}
      <Modal
        title={
          <Space>
            {modalMode === 'create' ? <PlusOutlined /> : <EditOutlined />}
            {modalMode === 'create' ? '新增设备' : '编辑设备'}
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={760}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            status: 'idle', priority: 'B', healthScore: 100,
            onlineParams: [], programList: [],
          }}
        >
          {formContent}

          <div style={{ textAlign: 'right', marginTop: 16, borderTop: `1px solid ${Colors.gray200}`, paddingTop: 16 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {modalMode === 'create' ? '创建' : '保存'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Upload Document Modal ── */}
      <Modal
        title="上传文档"
        open={uploadModalOpen}
        onCancel={() => { setUploadModalOpen(false); setUploadFile(null); setUploadName(''); }}
        footer={null}
        width={460}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: Colors.gray600 }}>文档名称 <span style={{ color: Colors.danger }}>*</span></div>
          <Input
            placeholder="如: 保养记录 2026-06"
            value={uploadName}
            onChange={e => setUploadName(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 4, fontSize: 13, color: Colors.gray600 }}>文档类型</div>
          <Select
            style={{ width: '100%' }}
            value={uploadType}
            onChange={setUploadType}
            options={DOC_TYPE_OPTIONS}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Dragger
            multiple={false}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.png"
            beforeUpload={(file) => {
              setUploadFile(file);
              if (!uploadName) {
                const name = file.name.replace(/\.[^/.]+$/, '');
                setUploadName(name);
              }
              return false;
            }}
            onRemove={() => setUploadFile(null)}
            fileList={uploadFile ? [{ uid: '-1', name: uploadFile.name, status: 'done' } as any] : []}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>
              支持 PDF、Word、Excel、PPT、TXT、CSV、图片等格式，最大 50MB
            </p>
          </Dragger>
        </div>
        <div style={{ textAlign: 'right', borderTop: `1px solid ${Colors.gray200}`, paddingTop: 16 }}>
          <Button style={{ marginRight: 8 }} onClick={() => { setUploadModalOpen(false); setUploadFile(null); setUploadName(''); }}>取消</Button>
          <Button type="primary" loading={uploading} onClick={handleDocUpload} disabled={!uploadFile || !uploadName.trim()}>
            上传
          </Button>
        </div>
      </Modal>
    </div>
  );
}
