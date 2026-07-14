import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, InputNumber, Upload, message, List, Tag, Divider, Result, Spin, Empty } from 'antd';
import { CameraOutlined, ScanOutlined, OrderedListOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useDeviceDataSource, useInspectionPlanDataSource } from '../services/dataSource';

interface InspectionItem {
  id: string;
  name: string;
  method: string;
  value: string;
  result: 'pass' | 'fail';
  normalRange?: string;
}

const presetItems: InspectionItem[] = [
  { id: 'item-1', name: '润滑油位', method: '目视', value: '', result: 'pass', normalRange: '油位在上下刻度之间' },
  { id: 'item-2', name: '温度检查', method: '测温枪', value: '', result: 'pass', normalRange: '30-60°C' },
  { id: 'item-3', name: '振动检测', method: '振动仪', value: '', result: 'pass', normalRange: '<5.0mm/s' },
  { id: 'item-4', name: '紧固件检查', method: '目视+扳手', value: '', result: 'pass', normalRange: '无松动' },
  { id: 'item-5', name: '清洁度', method: '目视', value: '', result: 'pass', normalRange: '无油污/异物' },
];

// 设备类型 → 备选点检项目映射表（后端无配置时的 fallback）
const typeDefaultItems: Record<string, InspectionItem[]> = {
  CNC: [
    { id: 'cnc-1', name: '主轴温度', method: '测温枪', value: '', result: 'pass', normalRange: '<45°C' },
    { id: 'cnc-2', name: '润滑油位', method: '目视', value: '', result: 'pass', normalRange: '上/下刻度之间' },
    { id: 'cnc-3', name: '切削液浓度', method: '折射仪', value: '', result: 'pass', normalRange: '5-10%' },
    { id: 'cnc-4', name: '气动压力', method: '压力表', value: '', result: 'pass', normalRange: '0.5-0.7MPa' },
    { id: 'cnc-5', name: '安全门开关', method: '手动测试', value: '', result: 'pass', normalRange: '正常' },
  ],
  注塑机: [
    { id: 'inj-1', name: '料筒温度', method: '温控表', value: '', result: 'pass', normalRange: '180-230°C' },
    { id: 'inj-2', name: '液压油位', method: '目视', value: '', result: 'pass', normalRange: '油标中位' },
    { id: 'inj-3', name: '冷却水流量', method: '流量计', value: '', result: 'pass', normalRange: '≥15L/min' },
    { id: 'inj-4', name: '安全光栅', method: '手动测试', value: '', result: 'pass', normalRange: '正常' },
    { id: 'inj-5', name: '模具紧固', method: '目视+扳手', value: '', result: 'pass', normalRange: '无松动' },
  ],
  冲床: [
    { id: 'pch-1', name: '离合器间隙', method: '塞尺', value: '', result: 'pass', normalRange: '0.5-1.0mm' },
    { id: 'pch-2', name: '刹车磨损', method: '目视', value: '', result: 'pass', normalRange: '磨损标记内' },
    { id: 'pch-3', name: '润滑油位', method: '目视', value: '', result: 'pass', normalRange: '油标中位' },
    { id: 'pch-4', name: '安全双按钮', method: '手动测试', value: '', result: 'pass', normalRange: '正常' },
  ],
};

