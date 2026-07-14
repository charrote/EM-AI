import { useState, useRef, useCallback } from 'react';
import { Input, Button, Tag, Space, Typography, message as antMsg, Spin, Tooltip, Alert } from 'antd';
import {
  SoundOutlined, StopOutlined, SendOutlined,
  RobotOutlined, BugOutlined, ToolOutlined,
  CheckCircleOutlined, ThunderboltOutlined,
  ExperimentOutlined, FireOutlined, CloudOutlined,
  QuestionCircleOutlined, CloseOutlined,
  LoadingOutlined, SearchOutlined, DashboardOutlined,
} from '@ant-design/icons';
import { Colors } from '../styles/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { useDeviceDataSource } from '../services/dataSource';

const { Text } = Typography;
const { TextArea } = Input;

interface ParsedResult {
  deviceName: string;
  faultPhenomenon: string[];
  urgency: string;
  estimatedFaultType: string;
  confidence: number;
  raw?: string;
  urgencyReason?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'system';
  text?: string;
  data?: ParsedResult;
  status?: 'loading' | 'result' | 'error';
  error?: string;
}

type ParseStep = 'semantic' | 'device' | 'fault' | 'urgency' | null;

const stepSequence: { key: ParseStep; label: string }[] = [
  { key: 'semantic', label: '语义分析中...' },
  { key: 'device', label: '设备匹配中...' },
  { key: 'fault', label: '故障识别中...' },
  { key: 'urgency', label: '紧急评估中...' },
];

const faultTypeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  '机械': { icon: <ToolOutlined />, color: Colors.dangerLight },
  '电气': { icon: <ThunderboltOutlined />, color: Colors.info },
  '液压': { icon: <ExperimentOutlined />, color: '#06B6D4' },
  '气动': { icon: <FireOutlined />, color: '#8B5CF6' },
  '软件': { icon: <CloudOutlined />, color: '#6366F1' },
};

const urgencyConfig: Record<string, { label: string; color: string }> = {
  '高': { label: '高 - 紧急', color: '#DC2626' },
  '中': { label: '中 - 关注', color: '#F59E0B' },
  '低': { label: '低 - 观察', color: '#16A34A' },
};

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const demoTips = [
  '老大，3号产线的那个电机声音不对劲，好像有点刺耳，可能转不动了。',
  '2号空压机温度一直降不下来，已经80度了，报警灯亮了。',
  '5号线传送带有异响，跑偏严重，产品都堆起来了。',
];

// ── 模拟 LLM 解析 ─────────────────────────────────
const devicePatterns = [
  { keywords: ['电机', '马达', 'motor'], name: '驱动电机', faultType: '机械' as const },
  { keywords: ['空压机', '压缩机', '压缩机'], name: '空压机', faultType: '机械' as const },
  { keywords: ['传送带', '输送带', '皮带'], name: '传送带', faultType: '机械' as const },
  { keywords: ['泵', '水泵', '油泵'], name: '水泵', faultType: '液压' as const },
  { keywords: ['风机', '风扇', '鼓风机'], name: '风机', faultType: '机械' as const },
  { keywords: ['轴承'], name: '轴承', faultType: '机械' as const },
  { keywords: ['减速机', '齿轮箱'], name: '减速机', faultType: '机械' as const },
  { keywords: ['气缸'], name: '气缸', faultType: '气动' as const },
  { keywords: ['阀', '阀门', '电磁阀'], name: '阀门', faultType: '气动' as const },
  { keywords: ['plc', '控制器', '控制柜'], name: '控制器', faultType: '电气' as const },
  { keywords: ['传感器', '感应器'], name: '传感器', faultType: '电气' as const },
  { keywords: ['屏幕', '显示器', '触摸屏', 'hmi'], name: '触摸屏', faultType: '软件' as const },
];

