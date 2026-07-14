// @ts-nocheck - Dynamic data types with complex column definitions
import { SettingOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Tag, Typography, Space, Drawer, Modal, Select, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined, ToolOutlined, CheckCircleOutlined,
  BarChartOutlined, BulbOutlined, BugOutlined,
  WarningOutlined, BookOutlined,
  RobotOutlined, NodeIndexOutlined, CalendarOutlined,
  SafetyCertificateOutlined, ExperimentOutlined,
  MonitorOutlined, BuildOutlined, SafetyOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
  PieChartOutlined, DatabaseOutlined, ApartmentOutlined, TagsOutlined, TeamOutlined,
  ThunderboltOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { useStore, type UserRole } from '../store/useStore';
import { Colors, RoleConfig } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import MobileBottomNav from '../components/MobileBottomNav';
import AISidebar from '../components/AISidebar';
import api from '../services/api';

const { Header, Sider, Content, Footer } = Layout;
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
    key: 'scenario-dashboard',
    icon: <RobotOutlined />,
    label: '决策仪表',
    roles: ['executive', 'admin'],
    children: [
      { key: 'executive', icon: <RobotOutlined />, label: '决策仪表盘', roles: ['executive', 'admin'] },
    ],
  },
  {
    key: 'scenario-basic-data',
    icon: <DatabaseOutlined />,
    label: '基础数据',
    roles: ['supervisor', 'admin'],
    children: [
      { key: 'organizations', icon: <ApartmentOutlined />, label: '企业层级', roles: ['supervisor', 'admin'] },
      { key: 'device-types', icon: <TagsOutlined />, label: '设备类型', roles: ['supervisor', 'admin'] },
      { key: 'device-manage', icon: <DatabaseOutlined />, label: '设备基础数据', roles: ['supervisor', 'admin'] },
      { key: 'teams', icon: <TeamOutlined />, label: '班组管理', roles: ['supervisor', 'admin'] },
      { key: 'work-calendar', icon: <CalendarOutlined />, label: '工作日历', roles: ['supervisor', 'admin'] },
    ],
  },
  {
    key: 'scenario-fault',
    icon: <WarningOutlined />,
    label: '故障管理',
    roles: ['operator', 'repair', 'supervisor', 'admin'],
    children: [
      { key: 'report-fault', icon: <BugOutlined />, label: '快捷报修', roles: ['operator', 'admin'] },
      { key: 'devices', icon: <DashboardOutlined />, label: '设备总览', roles: ['operator', 'supervisor', 'admin'] },
      { key: 'work-orders', icon: <WarningOutlined />, label: '工单管理', roles: ['operator', 'repair', 'supervisor', 'admin'] },
      { key: 'rca-analysis', icon: <NodeIndexOutlined />, label: '根因分析', roles: ['repair', 'supervisor', 'admin'] },
      { key: 'knowledge', icon: <BookOutlined />, label: '知识库', roles: ['operator', 'repair', 'supervisor', 'admin'] },
    ],
  },
  {
    key: 'scenario-prevent',
    icon: <SafetyCertificateOutlined />,
    label: '预防管理',
    roles: ['operator', 'repair', 'supervisor', 'admin'],
    children: [
      { key: 'inspections', icon: <CheckCircleOutlined />, label: '点检执行', roles: ['operator', 'supervisor', 'admin'] },
      { key: 'inspection-plans', icon: <CalendarOutlined />, label: '点检计划', roles: ['supervisor', 'admin'] },
      { key: 'maintenance-plans', icon: <SafetyCertificateOutlined />, label: '保养计划', roles: ['supervisor', 'admin'] },
      { key: 'maintenance-execute', icon: <ExperimentOutlined />, label: '保养执行', roles: ['repair', 'supervisor', 'admin'] },
    ],
  },
  {
    key: 'scenario-efficiency',
    icon: <BarChartOutlined />,
    label: '效率管理',
    roles: ['supervisor', 'executive', 'admin'],
    children: [
      { key: 'oee', icon: <BarChartOutlined />, label: 'OEE 看板', roles: ['supervisor', 'executive', 'admin'] },
      { key: 'loss-analysis', icon: <PieChartOutlined />, label: '损失分析', roles: ['supervisor', 'executive', 'admin'] },
      { key: 'improvements', icon: <BulbOutlined />, label: '改善项目', roles: ['supervisor', 'executive', 'admin'] },
      { key: 'andon-board', icon: <MonitorOutlined />, label: '效率看板', roles: ['supervisor', 'executive', 'admin'] },
    ],
  },
  {
    key: 'scenario-tooling',
    icon: <BuildOutlined />,
    label: '工治具管理',
    roles: ['repair', 'supervisor', 'admin'],
    children: [
      { key: 'toolings', icon: <BuildOutlined />, label: '工治具档案', roles: ['repair', 'supervisor', 'admin'] },
      { key: 'tooling-mount', icon: <ArrowUpOutlined />, label: '工治具上机', roles: ['repair', 'supervisor', 'admin'] },
      { key: 'tooling-dismount', icon: <ArrowDownOutlined />, label: '工治具下机', roles: ['repair', 'supervisor', 'admin'] },
      { key: 'tooling-maintenance', icon: <SafetyOutlined />, label: '工治具保养', roles: ['repair', 'supervisor', 'admin'] },
    ],
  },
];

