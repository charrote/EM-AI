import { Card } from 'antd';
import type { CardProps } from 'antd';
import { Colors } from '../styles/theme';

interface PageCardProps extends CardProps {
  icon?: React.ReactNode;
}

/**
 * 统一页面卡片组件 — 扁平化设计，无 emoji，统一间距和边框
 */
export default function PageCard({ icon, title, children, style, ...rest }: PageCardProps) {
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
      style={{
        borderRadius: 8,
        border: `1px solid ${Colors.gray200}`,
        boxShadow: 'none',
        ...style,
      }}
    >
      {children}
    </Card>
  );
}
