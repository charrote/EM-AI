import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Tag, Typography, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined, ToolOutlined, CheckCircleOutlined,
  BarChartOutlined, BulbOutlined, BugOutlined,
  WarningOutlined, BookOutlined, PieChartOutlined,
  UserOutlined, SettingOutlined, LogoutOutlined,
  RobotOutlined, NodeIndexOutlined, CalendarOutlined,
  SafetyCertificateOutlined, ExperimentOutlined,
  MonitorOutlined, BuildOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { useStore, type UserRole } from '../store/useStore';
import { Colors, RoleConfig } from '../styles/theme';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// ── 角色类型 ──────────────────────────────────
type Role = UserRole;

// ── 场景菜单项定义（含角色可见性）────────────
interface ScenarioItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles: Role[];
}

interface ScenarioGroup {
  key: string;
  icon: React.ReactNode;
  label: string;
  roles: Role[];
  children: ScenarioItem[];
}

const scenarioGroups: ScenarioGroup[] = [
  {
    key: 'scenario-fault',
    icon: <WarningOutlined />,
    label: '故障管理',
    roles: ['operator', 'repair', 'supervisor'],
    children: [
      { key: 'report-fault', icon: <BugOutlined />, label: '快捷报修', roles: ['operator'] },
      { key: 'devices', icon: <DashboardOutlined />, label: '设备总览', roles: ['operator', 'supervisor'] },
      { key: 'work-orders', icon: <WarningOutlined />, label: '工单管理', roles: ['operator', 'repair', 'supervisor'] },
      { key: 'rca-analysis', icon: <NodeIndexOutlined />, label: '根因分析', roles: ['repair', 'supervisor'] },
      { key: 'knowledge', icon: <BookOutlined />, label: '知识库', roles: ['operator', 'repair', 'supervisor'] },
    ],
  },
  {
    key: 'scenario-prevent',
    icon: <SafetyCertificateOutlined />,
    label: '预防管理',
    roles: ['operator', 'repair', 'supervisor'],
    children: [
      { key: 'inspections', icon: <CheckCircleOutlined />, label: '点检执行', roles: ['operator', 'supervisor'] },
      { key: 'inspection-plans', icon: <CalendarOutlined />, label: '点检计划', roles: ['supervisor'] },
      { key: 'maintenance-plans', icon: <SafetyCertificateOutlined />, label: '保养计划', roles: ['supervisor'] },
      { key: 'maintenance-execute', icon: <ExperimentOutlined />, label: '保养执行', roles: ['repair', 'supervisor'] },
    ],
  },
  {
    key: 'scenario-efficiency',
    icon: <BarChartOutlined />,
    label: '效率管理',
    roles: ['supervisor', 'executive'],
    children: [
      { key: 'oee', icon: <BarChartOutlined />, label: 'OEE 看板', roles: ['supervisor', 'executive'] },
      { key: 'loss-analysis', icon: <PieChartOutlined />, label: '损失分析', roles: ['supervisor', 'executive'] },
      { key: 'improvements', icon: <BulbOutlined />, label: '改善项目', roles: ['supervisor', 'executive'] },
      { key: 'andon-board', icon: <MonitorOutlined />, label: '效率看板', roles: ['supervisor', 'executive'] },
      { key: 'executive', icon: <RobotOutlined />, label: '决策仪表盘', roles: ['executive'] },
    ],
  },
  {
    key: 'scenario-tooling',
    icon: <BuildOutlined />,
    label: '工治具管理',
    roles: ['repair', 'supervisor'],
    children: [
      { key: 'toolings', icon: <BuildOutlined />, label: '工治具档案', roles: ['repair', 'supervisor'] },
      { key: 'tooling-maintenance', icon: <SafetyOutlined />, label: '工治具保养', roles: ['repair', 'supervisor'] },
    ],
  },
];

// ── 根据角色筛选菜单 ─────────────────────────
function filterMenuByRole(groups: ScenarioGroup[], role: Role): MenuProps['items'] {
  return groups
    .filter((group) => group.roles.includes(role))
    .map((group) => {
      const visibleChildren = group.children.filter((child) => child.roles.includes(role));
      if (visibleChildren.length === 0) return null;
      return {
        key: group.key,
        icon: group.icon,
        label: group.label,
        children: visibleChildren.map((child) => ({
          key: child.key,
          icon: child.icon,
          label: child.label,
        })),
      } as NonNullable<MenuProps['items']>[number];
    })
    .filter(Boolean) as MenuProps['items'];
}

