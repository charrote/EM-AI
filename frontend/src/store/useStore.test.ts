import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../useStore';

describe('useStore', () => {
  beforeEach(() => {
    // 重置 store
    useStore.setState({
      user: { id: 'demo-admin', name: '管理员', role: 'admin' },
      isAuthenticated: false,
      selectedOrganizationId: null,
      selectedOrgName: '全厂',
      dataMode: 'mock',
    });
  });

  describe('用户状态', () => {
    it('应该正确初始化用户状态', () => {
      const user = useStore.getState().user;
      expect(user.role).toBe('admin');
      expect(user.name).toBe('管理员');
    });

    it('应该能够切换角色', () => {
      const { setRole } = useStore.getState();
      setRole('operator');
      
      const user = useStore.getState().user;
      expect(user.role).toBe('operator');
      expect(user.name).toBe('操作员');
    });
  });

  describe('认证状态', () => {
    it('应该能够设置认证状态', () => {
      const { setAuth } = useStore.getState();
      setAuth('test-token', {
        id: 'user-1',
        name: 'Test User',
        role: 'operator',
      });
      
      expect(useStore.getState().isAuthenticated).toBe(true);
      expect(useStore.getState().user.name).toBe('Test User');
    });

    it('应该能够登出', () => {
      const { setAuth, logout } = useStore.getState();
      setAuth('test-token', {
        id: 'user-1',
        name: 'Test User',
        role: 'operator',
      });
      logout();
      
      expect(useStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('数据模式', () => {
    it('应该默认为 mock 模式', () => {
      expect(useStore.getState().dataMode).toBe('mock');
    });

    it('应该能够切换数据模式', () => {
      const { setDataMode } = useStore.getState();
      setDataMode('real');
      expect(useStore.getState().dataMode).toBe('real');
      
      setDataMode('mock');
      expect(useStore.getState().dataMode).toBe('mock');
    });
  });

  describe('组织选择', () => {
    it('应该能够选择组织', () => {
      const { setSelectedOrganizationId, setSelectedOrgName } = useStore.getState();
      setSelectedOrganizationId('org-1');
      setSelectedOrgName('测试组织');
      
      expect(useStore.getState().selectedOrganizationId).toBe('org-1');
      expect(useStore.getState().selectedOrgName).toBe('测试组织');
    });
  });
});