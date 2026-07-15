import { create } from 'zustand';
import api from '../services/api';

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
  // Aura助手
  auraChatOpen: boolean;
  setAuraChatOpen: (open: boolean) => void;
  // Aura助手全局开关
  auraChatEnabled: boolean;
  setAuraChatEnabled: (enabled: boolean) => void;
  // 预测性维护全局开关
  predictiveMaintenanceEnabled: boolean;
  setPredictiveMaintenanceEnabled: (enabled: boolean) => void;
  // 智能派工模态窗
  dispatchModalOpen: boolean;
  setDispatchModalOpen: (open: boolean) => void;
  // OEE 智能诊断模态窗
  oeeDiagnosisModalOpen: boolean;
  setOeeDiagnosisModalOpen: (open: boolean) => void;
  // 健康评分详情模态窗
  healthScoreModalOpen: boolean;
  setHealthScoreModalOpen: (open: boolean) => void;
  // 健康评分当前设备ID
  healthScoreDeviceId: string | null;
  setHealthScoreDeviceId: (id: string | null) => void;
  // ─── 数据模式（mock/real）───
  dataMode: 'mock' | 'real';
  setDataMode: (mode: 'mock' | 'real') => void;
  // ─── Aura AI 模型配置───
  auraAiModelProvider: string;
  setAuraAiModelProvider: (provider: string) => void;
  auraAiModelBaseUrl: string;
  setAuraAiModelBaseUrl: (baseUrl: string) => void;
  auraAiModelApiKey: string;
  setAuraAiModelApiKey: (apiKey: string) => void;
  auraAiModelId: string;
  setAuraAiModelId: (modelId: string) => void;
  // ─── 设置同步───
  fetchSettings: () => Promise<void>;
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

function getStoredAuth(): { user: User } | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  const storedUser = localStorage.getItem('demo_user');
  if (token && expiry && storedUser) {
    if (Date.now() < Number(expiry)) {
      try {
        const user = JSON.parse(storedUser);
        if (user && user.role) {
          return { user };
        }
      } catch { /* ignore */ }
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem('demo_user');
  }
  return null;
}

export const useStore = create<AppState>((set) => {
  // Restore user from localStorage on first load
  const stored = getStoredAuth();
  const initialUser = stored?.user || {
    id: 'demo-admin',
    name: '管理员',
    role: 'admin',
  };

  return {
  user: initialUser,
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
  isAuthenticated: !!stored,
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    localStorage.setItem('demo_user', JSON.stringify(user));
    set({ isAuthenticated: true, user });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem('demo_user');
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
  // Aura助手
  auraChatOpen: false,
  setAuraChatOpen: (open) => set({ auraChatOpen: open }),
  // Aura助手全局开关（默认打开）
  auraChatEnabled: true,
  setAuraChatEnabled: (enabled) => set({ auraChatEnabled: enabled }),
  // 预测性维护全局开关（默认关闭）
  predictiveMaintenanceEnabled: false,
  setPredictiveMaintenanceEnabled: (enabled) => set({ predictiveMaintenanceEnabled: enabled }),
  // 智能派工模态窗（默认关闭）
  dispatchModalOpen: false,
  setDispatchModalOpen: (open) => set({ dispatchModalOpen: open }),
  // OEE 智能诊断模态窗（默认关闭）
  oeeDiagnosisModalOpen: false,
  setOeeDiagnosisModalOpen: (open) => set({ oeeDiagnosisModalOpen: open }),
  // 健康评分详情模态窗
  healthScoreModalOpen: false,
  setHealthScoreModalOpen: (open) => set({ healthScoreModalOpen: open }),
  // 健康评分当前设备ID
  healthScoreDeviceId: null,
  setHealthScoreDeviceId: (id) => set({ healthScoreDeviceId: id }),
  // ─── 数据模式（mock/real）───
  // 从后端 settings API 同步
  dataMode: 'mock' as 'mock' | 'real',
  setDataMode: async (mode) => {
    try {
      await api.put('/settings/dataMode', { mode });
    } catch {
      // fallback to localStorage
    }
    localStorage.setItem('dataMode', mode);
    set({ dataMode: mode });
  },
  // ─── Aura AI 模型配置───
  // 从后端 settings API 同步
  auraAiModelProvider: 'openai',
  setAuraAiModelProvider: async (provider) => {
    try {
      await api.put('/settings/ai', { provider, baseUrl: useStore.getState().auraAiModelBaseUrl, apiKey: useStore.getState().auraAiModelApiKey, modelId: useStore.getState().auraAiModelId });
    } catch {
      // fallback
    }
    localStorage.setItem('auraAiModelProvider', provider);
    set({ auraAiModelProvider: provider });
  },
  auraAiModelBaseUrl: '',
  setAuraAiModelBaseUrl: async (baseUrl) => {
    try {
      await api.put('/settings/ai', { provider: useStore.getState().auraAiModelProvider, baseUrl, apiKey: useStore.getState().auraAiModelApiKey, modelId: useStore.getState().auraAiModelId });
    } catch {
      // fallback
    }
    localStorage.setItem('auraAiModelBaseUrl', baseUrl);
    set({ auraAiModelBaseUrl: baseUrl });
  },
  auraAiModelApiKey: '',
  setAuraAiModelApiKey: async (apiKey) => {
    try {
      await api.put('/settings/ai', { provider: useStore.getState().auraAiModelProvider, baseUrl: useStore.getState().auraAiModelBaseUrl, apiKey, modelId: useStore.getState().auraAiModelId });
    } catch {
      // fallback
    }
    localStorage.setItem('auraAiModelApiKey', apiKey);
    set({ auraAiModelApiKey: apiKey });
  },
  auraAiModelId: 'gpt-4o',
  setAuraAiModelId: async (modelId) => {
    try {
      await api.put('/settings/ai', { provider: useStore.getState().auraAiModelProvider, baseUrl: useStore.getState().auraAiModelBaseUrl, apiKey: useStore.getState().auraAiModelApiKey, modelId });
    } catch {
      // fallback
    }
    localStorage.setItem('auraAiModelId', modelId);
    set({ auraAiModelId: modelId });
  },
  // ─── 设置同步───
  fetchSettings: async () => {
    try {
      const [modeRes, aiRes] = await Promise.all([
        api.get('/settings/dataMode').catch(() => ({ data: { data: { mode: 'mock' } } })),
        api.get('/settings/ai').catch(() => ({ data: { data: { provider: 'openai', baseUrl: '', apiKey: '', modelId: 'gpt-4o' } } })),
      ]);
      const mode = modeRes.data?.data?.mode || 'mock';
      const ai = aiRes.data?.data || {};
      set({
        dataMode: mode,
        auraAiModelProvider: ai.provider || 'openai',
        auraAiModelBaseUrl: ai.baseUrl || '',
        auraAiModelApiKey: ai.apiKey || '',
        auraAiModelId: ai.modelId || 'gpt-4o',
      });
    } catch {
      // fallback to localStorage
      set({
        dataMode: (localStorage.getItem('dataMode') as 'mock' | 'real') || 'mock',
        auraAiModelProvider: localStorage.getItem('auraAiModelProvider') || 'openai',
        auraAiModelBaseUrl: localStorage.getItem('auraAiModelBaseUrl') || '',
        auraAiModelApiKey: localStorage.getItem('auraAiModelApiKey') || '',
        auraAiModelId: localStorage.getItem('auraAiModelId') || 'gpt-4o',
      });
    }
  },
}});