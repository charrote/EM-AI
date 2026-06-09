import { create } from 'zustand';

export type UserRole = 'operator' | 'repair' | 'supervisor' | 'executive';

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
}

const roleInfo: Record<UserRole, { name: string }> = {
  operator: { name: '操作员' },
  repair: { name: '维修工程师' },
  supervisor: { name: '设备主管' },
  executive: { name: '决策者' },
};

export const useStore = create<AppState>((set) => ({
  user: {
    id: 'demo-operator',
    name: '张操作',
    role: 'operator',
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
}));
