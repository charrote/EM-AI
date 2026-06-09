import { BuildOutlined } from '@ant-design/icons';
import FeaturePlaceholder from '../components/FeaturePlaceholder';

export default function ToolingList() {
  return (
    <FeaturePlaceholder
      icon={<BuildOutlined />}
      title="工治具档案"
      description="模具/夹具/刀具/量具的全生命周期管理。一物一码（二维码），完整档案信息、状态管理、领用归还、寿命追踪全程可追溯。"
      phase="Phase 1"
      featureList={[
        '一物一码：二维码/RFID 唯一标识',
        '档案：规格/供应商/寿命/关联设备',
        '状态：在库/在用/保养/维修/报废',
        '领用/归还扫码流程',
        '超期未归还自动提醒',
      ]}
    />
  );
}
