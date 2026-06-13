import { Suspense, lazy, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, theme, Spin, Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './layouts/AppLayout';
import { Colors } from './styles/theme';
import ErrorBoundary from './components/ErrorBoundary';
import { useStore } from './store/useStore';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DeviceList = lazy(() => import('./pages/DeviceList'));
const DeviceDetail = lazy(() => import('./pages/DeviceDetail'));
const WorkOrderList = lazy(() => import('./pages/WorkOrderList'));
const WorkOrderDetail = lazy(() => import('./pages/WorkOrderDetail'));
const InspectionPage = lazy(() => import('./pages/InspectionPage'));
const OEEDashboard = lazy(() => import('./pages/OEEDashboard'));
const LossAnalysis = lazy(() => import('./pages/LossAnalysis'));
const ImprovementProjects = lazy(() => import('./pages/ImprovementProjects'));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'));
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const ReportFault = lazy(() => import('./pages/ReportFault'));
import NlrDemo from './pages/NlrDemo';
const OrganizationPage = lazy(() => import('./pages/OrganizationPage'));
const DeviceTypePage = lazy(() => import('./pages/DeviceTypePage'));
const DeviceManagePage = lazy(() => import('./pages/DeviceManagePage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const WorkCalendar = lazy(() => import('./pages/WorkCalendar'));
const RcaAnalysis = lazy(() => import('./pages/RcaAnalysis'));
const InspectionPlans = lazy(() => import('./pages/InspectionPlans'));
const MaintenancePlans = lazy(() => import('./pages/MaintenancePlans'));
const MaintenanceExecute = lazy(() => import('./pages/MaintenanceExecute'));
const AndonBoard = lazy(() => import('./pages/AndonBoard'));
const ToolingList = lazy(() => import('./pages/ToolingList'));
const ToolingMaintenance = lazy(() => import('./pages/ToolingMaintenance'));
const AuraDataConvergence = lazy(() => import('./pages/AuraDataConvergence'));
const AuraDataCleaning = lazy(() => import('./pages/AuraDataCleaning'));
const AuraDeviceHealth = lazy(() => import('./pages/AuraDeviceHealth'));
const AuraDeviceProfile = lazy(() => import('./pages/AuraDeviceProfile'));
import AuraDiagnosticModal from './components/AuraDiagnosticModal';
import KnowledgeMiningModal from './components/KnowledgeMiningModal';
import AuraChat from './components/AuraChat';

function PageLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Spin size="large" />
    </div>
  );
}

/** 认证守卫：未登录 → 跳转 /login，并保留原始路径用于登录后回跳 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return <>{children}</>;
}

function App() {
  const [auraModalOpen, setAuraModalOpen] = [
    useStore((s) => s.auraModalOpen),
    useStore((s) => s.setAuraModalOpen),
  ];
  const [dataCleaningModalOpen, setDataCleaningModalOpen] = [
    useStore((s) => s.dataCleaningModalOpen),
    useStore((s) => s.setDataCleaningModalOpen),
  ];
  const [deviceHealthModalOpen, setDeviceHealthModalOpen] = [
    useStore((s) => s.deviceHealthModalOpen),
    useStore((s) => s.setDeviceHealthModalOpen),
  ];
  const [deviceProfileModalOpen, setDeviceProfileModalOpen] = [
    useStore((s) => s.deviceProfileModalOpen),
    useStore((s) => s.setDeviceProfileModalOpen),
  ];
  const [nlrModalOpen, setNlrModalOpen] = [
    useStore((s) => s.nlrModalOpen),
    useStore((s) => s.setNlrModalOpen),
  ];

  // 监听设备全景画像的"穿透查询"，自动关闭画像模态窗并打开目标模态窗
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.path) return;
      setDeviceProfileModalOpen(false);
      setTimeout(() => {
        if (detail.path === '/aura/data-cleaning') {
          useStore.getState().setDataCleaningModalOpen(true);
        } else if (detail.path === '/aura/device-health') {
          useStore.getState().setDeviceHealthModalOpen(true);
        } else if (detail.path === '/aura/data-convergence') {
          useStore.getState().setAuraModalOpen(true);
        }
      }, 350);
    };
    window.addEventListener('aura-drill', handler);
    return () => window.removeEventListener('aura-drill', handler);
  }, []);

  return (
    <ErrorBoundary>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: Colors.primary,
          borderRadius: 6,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          colorBgLayout: Colors.bodyBg,
          colorBorder: Colors.gray200,
          colorBgContainer: '#FFFFFF',
        },
        components: {
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: Colors.sidebarActive,
            itemSelectedColor: Colors.primary,
            itemColor: Colors.gray600,
            itemHoverBg: Colors.gray100,
            itemBorderRadius: 6,
            subMenuItemBg: 'transparent',
          },
          Tag: { borderRadius: 4 },
          Button: { borderRadius: 6 },
          Input: { borderRadius: 6 },
          Select: { borderRadius: 6 },
          Card: { borderRadius: 8 },
        },
      }}
    >
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* 登录页（独立布局，无侧栏） */}
          <Route path="/login" element={<LoginPage />} />

          {/* 受保护的主应用 */}
          <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
            {/* 首页 = 决策仪表盘 */}
            <Route index element={<ErrorBoundary><ExecutiveDashboard /></ErrorBoundary>} />

            {/* ─── 故障管理 ─── */}
            <Route path="report-fault" element={<ReportFault />} />
            <Route path="devices" element={<DeviceList />} />
            <Route path="devices/:id" element={<DeviceDetail />} />
            <Route path="work-orders" element={<WorkOrderList />} />
            <Route path="work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="rca-analysis" element={<RcaAnalysis />} />
            <Route path="knowledge" element={<KnowledgeBase />} />

            {/* ─── 预防管理 ─── */}
            <Route path="inspections" element={<InspectionPage />} />
            <Route path="inspection-plans" element={<InspectionPlans />} />
            <Route path="maintenance-plans" element={<MaintenancePlans />} />
            <Route path="maintenance-execute" element={<MaintenanceExecute />} />

            {/* ─── 效率管理 ─── */}
            <Route path="oee" element={<OEEDashboard />} />
            <Route path="loss-analysis" element={<LossAnalysis />} />
            <Route path="improvements" element={<ImprovementProjects />} />
            <Route path="andon-board" element={<AndonBoard />} />
            <Route path="executive" element={<ErrorBoundary><ExecutiveDashboard /></ErrorBoundary>} />

            {/* ─── 工治具管理 ─── */}
            <Route path="toolings" element={<ToolingList />} />
            <Route path="tooling-maintenance" element={<ToolingMaintenance />} />

            {/* ─── 基础数据 ─── */}
            <Route path="organizations" element={<OrganizationPage />} />
            <Route path="device-types" element={<DeviceTypePage />} />
            <Route path="device-manage" element={<DeviceManagePage />} />
            <Route path="teams" element={<TeamPage />} />
            <Route path="work-calendar" element={<WorkCalendar />} />
          </Route>

          {/* 未匹配路由 → 登录页 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>

      {/* ─── AURA 多元数据汇聚模态窗 ─── */}
      <ConfigProvider
        theme={{
          components: {
            Modal: {
              contentBg: '#070A1A',
              headerBg: '#070A1A',
            },
          },
        }}
      >
      <Modal
        open={auraModalOpen}
        onCancel={() => setAuraModalOpen(false)}
        footer={null}
        width="94vw"
        centered
        style={{ padding: 0, margin: 0 }}
        classNames={{
          content: 'aura-modal-content',
          body: 'aura-modal-body',
          mask: 'aura-modal-mask',
        }}
        styles={{
          body: { height: '90vh', padding: 0, margin: 0 },
          mask: { background: 'rgba(0,0,0,0.5)' },
        }}
        destroyOnHidden
        closeIcon={<CloseOutlined style={{ color: '#FFFFFF', fontSize: 18 }} />}
        mask={{ closable: false }}
        keyboard={true}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#070A1A' }}>
          <AuraDataConvergence />
        </div >
      </Modal>
      {/* ─── AURA AI 数据清洗模态窗 ─── */}
      <Modal
        open={dataCleaningModalOpen}
        onCancel={() => setDataCleaningModalOpen(false)}
        footer={null}
        width="94vw"
        centered
        style={{ padding: 0, margin: 0 }}
        classNames={{
          content: 'aura-modal-content',
          body: 'aura-modal-body',
          mask: 'aura-modal-mask',
        }}
        styles={{
          body: { height: '90vh', padding: 0, margin: 0 },
          mask: { background: 'rgba(0,0,0,0.5)' },
        }}
        destroyOnHidden
        closeIcon={<CloseOutlined style={{ color: '#FFFFFF', fontSize: 18 }} />}
        mask={{ closable: false }}
        keyboard={true}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#070A1A' }}>
          <AuraDataCleaning />
        </div >
      </Modal>
      {/* ─── AURA 设备健康基线模态窗 ─── */}
      <Modal
        open={deviceHealthModalOpen}
        onCancel={() => setDeviceHealthModalOpen(false)}
        footer={null}
        width="94vw"
        centered
        style={{ padding: 0, margin: 0 }}
        classNames={{
          content: 'aura-modal-content',
          body: 'aura-modal-body',
          mask: 'aura-modal-mask',
        }}
        styles={{
          body: { height: '90vh', padding: 0, margin: 0 },
          mask: { background: 'rgba(0,0,0,0.5)' },
        }}
        destroyOnHidden
        closeIcon={<CloseOutlined style={{ color: '#FFFFFF', fontSize: 18 }} />}
        mask={{ closable: false }}
        keyboard={true}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#070A1A' }}>
          <AuraDeviceHealth />
        </div >
      </Modal>
      {/* ─── AURA 设备全景画像模态窗 ─── */}
      <Modal
        open={deviceProfileModalOpen}
        onCancel={() => setDeviceProfileModalOpen(false)}
        footer={null}
        width="94vw"
        centered
        style={{ padding: 0, margin: 0 }}
        classNames={{
          content: 'aura-modal-content',
          body: 'aura-modal-body',
          mask: 'aura-modal-mask',
        }}
        styles={{
          body: { height: '90vh', padding: 0, margin: 0 },
          mask: { background: 'rgba(0,0,0,0.5)' },
        }}
        destroyOnHidden
        closeIcon={<CloseOutlined style={{ color: '#FFFFFF', fontSize: 18 }} />}
        mask={{ closable: false }}
        keyboard={true}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#070A1A' }}>
          <AuraDeviceProfile />
        </div >
      </Modal>
      {/* ─── AURA AI 辅助诊断模态窗 ─── */}
      <AuraDiagnosticModal />
      {/* ─── AURA 知识自动沉淀模态窗 ─── */}
      <KnowledgeMiningModal />

      {/* ─── Aura 聊天智能体 ─── */}
      <AuraChat />

      {/* ─── NLP 自然语言报修 — 纯 DOM 覆盖层（替换 Modal）─── */}
     {nlrModalOpen && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1050,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              width: '94vw', maxWidth: 680, height: '90vh',
              background: '#FFFFFF', borderRadius: 12,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <ErrorBoundary><NlrDemo /></ErrorBoundary>
          </div>
        </div>,
        document.body,
      )}
      </ConfigProvider>
      <style>{`
        .aura-modal-content {
          background: #070A1A !important;
          border: none !important;
          outline: none !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          border-radius: 12px !important;
        }
        .aura-modal-body {
          background: #070A1A !important;
          border: none !important;
          outline: none !important;
        }
        .aura-modal-mask {
          background: rgba(0,0,0,0.5) !important;
        }
      `}</style>
    </ConfigProvider>
      </ErrorBoundary>
  );
}

export default App;
