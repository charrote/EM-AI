import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Space, Input, Upload, message, List, Tag, Divider,
  Result, Spin, Empty, Descriptions, Row, Col, Steps, Badge, Typography,
  Alert, Statistic,
} from 'antd';
import {
  CameraOutlined, ScanOutlined, OrderedListOutlined, EyeOutlined,
  ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import PageCard from '../components/PageCard';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useDeviceDataSource, useInspectionPlanDataSource } from '../services/dataSource';

const { Text, Title } = Typography;

interface InspectionItem {
  id: string;
  name: string;
  method: string;
  value: string;
  result: 'pass' | 'fail' | 'pending';
  normalRange?: string;
}

// 设备类型 → 备选点检项目映射表（后端无配置时的 fallback）
const typeDefaultItems: Record<string, InspectionItem[]> = {
  CNC: [
    { id: 'cnc-1', name: '主轴温度', method: '测温枪', value: '', result: 'pending', normalRange: '<45°C' },
    { id: 'cnc-2', name: '润滑油位', method: '目视', value: '', result: 'pending', normalRange: '上/下刻度之间' },
    { id: 'cnc-3', name: '切削液浓度', method: '折射仪', value: '', result: 'pending', normalRange: '5-10%' },
    { id: 'cnc-4', name: '气动压力', method: '压力表', value: '', result: 'pending', normalRange: '0.5-0.7MPa' },
    { id: 'cnc-5', name: '安全门开关', method: '手动测试', value: '', result: 'pending', normalRange: '正常' },
  ],
  注塑机: [
    { id: 'inj-1', name: '料筒温度', method: '温控表', value: '', result: 'pending', normalRange: '180-230°C' },
    { id: 'inj-2', name: '液压油位', method: '目视', value: '', result: 'pending', normalRange: '油标中位' },
    { id: 'inj-3', name: '冷却水流量', method: '流量计', value: '', result: 'pending', normalRange: '≥15L/min' },
    { id: 'inj-4', name: '安全光栅', method: '手动测试', value: '', result: 'pending', normalRange: '正常' },
    { id: 'inj-5', name: '模具紧固', method: '目视+扳手', value: '', result: 'pending', normalRange: '无松动' },
  ],
  冲床: [
    { id: 'pch-1', name: '离合器间隙', method: '塞尺', value: '', result: 'pending', normalRange: '0.5-1.0mm' },
    { id: 'pch-2', name: '刹车磨损', method: '目视', value: '', result: 'pending', normalRange: '磨损标记内' },
    { id: 'pch-3', name: '润滑油位', method: '目视', value: '', result: 'pending', normalRange: '油标中位' },
    { id: 'pch-4', name: '安全双按钮', method: '手动测试', value: '', result: 'pending', normalRange: '正常' },
  ],
};

// 通用默认项目
const genericDefaultItems: InspectionItem[] = [
  { id: 'gen-1', name: '润滑油位', method: '目视', value: '', result: 'pending', normalRange: '油位在上下刻度之间' },
  { id: 'gen-2', name: '温度检查', method: '测温枪', value: '', result: 'pending', normalRange: '30-60°C' },
  { id: 'gen-3', name: '振动检测', method: '振动仪', value: '', result: 'pending', normalRange: '<5.0mm/s' },
  { id: 'gen-4', name: '紧固件检查', method: '目视+扳手', value: '', result: 'pending', normalRange: '无松动' },
  { id: 'gen-5', name: '清洁度', method: '目视', value: '', result: 'pending', normalRange: '无油污/异物' },
];

