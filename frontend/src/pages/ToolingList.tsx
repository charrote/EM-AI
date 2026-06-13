import { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Button, Space, Card, Input, Select, Row, Col, Statistic,
  Modal, Form, message, Popconfirm, Typography, Tooltip, Badge, Descriptions,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, QrcodeOutlined, SwapOutlined, BuildOutlined,
  ToolOutlined, InboxOutlined, PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

const { Text, Title } = Typography;

interface Tooling {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  deviceId: string | null;
  device?: { id: string; code: string; name: string } | null;
  location: string | null;
  supplier: string | null;
  theoreticalLife: number | null;
  lifeUnit: string;
  lifeUsed: number | null;
  lifeRemaining: number | null;
  purchaseCost: number | null;
  purchaseDate: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  in_stock: { color: Colors.success, label: '在库' },
  in_use: { color: Colors.primary, label: '在用' },
  maintenance: { color: Colors.warning, label: '保养中' },
  repair: { color: '#F97316', label: '维修中' },
  retired: { color: Colors.gray500, label: '已报废' },
  pending_inspect: { color: Colors.info, label: '待检' },
};

const TYPE_OPTIONS = ['模具', '夹具', '刀具', '量具', '其他'];
const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }));

export default function ToolingList() {
  const [data, setData] = useState<Tooling[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tooling | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Tooling | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const { isMobile } = useResponsive();
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();

  // Detail modal
  const [detailTarget, setDetailTarget] = useState<Tooling | null>(null);
  const [detailModal, setDetailModal] = useState(false);

  // Print label
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedPrintIds, setSelectedPrintIds] = useState<string[]>([]);

  const handlePrintLabel = () => {
    if (selectedPrintIds.length === 0) {
      message.warning('请至少选择一个工治具');
      return;
    }
    const items = data.filter(d => selectedPrintIds.includes(d.id));
    const labelText = items.map(i => `[${i.code}] ${i.name} (${i.type})`).join('\n');
    message.success(`已打印 ${items.length} 张标签\n${labelText}`);
    setPrintModalOpen(false);
    setSelectedPrintIds([]);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/toolings', { params });
      setData(res.data.data || []);
    } catch (err) {
      message.error('加载工治具数据失败');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── CRUD ────────────────────────────────────
  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: Tooling) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/toolings/${id}`);
      message.success('已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editing) {
        await api.put(`/toolings/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/toolings', values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      // validation error
    } finally {
      setSubmitting(false);
    }
  };

  // ── 状态切换 ──────────────────────────────────
  const handleStatusChange = (record: Tooling) => {
    setStatusTarget(record);
    setNewStatus(record.status);
    statusForm.setFieldsValue({ status: record.status });
    setStatusModalOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    try {
      const values = await statusForm.validateFields();
      await api.put(`/toolings/${statusTarget.id}/status`, { status: values.status });
      message.success('状态已更新');
      setStatusModalOpen(false);
      fetchData();
    } catch {
      // validation error
    }
  };

  // ── 统计 ────────────────────────────────────
  const stats = {
    total: data.length,
    inStock: data.filter(d => d.status === 'in_stock').length,
    inUse: data.filter(d => d.status === 'in_use').length,
    maintenance: data.filter(d => d.status === 'maintenance' || d.status === 'repair').length,
  };

  // ── 表格列定义 ──────────────────────────────
  const columns: ColumnsType<Tooling> = [
    {
      title: '编码', dataIndex: 'code', key: 'code', width: 140,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    { title: '名称', dataIndex: 'name', key: 'name', width: 160, ellipsis: true },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v];
        return <Badge color={cfg?.color} text={cfg?.label || v} />;
      },
    },
    {
      title: '关联设备', key: 'device', width: 140, ellipsis: true,
      render: (_: unknown, r: Tooling) => r.device ? <Text>{r.device.name}</Text> : <Text type="secondary">-</Text>,
    },
    { title: '储位', dataIndex: 'location', key: 'location', width: 120, ellipsis: true },
    {
      title: '寿命', key: 'life', width: 120,
      render: (_: unknown, r: Tooling) => {
        if (!r.theoreticalLife) return <Text type="secondary">-</Text>;
        const pct = r.lifeRemaining != null ? Math.round((r.lifeRemaining / r.theoreticalLife) * 100) : 100;
        const color = pct > 50 ? Colors.success : pct > 20 ? Colors.warning : Colors.danger;
        return (
          <Tooltip title={`已用 ${r.lifeUsed || 0} / 总计 ${r.theoreticalLife} ${r.lifeUnit}`}>
            <Text style={{ color }}>{pct}%</Text>
          </Tooltip>
        );
      },
    },
    {
      title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 120, ellipsis: true,
      render: (v: string | null) => v || <Text type="secondary">-</Text>,
    },
    {
      title: '操作', key: 'action', width: 160, fixed: 'right',
      render: (_: unknown, r: Tooling) => (
        <Space size="small">
          <Tooltip title="切换状态">
            <Button size="small" icon={<SwapOutlined />} onClick={() => handleStatusChange(r)} />
          </Tooltip>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
          </Tooltip>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(r.id)}>
            <Tooltip title="删除">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* ─── 统计卡片 ─── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="工治具总数" value={stats.total} prefix={<BuildOutlined />} valueStyle={{ fontSize: 22 }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="在库" value={stats.inStock} prefix={<InboxOutlined />} valueStyle={{ fontSize: 22, color: Colors.success }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="在用" value={stats.inUse} prefix={<ToolOutlined />} valueStyle={{ fontSize: 22, color: Colors.primary }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: '12px 16px' } }}>
            <Statistic title="维护中" value={stats.maintenance} prefix={<BuildOutlined />} valueStyle={{ fontSize: 22, color: Colors.warning }} />
          </Card>
        </Col>
      </Row>

      {/* ─── 工具栏 ─── */}
      <Card size="small" styles={{ body: { padding: '12px 16px' } }} style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xs={24} sm={16}>
            <Space wrap size="small">
              <Input
                placeholder="搜索编码/名称..."
                prefix={<SearchOutlined />}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="类型"
                value={typeFilter}
                onChange={setTypeFilter}
                allowClear
                style={{ width: 100 }}
                options={TYPE_OPTIONS.map(t => ({ value: t, label: t }))}
              />
              <Select
                placeholder="状态"
                value={statusFilter}
                onChange={setStatusFilter}
                allowClear
                style={{ width: 110 }}
                options={STATUS_OPTIONS}
              />
              <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <Space>
              <Button icon={<PrinterOutlined />} onClick={() => setPrintModalOpen(true)}>
                打印标签
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                新增工治具
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ─── 表格 ─── */}
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: t => `共 ${t} 条` }}
          onRow={(record) => ({
            onClick: () => { setDetailTarget(record); setDetailModal(true); },
            style: { cursor: 'pointer' },
          })}
        />
      </Card>

      {/* ─── 创建/编辑 Modal ─── */}
      <Modal
        title={editing ? '编辑工治具' : '新增工治具'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="编码" rules={[{ required: true }]}>
                <Input placeholder="自动生成或手动输入" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="类型" rules={[{ required: true }]}>
                <Select options={TYPE_OPTIONS.map(t => ({ value: t, label: t }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="supplier" label="供应商">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="theoreticalLife" label="理论寿命">
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="lifeUnit" label="寿命单位" initialValue="cycles">
                <Select options={[
                  { value: 'cycles', label: '次' },
                  { value: 'hours', label: '小时' },
                  { value: 'days', label: '天' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="purchaseCost" label="采购成本(元)">
                <Input type="number" min={0} prefix="¥" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location" label="储位">
                <Input placeholder="如: A-3-12" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="初始状态" initialValue="in_stock">
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* ─── 状态切换 Modal ─── */}
      <Modal
        title={`切换状态 - ${statusTarget?.name || ''}`}
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={confirmStatusChange}
        width={400}
        destroyOnClose
      >
        <Form form={statusForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="status" label="目标状态" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── 详情 Modal ─── */}
      <Modal
        title={<Space><BuildOutlined /> {detailTarget?.name || '工治具详情'}</Space>}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={560}
        destroyOnClose
      >
        {detailTarget && (
          <Descriptions column={2} size="small" bordered>
            <Descriptions.Item label="编码">{detailTarget.code}</Descriptions.Item>
            <Descriptions.Item label="名称">{detailTarget.name}</Descriptions.Item>
            <Descriptions.Item label="类型">{detailTarget.type}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Badge color={STATUS_CONFIG[detailTarget.status]?.color} text={STATUS_CONFIG[detailTarget.status]?.label} />
            </Descriptions.Item>
            <Descriptions.Item label="储位">{detailTarget.location || '-'}</Descriptions.Item>
            <Descriptions.Item label="供应商">{detailTarget.supplier || '-'}</Descriptions.Item>
            <Descriptions.Item label="理论寿命">
              {detailTarget.theoreticalLife ? `${detailTarget.theoreticalLife} ${detailTarget.lifeUnit}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="已用寿命">
              {detailTarget.lifeUsed != null ? `${detailTarget.lifeUsed} ${detailTarget.lifeUnit}` : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="剩余寿命">
              <Tag color={detailTarget.lifeRemaining != null && detailTarget.theoreticalLife
                ? (detailTarget.lifeRemaining / detailTarget.theoreticalLife > 0.5 ? 'success' : detailTarget.lifeRemaining / detailTarget.theoreticalLife > 0.2 ? 'warning' : 'error')
                : 'default'}>
                {detailTarget.lifeRemaining != null ? `${detailTarget.lifeRemaining} ${detailTarget.lifeUnit}` : '-'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="关联设备">{detailTarget.device?.name || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* ─── 打印标签 Modal ─── */}
      <Modal
        title={<Space><PrinterOutlined /> 打印标签</Space>}
        open={printModalOpen}
        onCancel={() => { setPrintModalOpen(false); setSelectedPrintIds([]); }}
        onOk={handlePrintLabel}
        okText="打印"
        width={600}
        destroyOnClose
      >
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary">请选择需要打印标签的工治具：</Text>
        </div>
        <Table
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedPrintIds,
            onChange: (keys) => setSelectedPrintIds(keys as string[]),
          }}
          columns={[
            { title: '编码', dataIndex: 'code', width: 140, render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text> },
            { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
            { title: '类型', dataIndex: 'type', width: 80, render: (v: string) => <Tag>{v}</Tag> },
            { title: '储位', dataIndex: 'location', width: 120, render: (v: string | null) => v || '-' },
          ]}
          dataSource={data}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ y: 300 }}
        />
      </Modal>
    </div>
  );
}
