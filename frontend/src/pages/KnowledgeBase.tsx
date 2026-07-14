import { useState, useCallback } from 'react';
import {
  Tag, Input, Select, Empty, Spin, Space, message, Button, Segmented, Modal,
  Descriptions, Divider, Tooltip, Row, Col, Card, Typography, Breadcrumb,
  Collapse, Badge, Form, List, Table, Radio,
} from 'antd';
import {
  BookOutlined, SearchOutlined, ReloadOutlined,
  StarOutlined, StarFilled, PlusOutlined,
  FileTextOutlined, ExperimentOutlined, ToolOutlined,
  SafetyCertificateOutlined, EyeOutlined, ClockCircleOutlined,
  CloseOutlined, DeleteOutlined, EditOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  FilterOutlined, SortAscendingOutlined, ApartmentOutlined,
  FireOutlined, TeamOutlined, AuditOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, PriorityColors, FaultTypeColors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useKnowledgeDataSource, useKnowledgeStatsDataSource, useKnowledgeEquipmentTypesDataSource } from '../services/dataSource';

const { Text, Title } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

// ── 类型定义 ──────────────────────────────────────
interface KnowledgeEntry {
  id: string;
  type: 'case' | 'sop';
  title: string;
  equipmentType?: string;
  faultPart?: string;
  severity?: string;
  faultType?: string;
  symptom?: string;
  cause?: string;
  solution?: string;
  prevention?: string;
  content?: any;
  tags?: string[];
  status: string;
  views: number;
  author?: string;
  sourceWoId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  isFavorited?: boolean;
}

interface StatsData {
  total: number;
  cases: number;
  sops: number;
  pending: number;
  approved: number;
  todayAdded: number;
  monthlyAdded: number;
}

interface TreeItem {
  name: string;
  count: number;
  children?: TreeItem[];
}

// ── 常量 ──────────────────────────────────────────
const SEVERITY_OPTIONS = [
  { value: 'P0', label: 'P0 紧急停产', color: PriorityColors.P0 },
  { value: 'P1', label: 'P1 严重降速', color: PriorityColors.P1 },
  { value: 'P2', label: 'P2 轻微异常', color: PriorityColors.P2 },
  { value: 'P3', label: 'P3 观察项', color: PriorityColors.P3 },
];

const SORT_OPTIONS = [
  { value: 'time', label: '最新发布' },
  { value: 'views', label: '最多浏览' },
  { value: 'severity', label: '按等级' },
];

const FAULT_TYPE_OPTIONS = [
  { value: '机械', label: '机械' },
  { value: '电气', label: '电气' },
  { value: '液压', label: '液压' },
  { value: '气动', label: '气动' },
  { value: '软件', label: '软件' },
  { value: '其他', label: '其他' },
];

// ── 辅助函数 ──────────────────────────────────────
const safeTags = (tags: any): string[] => {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try { return JSON.parse(tags); } catch { return [tags]; }
  }
  return [];
};

