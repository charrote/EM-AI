import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AppLayout from './layouts/AppLayout';
import DeviceList from './pages/DeviceList';
import DeviceDetail from './pages/DeviceDetail';
import WorkOrderList from './pages/WorkOrderList';
import WorkOrderDetail from './pages/WorkOrderDetail';
import InspectionPage from './pages/InspectionPage';
import OEEDashboard from './pages/OEEDashboard';
import LossAnalysis from './pages/LossAnalysis';
import ImprovementProjects from './pages/ImprovementProjects';
import KnowledgeBase from './pages/KnowledgeBase';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import ReportFault from './pages/ReportFault';
import { Colors } from './styles/theme';

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
          },
          Tag: {
            borderRadius: 4,
          },
          Button: {
            borderRadius: 6,
          },
          Input: {
            borderRadius: 6,
          },
          Select: {
            borderRadius: 6,
          },
          Card: {
            borderRadius: 8,
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/devices" replace />} />
            <Route path="devices" element={<DeviceList />} />
            <Route path="devices/:id" element={<DeviceDetail />} />
            <Route path="work-orders" element={<WorkOrderList />} />
            <Route path="work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="inspections" element={<InspectionPage />} />
            <Route path="oee" element={<OEEDashboard />} />
            <Route path="loss-analysis" element={<LossAnalysis />} />
            <Route path="improvements" element={<ImprovementProjects />} />
            <Route path="knowledge" element={<KnowledgeBase />} />
            <Route path="executive" element={<ExecutiveDashboard />} />
            <Route path="report-fault" element={<ReportFault />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
