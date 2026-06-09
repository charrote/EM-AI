import { MonitorOutlined } from '@ant-design/icons';
import FeaturePlaceholder from '../components/FeaturePlaceholder';

export default function AndonBoard() {
  return (
    <FeaturePlaceholder
      icon={<MonitorOutlined />}
      title="效率看板 (Andon)"
      description="车间级实时效率看板，展示各设备 OEE、运行状态灯、当日损失统计和实时告警。支持大屏模式，数据自动刷新，异常即时推送。"
      featureList={[
        '全厂 OEE 实时值 + 各设备 OEE 排行',
        '设备状态灯（红/黄/绿）',
        '实时损失统计与告警滚动',
        '大屏/全屏模式',
        '交接班自动汇总报告',
      ]}
    />
  );
}
