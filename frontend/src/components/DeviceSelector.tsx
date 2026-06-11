import { useEffect, useState, useRef, useCallback } from 'react';
import { Select, Tag, Space, Spin, Typography } from 'antd';
import { SearchOutlined, ToolOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;

/* ─── 设备数据类型 ────────────────────────────── */

export interface DeviceInfo {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
  area?: string;
  line?: string;
  healthScore?: number;
  oee?: number;
}

/* ─── 组件 Props ──────────────────────────────── */

interface DeviceSelectorProps {
  value?: DeviceInfo | null;
  onChange?: (device: DeviceInfo | null) => void;
  placeholder?: string;
  /** 允许清除选择 */
  allowClear?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
  /** 暗色背景模式（用于 AURA 暗色主题页面） */
  dark?: boolean;
}

/* ─── 状态颜色映射 ────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  running: '#22C55E',
  idle: '#9CA3AF',
  changeover: '#F59E0B',
  fault: '#EF4444',
  maintenance: '#3B82F6',
  repair: '#F97316',
  retired: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  running: '运行中',
  idle: '待机',
  changeover: '换型中',
  fault: '故障',
  maintenance: '保养中',
  repair: '检修中',
  retired: '已报废',
};

/* ═══════════════════════════════════════════════════
   组件
   ═══════════════════════════════════════════════════ */

export default function DeviceSelector({
  value,
  onChange,
  placeholder = '搜索设备名称或编号...',
  allowClear = true,
  compact = false,
  dark = false,
}: DeviceSelectorProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const fetchIdRef = useRef(0);

  /* ── 获取设备列表 ── */
  const fetchDevices = useCallback(async (keyword?: string) => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      // 优先使用带 keyword 搜索的管理接口
      const params = new URLSearchParams({ page: '1', pageSize: '200' });
      if (keyword) params.set('keyword', keyword);

      const res = await api.get(`/devices/manage?${params.toString()}`);
      // 确保是最新一次请求
      if (fetchId !== fetchIdRef.current) return;

      const list: DeviceInfo[] = (res.data?.data || res.data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        type: d.type || '',
        status: d.status || 'idle',
        area: d.area || '',
        line: d.line || '',
        healthScore: d.healthScore,
        oee: d.oee,
      }));
      setDevices(list);
    } catch {
      // 管理接口不可用时回退到基础接口
      try {
        const res = await api.get('/devices');
        if (fetchId !== fetchIdRef.current) return;
        const list: DeviceInfo[] = (res.data?.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          code: d.code,
          type: d.type || '',
          status: d.status || 'idle',
          area: d.area || '',
          line: d.line || '',
          healthScore: d.healthScore,
          oee: d.oee,
        }));
        setDevices(list);
      } catch {
        if (fetchId === fetchIdRef.current) setDevices([]);
      }
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, []);

  /* ── 初始加载 ── */
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  /* ── 客户端模糊搜索 ── */
  const filteredDevices = searchText
    ? devices.filter((d) => {
        const kw = searchText.toLowerCase();
        return (
          d.name.toLowerCase().includes(kw) ||
          d.code.toLowerCase().includes(kw) ||
          d.type.toLowerCase().includes(kw)
        );
      })
    : devices;

  /* ── 选项渲染 ── */
  const options = filteredDevices.map((d) => ({
    value: d.id,
    label: d.name,
    device: d,
  }));

  return (
    <><Select
      showSearch
      allowClear={allowClear}
      value={value?.id || undefined}
      placeholder={placeholder}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : '未找到匹配设备'}
      filterOption={false}
      variant="borderless"
      onSearch={(text) => setSearchText(text)}
      onChange={(id, option) => {
        if (!id) {
          onChange?.(null);
          return;
        }
        const opt = Array.isArray(option) ? option[0] : option;
        const device = (opt as any)?.device || devices.find((d) => d.id === id) || null;
        onChange?.(device);
      }}
      onFocus={() => {
        fetchDevices(searchText);
      }}
      style={{ width: '100%' }}
      dropdownMatchSelectWidth={false}
      dropdownStyle={{ minWidth: 360 }}
      popupClassName="device-selector-dropdown"
      options={options}
      suffixIcon={<SearchOutlined style={{ color: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} />}
      {...(dark ? {
        // 暗色模式下 Select 输入框本身也融入背景
        className: 'device-selector-dark',
      } : {})}
      optionRender={(option) => {
        const d = option.data.device as DeviceInfo;
        if (!d) return <span>{option.data.label}</span>;
        const statusColor = STATUS_COLORS[d.status] || '#999';
        const statusLabel = STATUS_LABELS[d.status] || d.status;
        const isDark = dark;
        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '4px 0',
            }}
          >
            {/* 状态指示圆点 */}
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColor,
                flexShrink: 0,
              }}
            />
            {/* 设备信息 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#E5E7EB' : '#1F2937' }}>
                {d.name}
              </div>
              <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : '#9CA3AF', marginTop: 1 }}>
                {d.code}
                {d.type ? ` · ${d.type}` : ''}
                {d.area ? ` · ${d.area}` : ''}
              </div>
            </div>
            {/* 状态标签 */}
            <span
              style={{
                fontSize: 10,
                color: statusColor,
                background: `${statusColor}15`,
                padding: '0 6px',
                borderRadius: 3,
                lineHeight: '18px',
                flexShrink: 0,
              }}
            >
              {statusLabel}
            </span>
            {/* 健康评分（如果有） */}
            {d.healthScore !== undefined && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: d.healthScore >= 80 ? '#22C55E' : d.healthScore >= 60 ? '#F59E0B' : '#EF4444',
                  flexShrink: 0,
                  minWidth: 32,
                  textAlign: 'right',
                }}
              >
                {d.healthScore}
              </span>
            )}
          </div>
        );
      }}
      />
      {dark && (
        <style>{`
          .device-selector-dropdown.ant-select-dropdown {
            background: #0E1230 !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
          }
          .device-selector-dropdown .ant-select-item {
            color: rgba(255,255,255,0.7) !important;
          }
          .device-selector-dropdown .ant-select-item-option-active {
            background: rgba(59,130,246,0.1) !important;
          }
          .device-selector-dropdown .ant-select-item-option-selected {
            background: rgba(59,130,246,0.15) !important;
            color: #3B82F6 !important;
          }
          .device-selector-dropdown .ant-select-item-option-state {
            color: #3B82F6 !important;
          }
          .device-selector-dropdown .ant-empty-description {
            color: rgba(255,255,255,0.3) !important;
          }
          .device-selector-dark.ant-select {
            color: rgba(255,255,255,0.7) !important;
          }
          .device-selector-dark.ant-select .ant-select-selection-placeholder {
            color: rgba(255,255,255,0.35) !important;
          }
          .device-selector-dark.ant-select .ant-select-clear {
            background: transparent !important;
            color: rgba(255,255,255,0.35) !important;
          }
          .device-selector-dark.ant-select .ant-select-selection-item {
            color: rgba(255,255,255,0.75) !important;
          }
          .device-selector-dark.ant-select .ant-select-arrow {
            color: rgba(255,255,255,0.3) !important;
          }
          .device-selector-dark.ant-select .ant-select-selector {
            background: rgba(255,255,255,0.03) !important;
          }
        `}</style>
      )}
    </>
  );
}
