import { create } from 'zustand';

export type UserRole = 'operator' | 'repair' | 'supervisor' | 'executive' | 'admin';

interface User {
  id: string;
  name: string;
  role: UserRole;
}

interface AppState {
  user: User;
  setUser: (user: User) => void;
  setRole: (role: UserRole) => void;
  // 认证
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  selectedOrganizationId: string | null;
  setSelectedOrganizationId: (id: string | null) => void;
  selectedOrgName: string;
  setSelectedOrgName: (name: string) => void;
  // AI 右边栏
  aiSidebarOpen: boolean;
  setAISidebarOpen: (open: boolean) => void;
  toggleAISidebar: () => void;
  // AURA 模态窗
  auraModalOpen: boolean;
  setAuraModalOpen: (open: boolean) => void;
}

const roleInfo: Record<UserRole, { name: string }> = {
  operator: { name: '操作员' },
  repair: { name: '维修工程师' },
  supervisor: { name: '设备主管' },
  executive: { name: '决策者' },
  admin: { name: '系统管理员' },
};

const TOKEN_KEY = 'demo_token';
const TOKEN_EXPIRY_KEY = 'demo_token_expiry';

function getStoredAuth(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (token && expiry) {
    if (Date.now() < Number(expiry)) {
      return true;
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }
  return false;
}

export const useStore = create<AppState>((set) => ({
  user: {
    id: 'demo-admin',
    name: '管理员',
    role: 'admin',
  },
  setUser: (user) => set({ user }),
  setRole: (role) =>
    set({
      user: {
        id: `demo-${role}`,
        name: roleInfo[role].name,
        role,
      },
    }),
  // 认证
  isAuthenticated: getStoredAuth(),
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    set({ isAuthenticated: true, user });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    set({ isAuthenticated: false });
  },
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  selectedOrganizationId: null,
  setSelectedOrganizationId: (id) => set({ selectedOrganizationId: id }),
  selectedOrgName: '全厂',
  setSelectedOrgName: (name) => set({ selectedOrgName: name }),
  // AI 右边栏
  aiSidebarOpen: false,
  setAISidebarOpen: (open) => set({ aiSidebarOpen: open }),
  toggleAISidebar: () => set((s) => ({ aiSidebarOpen: !s.aiSidebarOpen })),
  // AURA 模态窗
  auraModalOpen: false,
  setAuraModalOpen: (open) => set({ auraModalOpen: open }),
}));
