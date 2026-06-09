import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Tag, Spin, Empty, Segmented, Select, Space, Progress, Collapse, Badge, Tooltip } from 'antd';
import type { CollapseProps } from 'antd';
import {
  ThunderboltOutlined, UserOutlined, ToolOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, DeviceStatusConfig } from '../styles/theme';

// ── 场景配置 ──────────────────────────────────
interface ScenarioInfo {
  label: string;
  types: string[];
}

type ScenarioKey = 'metal' | 'capacitor';

// ── 设备卡片子组件 ────────────────────────────
function DeviceMiniCard({ device, onClick }: { device: any; onClick: () => void }) {
  const statusCfg = DeviceStatusConfig[device.status];
  const StatusIcon = statusCfg?.icon || ThunderboltOutlined;
  const oeeColor = (device.oee || 0) >= 85 ? Colors.successLight : (device.oee || 0) >= 75 ? Colors.warningLight : Colors.dangerLight;

  // 检查是否有活跃工单（保养/维修中显示负责人）
  const activeWo = device.workOrders?.[0];
  const showAssignee = ['maintenance', 'repair'].includes(device.status) && activeWo?.assigneeId;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${Colors.gray200}`,
        borderRadius: 8,
        padding: 14,
        cursor: 'pointer',
        borderLeft: `3px solid ${statusCfg?.color || Colors.gray400}`,
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = Colors.primaryLight; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = Colors.gray200; }}
    >
      {/* 首行：状态图标 + 名称 + 状态标签 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <StatusIcon style={{ fontSize: 14, color: statusCfg?.color || Colors.gray400, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: Colors.gray800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {device.name}
          </span>
        </div>
        <Tag
          color={statusCfg?.color}
          style={{ borderRadius: 3, border: 'none', margin: 0, fontSize: 10, lineHeight: '18px', padding: '0 8px', flexShrink: 0 }}
        >
          {statusCfg?.label || device.status}
        </Tag>
      </div>

      {/* 第二行：编码 + 类型 */}
      <div style={{ fontSize: 11, color: Colors.gray400, marginBottom: 8, display: 'flex', gap: 12 }}>
        <span>{device.code}</span>
        <span>{device.type}</span>
      </div>

      {/* 第三行：OEE + 健康度 (紧凑) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: Colors.gray500 }}>OEE</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: oeeColor }}>{device.oee || '-'}%</span>
        </div>
        <Progress
          type="circle"
          percent={device.healthScore || 0}
          size={32}
          strokeColor={device.healthScore >= 80 ? Colors.successLight : device.healthScore >= 60 ? Colors.warningLight : Colors.dangerLight}
          trailColor={Colors.gray100}
          format={(pct) => ''}
        />
      </div>

      {/* 第四行：维修/保养负责人 */}
      {showAssignee && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${Colors.gray100}`, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: Colors.warningLight }}>
          <UserOutlined style={{ fontSize: 11 }} />
          <span>{activeWo.assigneeId}</span>
        </div>
      )}
    </div>
  );
}

