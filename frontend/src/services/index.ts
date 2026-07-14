// API 服务层统一导出
export { authApi } from './auth';
export { deviceApi } from './devices';
export { workOrderApi } from './workOrders';
export { inspectionApi } from './inspections';
export { inspectionPlanApi } from './inspectionPlans';
export { toolingApi } from './toolings';
export { knowledgeApi } from './knowledge';
export { improvementApi } from './improvements';
export { dashboardApi } from './dashboard';
export { maintenanceApi } from './maintenance';
export { rcaApi } from './rca';
export { organizationApi } from './organizations';
export { teamApi } from './teams';
export { calendarApi } from './calendar';
export { settingsApi } from './settings';
export { uploadApi } from './upload';

// 数据源管理
export { useDataSource, useApiDataSource } from './dataSource';

// 保留原始 api 实例（用于特殊场景）
export { default as api } from './api';