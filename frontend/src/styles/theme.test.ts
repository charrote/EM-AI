import { describe, it, expect } from 'vitest';
import { Colors, DeviceStatusConfig, WorkOrderStatusLabels, PriorityLabels } from './theme';

describe('theme', () => {
  describe('Colors', () => {
    it('应该包含所有主色调', () => {
      expect(Colors.primary).toBe('#1D4ED8');
      expect(Colors.success).toBe('#16A34A');
      expect(Colors.warning).toBe('#D97706');
      expect(Colors.danger).toBe('#DC2626');
    });

    it('应该包含灰度色阶', () => {
      expect(Colors.gray50).toBe('#F9FAFB');
      expect(Colors.gray500).toBe('#6B7280');
      expect(Colors.gray900).toBe('#111827');
    });
  });

  describe('DeviceStatusConfig', () => {
    it('应该包含所有设备状态', () => {
      expect(DeviceStatusConfig.running.label).toBe('运行中');
      expect(DeviceStatusConfig.idle.label).toBe('待机');
      expect(DeviceStatusConfig.fault.label).toBe('故障');
      expect(DeviceStatusConfig.maintenance.label).toBe('保养中');
    });
  });

  describe('WorkOrderStatusLabels', () => {
    it('应该包含所有工单状态', () => {
      expect(WorkOrderStatusLabels.pending).toBe('待接单');
      expect(WorkOrderStatusLabels.completed).toBe('已完成');
    });
  });

  describe('PriorityLabels', () => {
    it('应该包含所有优先级标签', () => {
      expect(PriorityLabels.P0).toBe('紧急停产');
      expect(PriorityLabels.P1).toBe('严重降速');
      expect(PriorityLabels.P2).toBe('轻微异常');
      expect(PriorityLabels.P3).toBe('观察项');
    });
  });
});