import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from 'antd';
import {
  BarChartOutlined, DashboardOutlined, OrderedListOutlined,
  BugOutlined, SafetyCertificateOutlined,
  CheckCircleOutlined, ToolOutlined,
} from '@ant-design/icons';
import { Colors } from '../styles/theme';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [maintOpen, setMaintOpen] = useState(false);

  const navItems = [
    { key: 'oee', icon: <BarChartOutlined />, label: 'OEE', path: '/oee' },
    { key: 'devices', icon: <DashboardOutlined />, label: '设备', path: '/devices' },
    { key: 'work-orders', icon: <OrderedListOutlined />, label: '工单', path: '/work-orders' },
    { key: 'report-fault', icon: <BugOutlined />, label: '报修', path: '/report-fault' },
    { key: 'maintenance', icon: <SafetyCertificateOutlined />, label: '维保', path: '' },
  ];

  const currentBase = '/' + location.pathname.split('/')[1];

  const isActive = (item: typeof navItems[0]) => {
    if (item.key === 'maintenance') {
      return location.pathname.startsWith('/inspections') || location.pathname.startsWith('/maintenance-execute');
    }
    return currentBase === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
  };

  return (
    <>
      <div className="mobile-bottom-nav" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        height: 56,
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}>
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <div
              key={item.key}
              onClick={() => {
                if (item.key === 'maintenance') {
                  setMaintOpen(true);
                } else {
                  navigate(item.path);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                padding: '4px 8px',
                cursor: 'pointer',
                color: active ? Colors.primary : Colors.gray400,
                transition: 'color 0.2s',
                minWidth: 48,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                lineHeight: 1.2,
              }}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <Modal
        open={maintOpen}
        onCancel={() => setMaintOpen(false)}
        footer={null}
        width={320}
        closable={false}
        centered
        destroyOnClose
      >
        <div style={{ textAlign: 'center', marginBottom: 20, fontSize: 16, fontWeight: 600, color: Colors.gray800 }}>
          选择维保类型
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div
            onClick={() => { setMaintOpen(false); navigate('/inspections'); }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '24px 16px',
              borderRadius: 12,
              border: `1px solid ${Colors.gray200}`,
              cursor: 'pointer',
              background: '#F0F9FF',
              transition: 'all 0.2s',
            }}
          >
            <CheckCircleOutlined style={{ fontSize: 32, color: Colors.primary }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: Colors.gray800 }}>点检</span>
          </div>
          <div
            onClick={() => { setMaintOpen(false); navigate('/maintenance-execute'); }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '24px 16px',
              borderRadius: 12,
              border: `1px solid ${Colors.gray200}`,
              cursor: 'pointer',
              background: '#FFF7ED',
              transition: 'all 0.2s',
            }}
          >
            <ToolOutlined style={{ fontSize: 32, color: Colors.warning }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: Colors.gray800 }}>保养</span>
          </div>
        </div>
      </Modal>
    </>
  );
}
