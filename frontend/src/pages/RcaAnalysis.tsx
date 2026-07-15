// @ts-nocheck - Complex component with many dynamic data types
import { useState, useCallback, useMemo } from 'react';
import {
  Card, Button, Space, Typography, Row, Col, Steps, Input, Form,
  message, Tag, Empty, Divider, Alert, Result, Modal, Select, List,
  Descriptions, Tabs, InputNumber,
} from 'antd';
import {
  NodeIndexOutlined, PlusOutlined, ReloadOutlined,
  QuestionCircleOutlined, BulbOutlined, CheckCircleOutlined,
  HistoryOutlined, ApiOutlined, BarChartOutlined,
} from '@ant-design/icons';
import ReactECharts from '../components/ReactECharts';
import api from '../services/api';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useRcaDataSource } from '../services/dataSource';
import type { EChartsOption } from 'echarts';

const { Text, Title, Paragraph } = Typography;

interface RcaItem {
  id: string;
  workOrderId: string | null;
  deviceId: string;
  title: string;
  problemDesc: string;
  whyChain: { level: number; question: string; answer: string }[];
  fishboneData: Record<string, any>;
  rootCause: string | null;
  improvement: string | null;
  status: string;
  createdAt: string;
}

const FISHBONE_CATEGORIES = [
  { key: 'man', label: '人 (Man)', color: Colors.danger },
  { key: 'machine', label: '机 (Machine)', color: Colors.primary },
  { key: 'material', label: '料 (Material)', color: Colors.warning },
  { key: 'method', label: '法 (Method)', color: Colors.success },
  { key: 'measure', label: '测 (Measure)', color: '#8B5CF6' },
  { key: 'environment', label: '环 (Environment)', color: '#06B6D4' },
];

const WHY_QUESTIONS = [
  '为什么会发生这个问题？',
  '为什么会是这个原因？',
  '这个原因的根本因素是什么？',
  '还有更深层的原因吗？',
  '再深一层，真正根源是什么？',
];

