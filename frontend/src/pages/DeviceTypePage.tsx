import { useState, useCallback, useEffect } from 'react';
import {
  Card, Button, Space, Typography, Row, Col, Table, Tag, message,
  Modal, Input, Popconfirm, Empty, Switch, InputNumber,
  Drawer, Select, Tooltip, Upload, List, Divider,
} from 'antd';
import {
  TagsOutlined, PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined,
  UploadOutlined, FileOutlined, LinkOutlined, InboxOutlined,
} from '@ant-design/icons';

import type { UploadProps } from 'antd';
import { useApiDataSource } from '../services/dataSource';
import api from '../services/api';
import { generateMockDevices } from '../services/mockData';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

const { Text, Title } = Typography;
const { Dragger } = Upload;

interface DeviceTypeRecord {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  documents: DocRecord[] | null;
  createdAt: string;
  updatedAt: string;
}

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
  manual: '保养手册',
  inspection: '点检手册',
  operation: '操作说明',
  other: '其他',
};

export default function DeviceTypePage() {
  const { isMobile } = useResponsive();

  // ── Create/Edit Modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingType, setEditingType] = useState<DeviceTypeRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '', code: '', description: '', sortOrder: 0, isActive: true,
  });

  // ── Document Drawer ──
  const [docDrawerOpen, setDocDrawerOpen] = useState(false);
  const [docDrawerType, setDocDrawerType] = useState<DeviceTypeRecord | null>(null);
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [docLoading, setDocLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadType, setUploadType] = useState<'manual' | 'inspection' | 'operation' | 'other'>('manual');
  const [uploading, setUploading] = useState(false);

  // ── Data fetching ──
  const { data: types, loading, refresh: fetchTypes } = useApiDataSource(
    '/api/devices/manage/types',
    generateMockDevices(10)
  );

  // ── Type CRUD handlers ──
  const openCreate = () => {
    setModalMode('create');
    setEditingType(null);
    setFormValues({ name: '', code: '', description: '', sortOrder: 0, isActive: true });
    setModalOpen(true);
  };

  const openEdit = (record: DeviceTypeRecord) => {
    setModalMode('edit');
    setEditingType(record);
    setFormValues({
      name: record.name,
      code: record.code || '',
      description: record.description || '',
      sortOrder: record.sortOrder ?? 0,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formValues.name.trim()) {
      message.warning('请输入设备类型名称');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: formValues.name.trim(),
        code: formValues.code.trim() || undefined,
        description: formValues.description.trim() || undefined,
        sortOrder: formValues.sortOrder,
        isActive: formValues.isActive,
      };

      if (modalMode === 'create') {
        await api.post('/devices/manage/types', payload);
        message.success('设备类型已创建');
      } else if (editingType) {
        await api.put(`/devices/manage/types/${editingType.id}`, payload);
        message.success('设备类型已更新');
      }
      setModalOpen(false);
      fetchTypes();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '操作失败';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: DeviceTypeRecord) => {
    try {
      await api.delete(`/devices/manage/types/${record.id}`);
      message.success('已删除');
      fetchTypes();
    } catch (err: any) {
      const msg = err?.response?.data?.error || '删除失败';
      message.error(msg);
    }
  };

  // ── Document handlers ──
  const openDocDrawer = (record: DeviceTypeRecord) => {
    setDocDrawerType(record);
    setDocs(record.documents || []);
    setDocDrawerOpen(true);
  };

  const handleDocUpload = async () => {
    if (!uploadFile || !uploadName.trim() || !docDrawerType) {
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

      const updatedDocs = [...docs, newDoc];
      await api.put(`/devices/manage/types/${docDrawerType.id}`, { documents: updatedDocs });
      setDocs(updatedDocs);
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

  const handleDocDelete = async (docId: string) => {
    if (!docDrawerType) return;
    const updatedDocs = docs.filter(d => d.id !== docId);
    try {
      await api.put(`/devices/manage/types/${docDrawerType.id}`, { documents: updatedDocs });
      setDocs(updatedDocs);
      message.success('文档已删除');
    } catch {
      message.error('删除失败');
    }
  };

  // ── Columns ──
  const columns: any = [
    {
      title: '编码', dataIndex: 'code', key: 'code', width: 120,
      render: (v: string) => v ? <Text code>{v}</Text> : '-',
    },
    {
      title: '名称', dataIndex: 'name', key: 'name', width: 160,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    ...(isMobile ? [] : [
      {
        title: '描述', dataIndex: 'description', key: 'description', ellipsis: true,
        render: (v: string) => v || <Text type="secondary">-</Text>,
      },
      {
        title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 60, align: 'center' as const,
      },
      {
        title: '状态', dataIndex: 'isActive', key: 'isActive', width: 70, align: 'center' as const,
        render: (v: boolean) => v
          ? <Tag color={Colors.success} style={{ borderRadius: 4, border: 'none' }}>启用</Tag>
          : <Tag color={Colors.gray400} style={{ borderRadius: 4, border: 'none' }}>禁用</Tag>,
      },
      {
        title: '文档', dataIndex: 'documents', key: 'documents', width: 60, align: 'center' as const,
        render: (docs: DocRecord[] | null) => (
          <Text type="secondary">{docs?.length || 0} 个</Text>
        ),
      },
    ] as any),
    {
      title: '操作', key: 'action', width: 140, fixed: isMobile ? undefined : 'right',
      render: (_: any, record: DeviceTypeRecord) => (
        <Space size={0}>
          <Tooltip title="文档管理">
            <Button type="text" size="small" icon={<FileOutlined />} onClick={() => openDocDrawer(record)}>
              {!isMobile && <span style={{ marginLeft: 2 }}>文档</span>}
            </Button>
          </Tooltip>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm
            title="确定删除此设备类型？"
            description="有设备关联时无法删除"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
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
            <TagsOutlined style={{ marginRight: 8 }} />
            设备类型
          </Title>
        </Col>
        <Col>
          <Space size={4}>
            <Button icon={<ReloadOutlined />} onClick={fetchTypes} size={isMobile ? 'small' : 'middle'} />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} size={isMobile ? 'small' : 'middle'}>
              新增类型
            </Button>
          </Space>
        </Col>
      </Row>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={types}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={false}
          locale={{ emptyText: <Empty description="暂无设备类型" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      {/* ── Create/Edit Modal ── */}
      <Modal
        title={modalMode === 'create' ? '新增设备类型' : '编辑设备类型'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        <div style={{ paddingTop: 8 }}>
          <Row gutter={12}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: Colors.gray600 }}>名称 <span style={{ color: Colors.danger }}>*</span></div>
                <Input
                  placeholder="如: CNC 加工中心"
                  value={formValues.name}
                  onChange={e => setFormValues(p => ({ ...p, name: e.target.value }))}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: Colors.gray600 }}>编码</div>
                <Input
                  placeholder="如: DT-CNC"
                  value={formValues.code}
                  onChange={e => setFormValues(p => ({ ...p, code: e.target.value }))}
                />
              </div>
            </Col>
          </Row>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: Colors.gray600 }}>描述</div>
            <Input.TextArea
              rows={2}
              placeholder="设备类型描述（可选）"
              value={formValues.description}
              onChange={e => setFormValues(p => ({ ...p, description: e.target.value }))}
            />
          </div>
          <Row gutter={12}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: Colors.gray600 }}>排序</div>
                <InputNumber
                  min={0} style={{ width: '100%' }}
                  value={formValues.sortOrder}
                  onChange={v => setFormValues(p => ({ ...p, sortOrder: v ?? 0 }))}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: Colors.gray600 }}>状态</div>
                <Switch
                  checked={formValues.isActive}
                  onChange={v => setFormValues(p => ({ ...p, isActive: v }))}
                  checkedChildren="启用"
                  unCheckedChildren="禁用"
                />
              </div>
            </Col>
          </Row>
          <div style={{ textAlign: 'right', marginTop: 16, borderTop: `1px solid ${Colors.gray200}`, paddingTop: 16 }}>
            <Button style={{ marginRight: 8 }} onClick={() => setModalOpen(false)}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              {modalMode === 'create' ? '创建' : '保存'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Document Drawer ── */}
      <Drawer
        title={
          <Space>
            <FileOutlined />
            文档管理 — {docDrawerType?.name}
          </Space>
        }
        placement="right"
        width={480}
        open={docDrawerOpen}
        onClose={() => { setDocDrawerOpen(false); setDocDrawerType(null); }}
        extra={
          <Button type="primary" icon={<UploadOutlined />} size="small" onClick={() => setUploadModalOpen(true)}>
            上传文档
          </Button>
        }
      >
        {docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: Colors.gray400 }}>
            <InboxOutlined style={{ fontSize: 48, marginBottom: 12 }} />
            <div>暂无文档</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>点击右上角上传设备相关文档</div>
          </div>
        ) : (
          <List
            size="small"
            dataSource={docs}
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
                  avatar={<FileOutlined style={{ fontSize: 20, color: Colors.primary }} />}
                  title={
                    <Space size={4}>
                      <Text strong style={{ fontSize: 13 }}>{doc.name}</Text>
                      <Tag style={{ fontSize: 10, borderRadius: 4, border: 'none', lineHeight: '18px' }}>
                        {DOC_TYPE_MAP[doc.type] || doc.type}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {doc.fileName} · {(doc.size / 1024 / 1024).toFixed(1)}MB
                      {doc.uploadedAt && ` · ${new Date(doc.uploadedAt).toLocaleDateString('zh-CN')}`}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Drawer>

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
            placeholder="如: 保养手册 V2.0"
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
                // Auto-fill name from filename (without extension)
                const name = file.name.replace(/\.[^/.]+$/, '');
                setUploadName(name);
              }
              return false; // Prevent auto upload
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
