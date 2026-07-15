import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Card, Button, Space, Modal, Form, Input, Select, Tag,
  message, Typography, Popconfirm, Tooltip, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ReloadOutlined, TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../services/api';
import { useApiDataSource } from '../services/dataSource';
import { generateMockTeams } from '../services/mockData';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

const { Text, Title } = Typography;

const SHIFT_OPTIONS = [
  { value: '早班', label: '早班' },
  { value: '中班', label: '中班' },
  { value: '晚班', label: '晚班' },
  { value: '轮班', label: '轮班' },
];

export default function TeamPage() {
  // Memoize mock data to prevent infinite re-render loops
  const mockTeams = useMemo(() => generateMockTeams(8), []);

  // 使用 useApiDataSource 钩子，自动根据 dataMode 切换数据源
  const { data: teams, loading, refresh } = useApiDataSource(
    '/api/teams',
    mockTeams
  );

  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orgTree, setOrgTree] = useState<any[]>([]);
  const [form] = Form.useForm();
  const { isMobile } = useResponsive();

  useEffect(() => {
    api.get('/organizations/tree').then(res => {
      const flat: any[] = [];
      const flatten = (nodes: any[]) => {
        nodes.forEach((n: any) => {
          if (n.level === 'workshop' || n.level === 'line') {
            flat.push({ id: n.id, name: n.name, level: n.level });
          }
          if (n.children) flatten(n.children);
        });
      };
      flatten(res.data.data || []);
      setOrgTree(flat);
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setModalMode('create');
    setEditingTeam(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: any) => {
    setModalMode('edit');
    setEditingTeam(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await api.post('/teams', values);
        message.success('班组已创建');
      } else if (editingTeam) {
        await api.put(`/teams/${editingTeam.id}`, values);
        message.success('班组已更新');
      }
      setModalOpen(false);
      refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '操作失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: any) => {
    try {
      await api.delete(`/teams/${record.id}`);
      message.success('已删除');
      refresh();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '删除失败';
      message.error(msg);
    }
  };

  const columns: ColumnsType<any> = [
    { title: '编码', dataIndex: 'code', key: 'code', width: 100, render: (v: string) => <Text code>{v}</Text> },
    { title: '名称', dataIndex: 'name', key: 'name', ellipsis: true, width: 140 },
    {
      title: '班组长', dataIndex: 'leader', key: 'leader', width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '人数', dataIndex: 'memberCount', key: 'memberCount', width: 60,
      render: (v: number) => v != null ? <Text strong>{v}</Text> : '-',
    },
    {
      title: '班次', dataIndex: 'shift', key: 'shift', width: 80,
      render: (v: string) => v ? <Tag color="default">{v}</Tag> : '-',
    },
    ...(isMobile ? [] : [
      {
        title: '所属车间', dataIndex: 'workshopName', key: 'workshopName', width: 120,
        render: (v: string) => v || '-',
      },
      {
        title: '状态', dataIndex: 'isActive', key: 'isActive', width: 60,
        render: (v: boolean) => v
          ? <Tag color={Colors.success} style={{ borderRadius: 4, border: 'none' }}>启用</Tag>
          : <Tag color="default" style={{ borderRadius: 4, border: 'none' }}>停用</Tag>,
      },
      {
        title: '备注', dataIndex: 'description', key: 'description', ellipsis: true, width: 160,
        render: (v: string) => v || '-',
      },
    ] as ColumnsType<any>),
    {
      title: '操作', key: 'action', width: 80, fixed: 'right',
      render: (_: any, record: any) => (
        <Space size={0}>
          <Tooltip title="编辑">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm title="确定删除此班组？" onConfirm={() => handleDelete(record)}>
            <Tooltip title="删除">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            班组管理
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} size={isMobile ? 'small' : 'middle'}>
            新增班组
          </Button>
        </Col>
      </Row>

      {/* Filter */}
      <Card size="small" style={{ marginBottom: 12 }} styles={{ body: { padding: '8px 12px' } }}>
        <Row gutter={[8, 8]} align="middle">
          <Col xs={18} sm={12} md={8}>
            <Input
              placeholder="搜索编码/名称/班组长..."
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
              size={isMobile ? 'small' : 'middle'}
              onPressEnter={() => refresh()}
            />
          </Col>
          <Col xs={6} sm={4} md={4}>
            <Button icon={<ReloadOutlined />} onClick={() => { setKeyword(''); }} size={isMobile ? 'small' : 'middle'} />
          </Col>
        </Row>
      </Card>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={teams}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={{
            showTotal: t => `共 ${t} 个班组`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          locale={{ emptyText: '暂无班组数据' }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={modalMode === 'create' ? '新增班组' : '编辑班组'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ isActive: true, memberCount: 0 }}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="班组编码" name="code" rules={[{ required: true, message: '请输入编码' }]}>
                <Input placeholder="如: TEAM-A01" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="班组名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="如: 甲班" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="班组长" name="leader">
                <Input placeholder="如: 张三" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="人数" name="memberCount">
                <Input type="number" min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="班次" name="shift">
                <Select placeholder="选择班次" options={SHIFT_OPTIONS} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="所属车间" name="workshopId">
                <Select placeholder="选择车间" allowClear showSearch
                  options={orgTree.map((o: any) => ({ value: o.id, label: o.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="状态" name="isActive">
                <Select options={[{ value: true, label: '启用' }, { value: false, label: '停用' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="备注" name="description">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
          <div style={{ textAlign: 'right', borderTop: `1px solid ${Colors.gray200}`, paddingTop: 16 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {modalMode === 'create' ? '创建' : '保存'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