// ── 根据角色筛选菜单 ─────────────────────────
function filterMenuByRole(groups: ScenarioGroup[], role: Role): MenuProps['items'] {
  return groups
    .filter((group) => group.roles.includes(role))
    .flatMap((group) => {
      const visibleChildren = group.children.filter((child) => child.roles.includes(role));
      if (visibleChildren.length === 0) return [];

      // 单子分组展开为一级菜单（如决策仪表盘）
      if (group.key.startsWith('scenario-') && visibleChildren.length === 1) {
        return visibleChildren.map((child) => ({
          key: child.key,
          icon: child.icon,
          label: child.label,
        })) as MenuProps['items'];
      }

      return [{
        key: group.key,
        icon: group.icon,
        label: group.label,
        children: visibleChildren.map((child) => ({
          key: child.key,
          icon: child.icon,
          label: child.label,
        })),
      }] as MenuProps['items'];
    });
}

// ── 角色切换下拉菜单 ─────────────────────────
const roleOptions: { key: Role; label: string; icon: React.ReactNode }[] = [
  { key: 'operator', label: '操作员', icon: <UserOutlined /> },
  { key: 'repair', label: '维修工程师', icon: <ToolOutlined /> },
  { key: 'supervisor', label: '设备主管', icon: <BarChartOutlined /> },
  { key: 'executive', label: '决策层', icon: <RobotOutlined /> },
  { key: 'admin', label: '系统管理员', icon: <SafetyCertificateOutlined /> },
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
  const { user, setRole, selectedOrganizationId, setSelectedOrganizationId, setSelectedOrgName, auraChatOpen, setAuraChatOpen, auraChatEnabled, dataMode, setDataMode } = useStore();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orgTree, setOrgTree] = useState<any[]>([]);
  const [settingsOrgId, setSettingsOrgId] = useState<string | null>(selectedOrganizationId);

  const fetchOrgTree = useCallback(async () => {
    try {
      const res = await api.get('/organizations/tree');
      const flat: any[] = [];
      const flatten = (nodes: any[]) => {
        nodes.forEach((n: any) => {
          flat.push({ id: n.id, name: n.name, level: n.level });
          if (n.children) flatten(n.children);
        });
      };
      flatten(res.data.data || []);
      setOrgTree(flat);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (settingsOpen) fetchOrgTree();
  }, [settingsOpen, fetchOrgTree]);

  const handleSaveSettings = () => {
    setSelectedOrganizationId(settingsOrgId);
    const org = orgTree.find(o => o.id === settingsOrgId);
    setSelectedOrgName(org?.name || '全厂');
    message.success('组织选择已更新');
    setSettingsOpen(false);
  };

  // 移动端：侧栏默认收起；平板：侧栏默认收起；桌面：侧栏默认展开
  const [collapsed, setCollapsed] = useState(!isDesktop);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 当设备类型变化时自动调整 collapsed
  useEffect(() => {
    setCollapsed(!isDesktop);
  }, [isDesktop]);

  // 关闭 Aura 聊天时同步关闭聊天面板
  useEffect(() => {
    if (!auraChatEnabled && auraChatOpen) {
      setAuraChatOpen(false);
    }
  }, [auraChatEnabled]);

  // 当前角色可见的菜单
  const menuItems = useMemo(() => filterMenuByRole(scenarioGroups, user.role), [user.role]);
  const allLeafKeys = useMemo(() => getAllLeafKeys(scenarioGroups, user.role), [user.role]);

  // 当前路径对应的选中 key（根路径 → executive）
  const currentKey = location.pathname.split('/')[1] || 'executive';
  const selectedKey = allLeafKeys.includes(currentKey) ? currentKey : 'executive';

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

  // 退出登录
  const handleLogout = () => {
    useStore.getState().logout();
    navigate('/login', { replace: true });
  };

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
    { key: 'data-mode', label: (
        <Space>
          <span>数据模式</span>
          <Tag color={dataMode === 'real' ? 'green' : 'blue'} style={{ marginLeft: 8, fontSize: 10, lineHeight: '16px', padding: '0 6px' }}>
            {dataMode === 'real' ? '真实' : '模拟'}
          </Tag>
        </Space>
      ),
      onClick: () => {
        setDataMode(dataMode === 'real' ? 'mock' : 'real');
        message.success(`已切换到${dataMode === 'real' ? '模拟数据' : '真实数据'}模式`);
      },
    },
    { type: 'divider' as const },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ];

  // 菜单点击处理
  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate('/' + key);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const contentPadding = isMobile ? 12 : isTablet ? 16 : 20;
  const headerHeight = isMobile ? 48 : 56;

  // ── 渲染侧栏菜单（桌面用 Sider，移动端用 Drawer）──
  const renderSideMenu = (inDrawer: boolean) => (
    <>
      {/* 品牌标识 */}
      <div
        style={{
          height: inDrawer ? 56 : 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: inDrawer || collapsed ? 'center' : 'center',
          borderBottom: `1px solid ${Colors.sidebarBorder}`,
          gap: 8,
        }}
      >
        <ToolOutlined style={{ fontSize: inDrawer ? 24 : 22, color: Colors.primary }} />
        {(!collapsed || inDrawer) && (
          <span style={{ fontSize: inDrawer ? 18 : 17, fontWeight: 700, color: Colors.gray800, letterSpacing: 1 }}>
            UantekEM-AI
          </span>
        )}
      </div>

      {/* 导航菜单 */}
      <Menu
        key={user.role + (inDrawer ? '-drawer' : '-sider')}
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={defaultOpenKeys}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          borderRight: 0,
          padding: '4px 0',
          fontSize: inDrawer ? 15 : 14,
        }}
      />
    </>
  );

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: Colors.bodyBg }}>
      {/* ─── 桌面/平板：侧栏 ─── */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={240}
          style={{
            background: Colors.sidebarBg,
            borderRight: `1px solid ${Colors.sidebarBorder}`,
            height: '100vh',
            overflow: 'auto',
            position: 'sticky',
            top: 0,
          }}
          theme="light"
          trigger={null}
        >
          {renderSideMenu(false)}
        </Sider>
      )}

      {/* ─── 移动端：抽屉菜单 ─── */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          closable={false}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          styles={{ body: { padding: 0, overflow: 'auto' } }}
        >
          {renderSideMenu(true)}
        </Drawer>
      )}

      <Layout style={{ overflow: 'hidden' }}>
        {/* ─── 顶栏 ─── */}
        <Header
          style={{
            background: '#FFFFFF',
            padding: isMobile ? '0 12px' : '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${Colors.headerBorder}`,
            height: headerHeight,
            lineHeight: `${headerHeight}px`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            {/* 移动端：汉堡菜单按钮 */}
            {isMobile && (
              <div
                onClick={() => setDrawerOpen(true)}
                style={{
                  padding: '4px 4px 4px 0',
                  cursor: 'pointer',
                  fontSize: 18,
                  color: Colors.gray600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <MenuFoldOutlined />
              </div>
            )}

            {/* 平板/桌面：侧栏折叠按钮 */}
            {!isMobile && (
              <div
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  padding: 4,
                  cursor: 'pointer',
                  fontSize: 16,
                  color: Colors.gray600,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </div>
            )}

            <Tag
              color="default"
              style={{
                marginRight: 0,
                background: Colors.gray100,
                border: `1px solid ${Colors.gray200}`,
                borderRadius: 4,
                color: Colors.gray600,
                fontSize: isMobile ? 11 : 12,
                lineHeight: isMobile ? '20px' : '22px',
              }}
            >
              DEMO
            </Tag>
            {!isMobile && (
              <Text type="secondary" style={{ fontSize: 13 }}>数据仅供演示</Text>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* 当前组织显示 */}
            <Tag
              color="default"
              style={{
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                marginInlineEnd: 0,
                background: Colors.sidebarActive,
                border: 'none',
                borderRadius: 4,
                color: Colors.primary,
                fontSize: 12,
                cursor: 'pointer',
              }}
              onClick={() => { setSettingsOrgId(selectedOrganizationId); setSettingsOpen(true); }}
            >
              <ApartmentOutlined style={{ marginRight: 4 }} />
              {useStore.getState().selectedOrgName || '全厂'}
            </Tag>

            {/* Aura助手 */}
            {auraChatEnabled && (
            <div
              onClick={() => setAuraChatOpen(!auraChatOpen)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${Colors.primary}, #7C3AED)`,
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
                transition: 'all 0.2s',
                lineHeight: 1,
                gap: 1,
              }}
              title="Aura助手"
            >
              <ThunderboltOutlined style={{ fontSize: 12 }} />
              <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: 0.5 }}>Aura</span>
            </div>
            )}

            {/* 用户面板 */}
            <Dropdown
            menu={{ items: userMenuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            {isMobile ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: Colors.primary,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {getInitials(user.name)}
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '0 6px',
                  height: 32,
                  borderRadius: 6,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = Colors.gray100)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Avatar size={28} style={{ background: Colors.primary, color: '#FFFFFF', fontWeight: 600 }}>
                  {getInitials(user.name)}
                </Avatar>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: Colors.gray800 }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: Colors.gray500 }}>{RoleConfig[user.role].label}</div>
                </div>
              </div>
            )}
          </Dropdown>
          </div>
        </Header>

        {/* ─── 内容区 ─── */}
        <Content
          style={{
            padding: contentPadding,
            overflow: 'auto',
            height: '100%',
            paddingBottom: isMobile ? contentPadding + 56 : contentPadding, // 为底部导航留空间
          }}
        >
          <div className="fade-in" style={{ maxWidth: 1440, margin: '0 auto' }}>
            <Outlet />
          </div>
        </Content>

        {/* ─── 版权信息 ─── */}
        <Footer
          style={{
            textAlign: 'center',
            padding: '12px 24px',
            fontSize: 12,
            color: Colors.gray400,
            background: 'transparent',
            borderTop: `1px solid ${Colors.gray200}`,
          }}
        >
          Copyright © 2026 Uantek. All Rights Reserved.
        </Footer>
      </Layout>

      {/* ─── 移动端：底部导航 ─── */}
      {isMobile && <MobileBottomNav />}

      {/* ─── AURA AI 智能助手边栏 ─── */}
      <AISidebar />

      {/* ─── 个人设置 Modal ─── */}
      <Modal
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        onOk={handleSaveSettings}
        okText="保存"
        cancelText="取消"
        width={400}
      >
        <div style={{ padding: '12px 0' }}>
          <div style={{ marginBottom: 8, fontWeight: 500, color: Colors.gray700 }}>组织选择</div>
          <Select
            style={{ width: '100%' }}
            placeholder="选择组织（默认全厂）"
            allowClear
            value={settingsOrgId}
            onChange={setSettingsOrgId}
            options={orgTree.map((o: any) => ({
              value: o.id,
              label: `${'  '.repeat({ group: 0, company: 1, workshop: 2, line: 3 }[o.level] || 0)}${o.name} (${o.level})`,
            }))}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: Colors.gray400 }}>
            选择后，涉及组织数据筛选的页面将默认以所选组织层级展示数据。
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
