import { Card } from 'antd';
import type { CardProps } from 'antd';
import type { CSSProperties } from 'react';
import { Colors } from '../styles/theme';

interface PageCardProps extends Omit<CardProps, 'styles'> {
  icon?: React.ReactNode;
  /** @deprecated 请使用 styles.body 替代 */
  bodyStyle?: CSSProperties;
  styles?: CardProps['styles'];
}

/**
 * 统一页面卡片组件 — 扁平化设计
 *
 * 说明：
 * - 使用 `styles.body` 控制 body 内边距（Ant Design v6 方式）
 * - `bodyStyle` 作为兼容写法，自动映射到 `styles.body`
 * - 移动端适配通过内容区 padding 实现
 */
export default function PageCard({ icon, title, children, style, bodyStyle, styles, ...rest }: PageCardProps) {
  const cardTitle = title ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {icon && <span style={{ fontSize: 16, color: Colors.primary }}>{icon}</span>}
      <span style={{ fontSize: 15, fontWeight: 600, color: Colors.gray800 }}>{title}</span>
    </div>
  ) : undefined;

  return (
    <Card
      {...rest}
      title={cardTitle}
      styles={{
        body: {
          padding: 16,
          ...bodyStyle,    // 兼容 bodyStyle 写法
          ...styles?.body, // styles.body 优先级最高
        },
        header: cardTitle ? {
          padding: '12px 16px',
          minHeight: 44,
          ...styles?.header,
        } : undefined,
        ...styles,
      }}
      style={{
        borderRadius: 8,
        border: `1px solid ${Colors.gray200}`,
        boxShadow: 'none',
        ...style,
      }}
    />
  );
}