const phenomenonMap: { keywords: string[]; label: string }[] = [
  { keywords: ['声音', '异响', '噪音', '刺耳', '响'], label: '异响' },
  { keywords: ['温度', '发热', '发烫', '高温', '降不下来'], label: '温度过高' },
  { keywords: ['震动', '抖动', '振动', '摇晃'], label: '异常震动' },
  { keywords: ['跑偏', '偏移', '不正'], label: '运行跑偏' },
  { keywords: ['报警', '红灯', '报警灯'], label: '报警提示' },
  { keywords: ['不动', '转不动', '卡住', '卡死', '堵转', '停'], label: '无法运转' },
  { keywords: ['漏', '泄漏', '漏油', '漏水', '漏气'], label: '泄漏' },
  { keywords: ['冒烟', '烧', '火花'], label: '冒烟/火花' },
  { keywords: ['慢', '降速', '转速'], label: '转速异常' },
  { keywords: ['堆', '堆积', '堵塞'], label: '物料堆积' },
  { keywords: ['不准', '误差', '偏差'], label: '精度偏差' },
  { keywords: ['代码', '死机', '卡顿', '蓝屏', '重启'], label: '软件异常' },
];

function mockParse(text: string): Promise<ParsedResult> {
  const lower = text.toLowerCase();

  const matchedDevice = devicePatterns.find((d) =>
    d.keywords.some((kw) => lower.includes(kw)),
  );
  const lineMatch = text.match(/(\d+)[号#]?产?线?/);
  const deviceName = lineMatch
    ? `${lineMatch[1]}号生产线${matchedDevice?.name || '设备'}`
    : (matchedDevice?.name || '未知设备');

  const phenomena: string[] = [];
  for (const p of phenomenonMap) {
    if (p.keywords.some((kw) => lower.includes(kw))) {
      phenomena.push(p.label);
    }
  }
  if (phenomena.length === 0) {
    phenomena.push('运行异常');
  }

  const urgentWords = ['不动', '卡住', '冒烟', '烧', '停产', '紧急', '停', '报警', '堆', '刺耳'];
  const lowWords = ['好像', '可能', '偶尔', '轻微', '有点'];
  let urgency: '高' | '中' | '低' = '中';
  let urgencyReason = '';
  if (urgentWords.some((w) => lower.includes(w))) {
    urgency = '高';
    if (lower.includes('转不动') || lower.includes('卡住') || lower.includes('卡死')) {
      urgencyReason = '检测到"转不动"语义，设备可能卡死，风险等级高';
    } else if (lower.includes('冒烟') || lower.includes('烧')) {
      urgencyReason = '检测到"冒烟/烧毁"语义，存在安全风险';
    } else if (lower.includes('报警')) {
      urgencyReason = '设备报警触发，需及时处理';
    } else if (lower.includes('堆')) {
      urgencyReason = '物料堆积，可能影响产线运行';
    } else if (lower.includes('刺耳')) {
      urgencyReason = '异常噪音（刺耳），可能存在机械严重磨损';
    } else {
      urgencyReason = '检测到紧急关键词，需优先处理';
    }
  } else if (lowWords.some((w) => lower.includes(w))) {
    urgency = '中';
    urgencyReason = '描述中存在不确定性词汇（好像/可能），需现场确认';
  } else {
    urgency = '中';
    urgencyReason = '常规故障，按标准流程处理';
  }
  if (phenomena.every((p) => lowWords.some((w) => lower.includes(w)))) {
    urgency = '低';
    urgencyReason = '描述轻微，可安排常规维护';
  }

  const estimatedFaultType = matchedDevice?.faultType || '其他';

  const confidence = 0.75 + Math.random() * 0.2;

  return new Promise((resolve) => {
    const delay = 1200 + Math.random() * 800;
    setTimeout(() => {
      resolve({
        deviceName,
        faultPhenomenon: phenomena,
        urgency,
        estimatedFaultType,
        confidence: Math.round(confidence * 100) / 100,
        urgencyReason,
      });
    }, delay);
  });
}

export default function NlrDemo() {
  const { isMobile } = useResponsive();
  const setNlrModalOpen = useStore((s) => s.setNlrModalOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [parseSteps, setParseSteps] = useState<ParseStep[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);
  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Unified data source hook ───────────────────────────────
  const { data: devices } = useDeviceDataSource('default');

  const [matchedDevice, setMatchedDevice] = useState<any>(null);

  useEffect(() => {
    return () => {
      if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastSystemMessage = useCallback((updates: Partial<ChatMessage>) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.type === 'system') {
        return [...prev.slice(0, -1), { ...last, ...updates }];
      }
      return prev;
    });
  }, []);

  const findMatchingDevice = useCallback((deviceName: string) => {
    const keywords = deviceName.replace(/[号#]/g, '').split(/[-\s,，]/).filter(Boolean);
    let bestMatch: any = null;
    let bestScore = 0;

    for (const d of devices) {
      const searchText = `${d.code} ${d.name} ${d.area || ''} ${d.line || ''}`.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        if (searchText.includes(kw.toLowerCase())) {
          score += kw.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = d;
      }
    }
    return bestScore > 1 ? bestMatch : null;
  }, [devices]);

  const advanceSteps = useCallback(() => {
    let stepIndex = 0;
    const advance = () => {
      if (stepIndex < stepSequence.length) {
        setParseSteps((prev) => [...prev, stepSequence[stepIndex].key]);
        stepIndex++;
        parseTimerRef.current = setTimeout(advance, 400 + Math.random() * 300);
      }
    };
    advance();
  }, []);

  const handleParse = useCallback(async (text: string) => {
    addMessage({ id: generateId(), type: 'user', text });

    const msgId = generateId();
    addMessage({ id: msgId, type: 'system', status: 'loading' });

    setIsParsing(true);
    advanceSteps();

    try {
      const data = await mockParse(text);
      if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
      setParseSteps([]);
      setIsParsing(false);

      const device = findMatchingDevice(data.deviceName);
      setMatchedDevice(device);

      setTimeout(() => {
        updateLastSystemMessage({ status: 'result', data });
      }, 300);
    } catch (err: any) {
      if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
      setParseSteps([]);
      setIsParsing(false);

      try {
        updateLastSystemMessage({ status: 'error', error: err.message || '解析失败，请重试' });
      } catch {
        try {
          antMsg.error(`解析失败: ${err.message || '请稍后重试'}`);
        } catch {
          /* ignore */
        }
      }
    }
  }, [addMessage, updateLastSystemMessage, findMatchingDevice, advanceSteps]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    handleParse(text).catch(() => {});
  }, [inputText, handleParse]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognition?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      antMsg.warning('当前浏览器不支持语音识别，请使用 Chrome 或 Edge');
      return;
    }

    const recog = new SpeechRecognition();
    recog.lang = 'zh-CN';
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setInputText((prev) => prev + transcript);
        }
      }
    };

    recog.onend = () => {
      setIsRecording(false);
    };

    recog.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        antMsg.error(`语音识别失败: ${event.error}`);
      }
      setIsRecording(false);
    };

    recog.start();
    setRecognition(recog);
    setIsRecording(true);
  }, [isRecording, recognition]);

  const handleCreateWorkOrder = useCallback(async () => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.data || !matchedDevice) {
      antMsg.warning('未匹配到设备，无法创建工单');
      return;
    }

    setSubmitting(true);
    try {
      const priorityMap: Record<string, string> = { '高': 'P0', '中': 'P1', '低': 'P2' };
      const priority = priorityMap[lastMsg.data.urgency] || 'P1';

      const faultTypeMap: Record<string, string> = {
        '机械': '机械', '电气': '电气', '液压': '液压', '气动': '气动', '软件': '软件',
      };
      const faultType = faultTypeMap[lastMsg.data.estimatedFaultType] || '其他';

      const description = [
        `【AI解析】设备: ${lastMsg.data.deviceName}`,
        `故障现象: ${(Array.isArray(lastMsg.data.faultPhenomenon) ? lastMsg.data.faultPhenomenon : [lastMsg.data.faultPhenomenon]).filter(Boolean).join('、')}`,
        `紧急程度: ${lastMsg.data.urgency}`,
        `置信度: ${Math.round((lastMsg.data.confidence || 0) * 100)}%`,
        '---',
        lastMsg.text || '',
      ].join('\n');

      const res = await api.post('/work-orders', {
        deviceId: matchedDevice.id,
        type: 'repair',
        source: 'nlr',
        priority,
        faultType,
        description,
      });

      antMsg.success(`工单 ${res.data.data.code} 已创建！`);
      updateLastSystemMessage({ status: 'result', data: { ...lastMsg.data, workOrderCreated: true, workOrderCode: res.data.data.code } });
    } catch (err: any) {
      antMsg.error(err?.response?.data?.error || '创建工单失败');
    }
    setSubmitting(false);
  }, [messages, matchedDevice, updateLastSystemMessage]);

  const handleReset = useCallback(() => {
    if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    setMessages([]);
    setMatchedDevice(null);
    setInputText('');
    setParseSteps([]);
    setIsParsing(false);
  }, []);

  const handleDemoTip = useCallback((tip: string) => {
    setInputText(tip);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const renderParsedCard = (data: ParsedResult) => {
    const urgency = urgencyConfig[data.urgency] || urgencyConfig['中'];
    const faultCfg = faultTypeConfig[data.estimatedFaultType] || { icon: <QuestionCircleOutlined />, color: Colors.gray400 };
    const hasWorkOrder = (data as any).workOrderCreated;
    const phenomena = Array.isArray(data.faultPhenomenon) ? data.faultPhenomenon : [];
    const showAnimation = !hasWorkOrder;

    return (
      <div className={`parsed-card ${showAnimation ? 'card-enter' : ''}`}>
        <div style={{
          background: 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
          borderRadius: 12,
          border: `1px solid #BFDBFE`,
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.08)',
        }}>
          {/* 顶部标识 */}
          <div style={{
            background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <RobotOutlined style={{ color: '#FFFFFF', fontSize: 15 }} />
            <Text strong style={{ color: '#FFFFFF', fontSize: isMobile ? 13 : 14, flex: 1 }}>
              AI 提取信息 · 摘要
            </Text>
            <Tag style={{
              borderRadius: 10, border: 'none', fontSize: 10, lineHeight: '18px',
              background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', margin: 0,
            }}>
              置信度 {Math.round((data.confidence || 0) * 100)}%
            </Tag>
          </div>

          {/* 信息卡片 */}
          <div style={{ padding: isMobile ? 12 : 16 }}>
            {/* 设备名称 - 高亮行 */}
            <div style={{
              background: '#EFF6FF',
              borderRadius: 8,
              padding: isMobile ? '8px 12px' : '10px 14px',
              marginBottom: 10,
              border: '1px solid #DBEAFE',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <ThunderboltOutlined style={{ color: Colors.primary, fontSize: 15 }} />
              <Text style={{ color: Colors.gray500, fontSize: isMobile ? 12 : 13, whiteSpace: 'nowrap' }}>
                设备名称：
              </Text>
              <Text strong style={{ fontSize: isMobile ? 14 : 16, color: '#1E40AF' }}>
                {data.deviceName || '未知设备'}
              </Text>
              {matchedDevice && (
                <Tag color="green" style={{ borderRadius: 4, border: 'none', fontSize: 10, lineHeight: '18px', marginLeft: 'auto' }}>
                  已匹配
                </Tag>
              )}
              {!matchedDevice && (
                <Tag style={{ borderRadius: 4, border: `1px solid ${Colors.warning}`, fontSize: 10, lineHeight: '18px', color: Colors.warning, marginLeft: 'auto' }}>
                  未匹配
                </Tag>
              )}
            </div>

            {/* 故障现象 */}
            <div style={{
              padding: isMobile ? 8 : 10,
              marginBottom: 10,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <BugOutlined style={{ color: '#DC2626', fontSize: 14, marginTop: 2 }} />
                <Text style={{ color: Colors.gray500, fontSize: isMobile ? 12 : 13, whiteSpace: 'nowrap' }}>
                  故障现象：
                </Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                  {phenomena.map((p, i) => (
                    <Tag
                      key={i}
                      style={{
                        borderRadius: 4,
                        border: 'none',
                        fontSize: isMobile ? 12 : 13,
                        lineHeight: '24px',
                        padding: '0 10px',
                        background: '#FEF2F2',
                        color: '#DC2626',
                        margin: 0,
                        fontWeight: 500,
                      }}
                    >
                      {p}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>

            {/* 紧急程度 + 故障类型 */}
            <div style={{
              display: 'flex', gap: 12, flexWrap: 'wrap',
              padding: isMobile ? 8 : 10,
              background: '#FAFAFA',
              borderRadius: 8,
              border: '1px solid #F0F0F0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 140 }}>
                <DashboardOutlined style={{ color: urgency.color, fontSize: 14 }} />
                <Text style={{ color: Colors.gray500, fontSize: isMobile ? 12 : 13, whiteSpace: 'nowrap' }}>
                  紧急程度：
                </Text>
                <Tag
                  color={urgency.color}
                  style={{ borderRadius: 4, border: 'none', fontSize: isMobile ? 12 : 13, lineHeight: '24px', margin: 0, fontWeight: 600 }}
                >
                  {urgency.label}
                </Tag>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: Colors.gray500, fontSize: isMobile ? 11 : 12, whiteSpace: 'nowrap' }}>
                  故障类型：
                </Text>
                <Tag
                  style={{
                    borderRadius: 4, border: 'none',
                    fontSize: isMobile ? 11 : 12, lineHeight: '22px', margin: 0,
                    background: faultCfg.color + '20', color: faultCfg.color,
                  }}
                  icon={faultCfg.icon}
                >
                  {data.estimatedFaultType || '未知'}
                </Tag>
              </div>
            </div>

            {/* 紧急度判定说明 */}
            {data.urgencyReason && (
              <div style={{
                marginTop: 8,
                padding: '6px 10px',
                background: '#FFFBEB',
                borderRadius: 6,
                border: '1px solid #FDE68A',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <SearchOutlined style={{ color: '#D97706', fontSize: 12 }} />
                <Text style={{ fontSize: isMobile ? 11 : 12, color: '#92400E' }}>
                  AI 判定依据：{data.urgencyReason}
                </Text>
              </div>
            )}
          </div>

          {/* 操作区 */}
          <div style={{
            padding: isMobile ? '10px 12px' : '12px 16px',
            borderTop: '1px solid #E5E7EB',
            background: '#FFFFFF',
          }}>
            {!hasWorkOrder ? (
              <Space style={{ width: '100%' }} size={8}>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  size={isMobile ? 'middle' : 'large'}
                  block
                  loading={submitting}
                  onClick={handleCreateWorkOrder}
                  className="confirm-btn"
                  style={{
                    borderRadius: 8,
                    height: isMobile ? 40 : 46,
                    fontSize: isMobile ? 14 : 16,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                  }}
                >
                  确认并派工
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  size={isMobile ? 'middle' : 'large'}
                  onClick={handleReset}
                  style={{ borderRadius: 8, height: isMobile ? 40 : 46 }}
                >
                  重填
                </Button>
              </Space>
            ) : (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message={
                  <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
                    工单 {(data as any).workOrderCode} 已派发至维修组
                  </Text>
                }
                style={{ borderRadius: 8, border: 'none', background: '#F0FDF4' }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.type === 'user') {
      return (
        <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <div
            style={{
              maxWidth: isMobile ? '85%' : '70%',
              background: Colors.primary,
              color: '#FFFFFF',
              borderRadius: '12px 12px 4px 12px',
              padding: isMobile ? '8px 12px' : '10px 16px',
              fontSize: isMobile ? 13 : 14,
              lineHeight: 1.6,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              wordBreak: 'break-word',
            }}
          >
            {msg.text}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} style={{ display: 'flex', marginBottom: 12 }}>
        <div style={{ maxWidth: isMobile ? '90%' : '75%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <RobotOutlined style={{ color: Colors.primary, fontSize: 14 }} />
            <Text style={{ fontSize: 12, color: Colors.gray500 }}>AI 智能解析</Text>
          </div>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '4px 12px 12px 12px',
              padding: msg.status === 'loading' ? '12px 16px' : 0,
              boxShadow: msg.status === 'loading' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {msg.status === 'loading' && (
              <div className="parse-animation">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 20, color: Colors.primary }} spin />} />
                  <div>
                    <Text strong style={{ fontSize: isMobile ? 14 : 15, color: Colors.gray700 }}>
                      AI 智能解析
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.gray400, display: 'block' }}>
                      正在分析自然语言描述...
                    </Text>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 4 }}>
                  {stepSequence.map((step) => {
                    const isCompleted = parseSteps.includes(step.key);
                    const isCurrent = parseSteps.length > 0 && parseSteps[parseSteps.length - 1] === step.key;
                    return (
                      <div
                        key={step.key}
                        className={`parse-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                      >
                        <div className="step-indicator" style={{
                          width: 20, height: 20, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 'bold', flexShrink: 0,
                          background: isCompleted ? '#10B981' : isCurrent ? Colors.primary : Colors.gray200,
                          color: '#FFFFFF',
                          transition: 'all 0.3s ease',
                        }}>
                          {isCompleted ? '✓' : isCurrent ? <LoadingOutlined /> : stepSequence.indexOf(step) + 1}
                        </div>
                        <Text style={{
                          fontSize: isMobile ? 12 : 13,
                          color: isCompleted ? '#10B981' : isCurrent ? Colors.gray800 : Colors.gray400,
                          fontWeight: isCurrent ? 600 : isCompleted ? 500 : 400,
                          transition: 'all 0.3s ease',
                        }}>
                          {step.label}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {msg.status === 'result' && msg.data && renderParsedCard(msg.data)}
            {msg.status === 'error' && (
              <Alert
                type="error"
                showIcon
                message="解析失败"
                description={msg.error || '请重试或输入更清晰的描述'}
                style={{ borderRadius: 8, border: 'none' }}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${Colors.gray200}`, flexShrink: 0 }}>
        <Space size={8}>
          <SoundOutlined style={{ color: Colors.primary, fontSize: 16 }} />
          <Text strong style={{ fontSize: 15 }}>自然语言报修</Text>
          <Tag color="blue" style={{ borderRadius: 4, border: 'none', fontSize: 10 }}>DEMO</Tag>
        </Space>
        <Space size={4}>
          <Button type="link" size="small" onClick={handleReset} style={{ fontSize: 12 }}>清空</Button>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => setNlrModalOpen(false)} style={{ fontSize: 12, color: Colors.gray400 }} />
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 16, background: Colors.gray50 }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: '40px 0' }}>
            <RobotOutlined style={{ fontSize: 48, color: Colors.gray300 }} />
            <Text style={{ color: Colors.gray500, fontSize: 15, textAlign: 'center' }}>
              用自然语言描述故障，AI 自动提取关键信息
            </Text>
            <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 12, border: `1px solid ${Colors.gray200}`, width: '100%', maxWidth: 400 }}>
              <Text style={{ fontSize: 12, color: Colors.gray500, marginBottom: 8, display: 'block' }}>
                试试以下示例：
              </Text>
              <Space direction="vertical" size={6} style={{ width: '100%' }}>
                {demoTips.map((tip, i) => (
                  <div key={i} onClick={() => handleDemoTip(tip)}
                    style={{ padding: '6px 10px', borderRadius: 6, background: Colors.gray50, cursor: 'pointer', fontSize: 13, color: Colors.gray600, border: `1px solid ${Colors.gray100}`, lineHeight: 1.5 }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = Colors.primary; e.currentTarget.style.background = Colors.sidebarActive; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = Colors.gray100; e.currentTarget.style.background = Colors.gray50; }}
                  >
                    "{tip}"
                  </div>
                ))}
              </Space>
            </div>
          </div>
        )}

        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ borderTop: `1px solid ${Colors.gray200}`, padding: isMobile ? 8 : 12, background: '#FFFFFF', flexShrink: 0 }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入故障描述，例如：3号产线电机异响..."
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ borderRadius: '8px 0 0 8px', fontSize: 14, border: `1px solid ${Colors.gray200}` }}
            disabled={messages.some((m) => m.status === 'loading')}
          />
          <Tooltip title={isRecording ? '点击停止' : '点击语音输入'}>
            <Button
              type={isRecording ? 'primary' : 'default'}
              icon={isRecording ? <StopOutlined /> : <SoundOutlined />}
              onClick={toggleRecording}
              style={{
                borderRadius: 0, height: 'auto', border: `1px solid ${Colors.gray200}`, borderLeft: 'none', borderRight: 'none',
                background: isRecording ? '#DC2626' : undefined, borderColor: isRecording ? '#DC2626' : Colors.gray200,
                animation: isRecording ? 'pulse 1s infinite' : undefined, zIndex: 1,
              }}
            />
          </Tooltip>
          <Button
            type="primary" icon={<SendOutlined />} onClick={handleSend}
            disabled={!inputText.trim() || messages.some((m) => m.status === 'loading')}
            style={{ borderRadius: '0 8px 8px 0', height: 'auto' }}
          >
            {!isMobile && '发送'}
          </Button>
        </Space.Compact>
      </div>

      <style>{`
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); } 70% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); } }
        @keyframes blink { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes slideUpFadeIn {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        .parsed-card.card-enter {
          animation: slideUpFadeIn 0.4s ease-out;
        }

        .parsed-card .confirm-btn {
          animation: scaleIn 0.3s ease-out 0.2s both;
        }

        .parse-step {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 0;
          transition: all 0.3s ease;
        }

        .parse-step.completed {
          opacity: 0.8;
        }

        .parse-step.current {
          opacity: 1;
        }

        .parse-animation {
          padding: 8px 4px;
        }

        .parse-animation .parse-step.current .step-indicator {
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </div>
  );
}