export default function RcaAnalysis() {
  const {
    data: analyses,
    loading,
    refresh: fetchData,
  } = useRcaDataSource();

  const [activeTab, setActiveTab] = useState('new');
  const [selectedAnalysis, setSelectedAnalysis] = useState<RcaItem | null>(null);
  const { isMobile } = useResponsive();

  // New analysis form
  const [problemDesc, setProblemDesc] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [title, setTitle] = useState('');
  const [whyChain, setWhyChain] = useState<{ level: number; question: string; answer: string }[]>([]);
  const [currentWhyLevel, setCurrentWhyLevel] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');

  // Fishbone
  const [fishboneData, setFishboneData] = useState<Record<string, string[]>>({});
  const [fishboneInputs, setFishboneInputs] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'why' | 'fishbone' | 'result'>('why');

  // Result
  const [rootCause, setRootCause] = useState('');
  const [improvement, setImprovement] = useState('');
  const [rcaId, setRcaId] = useState<string | null>(null);

  // ── 5-Why 分析 ────────────────────────────────
  const resetAnalysis = () => {
    setProblemDesc('');
    setDeviceId('');
    setTitle('');
    setWhyChain([]);
    setCurrentWhyLevel(0);
    setCurrentAnswer('');
    setFishboneData({});
    setFishboneInputs({});
    setRootCause('');
    setImprovement('');
    setRcaId(null);
    setStep('why');
  };

  const handleStartAnalysis = async () => {
    if (!problemDesc.trim() || !title.trim()) {
      message.warning('请输入问题描述和分析标题');
      return;
    }
    try {
      const res = await api.post('/rca', {
        title: title.trim(),
        deviceId: deviceId || 'unknown',
        problemDesc: problemDesc.trim(),
        whyChain: [],
        fishboneData: {},
      });
      setRcaId(res.data.data.id);
      setCurrentWhyLevel(0);
      setWhyChain([]);
      message.success('RCA 分析已创建');
    } catch {
      message.error('创建分析失败');
    }
  };

  const handleAddWhy = () => {
    if (!currentAnswer.trim()) {
      message.warning('请输入回答');
      return;
    }
    const newItem = {
      level: currentWhyLevel + 1,
      question: WHY_QUESTIONS[currentWhyLevel] || `第 ${currentWhyLevel + 1} 层追问`,
      answer: currentAnswer.trim(),
    };
    const updatedChain = [...whyChain, newItem];
    setWhyChain(updatedChain);
    setCurrentAnswer('');
    setCurrentWhyLevel(currentWhyLevel + 1);

    // Save to backend
    if (rcaId) {
      api.put(`/rca/${rcaId}`, { whyChain: updatedChain }).catch(() => {});
    }
  };

  const handleCompleteWhy = () => {
    setStep('fishbone');
  };

  // ── 鱼骨图 ────────────────────────────────────
  const addFishboneItem = (category: string) => {
    const val = fishboneInputs[category]?.trim();
    if (!val) return;
    const updated = { ...fishboneData };
    if (!updated[category]) updated[category] = [];
    updated[category] = [...updated[category], val];
    setFishboneData(updated);
    setFishboneInputs({ ...fishboneInputs, [category]: '' });

    if (rcaId) {
      api.put(`/rca/${rcaId}`, { fishboneData: updated }).catch(() => {});
    }
  };

  const removeFishboneItem = (category: string, index: number) => {
    const updated = { ...fishboneData };
    updated[category] = updated[category].filter((_: any, i: number) => i !== index);
    setFishboneData(updated);
    if (rcaId) {
      api.put(`/rca/${rcaId}`, { fishboneData: updated }).catch(() => {});
    }
  };

  // ── 完成 ──────────────────────────────────────
  const handleComplete = async () => {
    if (!rootCause.trim() || !improvement.trim()) {
      message.warning('请输入根本原因和改善对策');
      return;
    }
    try {
      if (rcaId) {
        await api.put(`/rca/${rcaId}`, {
          rootCause: rootCause.trim(),
          improvement: improvement.trim(),
          status: 'completed',
        });
        message.success('RCA 分析完成');
        resetAnalysis();
        fetchData();
        setActiveTab('history');
      }
    } catch {
      message.error('保存失败');
    }
  };

  // ── ECharts Fishbone Visualization ────────────
  const fishboneChartOption = useMemo(() => {
    const categories = FISHBONE_CATEGORIES;
    const w = isMobile ? 480 : 700;
    const h = isMobile ? 300 : 400;
    const spineY = h / 2;
    const spineStartX = 60;
    const spineEndX = w - 40;
    const spineLen = spineEndX - spineStartX;

    // Build graphic elements
    const elements: any[] = [];

    // 1. Spine (main horizontal line)
    elements.push({
      type: 'line',
      shape: { x1: spineStartX, y1: spineY, x2: spineEndX, y2: spineY },
      style: { lineWidth: 3, stroke: Colors.gray600 },
    });

    // 2. Arrowhead
    elements.push({
      type: 'polygon',
      shape: {
        points: [
          [spineEndX, spineY],
          [spineEndX - 10, spineY - 5],
          [spineEndX - 10, spineY + 5],
        ],
      },
      style: { fill: Colors.gray600 },
    });

    // 3. Problem label at spine head
    elements.push({
      type: 'text',
      shape: { x: spineEndX - 15, y: spineY - 20 },
      style: {
        text: '问题',
        fontSize: 12,
        fontWeight: 'bold',
        fill: Colors.danger,
        textAlign: 'center',
      },
    });

    // 4. Bones & items — 3 above, 3 below
    const boneCount = categories.length;
    const boneSpacing = spineLen / (boneCount + 1);

    categories.forEach((cat, i) => {
      const boneX = spineStartX + boneSpacing * (i + 1);
      const isAbove = i < 3;
      const boneEndY = isAbove ? spineY - 80 : spineY + 80;

      // Bone line (diagonal)
      const cpX = boneX + (isAbove ? -20 : 20);
      const cpY = (spineY + boneEndY) / 2;

      elements.push({
        type: 'line',
        shape: { x1: boneX, y1: spineY, x2: boneX, y2: boneEndY },
        style: { lineWidth: 2, stroke: cat.color, lineDash: [4, 3] },
      });

      // Small diamond at spine junction
      elements.push({
        type: 'circle',
        shape: { cx: boneX, cy: spineY, r: 3 },
        style: { fill: cat.color },
      });

      // Category label
      elements.push({
        type: 'text',
        shape: { x: boneX, y: boneEndY + (isAbove ? -10 : 14) },
        style: {
          text: cat.label.split(' ')[0],
          fontSize: 11,
          fontWeight: 'bold',
          fill: cat.color,
          textAlign: 'center',
        },
      });

      // Items along the bone
      const items = (fishboneData[cat.key] || []) as string[];
      const itemCount = items.length;
      if (itemCount > 0) {
        items.forEach((item, j) => {
          const t = (j + 1) / (itemCount + 1);
          const ix = boneX + (isAbove ? -1 : 1) * 20 * (1 - t);
          const iy = spineY + (boneEndY - spineY) * t;
          const clampedIx = Math.max(spineStartX + 10, Math.min(spineEndX - 20, ix));

          // Dot
          elements.push({
            type: 'circle',
            shape: { cx: clampedIx, cy: iy, r: 4 },
            style: { fill: cat.color, opacity: 0.8 },
          });

          // Label (truncated)
          const label = item.length > 8 ? item.slice(0, 8) + '…' : item;
          elements.push({
            type: 'text',
            shape: {
              x: clampedIx + (isAbove ? 8 : -8),
              y: iy + 4,
            },
            style: {
              text: label,
              fontSize: 9,
              fill: Colors.gray700,
              textAlign: isAbove ? 'left' : 'right',
            },
          });
        });
      }
    });

    return {
      graphic: { elements, $action: 'replace' },
      xAxis: { show: false, min: 0, max: w },
      yAxis: { show: false, min: 0, max: h },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      series: [{ type: 'scatter', data: [] }],
      tooltip: {
        formatter: () => {
          let html = '<b>鱼骨图分析</b><br/>';
          categories.forEach(c => {
            const items = (fishboneData[c.key] || []) as string[];
            if (items.length > 0) {
              html += `<b style="color:${c.color}">${c.label}:</b> ${items.join(', ')}<br/>`;
            }
          });
          return html;
        },
      },
    };
  }, [fishboneData, isMobile]);

  const historyFishboneChartOption = useMemo(() => {
    if (!selectedAnalysis?.fishboneData) return null;
    const histData = selectedAnalysis.fishboneData as Record<string, string[]>;
    const categories = FISHBONE_CATEGORIES;
    const w = isMobile ? 480 : 700;
    const h = isMobile ? 300 : 400;
    const spineY = h / 2;
    const spineStartX = 60;
    const spineEndX = w - 40;
    const spineLen = spineEndX - spineStartX;

    const elements: any[] = [];

    elements.push({
      type: 'line',
      shape: { x1: spineStartX, y1: spineY, x2: spineEndX, y2: spineY },
      style: { lineWidth: 3, stroke: Colors.gray600 },
    });

    elements.push({
      type: 'polygon',
      shape: {
        points: [
          [spineEndX, spineY],
          [spineEndX - 10, spineY - 5],
          [spineEndX - 10, spineY + 5],
        ],
      },
      style: { fill: Colors.gray600 },
    });

    elements.push({
      type: 'text',
      shape: { x: spineEndX - 15, y: spineY - 20 },
      style: {
        text: '问题',
        fontSize: 12,
        fontWeight: 'bold',
        fill: Colors.danger,
        textAlign: 'center',
      },
    });

    const boneCount = categories.length;
    const boneSpacing = spineLen / (boneCount + 1);

    categories.forEach((cat, i) => {
      const boneX = spineStartX + boneSpacing * (i + 1);
      const isAbove = i < 3;
      const boneEndY = isAbove ? spineY - 80 : spineY + 80;

      elements.push({
        type: 'line',
        shape: { x1: boneX, y1: spineY, x2: boneX, y2: boneEndY },
        style: { lineWidth: 2, stroke: cat.color, lineDash: [4, 3] },
      });

      elements.push({
        type: 'circle',
        shape: { cx: boneX, cy: spineY, r: 3 },
        style: { fill: cat.color },
      });

      elements.push({
        type: 'text',
        shape: { x: boneX, y: boneEndY + (isAbove ? -10 : 14) },
        style: {
          text: cat.label.split(' ')[0],
          fontSize: 11,
          fontWeight: 'bold',
          fill: cat.color,
          textAlign: 'center',
        },
      });

      const items = (histData[cat.key] || []) as string[];
      const itemCount = items.length;
      if (itemCount > 0) {
        items.forEach((item, j) => {
          const t = (j + 1) / (itemCount + 1);
          const ix = boneX + (isAbove ? -1 : 1) * 20 * (1 - t);
          const iy = spineY + (boneEndY - spineY) * t;
          const clampedIx = Math.max(spineStartX + 10, Math.min(spineEndX - 20, ix));

          elements.push({
            type: 'circle',
            shape: { cx: clampedIx, cy: iy, r: 4 },
            style: { fill: cat.color, opacity: 0.8 },
          });

          const label = item.length > 8 ? item.slice(0, 8) + '…' : item;
          elements.push({
            type: 'text',
            shape: {
              x: clampedIx + (isAbove ? 8 : -8),
              y: iy + 4,
            },
            style: {
              text: label,
              fontSize: 9,
              fill: Colors.gray700,
              textAlign: isAbove ? 'left' : 'right',
            },
          });
        });
      }
    });

    return {
      graphic: { elements, $action: 'replace' },
      xAxis: { show: false, min: 0, max: w },
      yAxis: { show: false, min: 0, max: h },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      series: [{ type: 'scatter', data: [] }],
      tooltip: {
        formatter: () => {
          let html = '<b>鱼骨图分析</b><br/>';
          categories.forEach(c => {
            const items = (histData[c.key] || []) as string[];
            if (items.length > 0) {
              html += `<b style="color:${c.color}">${c.label}:</b> ${items.join(', ')}<br/>`;
            }
          });
          return html;
        },
      },
    };
  }, [selectedAnalysis?.fishboneData, isMobile]);

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <NodeIndexOutlined style={{ marginRight: 8 }} />
            根因分析 RCA
          </Title>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            <Button icon={<PlusOutlined />} onClick={() => { resetAnalysis(); setActiveTab('new'); }}>新建分析</Button>
          </Space>
        </Col>
      </Row>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ padding: '0 16px', marginBottom: 0 }}
          items={[
            {
              key: 'new',
              label: <span><ApiOutlined /> 新分析</span>,
              children: (
                <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
                  {/* Step 0: Define problem */}
                  {!rcaId && (
                    <div>
                      <Alert
                        type="info"
                        showIcon
                        title="RCA 根因分析"
                        description="通过 5-Why 追问和鱼骨图分析，找到问题的根本原因并制定改善对策。"
                        style={{ marginBottom: 24 }}
                      />

                      <Form layout="vertical">
                        <Form.Item label="分析标题" required>
                          <Input
                            placeholder="如: CNC-01 主轴异响根因分析"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                          />
                        </Form.Item>
                        <Form.Item label="问题描述" required>
                          <Input.TextArea
                            rows={3}
                            placeholder="描述具体的问题现象..."
                            value={problemDesc}
                            onChange={e => setProblemDesc(e.target.value)}
                          />
                        </Form.Item>
                        <Form.Item label="设备 ID">
                          <Input
                            placeholder="可选"
                            value={deviceId}
                            onChange={e => setDeviceId(e.target.value)}
                          />
                        </Form.Item>
                        <Button type="primary" onClick={handleStartAnalysis} icon={<QuestionCircleOutlined />}>
                          开始 5-Why 分析
                        </Button>
                      </Form>
                    </div>
                  )}

                  {/* Step 1: 5-Why */}
                  {rcaId && whyChain.length < 5 && (
                    <div>
                      <Steps
                        current={currentWhyLevel}
                        size="small"
                        style={{ marginBottom: 24 }}
                        items={Array.from({ length: 5 }, (_, i) => ({
                          title: `Why ${i + 1}`,
                          status: i < whyChain.length ? 'finish' : i === currentWhyLevel ? 'process' : 'wait',
                        }))}
                      />

                      {/* Previous answers */}
                      {whyChain.map((w, i) => (
                        <Alert
                          key={i}
                          type="success"
                          showIcon
                          style={{ marginBottom: 8 }}
                          title={
                            <div>
                              <Text strong>Q{w.level}: </Text>
                              <Text>{w.question}</Text>
                              <br />
                              <Text strong>A: </Text>
                              <Text>{w.answer}</Text>
                            </div>
                          }
                        />
                      ))}

                      <Divider />
                      <div style={{ padding: '16px 0' }}>
                        <Paragraph strong style={{ fontSize: 16, color: Colors.primary }}>
                          {WHY_QUESTIONS[currentWhyLevel]}
                        </Paragraph>
                        <Input.TextArea
                          rows={2}
                          placeholder="输入您的回答..."
                          value={currentAnswer}
                          onChange={e => setCurrentAnswer(e.target.value)}
                          onPressEnter={handleAddWhy}
                          style={{ marginBottom: 12 }}
                        />
                        <Space>
                          <Button type="primary" onClick={handleAddWhy} icon={<QuestionCircleOutlined />}>
                            提交回答
                          </Button>
                          {currentWhyLevel >= 2 && (
                            <Button onClick={handleCompleteWhy}>
                              进入鱼骨图分析
                            </Button>
                          )}
                        </Space>
                      </div>
                    </div>
                  )}

                  {/* Step 1b: All 5 whys done */}
                  {rcaId && whyChain.length >= 5 && step === 'why' && (
                    <div>
                      <Result
                        status="success"
                        title="5-Why 分析完成"
                        subTitle="现在进行鱼骨图分析，从多维度查找根因"
                        extra={
                          <Button type="primary" onClick={() => setStep('fishbone')}>
                            进入鱼骨图分析
                          </Button>
                        }
                      />
                      <Divider>5-Why 分析结果</Divider>
                      {whyChain.map((w, i) => (
                        <div key={i} style={{ marginBottom: 8, padding: '8px 12px', background: Colors.gray50, borderRadius: 6 }}>
                          <Text strong style={{ color: Colors.primary }}>Why {w.level}: </Text>
                          <Text>{w.question}</Text>
                          <br />
                          <Text strong>→ </Text>
                          <Text>{w.answer}</Text>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Fishbone section */}
                  {rcaId && step === 'fishbone' && (
                    <div>
                      <Title level={5} style={{ marginBottom: 16 }}>
                        <BarChartOutlined /> 鱼骨图分析 (Ishikawa)
                      </Title>
                      <Paragraph type="secondary">
                        从人/机/料/法/环/测六个维度分析可能的根本原因
                      </Paragraph>

                      {/* Visual Fishbone Chart */}
                      <Card size="small" style={{ marginBottom: 16, background: Colors.gray50 }}>
                        <ReactECharts option={fishboneChartOption} notMerge style={{ height: isMobile ? 320 : 420 }} />
                      </Card>

                      {/* Input cards */}
                      <Row gutter={[12, 12]}>
                        {FISHBONE_CATEGORIES.map(cat => (
                          <Col xs={24} sm={12} key={cat.key}>
                            <Card
                              size="small"
                              title={<Text style={{ color: cat.color }}>{cat.label}</Text>}
                              styles={{ body: { padding: '8px 12px' } }}
                            >
                              {/* Items */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                                {(fishboneData[cat.key] || []).map((item, idx) => (
                                  <Tag
                                    key={idx}
                                    closable
                                    onClose={() => removeFishboneItem(cat.key, idx)}
                                    color={cat.color}
                                    style={{ borderRadius: 4, border: 'none', margin: 0 }}
                                  >
                                    {item}
                                  </Tag>
                                ))}
                                {(fishboneData[cat.key] || []).length === 0 && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>暂无原因</Text>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Input
                                  size="small"
                                  placeholder="添加原因..."
                                  value={fishboneInputs[cat.key] || ''}
                                  onChange={e => setFishboneInputs({ ...fishboneInputs, [cat.key]: e.target.value })}
                                  onPressEnter={() => addFishboneItem(cat.key)}
                                  style={{ flex: 1 }}
                                />
                                <Button size="small" type="primary" ghost onClick={() => addFishboneItem(cat.key)}>添加</Button>
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>

                      <Divider />
                      <div style={{ textAlign: 'center' }}>
                        <Button
                          type="primary"
                          onClick={() => setStep('result')}
                          icon={<CheckCircleOutlined />}
                        >
                          完成根因分析，制定改善对策
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Result section */}
                  {rcaId && step === 'result' && (
                    <div>
                      <Title level={5}>总结与改善</Title>
                      <Form layout="vertical">
                        <Form.Item label="根本原因" required>
                          <Input.TextArea
                            rows={3}
                            placeholder="综合 5-Why 和鱼骨图分析，总结根本原因..."
                            value={rootCause}
                            onChange={e => setRootCause(e.target.value)}
                          />
                        </Form.Item>
                        <Form.Item label="改善对策" required>
                          <Input.TextArea
                            rows={3}
                            placeholder="制定具体的改善对策..."
                            value={improvement}
                            onChange={e => setImprovement(e.target.value)}
                          />
                        </Form.Item>

                        <Divider />
                        <h4>5-Why 分析链</h4>
                        {whyChain.map((w, i) => (
                          <div key={i} style={{ marginBottom: 4, padding: '4px 8px', background: Colors.gray50, borderRadius: 4 }}>
                            <Text strong>Q{w.level}: </Text><Text>{w.question}</Text>
                            <br />
                            <Text style={{ marginLeft: 20 }}>→ {w.answer}</Text>
                          </div>
                        ))}

                        <Divider />
                        <h4>鱼骨图分析</h4>
                        {FISHBONE_CATEGORIES.map(cat => {
                          const items = fishboneData[cat.key] || [];
                          if (items.length === 0) return null;
                          return (
                            <div key={cat.key} style={{ marginBottom: 4 }}>
                              <Text strong style={{ color: cat.color }}>{cat.label}: </Text>
                              <Text>{items.join(', ')}</Text>
                            </div>
                          );
                        })}

                        <div style={{ textAlign: 'right', marginTop: 16 }}>
                          <Button type="primary" size="large" onClick={handleComplete} icon={<CheckCircleOutlined />}>
                            完成 RCA 分析
                          </Button>
                        </div>
                      </Form>
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'history',
              label: <span><HistoryOutlined /> 历史分析</span>,
              children: (
                <div style={{ padding: 24 }}>
                  {analyses.length === 0 ? (
                    <Empty description="暂无 RCA 分析记录" />
                  ) : (
                    <Row gutter={[12, 12]}>
                      {analyses.map(a => (
                        <Col xs={24} sm={12} md={8} key={a.id}>
                          <Card
                            size="small"
                            title={<Text strong ellipsis style={{ maxWidth: 200 }}>{a.title}</Text>}
                            extra={
                              a.status === 'completed'
                                ? <Tag color={Colors.success}>已完成</Tag>
                                : <Tag color={Colors.warning}>草稿</Tag>
                            }
                            onClick={() => setSelectedAnalysis(a)}
                            style={{ cursor: 'pointer' }}
                            hoverable
                          >
                            <Text type="secondary" ellipsis style={{ display: 'block', marginBottom: 8 }}>
                              {a.problemDesc}
                            </Text>
                            <Space size="small">
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                5-Why: {a.whyChain?.length || 0} 层
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {new Date(a.createdAt).toLocaleDateString()}
                              </Text>
                            </Space>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}

                  {/* Detail Modal */}
                  <Modal
                    title={selectedAnalysis?.title}
                    open={!!selectedAnalysis}
                    onCancel={() => setSelectedAnalysis(null)}
                    footer={null}
                    width={640}
                  >
                    {selectedAnalysis && (
                      <Descriptions column={1} size="small" bordered>
                        <Descriptions.Item label="问题描述">{selectedAnalysis.problemDesc}</Descriptions.Item>
                        <Descriptions.Item label="根本原因">{selectedAnalysis.rootCause || '未完成'}</Descriptions.Item>
                        <Descriptions.Item label="改善对策">{selectedAnalysis.improvement || '未完成'}</Descriptions.Item>
                        <Descriptions.Item label="状态">
                          {selectedAnalysis.status === 'completed'
                            ? <Tag color={Colors.success}>已完成</Tag>
                            : <Tag color={Colors.warning}>草稿</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="创建时间">{new Date(selectedAnalysis.createdAt).toLocaleString()}</Descriptions.Item>
                      </Descriptions>
                    )}

                    {selectedAnalysis?.whyChain && selectedAnalysis.whyChain.length > 0 && (
                      <>
                        <Divider>5-Why 分析链</Divider>
                        {selectedAnalysis.whyChain.map((w, i) => (
                          <div key={i} style={{ marginBottom: 8, padding: '8px 12px', background: Colors.gray50, borderRadius: 6 }}>
                            <Text strong style={{ color: Colors.primary }}>Why {w.level}: </Text>
                            <Text>{w.question}</Text>
                            <br />
                            <Text strong>→ </Text>
                            <Text>{w.answer}</Text>
                          </div>
                        ))}
                      </>
                    )}

                    {selectedAnalysis?.fishboneData && historyFishboneChartOption && (
                      <>
                        <Divider>鱼骨图分析</Divider>
                        <Card size="small" style={{ marginBottom: 16, background: Colors.gray50 }}>
                          <ReactECharts option={historyFishboneChartOption} notMerge style={{ height: isMobile ? 320 : 420 }} />
                        </Card>
                        {FISHBONE_CATEGORIES.map(cat => {
                          const items = (selectedAnalysis.fishboneData as Record<string, string[]>)[cat.key] || [];
                          if (items.length === 0) return null;
                          return (
                            <div key={cat.key} style={{ marginBottom: 4 }}>
                              <Text strong style={{ color: cat.color }}>{cat.label}: </Text>
                              <Text>{items.join(', ')}</Text>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </Modal>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
