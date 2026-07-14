/**
 * 数据源管理核心
 * 根据 dataMode（mock/real）自动切换数据源
 */
import { useState, useEffect, useCallback } from 'react';
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
 */

// 设备列表
export function useDeviceDataSource(scenario: string, filters?: Record<string, any>) {
  return useApiDataSource(
    `/api/devices?scenario=${scenario}`,
    generateMockDevices(20),
    { params: filters }
  );
}

// 设备详情
export function useDeviceDetailDataSource(deviceId: string) {
  return useApiDataSource(
    `/api/devices/${deviceId}`,
    {
      id: deviceId,
      code: `DEV-${deviceId}`,
      name: '示例设备',
      status: 'running',
      oee: 85,
      healthScore: 90,
    }
  );
}

// 工单列表
export function useWorkOrderDataSource(statusFilter?: string) {
  return useApiDataSource(
    `/api/work-orders?limit=200${statusFilter ? `&status=${statusFilter}` : ''}`,
    generateMockWorkOrders(30)
  );
}

// OEE 数据
export function useOEEDataSource() {
  return useApiDataSource(
    '/api/dashboard/oee',
    generateMockOEEData()
  );
}

// 损失分析数据
export function useLossDataSource(scope: string) {
  return useApiDataSource(
    `/api/dashboard/losses?scope=${scope}`,
    generateMockLossData()
  );
}

// 班组数据
export function useTeamDataSource() {
  return useApiDataSource(
    '/api/teams',
    generateMockTeams(8)
  );
}

// 工治具数据
export function useToolingDataSource() {
  return useApiDataSource(
    '/api/toolings',
    generateMockToolings(15)
  );
}

// 组织树数据
export function useOrgTreeDataSource() {
  return useApiDataSource(
    '/api/organizations/tree',
    generateMockOrgTree()
  );
}

// 点检数据
export function useInspectionDataSource() {
  return useApiDataSource(
    '/api/inspections',
    generateMockInspections(20)
  );
}

// 保养数据
export function useMaintenanceDataSource() {
  return useApiDataSource(
    '/api/maintenance/records',
    generateMockMaintenanceRecords(15)
  );
}

// 改善项目数据
export function useImprovementDataSource() {
  return useApiDataSource(
    '/api/improvements',
    generateMockImprovements(10)
  );
}

// 知识库数据
export function useKnowledgeDataSource() {
  return useApiDataSource(
    '/api/knowledge',
    generateMockKnowledge(15)
  );
}

// 安灯数据
export function useAndonDataSource() {
  return useApiDataSource(
    '/api/dashboard/andon',
    generateMockAndonData()
  );
}

// 根因分析数据
export function useRcaDataSource() {
  return useApiDataSource(
    '/api/rca',
    generateMockRcaRecords(10)
  );
}

// 改善机会数据
export function useImprovementOpportunityDataSource() {
  return useApiDataSource(
    '/api/improvements/opportunities',
    generateMockImprovementOpportunities(10)
  );
}

// 设备管理列表 (用于工治具上/下机)
export function useDeviceManageDataSource(keyword?: string) {
  const params = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
  return useApiDataSource(
    `/api/devices/manage${params}`,
    generateMockDeviceManage(20)
  );
}

// 保养计划数据
export function useMaintenancePlanDataSource(active?: boolean) {
  const params = active ? '?active=true' : '';
  return useApiDataSource(
    `/api/maintenance/plans${params}`,
    generateMockMaintenancePlans(10)
  );
}

// 点检计划数据
export function useInspectionPlanDataSource() {
  return useApiDataSource(
    '/api/inspection-plans',
    generateMockInspectionPlans(8)
  );
}

// 知识库统计
export function useKnowledgeStatsDataSource() {
  return useApiDataSource(
    '/api/knowledge/stats',
    generateMockKnowledgeStats()
  );
}

// 知识库设备类型树
export function useKnowledgeEquipmentTypesDataSource() {
  return useApiDataSource(
    '/api/knowledge/equipment-types',
    generateMockEquipmentTypes()
  );
}

// 工作日历
export function useCalendarDataSource(year: number, month: number) {
  return useApiDataSource(
    `/api/calendar?year=${year}&month=${month}`,
    generateMockCalendarEntries(year, month)
  );
}