import { useState, useCallback } from 'react';
import {
  Table, Card, Button, Space, Modal, Form, Input, Select, InputNumber,
  message, Tag, Popconfirm, Typography, Badge, Row, Col, DatePicker,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useMaintenancePlanDataSource } from '../services/dataSource';

const { Text, Title } = Typography;

interface MaintenancePlan {
  id: string;
  title: string;
  deviceId: string | null;
  deviceType: string | null;
  type: string;
  triggerType: string;
  triggerValue: number;
  intervalDays: number | null;
  items: any[];
  sopUrl: string | null;
  description: string | null;
  active: boolean;
  lastExecutedAt: string | null;
  nextScheduledAt: string | null;
  createdAt: string;
}

const MAINTENANCE_TYPES = [
  { value: 'daily', label: '日常保养' },
  { value: 'level1', label: '一级保养' },
  { value: 'level2', label: '二级保养' },
  { value: 'overhaul', label: '大修保养' },
];

const TRIGGER_TYPES = [
  { value: 'time', label: '时间触发' },
  { value: 'runtime', label: '运行时长触发' },
  { value: 'output', label: '产量触发' },
];

const TYPE_COLORS: Record<string, string> = {
  daily: Colors.success,
  level1: Colors.primary,
  level2: Colors.warning,
  overhaul: Colors.danger,
};

const TRIGGER_LABELS: Record<string, string> = {
  time: '每N天',
  runtime: '每N小时',
  output: '每N件',
};

export default function MaintenancePlans() {
  const {
    data: data,
    loading,
    refresh: fetchData,
  } = useMaintenancePlanDataSource();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenancePlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [itemsStr, setItemsStr] = useState('');
  const [form] = Form.useForm();

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    setItemsStr('');
    setModalOpen(true);
  };

  const handleEdit = (record: MaintenancePlan) => {
    setEditing(record);
    form.setFieldsValue(record);
    setItemsStr(record.items ? record.items.map((i: any) => i.name || i).join('\n') : '');
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/maintenance/plans/${id}`);
      message.success('已删除');
      fetchData();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const items = itemsStr.split('\n').filter(Boolean).map((name: string) => ({ name: name.trim() }));
      const payload = { ...values, items };
      setSubmitting(true);
      if (editing) {
        await api.put(`/maintenance/plans/${editing.id}`, payload);
        message.success('更新成功');
      } else {
        await api.post('/maintenance/plans', payload);
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

  const columns: ColumnsType<MaintenancePlan> = [
    {
      title: '计划名称', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '保养类型', dataIndex: 'type', key: 'type', width: 100,
      render: (v: string) => {
        const t = MAINTENANCE_TYPES.find(t => t.value === v);
        return <Badge color={TYPE_COLORS[v]} text={t?.label || v} />;
      },
    },
    {
      title: '触发方式', key: 'trigger', width: 130,
      render: (_: unknown, r: MaintenancePlan) => (
        <Text>{TRIGGER_LABELS[r.triggerType] || r.triggerType} = {r.triggerValue}</Text>
      ),
    },
    {
      title: '间隔(天)', dataIndex: 'intervalDays', key: 'intervalDays', width: 80,
      render: (v: number | null) => v ? <Text>{v}天</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '下次执行', dataIndex: 'nextScheduledAt', key: 'nextScheduledAt', width: 110,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">-</Text>;
        const d = new Date(v);
        const isOverdue = d < new Date();
        return <Text style={{ color: isOverdue ? Colors.danger : Colors.gray600 }}>{d.toLocaleDateString()}</Text>;
      },
    },
    {
      title: '状态', dataIndex: 'active', key: 'active', width: 70,
      render: (v: boolean) => v
        ? <Badge color={Colors.success} text="启用" />
        : <Badge color={Colors.gray400} text="停用" />,
    },
    {
      title: '操作', key: 'action', width: 120, fixed: 'right',
      render: (_: unknown, r: MaintenancePlan) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <SafetyCertificateOutlined style={{ marginRight: 8 }} />
            保养计划管理
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建计划</Button>
          </Space>
        </Col>
      </Row>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 800 }}
          size="small"
          pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title={editing ? '编辑保养计划' : '新建保养计划'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="title" label="计划名称" rules={[{ required: true }]}>
            <Input placeholder="如: CNC 一级保养" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="保养类型" rules={[{ required: true }]}>
                <Select options={MAINTENANCE_TYPES} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deviceType" label="设备类型">
                <Input placeholder="如: CNC/注塑机" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="triggerType" label="触发方式" rules={[{ required: true }]}>
                <Select options={TRIGGER_TYPES} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="triggerValue" label="触发值" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="intervalDays" label="间隔天数">
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="保养项目（每行一项）">
            <Input.TextArea
              rows={4}
              value={itemsStr}
              onChange={e => setItemsStr(e.target.value)}
              placeholder={`检查润滑油位\n清洁滤网\n紧固螺栓\n测试安全装置`}
            />
          </Form.Item>
          <Form.Item name="sopUrl" label="SOP 链接">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
