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
  // AI 数据清洗模态窗
  dataCleaningModalOpen: boolean;
  setDataCleaningModalOpen: (open: boolean) => void;
  // 设备健康基线模态窗
  deviceHealthModalOpen: boolean;
  setDeviceHealthModalOpen: (open: boolean) => void;
  // 设备全景画像模态窗
  deviceProfileModalOpen: boolean;
  setDeviceProfileModalOpen: (open: boolean) => void;
  // NLP 自然语言报修模态窗
  nlrModalOpen: boolean;
  setNlrModalOpen: (open: boolean) => void;
  // AI 辅助诊断模态窗
  diagnosticModalOpen: boolean;
  setDiagnosticModalOpen: (open: boolean) => void;
  // 知识自动沉淀模态窗
  knowledgeMiningModalOpen: boolean;
  setKnowledgeMiningModalOpen: (open: boolean) => void;
  // 知识自动沉淀全局开关
  knowledgeMiningEnabled: boolean;
  setKnowledgeMiningEnabled: (enabled: boolean) => void;
  // 知识自动沉淀 - 当前选中的工单
  knowledgeMiningWorkOrder: any;
  setKnowledgeMiningWorkOrder: (wo: any) => void;
  // Aura 聊天智能体
  auraChatOpen: boolean;
  setAuraChatOpen: (open: boolean) => void;
  // Aura 聊天智能体全局开关
  auraChatEnabled: boolean;
  setAuraChatEnabled: (enabled: boolean) => void;
  // 预测性维护全局开关
  predictiveMaintenanceEnabled: boolean;
  setPredictiveMaintenanceEnabled: (enabled: boolean) => void;
  // 健康评分详情模态窗
  healthScoreModalOpen: boolean;
  setHealthScoreModalOpen: (open: boolean) => void;
  // 健康评分当前设备ID
  healthScoreDeviceId: string | null;
  setHealthScoreDeviceId: (id: string | null) => void;
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
  // AI 数据清洗模态窗
  dataCleaningModalOpen: false,
  setDataCleaningModalOpen: (open) => set({ dataCleaningModalOpen: open }),
  // 设备健康基线模态窗
  deviceHealthModalOpen: false,
  setDeviceHealthModalOpen: (open) => set({ deviceHealthModalOpen: open }),
  // 设备全景画像模态窗
  deviceProfileModalOpen: false,
  setDeviceProfileModalOpen: (open) => set({ deviceProfileModalOpen: open }),
  // NLP 自然语言报修模态窗
  nlrModalOpen: false,
  setNlrModalOpen: (open) => set({ nlrModalOpen: open }),
  // AI 辅助诊断模态窗
  diagnosticModalOpen: false,
  setDiagnosticModalOpen: (open) => set({ diagnosticModalOpen: open }),
  // 知识自动沉淀模态窗
  knowledgeMiningModalOpen: false,
  setKnowledgeMiningModalOpen: (open) => set({ knowledgeMiningModalOpen: open }),
  // 知识自动沉淀全局开关（默认关闭）
  knowledgeMiningEnabled: false,
  setKnowledgeMiningEnabled: (enabled) => set({ knowledgeMiningEnabled: enabled }),
  // 知识自动沉淀 - 当前选中的工单
  knowledgeMiningWorkOrder: null,
  setKnowledgeMiningWorkOrder: (wo) => set({ knowledgeMiningWorkOrder: wo }),
  // Aura 聊天智能体
  auraChatOpen: false,
  setAuraChatOpen: (open) => set({ auraChatOpen: open }),
  // Aura 聊天智能体全局开关（默认打开）
  auraChatEnabled: true,
  setAuraChatEnabled: (enabled) => set({ auraChatEnabled: enabled }),
  // 预测性维护全局开关（默认关闭）
  predictiveMaintenanceEnabled: false,
  setPredictiveMaintenanceEnabled: (enabled) => set({ predictiveMaintenanceEnabled: enabled }),
  // 健康评分详情模态窗
  healthScoreModalOpen: false,
  setHealthScoreModalOpen: (open) => set({ healthScoreModalOpen: open }),
  // 健康评分当前设备ID
  healthScoreDeviceId: null,
  setHealthScoreDeviceId: (id) => set({ healthScoreDeviceId: id }),
}));