// ── 主组件 ─────────────────────────────────────
export default function DeviceList() {
  const [scenarios, setScenarios] = useState<Record<ScenarioKey, ScenarioInfo>>({ metal: { label: '金属加工', types: [] }, capacitor: { label: '电解电容', types: [] } });
  const [scenario, setScenario] = useState<ScenarioKey>('metal');
  const [areas, setAreas] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 筛选条件
  const [filterArea, setFilterArea] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  const navigate = useNavigate();

  // 加载场景配置
  useEffect(() => {
    api.get('/devices/scenarios').then((res) => {
      setScenarios(res.data.data);
    });
  }, []);

  // 加载设备数据
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/devices/areas?scenario=${scenario}`),
      api.get(`/devices?scenario=${scenario}`),
    ]).then(([areasRes, devicesRes]) => {
      setAreas(areasRes.data.data);
      setDevices(devicesRes.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [scenario]);

  // 当前场景类型列表
  const currentTypes = scenarios[scenario]?.types || [];

  // 当前场景下的区域列表
  const areaOptions = useMemo(() => {
    return areas.map((a: any) => ({ value: a.area, label: `${a.area} (${a.total}台)` }));
  }, [areas]);

  // 当前场景下的类型列表（去重，从设备数据中提取）
  const typeOptions = useMemo(() => {
    const types = new Set(devices.map((d: any) => d.type));
    return Array.from(types).map((t) => ({ value: t as string, label: t as string }));
  }, [devices]);

  // 状态选项
  const statusOptions = Object.entries(DeviceStatusConfig).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
  }));

  // 筛选后的分组设备数据
  const filteredAreas = useMemo(() => {
    // First filter devices
    let filtered = [...devices];
    if (filterArea) filtered = filtered.filter((d: any) => d.area === filterArea);
    if (filterStatus) filtered = filtered.filter((d: any) => d.status === filterStatus);
    if (filterType) filtered = filtered.filter((d: any) => d.type === filterType);

    // Then group by area
    const areaMap = new Map<string, any[]>();
    for (const d of filtered) {
      const area = d.area || '未分配';
      if (!areaMap.has(area)) areaMap.set(area, []);
      areaMap.get(area)!.push(d);
    }

    return Array.from(areaMap.entries())
      .map(([area, devs]) => ({
        area,
        devices: devs,
        total: devs.length,
        statusCounts: devs.reduce((acc: any, d: any) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }))
      .sort((a, b) => a.area.localeCompare(b.area));
  }, [devices, filterArea, filterStatus, filterType]);

  // ── 渲染 ────────────────────────────────────
  return (
    <div>
      {/* ─── 场景切换 + 统计 ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <Segmented
          value={scenario}
          onChange={(v) => { setScenario(v as ScenarioKey); setFilterArea(''); setFilterStatus(''); setFilterType(''); }}
          options={[
            { value: 'metal', label: `金属加工 (${scenarios.metal.label})` },
            { value: 'capacitor', label: `电解电容 (${scenarios.capacitor.label})` },
          ]}
          style={{ borderRadius: 6 }}
          size="large"
        />
        <Space size={4}>
          {Object.entries(DeviceStatusConfig).map(([key, cfg]) => {
            const count = devices.filter((d: any) => d.status === key).length;
            if (!count) return null;
            const Icon = cfg.icon;
            return (
              <Tag
                key={key}
                color={cfg.color}
                style={{ borderRadius: 4, border: 'none', margin: 0, padding: '2px 10px', fontSize: 12 }}
              >
                <Icon style={{ marginRight: 3, fontSize: 11 }} />
                {cfg.label} {count}
              </Tag>
            );
          })}
        </Space>
      </div>

      {/* ─── 筛选栏 ─── */}
      <PageCard bodyStyle={{ padding: '10px 16px' }} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 8]} align="middle">
          <Col flex="180px">
            <Select
              placeholder="全部区域"
              value={filterArea || undefined}
              onChange={(v) => setFilterArea(v || '')}
              options={areaOptions}
              allowClear
              style={{ width: '100%', borderRadius: 6 }}
              size="small"
            />
          </Col>
          <Col flex="140px">
            <Select
              placeholder="全部状态"
              value={filterStatus || undefined}
              onChange={(v) => setFilterStatus(v || '')}
              options={statusOptions}
              allowClear
              style={{ width: '100%', borderRadius: 6 }}
              size="small"
            />
          </Col>
          <Col flex="160px">
            <Select
              placeholder="全部类型"
              value={filterType || undefined}
              onChange={(v) => setFilterType(v || '')}
              options={typeOptions}
              allowClear
              style={{ width: '100%', borderRadius: 6 }}
              size="small"
            />
          </Col>
          <Col flex="auto">
            <div style={{ textAlign: 'right', fontSize: 13, color: Colors.gray500 }}>
              {(filterArea || filterStatus || filterType)
                ? <span>筛选出 <strong style={{ color: Colors.primary }}>{filteredAreas.reduce((s, a) => s + a.total, 0)}</strong> 台设备</span>
                : <span>共 <strong style={{ color: Colors.primary }}>{devices.length}</strong> 台设备</span>
              }
            </div>
          </Col>
        </Row>
      </PageCard>

      {/* ─── 区域分组设备列表 ─── */}
      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
      ) : filteredAreas.length === 0 ? (
        <Empty description="没有匹配的设备" />
      ) : (
        filteredAreas.map((areaGroup) => (
          <div key={areaGroup.area} style={{ marginBottom: 16 }}>
            {/* 区域标题栏 */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 10, paddingLeft: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: Colors.gray800 }}>
                  {areaGroup.area}
                </h3>
                <Tag style={{ borderRadius: 10, background: Colors.gray100, border: 'none', color: Colors.gray500, fontSize: 12 }}>
                  {areaGroup.total} 台
                </Tag>
              </div>
              <Space size={4}>
                {Object.entries(areaGroup.statusCounts).map(([status, count]) => {
                  const cfg = DeviceStatusConfig[status];
                  if (!cfg) return null;
                  return (
                    <Tag
                      key={status}
                      color={cfg.color}
                      style={{ borderRadius: 3, border: 'none', margin: 0, fontSize: 11, lineHeight: '18px', padding: '0 8px' }}
                    >
                      {cfg.label} {count}
                    </Tag>
                  );
                })}
              </Space>
            </div>

            {/* 设备卡片网格 */}
            <Row gutter={[12, 12]}>
              {areaGroup.devices.map((device: any) => (
                <Col key={device.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                  <DeviceMiniCard
                    device={device}
                    onClick={() => navigate(`/devices/${device.id}`)}
                  />
                </Col>
              ))}
            </Row>
          </div>
        ))
      )}
    </div>
  );
}
