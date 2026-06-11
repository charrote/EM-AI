import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Button, Space, Typography, Row, Col, Tree, Input, Modal, Form,
  message, Tag, Empty, Descriptions, Divider, Alert, Popconfirm,
  Select, Spin, InputNumber,
} from 'antd';
import {
  ApartmentOutlined, PlusOutlined, ReloadOutlined, DeleteOutlined,
  EditOutlined, SearchOutlined, HomeOutlined, BankOutlined,
  ShopOutlined, NodeIndexOutlined, DashboardOutlined,
} from '@ant-design/icons';
import type { TreeProps, DataNode } from 'antd/es/tree';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import ErrorBoundary from '../components/ErrorBoundary';

const { Text, Title } = Typography;

const LEVEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  group: { label: '集团', icon: <HomeOutlined />, color: '#8B5CF6' },
  company: { label: '公司', icon: <BankOutlined />, color: Colors.primary },
  workshop: { label: '车间', icon: <ShopOutlined />, color: Colors.warning },
  line: { label: '产线', icon: <DashboardOutlined />, color: Colors.success },
};

const NEXT_LEVEL: Record<string, string> = { group: 'company', company: 'workshop', workshop: 'line', line: '' };

export default function OrganizationPage() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [flatData, setFlatData] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [autoExpandDone, setAutoExpandDone] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalParent, setModalParent] = useState<any>(null);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const { isMobile } = useResponsive();

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/organizations/tree');
      const tree = res.data.data || [];
      setTreeData(tree);

      // Build flat list with OEE inheritance
      const flat: any[] = [];
      const flatten = (nodes: any[], parent?: any) => {
        nodes.forEach(n => {
          const inheritedOee = n.oeeTarget != null ? n.oeeTarget : (parent?._oeeDisplay ?? null);
          flat.push({
            ...n,
            parentName: parent?.name || null,
            _oeeDisplay: inheritedOee,
            _oeeInherited: n.oeeTarget == null && inheritedOee != null,
          });
          if (n.children) flatten(n.children, { ...n, _oeeDisplay: inheritedOee });
        });
      };
      flatten(tree);
      setFlatData(flat);

      // Collect all keys for full expansion
      if (tree.length > 0 && !autoExpandDone) {
        const allKeys: React.Key[] = [];
        const collectKeys = (nodes: any[]) => {
          nodes.forEach(n => {
            allKeys.push(n.id);
            if (n.children) collectKeys(n.children);
          });
        };
        collectKeys(tree);
        setExpandedKeys(allKeys);
        setAutoExpandDone(true);
        if (!selectedNode) {
          setSelectedNode(tree[0]);
        }
      }
    } catch {
      message.error('加载组织架构失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, []);

  // Convert flat tree to Ant Design Tree format
  const antTreeData: DataNode[] = useMemo(() => {
    const convert = (nodes: any[]): DataNode[] =>
      nodes.map(n => ({
        key: n.id,
        title: (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 0',
              fontSize: isMobile ? 13 : 13,
            }}
          >
            <span style={{ color: LEVEL_CONFIG[n.level]?.color, fontSize: 14 }}>
              {LEVEL_CONFIG[n.level]?.icon}
            </span>
            <Text
              strong
              ellipsis
              style={{
                maxWidth: isMobile ? 100 : 140,
                color: selectedNode?.id === n.id ? Colors.primary : Colors.gray700,
              }}
            >
              {n.name}
            </Text>
            <span style={{ flex: 1 }} />
            {n._oeeDisplay != null && (
              <Tag color={n._oeeInherited ? Colors.gray400 : Colors.primary} style={{ borderRadius: 4, border: 'none', fontSize: 10, lineHeight: '16px', padding: '0 4px', marginRight: 4 }}>
                OEE {n._oeeDisplay}%{n._oeeInherited ? '(继承)' : ''}
              </Tag>
            )}
            <Tag
              style={{
                borderRadius: 4, border: 'none',
                fontSize: 10, lineHeight: '16px', padding: '0 4px',
                background: Colors.gray100, color: Colors.gray500,
              }}
            >
              {n.children?.length || 0} 子级
            </Tag>
          </div>
        ),
        icon: <span style={{ fontSize: 0 }} />,
        children: n.children?.length > 0 ? convert(n.children) : undefined,
        isLeaf: n.children?.length === 0,
      }));
    return convert(treeData);
  }, [treeData, selectedNode, isMobile]);

  // Handle tree node select — use flatData to include computed _oeeDisplay
  const handleSelect: TreeProps['onSelect'] = (keys, info) => {
    if (keys.length === 0) return;
    const node = flatData.find((n: any) => n.id === keys[0]);
    if (!node) return;
    setSelectedNode(node);
  };

  const findNodeById = (nodes: any[], id: string): any | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      if (n.children) {
        const found = findNodeById(n.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // ── CRUD Actions ────────────────────────────

  const openCreateModal = (parent?: any) => {
    setModalMode('create');
    setModalParent(parent || null);
    setEditingNode(null);
    setModalOpen(true);
  };

  const openEditModal = (node: any) => {
    setModalMode('edit');
    setEditingNode(node);
    setModalParent(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await api.post('/organizations', {
          ...values,
          parentId: modalParent?.id || null,
        });
        message.success('创建成功');
      } else if (editingNode) {
        await api.put(`/organizations/${editingNode.id}`, values);
        message.success('更新成功');
      }
      setModalOpen(false);
      fetchTree();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '操作失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (node: any) => {
    try {
      await api.delete(`/organizations/${node.id}`);
      message.success('已删除');
      if (selectedNode?.id === node.id) {
        setSelectedNode(null);
      }
      fetchTree();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '删除失败';
      message.error(msg);
    }
  };

  // ── Filter tree by search ──────────────────
  const hasGroupRoot = useMemo(() => flatData.some(n => n.level === 'group' && !n.parentId), [flatData]);

  const filteredFlatData = useMemo(() => {
    if (!search) return flatData;
    const s = search.toLowerCase();
    return flatData.filter(n => n.name.toLowerCase().includes(s) || n.code.toLowerCase().includes(s));
  }, [flatData, search]);

  // Page split layout
  const renderTreePanel = () => (
    <Card
      size="small"
      title={
        <Space>
          <ApartmentOutlined style={{ color: Colors.primary }} />
          <Text strong>企业层级</Text>
        </Space>
      }
      extra={
        <Space size={4}>
          <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateModal()} disabled={hasGroupRoot}>
            新增
          </Button>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchTree} />
        </Space>
      }
      style={{ height: '100%' }}
      styles={{ body: { padding: '8px', overflow: 'auto', maxHeight: isMobile ? '50vh' : 'calc(100vh - 200px)' } }}
    >
      {/* Search */}
      <Input
        size="small"
        placeholder="搜索..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 8, borderRadius: 6 }}
        allowClear
      />

      {/* Tree or search results */}
      {search ? (
        <div>
          {filteredFlatData.map(n => (
            <div
              key={n.id}
              onClick={() => {
                setSelectedNode(n);
              }}
              style={{
                padding: '6px 8px',
                cursor: 'pointer',
                borderRadius: 4,
                background: selectedNode?.id === n.id ? Colors.sidebarActive : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 2,
              }}
            >
              <span style={{ color: LEVEL_CONFIG[n.level]?.color }}>
                {LEVEL_CONFIG[n.level]?.icon}
              </span>
              <Text>{n.name}</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>({n.code})</Text>
              <span style={{ flex: 1 }} />
              <Tag style={{ fontSize: 10, borderRadius: 4, border: 'none' }}>
                {LEVEL_CONFIG[n.level]?.label}
              </Tag>
            </div>
          ))}
          {filteredFlatData.length === 0 && (
            <Empty description="无匹配节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </div>
      ) : (
        <Spin spinning={loading}>
          {antTreeData.length > 0 ? (
            <Tree
              treeData={antTreeData}
              onSelect={handleSelect}
              selectedKeys={selectedNode ? [selectedNode.id] : []}
              expandedKeys={expandedKeys}
              onExpand={setExpandedKeys}
              showIcon
              blockNode
              style={{ background: 'transparent' }}
            />
          ) : (
            <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Spin>
      )}

      {/* Quick: show full path info on bottom */}
      {flatData.length > 0 && !search && (
        <div style={{ marginTop: 8, padding: '4px 8px', fontSize: 11, color: Colors.gray400, borderTop: `1px solid ${Colors.gray100}` }}>
          共 {flatData.length} 个节点 · {treeData[0]?.name || '无根节点'}
        </div>
      )}
    </Card>
  );

  const renderDetailPanel = () => {
    if (!selectedNode) {
      return (
        <Card size="small" style={{ height: '100%' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Text type="secondary">选择一个节点查看详情</Text>}
          />
        </Card>
      );
    }

    const levelCfg = LEVEL_CONFIG[selectedNode.level] || { label: '未知', icon: <NodeIndexOutlined />, color: Colors.gray500 };
    const nextLevel = NEXT_LEVEL[selectedNode.level];

    return (
      <Card
        size="small"
        title={
          <Space>
            <span style={{ color: levelCfg.color }}>{levelCfg.icon}</span>
            <Text strong>{selectedNode.name}</Text>
            <Tag color={levelCfg.color} style={{ borderRadius: 4, border: 'none' }}>
              {levelCfg.label}
            </Tag>
          </Space>
        }
        extra={
          <Space size={4}>
            {nextLevel && (
              <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateModal(selectedNode)}>
                新增下级
              </Button>
            )}
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(selectedNode)} />
            <Popconfirm
              title="确定删除此节点？"
              description="删除后不可恢复"
              onConfirm={() => handleDelete(selectedNode)}
              placement="bottomRight"
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        }
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
      >
        <Descriptions column={isMobile ? 1 : 2} size="small" bordered>
          <Descriptions.Item label="编码">{selectedNode.code}</Descriptions.Item>
          <Descriptions.Item label="名称">{selectedNode.name}</Descriptions.Item>
          <Descriptions.Item label="层级">
            <Tag color={levelCfg.color} style={{ borderRadius: 4, border: 'none' }}>{levelCfg.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={selectedNode.isActive ? Colors.success : Colors.gray400} style={{ borderRadius: 4, border: 'none' }}>
              {selectedNode.isActive ? '启用' : '停用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="位置">{selectedNode.location || '-'}</Descriptions.Item>
          <Descriptions.Item label="排序">{selectedNode.sortOrder || 0}</Descriptions.Item>
          <Descriptions.Item label="OEE 目标">
            {selectedNode._oeeDisplay != null
              ? <Text strong style={{ color: selectedNode._oeeInherited ? Colors.gray500 : Colors.primary }}>
                  {selectedNode._oeeDisplay}%
                  {selectedNode._oeeInherited && <Text type="secondary"> (继承)</Text>}
                </Text>
              : '-'
            }
          </Descriptions.Item>
        </Descriptions>

        {selectedNode.children?.length > 0 && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <Text strong style={{ fontSize: 13 }}>下级节点 ({selectedNode.children.length})</Text>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedNode.children.map((child: any) => (
                <Tag
                  key={child.id}
                  color={LEVEL_CONFIG[child.level]?.color}
                  style={{ borderRadius: 4, border: 'none', cursor: 'pointer' }}
                  onClick={() => {
                    const found = flatData.find((f: any) => f.id === child.id);
                    if (found) setSelectedNode(found);
                  }}
                >
                  {child.name}
                </Tag>
              ))}
            </div>
          </>
        )}
      </Card>
    );
  };

  // ── Create / Edit Modal ─────────────────────
  const renderModal = () => {
    const isCreate = modalMode === 'create';
    const nextLevel = isCreate
      ? (modalParent ? NEXT_LEVEL[modalParent.level] : 'group')
      : editingNode?.level;
    const levelCfg = nextLevel ? LEVEL_CONFIG[nextLevel] : null;

    return (
      <Modal
        title={
          <Space>
            {isCreate ? <PlusOutlined /> : <EditOutlined />}
            {isCreate ? `新增${levelCfg?.label || '节点'}` : '编辑节点'}
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        {modalParent && isCreate && (
          <Alert
            type="info"
            showIcon
            title={`上级节点: ${modalParent.name} (${LEVEL_CONFIG[modalParent.level]?.label})`}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          layout="vertical"
          initialValues={
            isCreate
              ? { level: nextLevel, isActive: true, sortOrder: 1 }
              : {
                  code: editingNode?.code,
                  name: editingNode?.name,
                  sortOrder: editingNode?.sortOrder,
                  isActive: editingNode?.isActive,
                  location: editingNode?.location,
                  oeeTarget: editingNode?.oeeTarget,
                }
          }
          onFinish={handleModalSubmit}
        >
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="编码" name="code" rules={[{ required: true, message: '请输入编码' }]}>
                <Input placeholder="如: GRP-01 / WS-CNC" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
                <Input placeholder="如: Uantek集团" />
              </Form.Item>
            </Col>
          </Row>

          {isCreate && (
            <Form.Item label="层级" name="level">
              <Select disabled>
                {Object.entries(LEVEL_CONFIG).map(([k, v]) => (
                  <Select.Option key={k} value={k}>{v.icon} {v.label}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="排序" name="sortOrder">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="状态" name="isActive" valuePropName="checked">
                <Select>
                  <Select.Option value={true}>启用</Select.Option>
                  <Select.Option value={false}>停用</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="位置/地址" name="location">
            <Input placeholder="可选" />
          </Form.Item>

          <Form.Item label="OEE 目标 (%)" name="oeeTarget">
            <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} placeholder={modalParent?._oeeDisplay ? `继承: ${modalParent._oeeDisplay}%` : '如: 85'} />
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {isCreate ? '创建' : '保存'}
            </Button>
          </div>
        </Form>
      </Modal>
    );
  };

  return (
    <ErrorBoundary>
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <ApartmentOutlined style={{ marginRight: 8 }} />
            企业层级
          </Title>
        </Col>
        <Col>
          <Text type="secondary" style={{ fontSize: 12 }}>
            集团 → 公司 → 车间 → 产线
          </Text>
        </Col>
      </Row>

      <Row gutter={[12, 12]} style={{ minHeight: isMobile ? 'auto' : 'calc(100vh - 200px)' }}>
        <Col xs={24} sm={24} md={8} lg={7}>
          {renderTreePanel()}
        </Col>
        <Col xs={24} sm={24} md={16} lg={17}>
          {renderDetailPanel()}
        </Col>
      </Row>

      {renderModal()}
    </div>
    </ErrorBoundary>
  );
}
