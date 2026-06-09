import { ExperimentOutlined } from '@ant-design/icons';
import FeaturePlaceholder from '../components/FeaturePlaceholder';

export default function MaintenanceExecute() {
  return (
    <FeaturePlaceholder
      icon={<ExperimentOutlined />}
      title="保养执行与记录"
      description="扫码启动保养任务，按 SOP 步骤引导执行，记录保养过程中的检测数据、更换备件和操作耗时，完工后自动生成保养履历。"
      featureList={[
        '扫码启动保养任务',
        'SOP 步骤引导执行',
        '检测数据/备件更换/耗时记录',
        '保养前后对比照片上传',
        '完工确认 + 自动生成保养履历',
      ]}
    />
  );
}
