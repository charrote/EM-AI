import { useState, useCallback } from 'react';
import {
  Table, Card, Button, Space, Typography, Badge, Tag, message,
  Row, Col, Select, Modal, Descriptions, Divider, Timeline, Empty,
} from 'antd';
import {
  SafetyOutlined, ReloadOutlined, ToolOutlined,
  HistoryOutlined, SearchOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useToolingDataSource } from '../services/dataSource';

const { Text, Title } = Typography;


const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  in_stock: { color: Colors.success, label: '在库' },
  in_use: { color: Colors.primary, label: '在用' },
  maintenance: { color: Colors.warning, label: '保养中' },
  repair: { color: '#F97316', label: '维修中' },
  retired: { color: Colors.gray500, label: '已报废' },
  pending_inspect: { color: Colors.info, label: '待检' },
};

export default function ToolingMaintenance() {
  const {
    data: data,
    loading,
    refresh: fetchData,
  } = useToolingDataSource();

  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [detailModal, setDetailModal] = useState(false);
  const [selectedTooling, setSelectedTooling] = useState<any | null>(null);

  const columns: any = [
    {
      title: '编码/名称', key: 'name', render: (_: unknown, r: any) => (
        <div>
          <Text code style={{ fontSize: 11 }}>{r.code}</Text>
          <br />
          <Text strong>{r.name}</Text>
        </div>
      ),
      width: 180,
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 70,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v];
        return <Badge color={cfg?.color} text={cfg?.label || v} />;
      },
    },
    {
      title: '关联设备', key: 'device', width: 130, ellipsis: true,
      render: (_: unknown, r: any) => r.device ? <Text>{r.device.name}</Text> : <Text type="secondary">-</Text>,
    },
    {
      title: '寿命', key: 'life', width: 120,
      render: (_: unknown, r: any) => {
        if (!r.theoreticalLife) return <Text type="secondary">-</Text>;
        const pct = r.lifeRemaining != null ? Math.round((r.lifeRemaining / r.theoreticalLife) * 100) : 100;
        const color = pct > 50 ? Colors.success : pct > 20 ? Colors.warning : Colors.danger;
        return (
          <div>
            <Text style={{ color, fontWeight: 600 }}>{pct}%</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {r.lifeUsed || 0}/{r.theoreticalLife} {r.lifeUnit}
            </Text>
          </div>
        );
      },
    },
    {
      title: '健康度', dataIndex: 'healthScore', key: 'healthScore', width: 90,
      render: (v: number | null) => {
        if (v == null) return <Text type="secondary">-</Text>;
        const color = v >= 80 ? Colors.success : v >= 50 ? Colors.warning : Colors.danger;
        return <Text strong style={{ color }}>{v}</Text>;
      },
    },
    {
      title: '上次保养', dataIndex: 'lastMaintenanceAt', key: 'lastMaintenanceAt', width: 130,
      render: (v: string | null) => {
        if (!v) return <Text type="secondary">-</Text>;
        const d = new Date(v);
        return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
      },
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: unknown, r: any) => (
        <Button size="small" onClick={() => { setSelectedTooling(r); setDetailModal(true); }}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <SafetyOutlined style={{ marginRight: 8 }} />
            工治具保养管理
          </Title>
        </Col>
        <Col>
          <Space>
            <Select
              placeholder="类型"
              value={typeFilter}
              onChange={setTypeFilter}
              allowClear
              style={{ width: 100 }}
              options={['模具', '夹具', '刀具', '量具'].map(t => ({ value: t, label: t }))}
            />
            <Select
              placeholder="状态"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              style={{ width: 110 }}
              options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
          </Space>
        </Col>
      </Row>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: t => `共 ${t} 条` }}
        />
      </Card>

      {/* ─── 详情 Modal ─── */}
      <Modal
        title={<Space><ToolOutlined /> {selectedTooling?.name}</Space>}
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={null}
        width={560}
      >
        {selectedTooling && (
          <div>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="编码">{selectedTooling.code}</Descriptions.Item>
              <Descriptions.Item label="类型">{selectedTooling.type}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge color={STATUS_CONFIG[selectedTooling.status]?.color} text={STATUS_CONFIG[selectedTooling.status]?.label} />
              </Descriptions.Item>
              <Descriptions.Item label="储位">{selectedTooling.location || '-'}</Descriptions.Item>
              <Descriptions.Item label="理论寿命">
                {selectedTooling.theoreticalLife ? `${selectedTooling.theoreticalLife} ${selectedTooling.lifeUnit}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="已用寿命">
                {selectedTooling.lifeUsed != null ? `${selectedTooling.lifeUsed} ${selectedTooling.lifeUnit}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="剩余寿命">
                {selectedTooling.lifeRemaining != null ? `${selectedTooling.lifeRemaining} ${selectedTooling.lifeUnit}` : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="健康度">
                {selectedTooling.healthScore != null
                  ? <Tag color={selectedTooling.healthScore >= 80 ? 'success' : selectedTooling.healthScore >= 50 ? 'warning' : 'error'}>{selectedTooling.healthScore}</Tag>
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="关联设备" span={2}>
                {selectedTooling.device?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="上次保养" span={2}>
                {selectedTooling.lastMaintenanceAt ? (() => { const d = new Date(selectedTooling.lastMaintenanceAt); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`; })() : '未保养'}
              </Descriptions.Item>
            </Descriptions>

            <Divider><HistoryOutlined /> 保养建议</Divider>
            <div style={{ padding: '12px 0' }}>
              {selectedTooling.status === 'maintenance' ? (
                <Tag color="orange" style={{ marginBottom: 8 }}>当前处于保养中</Tag>
              ) : selectedTooling.lifeRemaining != null && selectedTooling.lifeRemaining < (selectedTooling.theoreticalLife || 1) * 0.2 ? (
                <div>
                  <Tag color="red" style={{ marginBottom: 8 }}>寿命不足 20%，建议尽快安排保养</Tag>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <SafetyOutlined style={{ fontSize: 36, color: Colors.gray300, marginBottom: 8, display: 'block' }} />
                  <Text type="secondary">当前状态正常，无需保养</Text>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