export default function InspectionPage() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  // ── Unified data source hooks ──────────────────────────────
  const {
    data: devices,
    loading: devicesLoading,
    refresh: refreshDevices,
  } = useDeviceDataSource('default');

  const {
    data: plans,
    loading: plansLoading,
    refresh: refreshPlans,
  } = useInspectionPlanDataSource();

  // Loading state
  const loading = devicesLoading || plansLoading;

  // ── Local state ────────────────────────────────────────────
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState<any>(null);
  const [items, setItems] = useState<InspectionItem[]>(presetItems);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'inspect' | 'result'>('select');

  // ── 设备切换时动态加载点检项目 ────────────────
  const loadInspectionItems = useCallback(async (deviceId: string) => {
    setLoadingItems(true);
    const device = devices.find((d: any) => d.id === deviceId);
    setSelectedDeviceInfo(device || null);

    try {
      // 先从 inspection-plans API 按设备类型查找
      if (device?.type) {
        const matchedPlans = plans.filter((p: any) => p.deviceType === device.type && p.active !== false);
        if (matchedPlans.length > 0) {
          const plan = matchedPlans[0];
          const planItems = (plan.items || []).map((item: any, i: number) => ({
            id: `plan-${plan.id}-${i}`,
            name: item.name || item,
            method: item.method || '目视',
            value: '',
            result: 'pass' as const,
            normalRange: item.normalRange || item.range || '',
          }));
          if (planItems.length > 0) {
            setItems(planItems);
            setLoadingItems(false);
            return;
          }
        }
        // Fallback: 按设备类型查找默认配置
        const defaults = typeDefaultItems[device.type as string];
        if (defaults) {
          setItems(defaults.map((d) => ({ ...d })));
          setLoadingItems(false);
          return;
        }
      }
      // 最终 fallback：通用预设
      setItems(presetItems.map((p) => ({ ...p })));
    } catch {
      setItems(presetItems.map((p) => ({ ...p })));
    }
    setLoadingItems(false);
  }, [devices, plans]);

  useEffect(() => {
    if (selectedDevice) {
      loadInspectionItems(selectedDevice);
    }
  }, [selectedDevice, loadInspectionItems]);

  const handleValueChange = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, value, result: value ? 'pass' : 'fail' };
      })
    );
  };

  const handleSubmit = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    try {
      const emptyItems = items.filter((item) => !item.value && item.result === 'pass');
      if (emptyItems.length > 0) {
        message.warning(`还有 ${emptyItems.length} 项未填写，请完成所有点检`);
        setSubmitting(false);
        return;
      }

      const res = await api.post('/inspections', {
        deviceId: selectedDevice,
        level: 'daily',
        operatorId: 'demo-operator',
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          method: item.method,
          value: item.value,
          result: item.value ? 'pass' : 'fail',
        })),
      });
      setResult(res.data);
      setStep('result');
      if (res.data.triggeredWorkOrderId) {
        message.warning('点检发现异常，已自动创建维修工单！');
      } else {
        message.success('点检完成，所有项目正常！');
      }
    } catch {
      message.error('提交失败，请重试');
    }
    setSubmitting(false);
  };

  const handleReset = () => {
    setSelectedDevice('');
    setSelectedDeviceInfo(null);
    setItems(presetItems.map(p => ({ ...p })));
    setStep('select');
    setResult(null);
  };

  const pageMaxWidth = isMobile ? '100%' : 640;

  return (
    <div style={{ maxWidth: pageMaxWidth, margin: '0 auto' }}>
      {step === 'select' && (
        <PageCard icon={<OrderedListOutlined />} title="选择设备" bodyStyle={{ padding: isMobile ? 16 : 24 }}>
          <div style={{ marginBottom: 16 }}>
            <Button icon={<ScanOutlined />} size={isMobile ? 'middle' : 'large'} block
              style={{ height: isMobile ? 44 : 48, marginBottom: 12, borderRadius: 8 }}>
              扫描设备二维码
            </Button>
          </div>
          <Select
            showSearch
            placeholder="搜索并选择设备"
            value={selectedDevice || undefined}
            onChange={setSelectedDevice}
            style={{ width: '100%' }}
            size={isMobile ? 'middle' : 'large'}
            options={devices.map((d) => ({
              value: d.id,
              label: `${d.code} - ${d.name}`,
            }))}
          />
          <Divider />
          <Button
            type="primary"
            size={isMobile ? 'middle' : 'large'}
            block
            disabled={!selectedDevice}
            onClick={() => setStep('inspect')}
            style={{ borderRadius: 8, height: isMobile ? 40 : 44 }}
          >
            开始点检
          </Button>
        </PageCard>
      )}

      {step === 'inspect' && (
        <PageCard icon={<EyeOutlined />} title="点检执行" bodyStyle={{ padding: isMobile ? 16 : 24 }}>
          <div style={{ marginBottom: isMobile ? 12 : 16 }}>
            <Tag color={Colors.primary} style={{ borderRadius: 4, marginRight: 8 }}>{selectedDeviceInfo?.type}</Tag>
            <span style={{ color: Colors.gray600, fontSize: isMobile ? 13 : 14 }}>
              {selectedDeviceInfo?.name}（{selectedDeviceInfo?.code}）
            </span>
            <span style={{ color: Colors.gray400, fontSize: 12, marginLeft: 8 }}>
              · {items.length} 项
            </span>
          </div>

          {loadingItems ? (
            <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
          ) : (
            <>
              <List
                dataSource={items}
                renderItem={(item) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isMobile ? 4 : 8 }}>
                        <strong style={{ fontSize: isMobile ? 13 : 14, color: Colors.gray700 }}>{item.name}</strong>
                        <Tag style={{ borderRadius: 4, fontSize: isMobile ? 11 : 12 }}>{item.method}</Tag>
                      </div>
                      <div style={{ fontSize: isMobile ? 11 : 12, color: Colors.gray400, marginBottom: isMobile ? 4 : 8 }}>正常范围：{item.normalRange}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <InputNumber
                          style={{ flex: 1, borderRadius: 6 }}
                          placeholder="输入检测数值"
                          size={isMobile ? 'middle' : 'middle'}
                          value={item.value ? parseFloat(item.value) : undefined}
                          onChange={(v) => handleValueChange(item.id, v ? String(v) : '')}
                        />
                        <Upload beforeUpload={() => false} showUploadList={false}>
                          <Button icon={<CameraOutlined />} style={{ borderRadius: 6 }} size={isMobile ? 'middle' : 'middle'} />
                        </Upload>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
              <Button
                type="primary"
                size={isMobile ? 'middle' : 'large'}
                block
                onClick={handleSubmit}
                loading={submitting}
                style={{ marginTop: isMobile ? 12 : 16, borderRadius: 8, height: isMobile ? 40 : 44 }}
              >
                提交点检结果
              </Button>
              <Button block onClick={handleReset} style={{ marginTop: isMobile ? 6 : 8, borderRadius: 8 }}>取消</Button>
            </>
          )}
        </PageCard>
      )}

      {step === 'result' && (
        <PageCard>
          <Result
            status={result?.triggeredWorkOrderId ? 'warning' : 'success'}
            title={result?.triggeredWorkOrderId ? '发现异常，已自动创建工单' : '点检完成，一切正常'}
            subTitle={result?.triggeredWorkOrderId ? `异常项目已自动生成维修工单` : '所有点检项目均在正常范围内'}
            extra={[
              <Button type="primary" key="back" onClick={handleReset} style={{ borderRadius: 6 }} size={isMobile ? 'middle' : 'middle'}>继续点检</Button>,
              <Button key="list" onClick={() => navigate('/work-orders')} style={{ borderRadius: 6 }} size={isMobile ? 'middle' : 'middle'}>查看工单</Button>,
            ]}
          />
        </PageCard>
      )}
    </div>
  );
}