// ── 角色切换下拉菜单 ─────────────────────────
const roleOptions: { key: Role; label: string; icon: React.ReactNode }[] = [
  { key: 'operator', label: '操作员', icon: <UserOutlined /> },
  { key: 'repair', label: '维修工程师', icon: <ToolOutlined /> },
  { key: 'supervisor', label: '设备主管', icon: <BarChartOutlined /> },
  { key: 'executive', label: '决策层', icon: <RobotOutlined /> },
];

function getInitials(name: string): string {
  if (!name) return '?';
  return name.slice(0, 1).toUpperCase();
}

// ── 扁平化获取所有叶子 key ───────────────────
function getAllLeafKeys(groups: ScenarioGroup[], role: Role): string[] {
  const keys: string[] = [];
  for (const group of groups) {
    if (!group.roles.includes(role)) continue;
    for (const child of group.children) {
      if (child.roles.includes(role)) {
        keys.push(child.key);
      }
    }
  }
  return keys;
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setRole } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  // 当前角色可见的菜单
  const menuItems = useMemo(() => filterMenuByRole(scenarioGroups, user.role), [user.role]);
  const allLeafKeys = useMemo(() => getAllLeafKeys(scenarioGroups, user.role), [user.role]);

  // 当前路径对应的选中 key
  const currentKey = location.pathname.split('/')[1] || 'devices';
  const selectedKey = allLeafKeys.includes(currentKey) ? currentKey : 'devices';

  // 当前角色可见的叶子 key → 计算需要展开的父级
  const defaultOpenKeys = useMemo(() => {
    const openKeys: string[] = [];
    for (const group of scenarioGroups) {
      if (!group.roles.includes(user.role)) continue;
      const hasVisibleChild = group.children.some((c) => c.roles.includes(user.role));
      if (hasVisibleChild) openKeys.push(group.key);
    }
    return openKeys;
  }, [user.role]);

  // 用户面板下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'role-header',
      label: <div style={{ padding: '4px 0' }}><Text strong style={{ fontSize: 12, color: Colors.gray500 }}>切换角色</Text></div>,
      disabled: true,
      style: { cursor: 'default', padding: '4px 12px' },
    },
    ...roleOptions.map((role) => ({
      key: role.key,
      label: (
        <Space>
          {role.icon}
          <span>{role.label}</span>
          {user.role === role.key && (
            <Tag color={Colors.primary} style={{ marginLeft: 8, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}>当前</Tag>
          )}
        </Space>
      ),
      onClick: () => setRole(role.key),
    })),
    { type: 'divider' as const },
    { key: 'settings', icon: <SettingOutlined />, label: '系统设置', disabled: true },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', disabled: true },
  ];

  // 菜单点击处理
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate('/' + key);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: Colors.bodyBg }}>
      {/* ─── 侧栏 ─── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        style={{
          background: Colors.sidebarBg,
          borderRight: `1px solid ${Colors.sidebarBorder}`,
        }}
        theme="light"
      >
        {/* 品牌标识 */}
        <div
          style={{
            height: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: `1px solid ${Colors.sidebarBorder}`,
            gap: 8,
          }}
        >
          <ToolOutlined style={{ fontSize: 22, color: Colors.primary }} />
          {!collapsed && (
            <span style={{ fontSize: 17, fontWeight: 700, color: Colors.gray800, letterSpacing: 1 }}>
              EM-AI
            </span>
          )}
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={defaultOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 0,
            padding: '4px 0',
            fontSize: 14,
          }}
        />
      </Sider>

      <Layout>
        {/* ─── 顶栏 ─── */}
        <Header
          style={{
            background: '#FFFFFF',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${Colors.headerBorder}`,
            height: 56,
            lineHeight: '56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag
              color="default"
              style={{
                marginRight: 0,
                background: Colors.gray100,
                border: `1px solid ${Colors.gray200}`,
                borderRadius: 4,
                color: Colors.gray600,
                fontSize: 12,
                lineHeight: '22px',
              }}
            >
              DEMO
            </Tag>
            <Text type="secondary" style={{ fontSize: 13 }}>数据仅供演示</Text>
          </div>

          {/* 用户面板 */}
          <Dropdown
            menu={{ items: userMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = Colors.gray100)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar size={32} style={{ background: Colors.primary, color: '#FFFFFF', fontWeight: 600 }}>
                {getInitials(user.name)}
              </Avatar>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: Colors.gray800 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: Colors.gray500 }}>{RoleConfig[user.role].label}</div>
              </div>
            </div>
          </Dropdown>
        </Header>

        {/* ─── 内容区 ─── */}
        <Content style={{ padding: 20 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
