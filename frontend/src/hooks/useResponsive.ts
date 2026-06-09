import { useState, useEffect } from 'react';

/**
 * 响应式断点系统
 *
 * 参考 Ant Design 的断点设计，适配移动端、平板和桌面
 */
export const Breakpoints = {
  /** 手机 (<576px) */
  xs: 576,
  /** 平板 (576px ~ 992px) */
  sm: 992,
  /** 桌面 (992px+) */
  md: 992,
} as const;

export type ResponsiveDevice = 'mobile' | 'tablet' | 'desktop';

export interface ResponsiveInfo {
  /** 设备类型 */
  device: ResponsiveDevice;
  /** 是否为移动端 (<576px) */
  isMobile: boolean;
  /** 是否为平板 (576px ~ 992px) */
  isTablet: boolean;
  /** 是否为桌面 (>=992px) */
  isDesktop: boolean;
  /** 当前窗口宽度 */
  width: number;
  /** 当前窗口高度 */
  height: number;
}

/**
 * 响应式监听 Hook
 *
 * 用法：
 * ```tsx
 * const { isMobile, isTablet, device, width } = useResponsive();
 * ```
 */
export function useResponsive(): ResponsiveInfo {
  const [info, setInfo] = useState<ResponsiveInfo>(() => {
    // SSR 安全：在服务端默认返回桌面尺寸
    if (typeof window === 'undefined') {
      return { device: 'desktop', isMobile: false, isTablet: false, isDesktop: true, width: 1440, height: 900 };
    }
    const w = window.innerWidth;
    return {
      device: w < Breakpoints.xs ? 'mobile' : w < Breakpoints.sm ? 'tablet' : 'desktop',
      isMobile: w < Breakpoints.xs,
      isTablet: w >= Breakpoints.xs && w < Breakpoints.sm,
      isDesktop: w >= Breakpoints.md,
      width: w,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    let rafId: number;

    const handleResize = () => {
      // 使用 requestAnimationFrame 节流
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const w = window.innerWidth;
        setInfo({
          device: w < Breakpoints.xs ? 'mobile' : w < Breakpoints.sm ? 'tablet' : 'desktop',
          isMobile: w < Breakpoints.xs,
          isTablet: w >= Breakpoints.xs && w < Breakpoints.sm,
          isDesktop: w >= Breakpoints.md,
          width: w,
          height: window.innerHeight,
        });
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return info;
}

/**
 * 响应式栅格列配置生成器
 *
 * 用法：
 * ```tsx
 * <Col {...gridCols(2)}>...</Col>           // 桌面2列 -> 平板2列 -> 移动1列
 * <Col {...gridCols(3)}>...</Col>           // 桌面3列 -> 平板2列 -> 移动1列
 * <Col {...gridCols(4)}>...</Col>           // 桌面4列 -> 平板2列 -> 移动1列
 * <Col {...gridCols(3, { md: 3, sm: 1 })}>...</Col> // 自定义
 * ```
 */
export function gridCols(
  desktopCols: 1 | 2 | 3 | 4 | 6 | 8 | 12,
  overrides?: { xs?: number; sm?: number; md?: number },
) {
  // 24 / cols  = span
  const md = overrides?.md ?? (desktopCols >= 4 ? 8 : 24 / desktopCols);
  const sm = overrides?.sm ?? (desktopCols >= 3 ? 12 : md);
  const xs = overrides?.xs ?? 24;

  return {
    xs: overrides?.xs ?? xs,
    sm: overrides?.sm ?? (desktopCols >= 3 ? 12 : md),
    md: overrides?.md ?? (24 / Math.min(desktopCols, 4)),
    lg: 24 / Math.min(desktopCols, 6),
    xl: 24 / Math.min(desktopCols, 8),
    xxl: 24 / Math.min(desktopCols, 12),
  };
}

/**
 * 响应式间距
 * 移动端用较小的间距，桌面用较大的间距
 */
export function responsiveGutter(isMobile: boolean, isTablet: boolean): [number, number] {
  if (isMobile) return [8, 8];
  if (isTablet) return [12, 12];
  return [16, 16];
}

/**
 * 生成响应式 padding
 */
export function responsivePadding(isMobile: boolean) {
  return isMobile ? 12 : 20;
}
