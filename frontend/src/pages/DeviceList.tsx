import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Tag, Spin, Empty, Segmented, Select, Space, Progress, Tooltip, Switch } from 'antd';
import {
  ThunderboltOutlined, UserOutlined, ToolOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors, DeviceStatusConfig } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { isMobile } = useResponsive();

  // 多选筛选条件（数组）
  const [filterAreas, setFilterAreas] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);

  // Simulator 状态
  const [simulatorStatus, setSimulatorStatus] = useState<'running' | 'stopped'>('stopped');
  const [simulatorTick, setSimulatorTick] = useState(0);

  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载场景配置
  useEffect(() => {
    api.get('/devices/scenarios').then((res) => {
      setScenarios(res.data.data);
    });
    // 获取模拟器状态
    api.get('/demo/simulator').then((res) => {
      setSimulatorStatus(res.data.status);
      setSimulatorTick(res.data.tickCount);
    }).catch(() => {});
  }, []);

  // ── 加载数据函数（可复用） ───────────────────
  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('scenario', scenario);
      if (filterAreas.length) filterAreas.forEach((a) => params.append('area', a));
      if (filterStatuses.length) filterStatuses.forEach((s) => params.append('status', s));
      if (filterTypes.length) filterTypes.forEach((t) => params.append('type', t));

      const [areasRes, devicesRes] = await Promise.all([
        api.get(`/devices/areas?scenario=${scenario}`),
        api.get(`/devices?${params.toString()}`),
      ]);
      setAreas(areasRes.data.data);
      setDevices(devicesRes.data.data);
    } catch (err) {
      console.error('Failed to load device data', err);
    }
  }, [scenario, filterAreas, filterStatuses, filterTypes]);

  // 首次 + 筛选变化时加载
  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // ── 自动刷新轮询 ────────────────────────────
  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      loadData();
      // 顺便刷新模拟器计数
      api.get('/demo/simulator').then((res) => {
        setSimulatorStatus(res.data.status);
        setSimulatorTick(res.data.tickCount);
      }).catch(() => {});
    }, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadData]);

  // 当前场景类型列表
  const currentTypes = scenarios[scenario]?.types || [];

  // 区域选项
  const areaOptions = useMemo(() => {
    return areas.map((a: any) => ({ value: a.area, label: `${a.area} (${a.total}台)` }));
  }, [areas]);

  // 类型选项（从当前场景的设备类型中）
  const typeOptions = useMemo(() => {
    return currentTypes.map((t) => ({ value: t, label: t }));
  }, [currentTypes]);

  // 状态选项
  const statusOptions = Object.entries(DeviceStatusConfig).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
  }));

  // 筛选后结果（分组）
  const filteredAreas = useMemo(() => {
    let filtered = [...devices];
    if (filterAreas.length) filtered = filtered.filter((d: any) => filterAreas.includes(d.area));
    if (filterStatuses.length) filtered = filtered.filter((d: any) => filterStatuses.includes(d.status));
    if (filterTypes.length) filtered = filtered.filter((d: any) => filterTypes.includes(d.type));

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
  }, [devices, filterAreas, filterStatuses, filterTypes]);

  const totalFiltered = filteredAreas.reduce((s, a) => s + a.total, 0);

  // ── 渲染 ────────────────────────────────────
  return (
    <div>
      {/* ─── 顶部栏：场景切换 + 实时指示器 + 统计 ─── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: isMobile ? 12 : 16,
        gap: isMobile ? 8 : 12,
      }}>
        <Segmented
          value={scenario}
          onChange={(v) => { setScenario(v as ScenarioKey); setFilterAreas([]); setFilterStatuses([]); setFilterTypes([]); }}
          options={[
            { value: 'metal', label: `金属加工` },
            { value: 'capacitor', label: `电解电容` },
          ]}
          style={{ borderRadius: 6 }}
          size={isMobile ? 'middle' : 'large'}
        />
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: isMobile ? 6 : 12,
          alignItems: 'center',
        }}>
          {/* 实时指示器 */}
          <Tooltip title={`模拟器已运行 ${simulatorStatus === 'running' ? `${simulatorTick} 次 tick` : '已停止'}`}>
            <Tag
              color={simulatorStatus === 'running' ? 'green' : 'default'}
              style={{ borderRadius: 4, border: 'none', margin: 0, padding: '2px 12px', fontSize: isMobile ? 11 : 12, lineHeight: '22px' }}
            >
              <span style={{
                display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                background: simulatorStatus === 'running' ? '#52c41a' : Colors.gray400,
                marginRight: 5, verticalAlign: 'middle',
                animation: simulatorStatus === 'running' ? 'pulse 2s infinite' : 'none',
              }} />
              {simulatorStatus === 'running' ? `LIVE #${simulatorTick}` : 'OFF'}
            </Tag>
          </Tooltip>
          {/* 自动刷新开关 */}
          <Space size={4}>
            <ClockCircleOutlined style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray400 }} />
            <span style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray500 }}>30s刷新</span>
            <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
          </Space>
          {/* 状态统计（移动端只显示有数量的） */}
          {Object.entries(DeviceStatusConfig).map(([key, cfg]) => {
            const count = devices.filter((d: any) => d.status === key).length;
            if (!count) return null;
            if (isMobile && count === 0) return null;
            const Icon = cfg.icon;
            return (
              <Tag
                key={key}
                color={cfg.color}
                style={{ borderRadius: 4, border: 'none', margin: 0, padding: '2px 10px', fontSize: isMobile ? 10 : 12 }}
              >
                <Icon style={{ marginRight: 3, fontSize: isMobile ? 10 : 11 }} />
                {isMobile ? count : `${cfg.label} ${count}`}
              </Tag>
            );
          })}
        </div>
      </div>

      {/* ─── 多选筛选栏（移动端纵向排列） ─── */}
      <PageCard bodyStyle={{ padding: isMobile ? '8px 12px' : '10px 16px' }} style={{ marginBottom: isMobile ? 12 : 16 }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 12,
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          <Select
            mode="multiple"
            placeholder="全部区域"
            value={filterAreas.length ? filterAreas : undefined}
            onChange={(v) => setFilterAreas(v as string[])}
            options={areaOptions}
            allowClear
            maxTagCount={isMobile ? 1 : 2}
            style={{ flex: isMobile ? '1 1 auto' : '0 0 220px', borderRadius: 6 }}
            size={isMobile ? 'small' : 'small'}
          />
          <Select
            mode="multiple"
            placeholder="全部状态"
            value={filterStatuses.length ? filterStatuses : undefined}
            onChange={(v) => setFilterStatuses(v as string[])}
            options={statusOptions}
            allowClear
            maxTagCount={isMobile ? 1 : 2}
            style={{ flex: isMobile ? '1 1 auto' : '0 0 180px', borderRadius: 6 }}
            size="small"
          />
          <Select
            mode="multiple"
            placeholder="全部类型"
            value={filterTypes.length ? filterTypes : undefined}
            onChange={(v) => setFilterTypes(v as string[])}
            options={typeOptions}
            allowClear
            maxTagCount={isMobile ? 1 : 2}
            style={{ flex: isMobile ? '1 1 auto' : '0 0 200px', borderRadius: 6 }}
            size="small"
          />
          <div style={{
            textAlign: isMobile ? 'left' : 'right',
            fontSize: 13,
            color: Colors.gray500,
            flex: isMobile ? '0 0 auto' : '1 1 auto',
          }}>
            {(filterAreas.length || filterStatuses.length || filterTypes.length)
              ? <span>筛选 <strong style={{ color: Colors.primary }}>{totalFiltered}</strong> / {devices.length} 台</span>
              : <span>共 <strong style={{ color: Colors.primary }}>{devices.length}</strong> 台设备</span>
            }
          </div>
        </div>
      </PageCard>

      {/* ─── 区域分组设备列表 ─── */}
      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '80px auto' }} />
      ) : filteredAreas.length === 0 ? (
        <Empty description="没有匹配的设备" />
      ) : (
        filteredAreas.map((areaGroup) => (
          <div key={areaGroup.area} style={{ marginBottom: isMobile ? 12 : 16 }}>
            {/* 区域标题栏 */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: isMobile ? 8 : 10, paddingLeft: 4,
              flexWrap: 'wrap', gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: isMobile ? 15 : 16, fontWeight: 600, color: Colors.gray800 }}>
                  {areaGroup.area}
                </h3>
                <Tag style={{ borderRadius: 10, background: Colors.gray100, border: 'none', color: Colors.gray500, fontSize: isMobile ? 11 : 12 }}>
                  {areaGroup.total} 台
                </Tag>
              </div>
              <Space size={isMobile ? 2 : 4} wrap>
                {Object.entries(areaGroup.statusCounts).map(([status, count]) => {
                  const cfg = DeviceStatusConfig[status];
                  if (!cfg) return null;
                  return (
                    <Tag
                      key={status}
                      color={cfg.color}
                      style={{ borderRadius: 3, border: 'none', margin: 0, fontSize: isMobile ? 10 : 11, lineHeight: '18px', padding: '0 8px' }}
                    >
                      {isMobile ? `${count}` : `${cfg.label} ${count}`}
                    </Tag>
                  );
                })}
              </Space>
            </div>

            {/* 设备卡片网格 */}
            <Row gutter={[isMobile ? 8 : 12, isMobile ? 8 : 12]}>
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

      {/* LIVE 指示灯脉冲动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
