import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './layouts/AppLayout';
import { Colors } from './styles/theme';
import ErrorBoundary from './components/ErrorBoundary';

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

function PageLoading() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Spin size="large" />
    </div>
  );
}

function App() {
  return (
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
        <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
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
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
