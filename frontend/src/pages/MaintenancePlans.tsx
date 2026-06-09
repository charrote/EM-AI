import { SafetyCertificateOutlined } from '@ant-design/icons';
import FeaturePlaceholder from '../components/FeaturePlaceholder';

export default function MaintenancePlans() {
  return (
    <FeaturePlaceholder
      icon={<SafetyCertificateOutlined />}
      title="保养计划管理"
      description="按时间/运行时长/产量三种触发方式自动生成保养计划，覆盖日常保养、一级/二级保养和大修保养，到期自动推送提醒。"
      featureList={[
        '保养类型：日常/一级/二级/大修',
        '触发方式：时间/运行时长/产量',
        '保养项目标准库（SOP 关联）',
        '到期自动推送提醒',
        '保养日历视图 + 执行率统计',
      ]}
    />
  );
}
