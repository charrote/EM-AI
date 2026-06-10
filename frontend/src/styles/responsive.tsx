import type { ReactNode } from 'react';
import { Col } from 'antd';
import { gridCols } from '../hooks/useResponsive';

/**
 * 响应式统计卡片列
 * 桌面 span=6（4 个），平板 span=12（2 个），移动 span=24（1 个）
 */
export function StatCol({ children, span, style }: { children: ReactNode; span?: number; style?: React.CSSProperties }) {
  return (
    <Col xs={24} sm={12} md={span ?? 6} style={style}>
      {children}
    </Col>
  );
}

/**
 * 响应式图表列
 * 桌面 span=12（2 列），平板 span=24（1 列），移动 span=24（1 列）
 */
export function ChartCol({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <Col xs={24} sm={24} md={12} style={style}>
      {children}
    </Col>
  );
}

/**
 * 响应式三列布局
 * 桌面 span=8（3 列），平板 span=12（2 列），移动 span=24（1 列）
 */
export function TripleCol({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <Col xs={24} sm={12} md={8} style={style}>
      {children}
    </Col>
  );
}

/**
 * 响应式设备卡片网格列
 * xs=24(1列) sm=12(2列) md=8(3列) lg=6(4列) xl=4(6列)
 */
export function DeviceCardCol({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <Col xs={24} sm={12} md={8} lg={6} xl={4} style={style}>
      {children}
    </Col>
  );
}

export { gridCols };
