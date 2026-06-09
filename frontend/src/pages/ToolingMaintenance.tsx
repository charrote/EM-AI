import { SafetyOutlined } from '@ant-design/icons';
import FeaturePlaceholder from '../components/FeaturePlaceholder';

export default function ToolingMaintenance() {
  return (
    <FeaturePlaceholder
      icon={<SafetyOutlined />}
      title="工治具保养"
      description="基于使用次数和运行时长自动生成工治具保养计划，保养项目标准化，保养记录与工治具档案关联形成完整保养履历。"
      phase="Phase 1"
      featureList={[
        '基于使用次数/时长的保养计划',
        '保养项目标准化（清洁/润滑/检测）',
        '保养记录与工治具档案关联',
        '保养履历完整可追溯',
        '保养质量评分 + 趋势分析',
      ]}
    />
  );
}
