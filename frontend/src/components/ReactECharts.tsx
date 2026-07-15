import { useRef, useEffect, useMemo, type CSSProperties } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

export interface ReactEChartsProps {
  option?: EChartsOption;
  style?: CSSProperties;
  className?: string;
  height?: number | string;
  /** 是否在窗口大小变化时自动 resize */
  autoResize?: boolean;
  /** 是否在 option 变化时自动 setOption */
  notMerge?: boolean;
  lazyUpdate?: boolean;
  /** 加载动画配置 */
  loadingOption?: object;
  /** 是否显示加载动画 */
  showLoading?: boolean;
  /** 事件监听 */
  onEvents?: Record<string, (params: any) => void>;
}

/**
 * React ECharts 组件 - 使用 hooks 替代类组件
 * 替代 echarts-for-react 与 React 19 兼容
 */
export default function ReactECharts({
  option,
  style,
  className,
  height = 400,
  autoResize = true,
  notMerge = false,
  showLoading = false,
  loadingOption,
  onEvents,
}: ReactEChartsProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // 初始化图表
  useEffect(() => {
    if (!chartRef.current) return;

    // 创建实例
    chartInstance.current = echarts.init(chartRef.current);

    // 设置 option
    if (option) {
      chartInstance.current.setOption(option, notMerge);
    }

    // 显示加载动画
    if (showLoading) {
      chartInstance.current.showLoading(loadingOption);
    }

    // 绑定事件
    if (onEvents) {
      Object.entries(onEvents).forEach(([event, handler]) => {
        chartInstance.current?.on(event, handler);
      });
    }

    // 监听窗口大小变化
    if (autoResize) {
      observerRef.current = new ResizeObserver(() => {
        chartInstance.current?.resize();
      });
      observerRef.current.observe(chartRef.current);
    }

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  // 更新 option
  useEffect(() => {
    if (chartInstance.current && option) {
      chartInstance.current.setOption(option, notMerge);
    }
  }, [option, notMerge]);

  // 更新事件监听
  useEffect(() => {
    if (!chartInstance.current || !onEvents) return;

    // 移除旧事件
    const currentInstance = chartInstance.current;
    Object.keys(onEvents).forEach((event) => {
      currentInstance.off(event);
    });

    // 添加新事件
    Object.entries(onEvents).forEach(([event, handler]) => {
      currentInstance.on(event, handler);
    });
  }, [onEvents]);

  const chartStyle: CSSProperties = useMemo(
    () => ({
      width: '100%',
      height: height,
      ...style,
    }),
    [height, style]
  );

  return (
    <div
      ref={chartRef}
      className={className}
      style={chartStyle}
    />
  );
}