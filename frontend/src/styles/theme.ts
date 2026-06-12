import {
  ThunderboltOutlined,
  PauseCircleOutlined,
  SwapOutlined,
  CloseCircleOutlined,
  ToolOutlined,
  WarningOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { GetProps } from 'antd';

type IconType = typeof ThunderboltOutlined;

// ── 颜色系统 ──────────────────────────────────
export const Colors = {
  primary: '#1D4ED8',
  primaryLight: '#3B82F6',
  success: '#16A34A',
  successLight: '#22C55E',
  warning: '#D97706',
  warningLight: '#F59E0B',
  danger: '#DC2626',
  dangerLight: '#EF4444',
  info: '#2563EB',

  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  sidebarBg: '#FFFFFF',
  sidebarActive: '#EFF6FF',
  sidebarBorder: '#F3F4F6',
  headerBorder: '#F3F4F6',
  cardBorder: '#F3F4F6',
  bodyBg: '#F8FAFC',
} as const;

// ── 设备状态配置 ──────────────────────────────
export interface StatusConfig {
  color: string;
  label: string;
  icon: IconType;
}

export const DeviceStatusConfig: Record<string, StatusConfig> = {
  running: { color: Colors.successLight, label: '运行中', icon: ThunderboltOutlined },
  idle: { color: Colors.gray400, label: '待机', icon: PauseCircleOutlined },
  changeover: { color: Colors.warningLight, label: '换型中', icon: SwapOutlined },
  fault: { color: Colors.dangerLight, label: '故障', icon: CloseCircleOutlined },
  maintenance: { color: Colors.info, label: '保养中', icon: ToolOutlined },
  repair: { color: '#F97316', label: '检修中', icon: WarningOutlined },
  retired: { color: Colors.gray500, label: '已报废', icon: CloseCircleOutlined },
};

// ── 工单状态 ──────────────────────────────────
export const WorkOrderStatusLabels: Record<string, string> = {
  pending: '待接单',
  accepted: '已接单',
  diagnosing: '诊断中',
  repairing: '维修中',
  verifying: '待审核',
  completed: '已完成',
  cancelled: '已取消',
};

export const WorkOrderStatusColors: Record<string, string> = {
  pending: Colors.dangerLight,
  accepted: Colors.warningLight,
  diagnosing: Colors.info,
  repairing: Colors.primary,
  verifying: '#06B6D4',
  completed: Colors.successLight,
  cancelled: Colors.gray400,
};

export const PriorityColors: Record<string, string> = {
  P0: Colors.dangerLight,
  P1: Colors.warningLight,
  P2: '#EAB308',
  P3: Colors.gray400,
};

export const PriorityLabels: Record<string, string> = {
  P0: '紧急停产',
  P1: '严重降速',
  P2: '轻微异常',
  P3: '观察项',
};

// ── 故障类型颜色 ──────────────────────────────
export const FaultTypeColors: Record<string, string> = {
  机械: Colors.dangerLight,
  电气: Colors.info,
  液压: '#06B6D4',
  气动: '#8B5CF6',
  软件: '#6366F1',
  其他: Colors.gray500,
};

// ── 角色配置 ──────────────────────────────────
export const RoleConfig: Record<string, { label: string; icon: string }> = {
  operator: { label: '操作员', icon: 'O' },
  repair: { label: '维修工程师', icon: 'R' },
  supervisor: { label: '设备主管', icon: 'S' },
  executive: { label: '决策层', icon: 'E' },
  admin: { label: '系统管理员', icon: 'A' },
};

// ── 共享样式 ──────────────────────────────────
export const CardStyle: React.CSSProperties = {
  borderRadius: 8,
  border: `1px solid ${Colors.cardBorder}`,
};

export const PageTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: Colors.gray900,
  marginBottom: 20,
};
