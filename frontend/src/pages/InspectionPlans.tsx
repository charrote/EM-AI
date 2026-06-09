import { CalendarOutlined } from '@ant-design/icons';
import FeaturePlaceholder from '../components/FeaturePlaceholder';

export default function InspectionPlans() {
  return (
    <FeaturePlaceholder
      icon={<CalendarOutlined />}
      title="点检计划与排程"
      description="支持自动排程和日历视图，按设备类型和点检层级动态生成每日/每周点检任务，支持拖拽调整和批量排程。"
      featureList={[
        '日历视图查看全网点检任务',
        '自动排程（日/周/月/季度）',
        '拖拽调整，批量排程',
        '防漏检自动提醒 + 超时上报',
        '点检频率基于历史数据动态优化',
      ]}
    />
  );
}
