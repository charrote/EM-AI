// @ts-nocheck
import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Tag } from 'antd';
import { BoltIcon, PauseIcon, RefreshIcon, CrossIcon, WrenchIcon, WarningIcon, TrashIcon, QuestionIcon, SpinnerIcon } from '../components/Icons';
import { useDataSource } from '../services/dataSource';
import { deviceApi } from '../services/devices';
import { generateMockDevices } from '../services/mockData';

const STATUS_CFG = {
  running: { color: '#22C55E', label: '运行中', icon: <BoltIcon size={14} /> },
  idle: { color: '#9CA3AF', label: '待机', icon: <PauseIcon size={14} /> },
  changeover: { color: '#F59E0B', label: '换型中', icon: <RefreshIcon size={14} /> },
  fault: { color: '#EF4444', label: '故障', icon: <CrossIcon size={14} /> },
  maintenance: { color: '#3B82F6', label: '保养中', icon: <WrenchIcon size={14} /> },
  repair: { color: '#F97316', label: '检修中', icon: <WarningIcon size={14} /> },
  retired: { color: '#6B7280', label: '已报废', icon: <TrashIcon size={14} /> },
};

function DeviceCard({ device, onClick }: { device: any; onClick: () => void }) {
  const cfg = STATUS_CFG[device.status] || { color: '#999', label: device.status, icon: <QuestionIcon size={14} /> };
  const oeeColor = (device.oee || 0) >= 85 ? '#22C55E' : (device.oee || 0) >= 75 ? '#F59E0B' : '#EF4444';
  const healthColor = (device.healthScore || 0) >= 80 ? '#22C55E' : (device.healthScore || 0) >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: 14,
        cursor: 'pointer', transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#3B82F6'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
    >
      {/* Row 1: name + status badge (icon + label) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {device.name}
        </span>
        <span style={{
          background: cfg.color, color: '#fff', borderRadius: 3, padding: '0 8px',
          fontSize: 10, lineHeight: '18px', fontWeight: 500, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          {cfg.icon}{cfg.label}
        </span>
      </div>

      {/* Row 2: code + type */}
      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 8, display: 'flex', gap: 12 }}>
        <span>{device.code}</span>
        <span>{device.type}</span>
      </div>

      {/* Row 3: OEE + HealthScore */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#6B7280' }}>OEE</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: oeeColor }}>{device.oee ?? '-'}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#6B7280' }}>健康</span>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `conic-gradient(${healthColor} ${device.healthScore || 0}%, #F3F4F6 ${device.healthScore || 0}%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: '#333', background: '#fff', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {device.healthScore ?? '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeviceList() {
  const [scenario, setScenario] = useState<string>('metal');
  const [areas, setAreas] = useState<any[]>([]);
  const [filterAreas, setFilterAreas] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const navigate = useNavigate();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 使用 useDataSource 钩子，自动根据 dataMode 切换数据源
  const { data, loading, source } = useDataSource<any[]>(
    async () => {
      const params = new URLSearchParams();
      params.set('scenario', scenario);
      if (filterAreas.length) filterAreas.forEach(a => params.append('area', a));
      if (filterStatuses.length) filterStatuses.forEach(s => params.append('status', s));
      if (filterTypes.length) filterTypes.forEach(t => params.append('type', t));

      const res = await deviceApi.list();
      return res.data || [];
    },
    generateMockDevices(20),
    { delay: 200 } // 演示延迟，让切换效果更明显
  );

  const devices = data || [];

  // Filters
  const areaOptions = useMemo(() => areas.map((a: any) => ({ value: a.area, label: `${a.area} (${a.total}台)` })), [areas]);
  const statusOptions = Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label }));

  // Group by area
  const filteredAreas = useMemo(() => {
    let filtered = [...devices];
    if (filterAreas.length) filtered = filtered.filter(d => filterAreas.includes(d.area));
    if (filterStatuses.length) filtered = filtered.filter(d => filterStatuses.includes(d.status));
    if (filterTypes.length) filtered = filtered.filter(d => filterTypes.includes(d.type));

    const areaMap = new Map<string, any[]>();
    for (const d of filtered) {
      const area = d.area || '未分配';
      if (!areaMap.has(area)) areaMap.set(area, []);
      areaMap.get(area)!.push(d);
    }
    return Array.from(areaMap.entries())
      .map(([area, devs]) => ({
        area, devices: devs, total: devs.length,
        statusCounts: devs.reduce((acc: any, d: any) => { acc[d.status] = (acc[d.status] || 0) + 1; return acc; }, {}),
      }))
      .sort((a, b) => a.area.localeCompare(b.area));
  }, [devices, filterAreas, filterStatuses, filterTypes]);

  const totalFiltered = filteredAreas.reduce((s, a) => s + a.total, 0);

  const scenarioLabels: Record<string, string> = { metal: '金属加工', capacitor: '电解电容' };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', borderRadius: 6, padding: 2 }}>
          {['metal', 'capacitor'].map(s => (
            <div key={s}
              onClick={() => { setScenario(s); setFilterAreas([]); setFilterStatuses([]); setFilterTypes([]); }}
              style={{
                padding: '4px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                background: scenario === s ? '#fff' : 'transparent', color: scenario === s ? '#1D4ED8' : '#6B7280',
                boxShadow: scenario === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >{scenarioLabels[s]}</div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_CFG).map(([key, cfg]) => {
            const count = devices.filter(d => d.status === key).length;
            if (!count) return null;
            return (
              <span key={key} style={{
                background: cfg.color + '20', color: cfg.color, borderRadius: 4,
                padding: '1px 10px', fontSize: 12, fontWeight: 500,
              }}>
                {cfg.icon} {cfg.label} {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #E5E7EB', padding: '10px 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            mode="multiple" placeholder="全部区域" allowClear maxTagCount={2}
            value={filterAreas.length ? filterAreas : undefined}
            onChange={(v) => setFilterAreas(v as string[])}
            options={areaOptions}
            style={{ minWidth: 200 }} size="small"
          />
          <Select
            mode="multiple" placeholder="全部状态" allowClear maxTagCount={2}
            value={filterStatuses.length ? filterStatuses : undefined}
            onChange={(v) => setFilterStatuses(v as string[])}
            options={statusOptions}
            style={{ minWidth: 160 }} size="small"
          />
          <div style={{ fontSize: 13, color: '#6B7280', marginLeft: 'auto' }}>
            {(filterAreas.length || filterStatuses.length || filterTypes.length)
              ? <>筛选 <strong style={{ color: '#1D4ED8' }}>{totalFiltered}</strong> / {devices.length} 台</>
              : <>共 <strong style={{ color: '#1D4ED8' }}>{devices.length}</strong> 台设备</>
            }
          </div>
        </div>
      </div>

      {/* Device grid by area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF', fontSize: 16 }}><SpinnerIcon size={18} style={{ marginRight: 6 }} />加载中...</div>
      ) : filteredAreas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF', fontSize: 16 }}>没有匹配的设备</div>
      ) : (
        filteredAreas.map(group => {
          const avgOEE = group.devices.reduce((s: number, d: any) => s + (d.oee || 0), 0) / (group.devices.length || 1);
          const avgOeeRounded = Math.round(avgOEE * 10) / 10;
          const oeeColor = avgOeeRounded >= 85 ? '#22C55E' : avgOeeRounded >= 75 ? '#F59E0B' : '#EF4444';
          return (
          <div key={group.area} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingLeft: 4, flexWrap: 'wrap', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#1F2937' }}>{group.area}</h3>
                <span style={{ background: '#F3F4F6', borderRadius: 10, padding: '0 10px', fontSize: 12, color: '#6B7280' }}>{group.total} 台</span>
                <span style={{ background: `${oeeColor}20`, borderRadius: 10, padding: '0 10px', fontSize: 12, fontWeight: 600, color: oeeColor }}>
                  综合OEE {avgOeeRounded}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.entries(group.statusCounts).map(([status, count]) => {
                  const cfg = STATUS_CFG[status];
                  if (!cfg) return null;
                  return (
                    <span key={status} style={{
                      background: cfg.color + '20', color: cfg.color, borderRadius: 3,
                      padding: '0 8px', fontSize: 11, lineHeight: '20px',
                    }}>
                      {cfg.label} {count}
                    </span>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {group.devices.map((device: any) => (
                <DeviceCard key={device.id} device={device} onClick={() => navigate(`/devices/${device.id}`)} />
              ))}
            </div>
          </div>
          );
        })
      )}
    </div>
  );
}
