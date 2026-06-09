import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Tag, Typography, Space, Divider } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  BulbOutlined,
  BugOutlined,
  WarningOutlined,
  BookOutlined,
  PieChartOutlined,
  UserOutlined,
  SwapOutlined,
  SettingOutlined,
  LogoutOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useStore, type UserRole } from '../store/useStore';
import { Colors, RoleConfig } from '../styles/theme';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// ── 角色对应的菜单项 key ─────────────────────
const roleMenuMap: Record<UserRole, string[]> = {
  operator: ['report-fault', 'devices', 'work-orders', 'inspections', 'knowledge'],
  repair: ['work-orders', 'knowledge', 'devices'],
  supervisor: ['devices', 'oee', 'loss-analysis', 'improvements', 'work-orders'],
  executive: ['executive', 'oee', 'improvements'],
};

// ── 菜单项定义（无 emoji，全 SVG 图标）──────
const menuItems: MenuProps['items'] = [
  { key: 'report-fault', icon: <BugOutlined />, label: '快捷报修' },
  { key: 'devices', icon: <DashboardOutlined />, label: '设备总览' },
  { key: 'work-orders', icon: <WarningOutlined />, label: '工单管理' },
  { key: 'inspections', icon: <CheckCircleOutlined />, label: '点检执行' },
  { key: 'oee', icon: <BarChartOutlined />, label: 'OEE 看板' },
  { key: 'loss-analysis', icon: <PieChartOutlined />, label: '损失分析' },
  { key: 'improvements', icon: <BulbOutlined />, label: '改善项目' },
  { key: 'knowledge', icon: <BookOutlined />, label: '知识库' },
  { key: 'executive', icon: <RobotOutlined />, label: '决策仪表盘' },
];

// ── 角色切换下拉菜单 ─────────────────────────
const roleOptions: { key: UserRole; label: string; icon: React.ReactNode }[] = [
  { key: 'operator', label: '操作员', icon: <UserOutlined /> },
  { key: 'repair', label: '维修工程师', icon: <ToolOutlined /> },
  { key: 'supervisor', label: '设备主管', icon: <BarChartOutlined /> },
  { key: 'executive', label: '决策层', icon: <RobotOutlined /> },
];

function getInitials(name: string): string {
  if (!name) return '?';
  // Take first character of each word
  return name.slice(0, 1).toUpperCase();
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setRole } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  const currentPath = '/' + location.pathname.split('/')[1];

  // 按角色过滤菜单
  const filteredMenu = menuItems.filter(
    (item) => item && roleMenuMap[user.role]?.includes(item.key as string)
  );

  // 用户面板下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'role-header',
      label: (
        <div style={{ padding: '4px 0' }}>
          <Text strong style={{ fontSize: 12, color: Colors.gray500 }}>切换角色</Text>
        </div>
      ),
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
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      disabled: true,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      disabled: true,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: Colors.bodyBg }}>
      {/* ─── 侧栏 ─── */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={220}
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
          selectedKeys={[currentPath.replace('/', '') || 'devices']}
          items={filteredMenu}
          onClick={({ key }) => navigate('/' + key)}
          style={{
            borderRight: 0,
            padding: '8px 0',
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
          {/* 左侧：面包屑/提示 */}
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
            <Text type="secondary" style={{ fontSize: 13 }}>
              数据仅供演示
            </Text>
          </div>

          {/* 右侧：用户面板 */}
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
              <Avatar
                size={32}
                style={{
                  background: Colors.primary,
                  color: '#FFFFFF',
                  fontWeight: 600,
                }}
              >
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