export default function InspectionPage() {
  const navigate = useNavigate();

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

  const loading = devicesLoading || plansLoading;

  // ── Local state ────────────────────────────────────────────
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedDeviceInfo, setSelectedDeviceInfo] = useState<any>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState<'select' | 'inspect' | 'result'>('select');
  const [searchText, setSearchText] = useState('');

  // 设备切换时动态加载点检项目 ────────────────
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
            result: 'pending' as const,
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
      setItems(genericDefaultItems.map((p) => ({ ...p })));
    } catch {
      setItems(genericDefaultItems.map((p) => ({ ...p })));
    }
    setLoadingItems(false);
  }, [devices, plans]);

  useEffect(() => {
    if (selectedDevice) {
      loadInspectionItems(selectedDevice);
    }
  }, [selectedDevice, loadInspectionItems]);

  // 设备搜索过滤
  const filteredDevices = useMemo(() => {
    if (!searchText) return devices;
    return devices.filter((d: any) =>
      d.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      d.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      d.area?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [devices, searchText]);

  const handleValueChange = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, value, result: value ? 'pass' : 'pending' };
      })
    );
  };

  const handleSubmit = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    try {
      const emptyItems = items.filter((item) => !item.value && item.result === 'pending');
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
    setItems([]);
    setStep('select');
    setResult(null);
    setSearchText('');
  };

  // 统计
  const passCount = items.filter((i) => i.result === 'pass').length;
  const failCount = items.filter((i) => i.result === 'fail').length;
  const pendingCount = items.filter((i) => i.result === 'pending').length;

  // 设备列表列定义
  const deviceColumns = [
    {
      title: '设备编码', dataIndex: 'code', key: 'code', width: 120,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    { title: '设备名称', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: '设备类型', dataIndex: 'type', key: 'type', width: 100 },
    { title: '所在区域', dataIndex: 'area', key: 'area', width: 100 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, r: any) => (
        <Button size="small" type="primary" onClick={() => {
          setSelectedDevice(r.id);
        }}>
          开始点检
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* ─── 顶栏 ─── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <EyeOutlined style={{ marginRight: 8, color: Colors.primary }} />
            点检执行
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={refreshDevices}>刷新设备</Button>
            <Button icon={<ReloadOutlined />} onClick={refreshPlans}>刷新计划</Button>
          </Space>
        </Col>
      </Row>

      {/* ─── 步骤条 ─── */}
      <Steps
        current={step === 'select' ? 0 : step === 'inspect' ? 1 : 2}
        style={{ marginBottom: 24 }}
        items={[
          { title: '选择设备' },
          { title: '点检执行' },
          { title: '执行结果' },
        ]}
      />

      {/* ─── Step 1: 选择设备 ─── */}
      {step === 'select' && (
        <Row gutter={[16, 16]}>
          <Col span={16}>
            <Card size="small" styles={{ body: { padding: 0 } }}>
              <div style={{ padding: 16 }}>
                <Space style={{ width: '100%' }}>
                  <Input
                    placeholder="搜索设备名称/编码/区域..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                    allowClear
                    size="middle"
                  />
                  <Button icon={<ScanOutlined />} onClick={() => {
                    // 模拟扫码
                    const randomDevice = devices[Math.floor(Math.random() * devices.length)];
                    if (randomDevice) {
                      setSelectedDevice(randomDevice.id);
                    }
                  }}>扫码点检</Button>
                  {selectedDeviceInfo && (
                    <Tag color={Colors.primary}>
                      已选择：{selectedDeviceInfo.name}（{selectedDeviceInfo.code}）
                    </Tag>
                  )}
                </Space>
              </div>
              <Table
                columns={deviceColumns}
                dataSource={filteredDevices}
                rowKey="id"
                loading={loading}
                size="small"
                scroll={{ x: 800 }}
                pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 台` }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="快速统计" size="small">
              <Row gutter={8}>
                <Col span={12}>
                  <Statistic title="设备总数" value={devices.length} valueStyle={{ fontSize: 24 }} />
                </Col>
                <Col span={12}>
                  <Statistic title="今日已点检" value={Math.floor(Math.random() * 10) + 5} valueStyle={{ fontSize: 24, color: Colors.success }} />
                </Col>
              </Row>
            </Card>
            <Card title="扫码点检" size="small" style={{ marginTop: 16 }}>
              <div style={{ textAlign: 'center', padding: 20 }}>
                <ScanOutlined style={{ fontSize: 48, color: Colors.primary }} />
                <div style={{ marginTop: 12, color: Colors.gray400, fontSize: 13 }}>
                  点击按钮模拟扫描设备二维码
                </div>
              </div>
              <Button type="primary" block icon={<ScanOutlined />} onClick={() => {
                const randomDevice = devices[Math.floor(Math.random() * devices.length)];
                if (randomDevice) {
                  setSelectedDevice(randomDevice.id);
                }
              }} style={{ borderRadius: 6 }}>模拟扫码</Button>
            </Card>
          </Col>
        </Row>
      )}

      {/* ─── Step 2: 点检执行 ─── */}
      {step === 'inspect' && selectedDeviceInfo && (
        <Card size="small" styles={{ body: { padding: 24 } }}>
          {/* 设备信息 */}
          <Descriptions
            bordered
            size="small"
            column={{ xs: 2, sm: 3, md: 4 }}
            style={{ marginBottom: 24 }}
          >
            <Descriptions.Item label="设备编码">{selectedDeviceInfo.code}</Descriptions.Item>
            <Descriptions.Item label="设备名称">{selectedDeviceInfo.name}</Descriptions.Item>
            <Descriptions.Item label="设备类型">{selectedDeviceInfo.type}</Descriptions.Item>
            <Descriptions.Item label="所在区域">{selectedDeviceInfo.area}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Tag>{selectedDeviceInfo.status}</Tag>
            </Descriptions.Item>
          </Descriptions>

          {/* 点检项目 */}
          {loadingItems ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Spin />
            </div>
          ) : (
            <>
              {/* 统计条 */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: 12, background: Colors.gray50, borderRadius: 8 }}>
                <div>
                  <Text type="secondary">总项：</Text>
                  <Text strong>{items.length}</Text>
                </div>
                <div>
                  <Text type="secondary">通过：</Text>
                  <Text strong style={{ color: Colors.success }}>{passCount}</Text>
                </div>
                <div>
                  <Text type="secondary">异常：</Text>
                  <Text strong style={{ color: Colors.danger }}>{failCount}</Text>
                </div>
                <div>
                  <Text type="secondary">待填：</Text>
                  <Text strong style={{ color: Colors.warning }}>{pendingCount}</Text>
                </div>
              </div>

              <Table
                dataSource={items}
                rowKey="id"
                size="small"
                pagination={false}
                scroll={{ x: 800 }}
                columns={[
                  {
                    title: '序号', dataIndex: 'id', key: 'index', width: 60,
                    render: (_: any, __: any, index: number) => <Text type="secondary">{index + 1}</Text>,
                  },
                  {
                    title: '点检项目', dataIndex: 'name', key: 'name',
                    render: (v: string) => <Text strong>{v}</Text>,
                  },
                  {
                    title: '检测方法', dataIndex: 'method', key: 'method', width: 100,
                    render: (v: string) => <Tag>{v}</Tag>,
                  },
                  {
                    title: '正常范围', dataIndex: 'normalRange', key: 'normalRange', width: 140,
                    render: (v: string) => <Text type="secondary">{v}</Text>,
                  },
                  {
                    title: '检测值', key: 'value', width: 200,
                    render: (_: any, record: InspectionItem) => (
                      <Space size={8}>
                        <Input
                          placeholder="输入检测数值"
                          value={record.value}
                          onChange={(e) => handleValueChange(record.id, e.target.value)}
                          style={{ borderRadius: 6 }}
                        />
                        <Upload beforeUpload={() => false} showUploadList={false}>
                          <Button icon={<CameraOutlined />} style={{ borderRadius: 6 }} />
                        </Upload>
                      </Space>
                    ),
                  },
                ]}
              />

              {/* 提交按钮 */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <Button onClick={handleReset}>取消</Button>
                <Button onClick={handleSubmit} loading={submitting} type="primary" style={{ borderRadius: 6 }}>
                  提交点检结果
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ─── Step 3: 执行结果 ─── */}
      {step === 'result' && result && (
        <Card size="small">
          <Result
            status={result?.triggeredWorkOrderId ? 'warning' : 'success'}
            title={result?.triggeredWorkOrderId ? '发现异常，已自动创建工单' : '点检完成，一切正常'}
            subTitle={result?.triggeredWorkOrderId ? `异常项目已自动生成维修工单` : '所有点检项目均在正常范围内'}
            extra={[
              <Button type="primary" key="back" onClick={handleReset} style={{ borderRadius: 6 }}>继续点检</Button>,
              <Button key="list" onClick={() => navigate('/work-orders')} style={{ borderRadius: 6 }}>查看工单</Button>,
            ]}
          >
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="设备">{selectedDeviceInfo?.name}</Descriptions.Item>
              <Descriptions.Item label="点检项目数">{items.length}</Descriptions.Item>
              <Descriptions.Item label="通过项数">{passCount}</Descriptions.Item>
              <Descriptions.Item label="异常项数">{failCount}</Descriptions.Item>
            </Descriptions>
          </Result>
        </Card>
      )}
    </div>
  );
}