import { Empty, Button, Space, Typography, Tag } from 'antd';
import { PlusOutlined, RightCircleOutlined } from '@ant-design/icons';
import PageCard from './PageCard';
import { Colors } from '../styles/theme';

const { Text, Title } = Typography;

interface FeaturePlaceholderProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  featureList?: string[];
  phase?: string;
}

export default function FeaturePlaceholder({
  icon,
  title,
  description,
  featureList,
  phase = 'Phase 1',
}: FeaturePlaceholderProps) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: 40 }}>
      <PageCard bodyStyle={{ padding: 48 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, color: Colors.gray300, marginBottom: 16 }}>{icon}</div>
          <Title level={3} style={{ margin: '0 0 8px', color: Colors.gray800 }}>{title}</Title>
          <Tag color={Colors.primary} style={{ borderRadius: 4, border: 'none', marginBottom: 12 }}>
            {phase} · 开发中
          </Tag>
          <div style={{ color: Colors.gray500, fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: '0 auto' }}>
            {description}
          </div>
        </div>

        {featureList && featureList.length > 0 && (
          <div style={{ background: Colors.gray50, borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <Text strong style={{ fontSize: 13, color: Colors.gray700, marginBottom: 8, display: 'block' }}>
              规划功能
            </Text>
            <ul style={{ margin: 0, padding: '0 0 0 16px', color: Colors.gray500, fontSize: 13, lineHeight: 2 }}>
              {featureList.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Space>
            <Button type="primary" ghost icon={<RightCircleOutlined />} style={{ borderRadius: 6 }}>
              查看功能详情
            </Button>
          </Space>
        </div>
      </PageCard>
    </div>
  );
}
