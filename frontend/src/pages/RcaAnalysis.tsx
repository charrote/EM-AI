import { NodeIndexOutlined } from '@ant-design/icons';
import FeaturePlaceholder from '../components/FeaturePlaceholder';

export default function RcaAnalysis() {
  return (
    <FeaturePlaceholder
      icon={<NodeIndexOutlined />}
      title="根因分析 RCA"
      description="通过 5-Why 分析法逐层追问根本原因，自动生成鱼骨图（人/机/料/法/环/测），帮助维修团队找到故障最深层的根因并制定改善对策。"
      featureList={[
        '5-Why 逐步追问引导，逐层深入',
        '鱼骨图自动生成（6 维度分析）',
        '根因→改善建议自动关联',
        '历史根因数据统计与模式识别',
      ]}
    />
  );
}
