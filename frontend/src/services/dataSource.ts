/**
 * 数据源管理核心
 * 根据 dataMode（mock/real）自动切换数据源
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import api from './api';
import { generateMockDevices, generateMockWorkOrders, generateMockOEEData, generateMockLossData, generateMockTeams, generateMockToolings, generateMockOrgTree, generateMockInspections, generateMockMaintenanceRecords, generateMockImprovements, generateMockKnowledge, generateMockAndonData, generateMockRcaRecords, generateMockImprovementOpportunities, generateMockDeviceManage, generateMockMaintenancePlans, generateMockInspectionPlans, generateMockKnowledgeStats, generateMockEquipmentTypes, generateMockCalendarEntries } from './mockData';

// 数据源模式
export type DataSourceMode = 'mock' | 'real';

// 数据源类型
export type DataSourceType = 'fallback' | 'real' | 'mock';

// API 响应包装
export interface DataSourceResponse<T> {
  data: T;
  source: DataSourceType;
  error?: string;
}

/**
 * 统一数据源获取钩子
 * 自动根据 dataMode 切换数据源，支持 fallback
 * @param realFetcher 真实数据获取函数
 * @param mockData 模拟数据（当 dataMode=mock 时返回）
 * @returns { data, loading, error, source, refresh }
 */
export function useDataSource<T>(
  realFetcher: () => Promise<T>,
  mockData: T,
  options?: {
    delay?: number; // 模拟延迟，用于演示
    onRealError?: (error: any) => void; // 真实数据错误回调
  }
) {
  const { dataMode } = useStore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSourceType>('mock');
  const { delay = 0, onRealError } = options || {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 如果 dataMode 是 mock，直接返回模拟数据
      if (dataMode === 'mock') {
        setData(mockData);
        setSource('mock');
        setLoading(false);
        return;
      }

      // 尝试获取真实数据
      try {
        const realData = await realFetcher();
        setData(realData);
        setSource('real');
      } catch (realError: any) {
        // 真实数据获取失败，回退到模拟数据
        console.warn('[useDataSource] Real data fetch failed, using mock:', realError.message);
        setData(mockData);
        setSource('fallback');
        onRealError?.(realError);
      }
    } finally {
      setLoading(false);
    }
  }, [dataMode, realFetcher, mockData, delay, onRealError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: data ?? mockData,
    loading,
    error,
    source,
    isMock: dataMode === 'mock',
    isReal: dataMode === 'real',
    refresh: fetchData,
  };
}

/**
 * 简化版数据源钩子 - 用于简单 API 调用
 * @param apiUrl API 路径
 * @param mockData 模拟数据
 * @returns { data, loading, error, source, refresh }
 */
export function useApiDataSource<T>(
  apiUrl: string,
  mockData: T,
  options?: { params?: Record<string, any> }
) {
  const { dataMode } = useStore();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSourceType>('mock');
  const { params } = options || {};

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 如果 dataMode 是 mock，直接返回模拟数据
      if (dataMode === 'mock') {
        setData(mockData);
        setSource('mock');
        setLoading(false);
        return;
      }

      // 尝试获取真实数据
      const res = await api.get(apiUrl, { params });
      setData(res.data.data || res.data);
      setSource('real');
    } catch (err: any) {
      console.warn(`[useApiDataSource] API fetch failed, using mock:`, err.message);
      setData(mockData);
      setSource('fallback');
    } finally {
      setLoading(false);
    }
  }, [dataMode, apiUrl, mockData, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: data ?? mockData,
    loading,
    error,
    source,
    isMock: dataMode === 'mock',
    isReal: dataMode === 'real',
    refresh: fetchData,
  };
}

/**
 * 预定义的数据源钩子 - 用于常见场景
 * 所有 mock 数据都用 useMemo 缓存引用，防止无限循环
 */

// 设备列表
export function useDeviceDataSource(scenario: string, filters?: Record<string, any>) {
  const mockDevices = useMemo(() => generateMockDevices(20), []);
  return useApiDataSource(
    `/api/devices?scenario=${scenario}`,
    mockDevices,
    { params: filters }
  );
}

// 设备详情
export function useDeviceDetailDataSource(deviceId: string) {
  const mockDevice = useMemo(() => ({
    id: deviceId,
    code: `DEV-${deviceId}`,
    name: '示例设备',
    status: 'running',
    oee: 85,
    healthScore: 90,
  }), [deviceId]);
  return useApiDataSource(
    `/api/devices/${deviceId}`,
    mockDevice
  );
}

