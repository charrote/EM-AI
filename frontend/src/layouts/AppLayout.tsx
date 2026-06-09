import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Select, Tag, Typography, theme } from 'antd';
import {
  DashboardOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  BulbOutlined,
  SettingOutlined,
  WarningOutlined,
  ProjectOutlined,
  BookOutlined,
  RobotOutlined,
  BugOutlined,
} from '@ant-design/icons';
import { useStore, UserRole } from '../store/useStore';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const roleMenuMap: Record<UserRole, string[]> = {
  operator: ['report-fault', 'devices', 'work-orders', 'inspections', 'knowledge'],
  repair: ['work-orders', 'knowledge', 'devices'],
  supervisor: ['devices', 'oee', 'loss-analysis', 'improvements', 'work-orders'],
  executive: ['executive', 'oee', 'improvements'],
};

const menuItems = [
  { key: 'report-fault', icon: <BugOutlined />, label: '扫码报修' },
  { key: 'devices', icon: <DashboardOutlined />, label: '设备总览' },
  { key: 'work-orders', icon: <WarningOutlined />, label: '工单管理' },
  { key: 'inspections', icon: <CheckCircleOutlined />, label: '点检执行' },
  { key: 'oee', icon: <BarChartOutlined />, label: 'OEE 看板' },
  { key: 'loss-analysis', icon: <ProjectOutlined />, label: '损失分析' },
  { key: 'improvements', icon: <BulbOutlined />, label: '改善项目' },
  { key: 'knowledge', icon: <BookOutlined />, label: '知识库' },
  { key: 'executive', icon: <RobotOutlined />, label: '决策仪表盘' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setRole } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const currentPath = '/' + location.pathname.split('/')[1];

  const filteredMenu = menuItems.filter(
    (item) => roleMenuMap[user.role]?.includes(item.key)
  );

  const statusColor: Record<string, string> = {
    running: '#22C55E',
    idle: '#9CA3AF',
    changeover: '#F59E0B',
    fault: '#EF4444',
    maintenance: '#3B82F6',
    repair: '#F97316',
    retired: '#6B7280',
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: colorBgContainer }}
        theme="light"
        width={220}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          fontWeight: 700,
          fontSize: collapsed ? 16 : 20,
          color: '#2563EB',
        }}>
          {collapsed ? 'EM' : 'EM-AI'}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[currentPath.replace('/', '') || 'devices']}
          items={filteredMenu}
          onClick={({ key }) => navigate('/' + key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: colorBgContainer,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          height: 64,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag color="orange" style={{ marginRight: 0 }}>DEMO 模式</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>数据为模拟数据</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Select
              value={user.role}
              onChange={(role: UserRole) => setRole(role)}
              style={{ width: 140 }}
              options={[
                { value: 'operator', label: '👷 操作员' },
                { value: 'repair', label: '🔧 维修工程师' },
                { value: 'supervisor', label: '📊 设备主管' },
                { value: 'executive', label: '🎯 决策层' },
              ]}
            />
          </div>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{
            padding: 24,
            minHeight: 360,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
