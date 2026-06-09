import { useNavigate, useLocation } from 'react-router-dom';
import { Colors } from '../styles/theme';
import { useStore } from '../store/useStore';
import { useMemo } from 'react';
import {
  WarningOutlined, DashboardOutlined, CheckCircleOutlined,
  BarChartOutlined, BugOutlined, BuildOutlined,
  HomeOutlined, OrderedListOutlined, UserOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

/**
 * 移动端底部导航栏 — 最多显示 5 个入口
 * 根据角色显示不同的默认页面
 */
const roleDefaultRoutes: Record<string, string> = {
  operator: '/report-fault',
  repair: '/work-orders',
  supervisor: '/oee',
  executive: '/executive',
  admin: '/devices',
};

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useStore();

  const navItems: NavItem[] = useMemo(() => {
    const role = user.role;
    const items: NavItem[] = [];

    // 根据角色显示不同的底部导航（最多 5 项）
    if (role === 'operator') {
      items.push(
        { key: 'home', icon: <HomeOutlined />, label: '首页', path: roleDefaultRoutes[role] },
        { key: 'report-fault', icon: <BugOutlined />, label: '快捷报修', path: '/report-fault' },
        { key: 'devices', icon: <DashboardOutlined />, label: '设备', path: '/devices' },
        { key: 'work-orders', icon: <OrderedListOutlined />, label: '工单', path: '/work-orders' },
        { key: 'profile', icon: <UserOutlined />, label: '我的', path: '/' },
      );
    } else if (role === 'repair') {
      items.push(
        { key: 'home', icon: <HomeOutlined />, label: '首页', path: roleDefaultRoutes[role] },
        { key: 'work-orders', icon: <OrderedListOutlined />, label: '工单', path: '/work-orders' },
        { key: 'devices', icon: <DashboardOutlined />, label: '设备', path: '/devices' },
        { key: 'inspections', icon: <CheckCircleOutlined />, label: '点检', path: '/inspections' },
        { key: 'profile', icon: <UserOutlined />, label: '我的', path: '/' },
      );
    } else if (role === 'supervisor' || role === 'executive') {
      items.push(
        { key: 'home', icon: <HomeOutlined />, label: '首页', path: roleDefaultRoutes[role] },
        { key: 'oee', icon: <BarChartOutlined />, label: 'OEE', path: '/oee' },
        { key: 'devices', icon: <DashboardOutlined />, label: '设备', path: '/devices' },
        { key: 'work-orders', icon: <OrderedListOutlined />, label: '工单', path: '/work-orders' },
        { key: 'inspections', icon: <SafetyCertificateOutlined />, label: '预防', path: '/inspections' },
      );
    } else {
      // admin
      items.push(
        { key: 'home', icon: <HomeOutlined />, label: '首页', path: roleDefaultRoutes[role] },
        { key: 'devices', icon: <DashboardOutlined />, label: '设备', path: '/devices' },
        { key: 'work-orders', icon: <OrderedListOutlined />, label: '工单', path: '/work-orders' },
        { key: 'oee', icon: <BarChartOutlined />, label: 'OEE', path: '/oee' },
        { key: 'report-fault', icon: <BugOutlined />, label: '报修', path: '/report-fault' },
      );
    }

    return items;
  }, [user.role]);

  const currentPath = '/' + location.pathname.split('/')[1];

  return (
    <div className="mobile-bottom-nav" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      height: 56,
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
    }}>
      {navItems.map((item) => {
        const isActive = currentPath === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
        return (
          <div
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 8px',
              cursor: 'pointer',
              color: isActive ? Colors.primary : Colors.gray400,
              transition: 'color 0.2s',
              minWidth: 48,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: isActive ? 600 : 400,
              lineHeight: 1.2,
            }}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
