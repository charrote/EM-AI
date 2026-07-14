import { useState, useEffect, useCallback } from 'react';
import {
  Table, Card, Button, Space, Modal, Form, Input, Select, InputNumber,
  message, Tag, Popconfirm, Typography, Badge, Row, Col, Tabs,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, CalendarOutlined,
  ReloadOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import { useApiDataSource } from '../services/dataSource';
import { generateMockInspections } from '../services/mockData';
import { Colors } from '../styles/theme';

const { Text, Title } = Typography;

interface InspectionPlan {
  id: string;
  title: string;
  deviceType: string;
  level: string;
  frequency: number;
  items: any[];
  sopUrl: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
}

const LEVEL_OPTIONS = [
  { value: 'daily', label: '日常点检' },
  { value: 'weekly', label: '每周点检' },
  { value: 'monthly', label: '每月点检' },
  { value: 'quarterly', label: '季度点检' },
];

const LEVEL_COLORS: Record<string, string> = {
  daily: Colors.success,
  weekly: Colors.primary,
  monthly: Colors.warning,
  quarterly: '#F97316',
};

const DEVICE_TYPE_OPTIONS = [
  '注塑机', 'CNC', '冲床', '冷墩机', '研磨机', '激光切割机',
  '大型弯折机', '全自动外观机', '裁切机', '钉卷机', '入壳机',
  '套管机', '老化设备', '自动包装机',
];

export default function InspectionPlans() {
  // 使用 useApiDataSource 钩子，自动根据 dataMode 切换数据源
  const { data, loading, refresh } = useApiDataSource(
    '/api/inspection-plans',
    generateMockInspections(10)
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<InspectionPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [form] = Form.useForm();
  const [itemsStr, setItemsStr] = useState('');

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    setItemsStr('');
    setModalOpen(true);
  };

  const handleEdit = (record: InspectionPlan) => {
    setEditing(record);
    form.setFieldsValue(record);
    setItemsStr(record.items ? record.items.map((i: any) => i.name || i).join('\n') : '');
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/inspection-plans/${id}`);
      message.success('已删除');
      refresh();
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
        await api.put(`/inspection-plans/${editing.id}`, payload);
        message.success('更新成功');
      } else {
        await api.post('/inspection-plans', payload);
        message.success('创建成功');
      }
      setModalOpen(false);
      refresh();
    } catch {
      // validation error
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<InspectionPlan> = [
    {
      title: '计划名称', dataIndex: 'title', key: 'title', ellipsis: true,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: '设备类型', dataIndex: 'deviceType', key: 'deviceType', width: 120,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '点检层级', dataIndex: 'level', key: 'level', width: 110,
      render: (v: string) => {
        const opt = LEVEL_OPTIONS.find(o => o.value === v);
        return <Badge color={LEVEL_COLORS[v]} text={opt?.label || v} />;
      },
    },
    {
      title: '频率(天)', dataIndex: 'frequency', key: 'frequency', width: 90,
      render: (v: number) => <Text>每 {v} 天</Text>,
    },
    {
      title: '项目数', key: 'items', width: 70,
      render: (_: unknown, r: InspectionPlan) => {
        const count = Array.isArray(r.items) ? r.items.length : 0;
        return <Tag>{count} 项</Tag>;
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
      render: (_: unknown, r: InspectionPlan) => (
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
          <Title level={4} style={{ margin: 0 }}>点检计划与排程</Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新建计划</Button>
          </Space>
        </Col>
      </Row>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ padding: '0 16px', marginBottom: 0 }}
          items={[
            {
              key: 'list',
              label: <span><UnorderedListOutlined /> 计划列表</span>,
              children: (
                <Table
                  columns={columns}
                  dataSource={data}
                  rowKey="id"
                  loading={loading}
                  scroll={{ x: 800 }}
                  size="small"
                  pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
                />
              ),
            },
            {
              key: 'calendar',
              label: <span><CalendarOutlined /> 排程日历</span>,
              children: (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <CalendarOutlined style={{ fontSize: 48, color: Colors.gray300, marginBottom: 16, display: 'block' }} />
                  <Text type="secondary" style={{ fontSize: 15 }}>日历视图开发中，当前支持列表管理</Text>
                  <div style={{ marginTop: 12, color: Colors.gray400, fontSize: 13 }}>
                    基于点检计划频率自动生成排程任务
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? '编辑点检计划' : '新建点检计划'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="计划名称" rules={[{ required: true }]}>
                <Input placeholder="如: CNC 日常点检" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deviceType" label="设备类型" rules={[{ required: true }]}>
                <Select
                  showSearch
                  options={DEVICE_TYPE_OPTIONS.map(t => ({ value: t, label: t }))}
                  placeholder="选择设备类型"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="level" label="点检层级" rules={[{ required: true }]}>
                <Select options={LEVEL_OPTIONS} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="frequency" label="频率（天）" rules={[{ required: true }]}>
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="点检项目（每行一项）">
            <Input.TextArea
              rows={5}
              value={itemsStr}
              onChange={e => setItemsStr(e.target.value)}
              placeholder={`润滑油位\n安全光栅\n温度检查\n振动值\n气压值`}
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