// 工单列表
export function useWorkOrderDataSource(statusFilter?: string) {
  const mockOrders = useMemo(() => generateMockWorkOrders(30), []);
  return useApiDataSource(
    `/api/work-orders?limit=200${statusFilter ? `&status=${statusFilter}` : ''}`,
    mockOrders
  );
}

// OEE 数据
export function useOEEDataSource() {
  const mockOEE = useMemo(() => generateMockOEEData(), []);
  return useApiDataSource(
    '/api/dashboard/oee',
    mockOEE
  );
}

// 损失分析数据
export function useLossDataSource(scope: string) {
  const mockLoss = useMemo(() => generateMockLossData(), []);
  return useApiDataSource(
    `/api/dashboard/losses?scope=${scope}`,
    mockLoss
  );
}

// 班组数据
export function useTeamDataSource() {
  const mockTeams = useMemo(() => generateMockTeams(8), []);
  return useApiDataSource(
    '/api/teams',
    mockTeams
  );
}

// 工治具数据
export function useToolingDataSource() {
  const mockToolings = useMemo(() => generateMockToolings(15), []);
  return useApiDataSource(
    '/api/toolings',
    mockToolings
  );
}

// 组织树数据
export function useOrgTreeDataSource() {
  const mockOrgTree = useMemo(() => generateMockOrgTree(), []);
  return useApiDataSource(
    '/api/organizations/tree',
    mockOrgTree
  );
}

// 点检数据
export function useInspectionDataSource() {
  const mockInspections = useMemo(() => generateMockInspections(20), []);
  return useApiDataSource(
    '/api/inspections',
    mockInspections
  );
}

// 保养数据
export function useMaintenanceDataSource() {
  const mockRecords = useMemo(() => generateMockMaintenanceRecords(15), []);
  return useApiDataSource(
    '/api/maintenance/records',
    mockRecords
  );
}

// 改善项目数据
export function useImprovementDataSource() {
  const mockImprovements = useMemo(() => generateMockImprovements(10), []);
  return useApiDataSource(
    '/api/improvements',
    mockImprovements
  );
}

// 知识库数据
export function useKnowledgeDataSource() {
  const mockKnowledge = useMemo(() => generateMockKnowledge(15), []);
  return useApiDataSource(
    '/api/knowledge',
    mockKnowledge
  );
}

// 安灯数据
export function useAndonDataSource() {
  const mockAndon = useMemo(() => generateMockAndonData(), []);
  return useApiDataSource(
    '/api/dashboard/andon',
    mockAndon
  );
}

// 根因分析数据
export function useRcaDataSource() {
  const mockRca = useMemo(() => generateMockRcaRecords(10), []);
  return useApiDataSource(
    '/api/rca',
    mockRca
  );
}

// 改善机会数据
export function useImprovementOpportunityDataSource() {
  const mockOpp = useMemo(() => generateMockImprovementOpportunities(10), []);
  return useApiDataSource(
    '/api/improvements/opportunities',
    mockOpp
  );
}

// 设备管理列表 (用于工治具上/下机)
export function useDeviceManageDataSource(keyword?: string) {
  const mockDevices = useMemo(() => generateMockDeviceManage(20), []);
  const params = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
  return useApiDataSource(
    `/api/devices/manage${params}`,
    mockDevices
  );
}

// 保养计划数据
export function useMaintenancePlanDataSource(active?: boolean) {
  const mockPlans = useMemo(() => generateMockMaintenancePlans(10), []);
  const params = active ? '?active=true' : '';
  return useApiDataSource(
    `/api/maintenance/plans${params}`,
    mockPlans
  );
}

// 点检计划数据
export function useInspectionPlanDataSource() {
  const mockPlans = useMemo(() => generateMockInspectionPlans(8), []);
  return useApiDataSource(
    '/api/inspection-plans',
    mockPlans
  );
}

// 知识库统计
export function useKnowledgeStatsDataSource() {
  const mockStats = useMemo(() => generateMockKnowledgeStats(), []);
  return useApiDataSource(
    '/api/knowledge/stats',
    mockStats
  );
}

// 知识库设备类型树
export function useKnowledgeEquipmentTypesDataSource() {
  const mockTypes = useMemo(() => generateMockEquipmentTypes(), []);
  return useApiDataSource(
    '/api/knowledge/equipment-types',
    mockTypes
  );
}

// 工作日历
export function useCalendarDataSource(year: number, month: number) {
  const mockEntries = useMemo(() => generateMockCalendarEntries(year, month), []);
  return useApiDataSource(
    `/api/calendar?year=${year}&month=${month}`,
    mockEntries
  );
}