const getDateStr = (dateStr: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getTypeLabel = (type: string) => {
  if (type === 'case') return '故障案例';
  if (type === 'sop') return '标准作业';
  return type;
};

const getTypeIcon = (type: string) => {
  if (type === 'case') return <FireOutlined style={{ color: '#EF4444' }} />;
  if (type === 'sop') return <ExperimentOutlined style={{ color: '#3B82F6' }} />;
  return <BookOutlined />;
};

const getTypeTag = (type: string) => {
  if (type === 'case') return <Tag color="#EF4444" style={{ borderRadius: 4, border: 'none', fontSize: 11 }}>故障案例</Tag>;
  if (type === 'sop') return <Tag color="#3B82F6" style={{ borderRadius: 4, border: 'none', fontSize: 11 }}>标准作业</Tag>;
  return null;
};

// ── KnowledgeBase (Main Component) ────────────────
export default function KnowledgeBase() {
  const { isMobile, isTablet } = useResponsive();

  // ── Tab & filters ──
  const [tab, setTab] = useState('all'); // all | cases | sops | pending | favorites
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('time');
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [selectedPart, setSelectedPart] = useState<string | undefined>(undefined);
  const [faultTypeFilter, setFaultTypeFilter] = useState<string | undefined>(undefined);
  const [severityFilter, setSeverityFilter] = useState<string | undefined>(undefined);

  // ── Unified data source hooks ───────────────────────────
  const { data: entries, loading, refresh: fetchEntries } = useKnowledgeDataSource();
  const { data: stats, loading: statsLoading } = useKnowledgeStatsDataSource();
  const { data: treeData, loading: treeLoading, refresh: fetchTree } = useKnowledgeEquipmentTypesDataSource();

  // ── Detail modal ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<KnowledgeEntry | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Create modal ──
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<'case' | 'sop'>('case');
  const [createLoading, setCreateLoading] = useState(false);
  const [form] = Form.useForm();

  // ── Mobile filter drawer ──
  const [filterOpen, setFilterOpen] = useState(false);

  // total from hook data
  const total = entries?.length || 0;

  // ── Toggle favorite ──
  const toggleFavorite = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await api.post(`/knowledge/${id}/favorite`);
      const { favorited } = res.data.data;
      if (detailEntry?.id === id) {
        setDetailEntry(prev => prev ? { ...prev, isFavorited: favorited } : null);
      }
      message.success(favorited ? '已收藏' : '已取消收藏');
      fetchEntries();
    } catch {
      message.error('操作失败');
    }
  }, [detailEntry, fetchEntries]);

  // ── Approve / Reject ──
  const handleApprove = useCallback(async (id: string, status: 'approved' | 'rejected', e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.post(`/knowledge/${id}/approve`, { status });
      message.success(status === 'approved' ? '✓ 已审核通过' : '✗ 已驳回');
      fetchEntries();
      if (detailEntry?.id === id) {
        setDetailEntry(prev => prev ? { ...prev, status } : null);
      }
    } catch {
      message.error('审核操作失败');
    }
  }, [fetchEntries, detailEntry]);

  // ── Delete ──
  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/knowledge/${id}`);
      message.success('已删除');
      setDetailOpen(false);
      setDetailEntry(null);
      fetchEntries();
    } catch {
      message.error('删除失败');
    }
  }, [fetchEntries]);

  // ── Create entry ──
  const handleCreate = useCallback(async () => {
    try {
      const values = await form.validateFields();
      setCreateLoading(true);

      const payload: any = {
        type: createType,
        title: values.title,
        equipmentType: values.equipmentType,
        faultPart: values.faultPart || null,
        severity: values.severity || null,
        faultType: values.faultType || null,
        symptom: values.symptom || null,
        cause: values.cause || null,
        solution: values.solution || null,
        prevention: values.prevention || null,
        tags: values.tags ? values.tags.split(/[,，、\s]+/).filter(Boolean) : [],
        author: values.author || '当前用户',
      };

      if (createType === 'sop') {
        payload.content = {
          tools_required: values.tools ? values.tools.split(/[,，、\s]+/).filter(Boolean) : [],
          safety_warnings: values.safetyWarnings ? values.safetyWarnings.split(/[,，、\s]+/).filter(Boolean) : [],
          parameters: values.parameters ? Object.fromEntries(values.parameters.split('\n').filter(Boolean).map((l: string) => l.split(':'))) : {},
        };
      }

      await api.post('/knowledge', payload);
      message.success('知识条目已创建，等待审核');
      setCreateOpen(false);
      form.resetFields();
      fetchEntries();
    } catch (err: any) {
      if (err.errorFields) return; // Form validation error
      message.error('创建失败');
    } finally {
      setCreateLoading(false);
    }
  }, [createType, form, fetchEntries]);

  // ── Open detail ──
  const openDetail = (id: string) => {
    setDetailLoading(true);
    setDetailOpen(true);
    // Fetch detail via api (detail pages use direct API call)
    api.get(`/knowledge/${id}`).then((res) => {
      setDetailEntry(res.data.data);
      setDetailLoading(false);
    }).catch(() => {
      message.error('加载详情失败');
      setDetailLoading(false);
    });
  };

  // ── Reset filters ──
  const resetFilters = () => {
    setSelectedType(undefined);
    setSelectedPart(undefined);
    setFaultTypeFilter(undefined);
    setSeverityFilter(undefined);
    setSearchText('');
  };

  // ── Clear all filters button ──
  const hasActiveFilters = selectedType || selectedPart || faultTypeFilter || severityFilter || searchText;
  const isReviewTab = tab === 'pending';

  // ── Computed stats for display ──
  const displayStats = stats || { total: 0, cases: 0, sops: 0, pending: 0, approved: 0, todayAdded: 0, monthlyAdded: 0 };

  // ─────────────────────────────────────────────────
  //  RENDER: Stats Row
  // ─────────────────────────────────────────────────
  const renderStats = () => (
    <Row gutter={[isMobile ? 6 : 12, isMobile ? 6 : 12]} style={{ marginBottom: isMobile ? 10 : 16 }}>
      <Col span={isMobile ? 12 : 6}>
        <div style={{
          background: '#fff', borderRadius: 8, border: `1px solid ${Colors.gray200}`,
          padding: isMobile ? '10px 12px' : '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: Colors.primary, lineHeight: 1.2 }}>
            {displayStats.total}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray500, marginTop: 2 }}>知识总数</div>
        </div>
      </Col>
      <Col span={isMobile ? 12 : 6}>
        <div style={{
          background: '#fff', borderRadius: 8, border: `1px solid ${Colors.gray200}`,
          padding: isMobile ? '10px 12px' : '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: '#EF4444', lineHeight: 1.2 }}>
            {displayStats.cases}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray500, marginTop: 2 }}>故障案例</div>
        </div>
      </Col>
      <Col span={isMobile ? 12 : 6}>
        <div style={{
          background: '#fff', borderRadius: 8, border: `1px solid ${Colors.gray200}`,
          padding: isMobile ? '10px 12px' : '14px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: '#3B82F6', lineHeight: 1.2 }}>
            {displayStats.sops}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray500, marginTop: 2 }}>标准作业</div>
        </div>
      </Col>
      <Col span={isMobile ? 12 : 6}>
        <div
          onClick={() => displayStats.pending > 0 && setTab('pending')}
          style={{
            background: '#fff', borderRadius: 8, border: `1px solid ${Colors.gray200}`,
            padding: isMobile ? '10px 12px' : '14px 16px', textAlign: 'center',
            cursor: displayStats.pending > 0 ? 'pointer' : 'default',
            transition: 'box-shadow 0.2s',
          }}
          onMouseEnter={e => { if (displayStats.pending > 0) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: Colors.warning, lineHeight: 1.2 }}>
            {displayStats.pending}
          </div>
          <div style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray500, marginTop: 2 }}>
            待审核 {displayStats.pending > 0 ? '→' : ''}
          </div>
        </div>
      </Col>
    </Row>
  );

  // ─────────────────────────────────────────────────
  //  RENDER: Sidebar Tree
  // ─────────────────────────────────────────────────
  const renderSidebar = () => (
    <div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: Colors.gray700,
        marginBottom: 8, padding: '0 4px',
      }}>
        <ApartmentOutlined style={{ marginRight: 6 }} />
        设备类型
      </div>
      <Collapse
        ghost
        defaultActiveKey={selectedType ? [selectedType] : []}
        size="small"
        style={{ fontSize: 13 }}
      >
        {treeData.map((item) => (
          <Panel
            key={item.name}
            header={
              <div
                onClick={() => {
                  setSelectedType(selectedType === item.name ? undefined : item.name);
                  setSelectedPart(undefined);
                }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  color: selectedType === item.name ? Colors.primary : Colors.gray700,
                  fontWeight: selectedType === item.name ? 600 : 400,
                }}
              >
                <span>{item.name}</span>
                <Badge count={item.count} style={{ backgroundColor: Colors.gray300, color: Colors.gray600, fontSize: 10, fontWeight: 400 }} />
              </div>
            }
          >
            {item.children && item.children.length > 0 ? (
              <div style={{ paddingLeft: 8 }}>
                <div
                  onClick={() => {
                    setSelectedPart(undefined);
                    setSelectedType(item.name);
                  }}
                  style={{
                    padding: '4px 8px', cursor: 'pointer', borderRadius: 4, fontSize: 12,
                    color: selectedType === item.name && !selectedPart ? Colors.primary : Colors.gray600,
                    background: selectedType === item.name && !selectedPart ? Colors.sidebarActive : 'transparent',
                    marginBottom: 2,
                  }}
                >
                  全部 {item.name}
                </div>
                {item.children.map((child) => (
                  <div
                    key={child.name}
                    onClick={() => {
                      setSelectedType(item.name);
                      setSelectedPart(selectedPart === child.name ? undefined : child.name);
                    }}
                    style={{
                      padding: '4px 8px 4px 16px', cursor: 'pointer', borderRadius: 4, fontSize: 12,
                      color: selectedPart === child.name ? Colors.primary : Colors.gray500,
                      background: selectedPart === child.name ? Colors.sidebarActive : 'transparent',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginBottom: 1,
                    }}
                  >
                    <span>{child.name}</span>
                    <span style={{ color: Colors.gray400, fontSize: 11 }}>{child.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '4px 8px 4px 16px', fontSize: 12, color: Colors.gray400 }}>
                暂无子分类
              </div>
            )}
          </Panel>
        ))}
      </Collapse>

      {/* Extra filters */}
      <Divider style={{ margin: '12px 0', fontSize: 11, color: Colors.gray400 }}>更多筛选</Divider>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: Colors.gray600, marginBottom: 4 }}>故障类型</div>
        <Select
          value={faultTypeFilter}
          onChange={setFaultTypeFilter}
          placeholder="全部"
          allowClear
          style={{ width: '100%' }}
          size="small"
          options={FAULT_TYPE_OPTIONS}
        />
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: Colors.gray600, marginBottom: 4 }}>故障等级</div>
        <Select
          value={severityFilter}
          onChange={setSeverityFilter}
          placeholder="全部"
          allowClear
          style={{ width: '100%' }}
          size="small"
          options={SEVERITY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
        />
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────
  //  RENDER: Knowledge Card
  // ─────────────────────────────────────────────────
  const renderCard = (entry: KnowledgeEntry) => {
    const tags = safeTags(entry.tags).slice(0, isMobile ? 3 : 5);
    const isPending = entry.status === 'pending';
    return (
      <div
        key={entry.id}
        onClick={() => openDetail(entry.id)}
        style={{
          background: '#fff', borderRadius: 8,
          border: `1px solid ${Colors.gray200}`,
          padding: isMobile ? '12px' : '14px 16px', cursor: 'pointer',
          transition: 'box-shadow 0.2s, border-color 0.2s',
          marginBottom: isMobile ? 6 : 8,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
          e.currentTarget.style.borderColor = Colors.primary;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = Colors.gray200;
        }}
      >
        {/* Row 1: Title + Type Tag */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
            {getTypeIcon(entry.type)}
            <Text strong style={{ fontSize: isMobile ? 13 : 14, color: Colors.gray800, lineHeight: 1.3 }} ellipsis={{ tooltip: entry.title }}>
              {entry.title}
            </Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {getTypeTag(entry.type)}
            {isPending && (
              <Tag icon={<ClockCircleOutlined />} color={Colors.warningLight}
                style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 10 : 11, lineHeight: '20px', margin: 0 }}>
                待审核
              </Tag>
            )}
            {entry.status === 'rejected' && (
              <Tag icon={<CloseCircleOutlined />} color={Colors.dangerLight}
                style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 10 : 11, lineHeight: '20px', margin: 0 }}>
                已驳回
              </Tag>
            )}
          </div>
        </div>

        {/* Row 2: Meta info */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 4 : 8, marginBottom: 6 }}>
          {entry.equipmentType && (
            <Tag style={{ borderRadius: 4, fontSize: isMobile ? 10 : 11, lineHeight: '20px', margin: 0, background: Colors.gray100, border: 'none', color: Colors.gray600 }}>
              {entry.equipmentType}
            </Tag>
          )}
          {entry.faultPart && (
            <Tag style={{ borderRadius: 4, fontSize: isMobile ? 10 : 11, lineHeight: '20px', margin: 0, background: Colors.gray100, border: 'none', color: Colors.gray600 }}>
              {entry.faultPart}
            </Tag>
          )}
          {entry.severity && (
            <Tag color={PriorityColors[entry.severity] || Colors.gray400}
              style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 10 : 11, lineHeight: '20px', margin: 0 }}>
              {entry.severity}
            </Tag>
          )}
          {entry.faultType && (
            <Tag color={FaultTypeColors[entry.faultType] || Colors.gray500}
              style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 10 : 11, lineHeight: '20px', margin: 0 }}>
              {entry.faultType}
            </Tag>
          )}
        </div>

        {/* Row 3: Summary */}
        <div style={{
          fontSize: isMobile ? 12 : 13, color: Colors.gray500, lineHeight: 1.6,
          marginBottom: isPending ? 8 : 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {entry.type === 'case'
            ? (entry.symptom || entry.cause || '暂无描述')
            : (entry.prevention || entry.content?.steps?.[0]?.description || '暂无描述')
          }
        </div>

        {/* Row 4: Tags + Footer + Review Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {tags.map((tag: string) => (
              <Tag key={tag} style={{ borderRadius: 4, fontSize: isMobile ? 10 : 11, margin: 0, background: Colors.gray50, border: `1px solid ${Colors.gray200}`, color: Colors.gray500 }}>
                {tag}
              </Tag>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: Colors.gray400, flexShrink: 0 }}>
            {isPending ? (
              /* ── 快捷审核按钮 ── */
              <Space size={4}>
                <Tooltip title="驳回">
                  <Button
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={(e) => handleApprove(entry.id, 'rejected', e)}
                    style={{
                      borderRadius: 6, borderColor: Colors.dangerLight, color: Colors.danger,
                      fontSize: 12, height: 26, padding: '0 10px',
                    }}
                  >
                    {isMobile ? '' : '驳回'}
                  </Button>
                </Tooltip>
                <Tooltip title="审核通过">
                  <Button
                    size="small"
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={(e) => handleApprove(entry.id, 'approved', e)}
                    style={{
                      borderRadius: 6, fontSize: 12, height: 26, padding: '0 10px',
                      background: Colors.success, borderColor: Colors.success,
                    }}
                  >
                    {isMobile ? '' : '通过'}
                  </Button>
                </Tooltip>
              </Space>
            ) : (
              <>
                <span><EyeOutlined style={{ marginRight: 2 }} />{entry.views || 0}</span>
                <span>{entry.author || '-'}</span>
                <span>{getDateStr(entry.createdAt)}</span>
                <Tooltip title={entry.isFavorited ? '取消收藏' : '收藏'}>
                  <span
                    onClick={(e) => toggleFavorite(entry.id, e)}
                    style={{ cursor: 'pointer', color: entry.isFavorited ? '#F59E0B' : Colors.gray400 }}
                  >
                    {entry.isFavorited ? <StarFilled /> : <StarOutlined />}
                  </span>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────
  //  RENDER: Detail Modal
  // ─────────────────────────────────────────────────
  const renderDetail = () => {
    if (!detailEntry) return null;
    const e = detailEntry;
    const content = e.content || {};
    const tags = safeTags(e.tags);
    const isCase = e.type === 'case';

    return (
      <Modal
        title={null}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailEntry(null); }}
        footer={null}
        width={isMobile ? '100%' : 800}
        destroyOnClose
        closeIcon={<CloseOutlined />}
        loading={detailLoading}
        styles={{ body: { padding: isMobile ? 16 : 24, maxHeight: '85vh', overflow: 'auto' } }}
      >
        {!detailLoading && (
          <div>
            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                { title: <a onClick={() => { setDetailOpen(false); setTab('all'); }}>知识库</a> },
                { title: getTypeLabel(e.type) },
                ...(e.equipmentType ? [{ title: e.equipmentType }] : []),
              ]}
              style={{ marginBottom: 12, fontSize: 12 }}
            />

            {/* Title Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                {getTypeIcon(e.type)}
                <Title level={4} style={{ margin: 0, fontSize: isMobile ? 16 : 18, color: Colors.gray900 }}>
                  {e.title}
                </Title>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <Tooltip title={e.isFavorited ? '取消收藏' : '收藏'}>
                  <Button
                    size="small"
                    icon={e.isFavorited ? <StarFilled /> : <StarOutlined />}
                    onClick={() => toggleFavorite(e.id)}
                    style={{ borderRadius: 6, color: e.isFavorited ? '#F59E0B' : undefined }}
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(e.id)}
                    style={{ borderRadius: 6 }}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Meta Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {getTypeTag(e.type)}
              {e.status === 'approved' ? (
                <Tag icon={<CheckCircleOutlined />} color={Colors.successLight} style={{ borderRadius: 4, border: 'none' }}>已发布</Tag>
              ) : e.status === 'rejected' ? (
                <Tag icon={<CloseCircleOutlined />} color={Colors.dangerLight} style={{ borderRadius: 4, border: 'none' }}>已驳回</Tag>
              ) : (
                <Tag icon={<ClockCircleOutlined />} color={Colors.warningLight} style={{ borderRadius: 4, border: 'none' }}>待审核</Tag>
              )}
              {e.equipmentType && <Tag style={{ borderRadius: 4, background: Colors.gray100, border: 'none' }}>{e.equipmentType}</Tag>}
              {e.faultPart && <Tag style={{ borderRadius: 4, background: Colors.gray100, border: 'none' }}>{e.faultPart}</Tag>}
              {e.severity && <Tag color={PriorityColors[e.severity]} style={{ borderRadius: 4, border: 'none' }}>{e.severity}</Tag>}
              {e.faultType && <Tag color={FaultTypeColors[e.faultType]} style={{ borderRadius: 4, border: 'none' }}>{e.faultType}</Tag>}
            </div>

            {/* Author & Meta */}
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: Colors.gray400, marginBottom: 16, flexWrap: 'wrap' }}>
              <span><TeamOutlined style={{ marginRight: 4 }} />{e.author || '-'}</span>
              <span><ClockCircleOutlined style={{ marginRight: 4 }} />{getDateStr(e.createdAt)}</span>
              <span><EyeOutlined style={{ marginRight: 4 }} />{e.views || 0} 次浏览</span>
            </div>

            <Divider style={{ margin: '0 0 16px 0' }} />

            {/* ── Case Content ── */}
            {isCase ? (
              <div>
                {e.symptom && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 6 }}>
                      <span style={{ display: 'inline-block', width: 4, height: 14, background: '#EF4444', borderRadius: 2, marginRight: 8, verticalAlign: 'middle' }} />
                      故障现象
                    </div>
                    <div style={{ fontSize: 13, color: Colors.gray600, lineHeight: 1.7, padding: '8px 12px', background: Colors.gray50, borderRadius: 6 }}>
                      {e.symptom}
                    </div>
                  </div>
                )}
                {e.cause && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 6 }}>
                      <span style={{ display: 'inline-block', width: 4, height: 14, background: '#D97706', borderRadius: 2, marginRight: 8, verticalAlign: 'middle' }} />
                      根本原因
                    </div>
                    <div style={{ fontSize: 13, color: Colors.gray600, lineHeight: 1.7, padding: '8px 12px', background: Colors.gray50, borderRadius: 6 }}>
                      {e.cause}
                    </div>
                  </div>
                )}
                {e.solution && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 6 }}>
                      <span style={{ display: 'inline-block', width: 4, height: 14, background: '#16A34A', borderRadius: 2, marginRight: 8, verticalAlign: 'middle' }} />
                      解决步骤
                    </div>
                    <div style={{ fontSize: 13, color: Colors.gray600, lineHeight: 1.8 }}>
                      {e.solution.split('\n').map((line: string, i: number) => (
                        <div key={i} style={{ padding: '3px 0', paddingLeft: 8 }}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
                {e.prevention && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 6 }}>
                      <span style={{ display: 'inline-block', width: 4, height: 14, background: '#3B82F6', borderRadius: 2, marginRight: 8, verticalAlign: 'middle' }} />
                      预防措施
                    </div>
                    <div style={{ fontSize: 13, color: Colors.gray600, lineHeight: 1.7, padding: '8px 12px', background: Colors.gray50, borderRadius: 6 }}>
                      {e.prevention}
                    </div>
                  </div>
                )}
                {content.spareParts && content.spareParts.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 8 }}>
                      <span style={{ display: 'inline-block', width: 4, height: 14, background: '#8B5CF6', borderRadius: 2, marginRight: 8, verticalAlign: 'middle' }} />
                      关联备件
                    </div>
                    <Table
                      dataSource={content.spareParts}
                      rowKey="part_id"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '备件编号', dataIndex: 'part_id', width: 120 },
                        { title: '名称', dataIndex: 'name', flex: 1 },
                        { title: '数量', dataIndex: 'qty', width: 60, render: (v: number, r: any) => `${v}${r.unit || ' 个'}` },
                      ]}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* ── SOP Content ── */
              <div>
                {content.tools_required && content.tools_required.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 6 }}>
                      <ToolOutlined style={{ marginRight: 6 }} />
                      所需工具
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {content.tools_required.map((t: string, i: number) => (
                        <Tag key={i} style={{ borderRadius: 4, padding: '2px 10px', background: Colors.gray50, border: `1px solid ${Colors.gray200}` }}>{t}</Tag>
                      ))}
                    </div>
                  </div>
                )}

                {content.safety_warnings && content.safety_warnings.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.danger, marginBottom: 6 }}>
                      <WarningOutlined style={{ marginRight: 6 }} />
                      安全警告
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {content.safety_warnings.map((w: string, i: number) => (
                        <Tag key={i} color={Colors.dangerLight} style={{ borderRadius: 4, border: 'none' }}>{w}</Tag>
                      ))}
                    </div>
                  </div>
                )}

                {e.prevention && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 6 }}>
                      <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                      适用范围
                    </div>
                    <div style={{ fontSize: 13, color: Colors.gray600, lineHeight: 1.7, padding: '8px 12px', background: Colors.gray50, borderRadius: 6 }}>
                      {e.prevention}
                    </div>
                  </div>
                )}

                {content.steps && content.steps.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 8 }}>
                      <span style={{ display: 'inline-block', width: 4, height: 14, background: '#16A34A', borderRadius: 2, marginRight: 8, verticalAlign: 'middle' }} />
                      操作步骤
                    </div>
                    {content.steps.map((step: any) => (
                      <div key={step.step_no} style={{
                        display: 'flex', gap: 12, padding: '10px 12px',
                        borderLeft: `3px solid ${Colors.primary}`,
                        background: Colors.gray50, borderRadius: 4,
                        marginBottom: 8,
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: Colors.primary, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600, flexShrink: 0,
                        }}>
                          {step.step_no}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: Colors.gray800, marginBottom: 2 }}>
                            {step.description}
                          </div>
                          {step.notes && (
                            <div style={{ fontSize: 12, color: Colors.gray500, fontStyle: 'italic' }}>
                              💡 {step.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {content.parameters && Object.keys(content.parameters).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: Colors.gray800, marginBottom: 6 }}>
                      <span style={{ display: 'inline-block', width: 4, height: 14, background: '#8B5CF6', borderRadius: 2, marginRight: 8, verticalAlign: 'middle' }} />
                      技术参数
                    </div>
                    <Table
                      dataSource={Object.entries(content.parameters).map(([k, v]) => ({ key: k, param: k, value: v }))}
                      rowKey="key"
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '参数', dataIndex: 'param', width: 150 },
                        { title: '值', dataIndex: 'value', flex: 1 },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Divider style={{ margin: '8px 0' }} />
                <div style={{ fontSize: 12, color: Colors.gray500, marginBottom: 4 }}>标签</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {tags.map((tag: string) => (
                    <Tag key={tag} style={{ borderRadius: 4 }}>{tag}</Tag>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {e.status === 'pending' && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Button
                  icon={<CloseCircleOutlined />}
                  onClick={() => handleApprove(e.id, 'rejected')}
                  style={{ borderRadius: 6 }}
                >
                  驳回
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleApprove(e.id, 'approved')}
                  style={{ borderRadius: 6 }}
                >
                  审核通过
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  };

  // ─────────────────────────────────────────────────
  //  RENDER: Create Modal
  // ─────────────────────────────────────────────────
  const renderCreateModal = () => (
    <Modal
      title={<Space><PlusOutlined /> 新建知识条目</Space>}
      open={createOpen}
      onCancel={() => { setCreateOpen(false); form.resetFields(); }}
      onOk={handleCreate}
      confirmLoading={createLoading}
      okText="提交审核"
      cancelText="取消"
      width={isMobile ? '100%' : 640}
      destroyOnClose
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
    >
      <Form form={form} layout="vertical" size={isMobile ? 'middle' : 'small'}>
        <Form.Item label="知识类型">
          <Radio.Group value={createType} onChange={(e) => setCreateType(e.target.value)}>
            <Radio.Button value="case">故障案例</Radio.Button>
            <Radio.Button value="sop">标准作业</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="输入标题" style={{ borderRadius: 6 }} />
        </Form.Item>

        <div style={{ display: 'flex', gap: isMobile ? 0 : 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <Form.Item name="equipmentType" label="设备类型" style={{ flex: 1 }}>
            <Input placeholder="如：注塑机、CNC" style={{ borderRadius: 6 }} />
          </Form.Item>
          {createType === 'case' && (
            <Form.Item name="faultPart" label="故障部位" style={{ flex: 1 }}>
              <Input placeholder="如：主轴、液压系统" style={{ borderRadius: 6 }} />
            </Form.Item>
          )}
        </div>

        <div style={{ display: 'flex', gap: isMobile ? 0 : 12, flexDirection: isMobile ? 'column' : 'row' }}>
          {createType === 'case' && (
            <>
              <Form.Item name="severity" label="故障等级" style={{ flex: 1 }}>
                <Select
                  placeholder="选择等级"
                  options={SEVERITY_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>
              <Form.Item name="faultType" label="故障类型" style={{ flex: 1 }}>
                <Select
                  placeholder="选择类型"
                  options={FAULT_TYPE_OPTIONS}
                  style={{ borderRadius: 6 }}
                />
              </Form.Item>
            </>
          )}
          <Form.Item name="author" label="作者" style={{ flex: 1 }}>
            <Input placeholder="作者" style={{ borderRadius: 6 }} />
          </Form.Item>
        </div>

        {createType === 'case' ? (
          <>
            <Form.Item name="symptom" label="故障现象" rules={[{ required: true, message: '请描述故障现象' }]}>
              <TextArea rows={2} placeholder="描述故障发生时的现象" style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item name="cause" label="根本原因" rules={[{ required: true, message: '请输入根本原因' }]}>
              <TextArea rows={2} placeholder="分析故障的根本原因" style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item name="solution" label="解决措施" rules={[{ required: true, message: '请输入解决措施' }]}>
              <TextArea rows={3} placeholder="描述解决步骤，每行一步" style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item name="prevention" label="预防建议">
              <TextArea rows={2} placeholder="如何预防类似故障" style={{ borderRadius: 6 }} />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item name="prevention" label="适用范围/说明">
              <TextArea rows={2} placeholder="本 SOP 适用的设备、条件等说明" style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item name="tools" label="所需工具（逗号分隔）">
              <Input placeholder="扭矩扳手, 拉马, 铜棒" style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item name="safetyWarnings" label="安全警告（逗号分隔）">
              <Input placeholder="断电挂牌, 佩戴护目镜" style={{ borderRadius: 6 }} />
            </Form.Item>
            <Form.Item name="parameters" label="参数（每行一个，格式：参数名:值）">
              <TextArea rows={3} placeholder="扭矩: 50Nm&#10;润滑脂: SKF X-200" style={{ borderRadius: 6 }} />
            </Form.Item>
          </>
        )}

        <Form.Item name="tags" label="标签（逗号分隔）">
          <Input placeholder="标签1, 标签2, 标签3" style={{ borderRadius: 6 }} />
        </Form.Item>
      </Form>
    </Modal>
  );

  // ─────────────────────────────────────────────────
  //  MAIN RENDER
  // ─────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header: Segmented Tabs + Action Buttons ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8, marginBottom: isMobile ? 10 : 16,
      }}>
        <Segmented
          value={tab}
          onChange={(v) => {
            setTab(v as string);
            if (v !== 'favorites') resetFilters();
          }}
          options={[
            { value: 'all', label: `全部 (${displayStats.total})` },
            { value: 'cases', label: `故障案例 (${displayStats.cases})` },
            { value: 'sops', label: `标准作业 (${displayStats.sops})` },
            { value: 'pending', label: `待审核 (${displayStats.pending})` },
            { value: 'favorites', label: '我的收藏' },
          ]}
          size={isMobile ? 'small' : 'middle'}
          style={{ borderRadius: 6 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setCreateOpen(true); form.resetFields(); }}
          size={isMobile ? 'middle' : 'large'}
          style={{ borderRadius: 6, display: 'flex', alignItems: 'center' }}
        >
          新建知识
        </Button>
      </div>

      {/* ── Stats Row ── */}
      {renderStats()}

      {/* ── Main Content: Sidebar + List ── */}
      <div style={{ display: 'flex', gap: isMobile ? 0 : 16, position: 'relative' }}>
        {/* Desktop Sidebar — 待审核标签页下隐藏筛选树 */}
        {!isMobile && !isReviewTab && (
          <div style={{
            width: 220, flexShrink: 0,
            background: '#fff', borderRadius: 8, border: `1px solid ${Colors.gray200}`,
            padding: 12, height: 'fit-content', position: 'sticky', top: 0,
          }}>
            {renderSidebar()}
          </div>
        )}

        {/* Mobile Filter Drawer Trigger — 待审核标签页下不显示 */}
        {isMobile && !isReviewTab && (
          <div style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 100 }}>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={<FilterOutlined />}
              onClick={() => setFilterOpen(true)}
              style={{
                boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
                width: 48, height: 48,
              }}
            />
          </div>
        )}

        {/* Mobile Filter Drawer */}
        <Modal
          title={<Space><FilterOutlined /> 筛选条件</Space>}
          open={filterOpen}
          onCancel={() => setFilterOpen(false)}
          footer={null}
          width="80vw"
          destroyOnClose
        >
          {renderSidebar()}
          {hasActiveFilters && (
            <Button
              block
              icon={<ReloadOutlined />}
              onClick={() => { resetFilters(); setFilterOpen(false); }}
              style={{ marginTop: 12, borderRadius: 6 }}
            >
              清除筛选
            </Button>
          )}
        </Modal>

        {/* Right Column: Search + List */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ── 审核模式提示横幅 ── */}
          {isReviewTab && (
            <div style={{
              background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
              borderRadius: 8, padding: isMobile ? '10px 14px' : '12px 16px',
              marginBottom: isMobile ? 10 : 12,
              border: `1px solid ${Colors.warningLight}30`,
              display: 'flex', alignItems: 'center', gap: 10,
              flexWrap: 'wrap',
            }}>
              <AuditOutlined style={{ color: Colors.warning, fontSize: 18 }} />
              <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 500, color: Colors.gray800, flex: 1 }}>
                审核模式 — {total} 条知识条目待审核
              </span>
              <span style={{ fontSize: 12, color: Colors.gray500 }}>
                点击卡片查看详情，或直接通过/驳回
              </span>
            </div>
          )}

          {/* Search & Sort Bar */}
          <div style={{
            display: 'flex', gap: isMobile ? 6 : 10,
            marginBottom: isMobile ? 8 : 12,
            flexDirection: isMobile ? 'column' : 'row',
          }}>
            <Input
              prefix={<SearchOutlined style={{ color: Colors.gray400 }} />}
              placeholder={isMobile ? "搜索知识库..." : "搜索故障现象、设备型号、SOP..."}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ flex: 1, borderRadius: 6 }}
              size={isMobile ? 'middle' : 'large'}
            />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Select
                value={sortBy}
                onChange={setSortBy}
                prefix=<SortAscendingOutlined />
                options={SORT_OPTIONS}
                style={{ width: isMobile ? '100%' : 130 }}
                size={isMobile ? 'middle' : 'large'}
              />
              <Button
                icon={<ReloadOutlined />}
                onClick={() => { resetFilters(); fetchEntries(); }}
                size={isMobile ? 'middle' : 'large'}
                style={{ borderRadius: 6 }}
              >
                {!isMobile && '刷新'}
              </Button>
            </div>
          </div>

          {/* Search result count */}
          {hasActiveFilters && (
            <div style={{ fontSize: 12, color: Colors.gray500, marginBottom: 8 }}>
              共 {total} 条结果
              {hasActiveFilters && (
                <a onClick={resetFilters} style={{ marginLeft: 8, color: Colors.primary }}>
                  清除筛选
                </a>
              )}
            </div>
          )}

          {/* Entry List */}
          {loading ? (
            <Spin style={{ display: 'block', margin: '60px auto' }} />
          ) : entries.length === 0 ? (
            <Empty
              description={
                tab === 'favorites'
                  ? '暂无收藏 - 点击知识卡片上的星标进行收藏'
                  : tab === 'pending'
                  ? '暂无待审核条目 - 所有知识条目已完成审核'
                  : '暂无知识条目 - 点击右上角"新建知识"创建'
              }
              style={{ marginTop: 40 }}
            >
              {tab === 'pending' && (
                <Button type="primary" onClick={() => setTab('all')} style={{ borderRadius: 6, marginTop: 8 }}>
                  浏览全部知识
                </Button>
              )}
            </Empty>
          ) : (
            <div>
              {entries.map((entry) => renderCard(entry))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {renderDetail()}

      {/* ── Create Modal ── */}
      {renderCreateModal()}
    </div>
  );
}

// ── Inline Warning Icon (used in SOP detail) ──
function WarningOutlined(props: any) {
  return (
    <svg viewBox="64 64 896 896" width="1em" height="1em" fill="currentColor" {...props}>
      <path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm-32 232c0-4.4 3.6-8 8-8h48c4.4 0 8 3.6 8 8v272c0 4.4-3.6 8-8 8h-48c-4.4 0-8-3.6-8-8V296zm32 440a48.01 48.01 0 010-96 48.01 48.01 0 010 96z" />
    </svg>
  );
}
