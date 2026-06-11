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
}

const roleInfo: Record<UserRole, { name: string }> = {
  operator: { name: '操作员' },
  repair: { name: '维修工程师' },
  supervisor: { name: '设备主管' },
  executive: { name: '决策者' },
  admin: { name: '系统管理员' },
};

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
}));
