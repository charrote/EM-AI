import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, message, Input, Select } from 'antd';
import { 
  LoadingOutlined,
  CheckCircleOutlined,
  CameraOutlined,
  HistoryOutlined,
  SearchOutlined,
  CloseOutlined,
  AimOutlined,
  ExperimentOutlined,
  RobotOutlined,
  DownOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';

const { Text } = Typography;

// ─── 类型定义 ────────────────────────────────────

interface DiagnosisResult {
  id: string;
  reason: string;
  confidence: number;
  evidence: string[];
}

interface ReasoningStep {
  id: string;
  content: string;
  type: 'thinking' | 'data' | 'conclusion' | 'warning';
}

interface DeviceOption {
  id: string;
  name: string;
  code: string;
  type: string;
  area: string;
  status: string;
  healthScore: number;
  oee: number;
}

// ─── 模拟设备数据 ────────────────────────────────────

const MOCK_DEVICES: DeviceOption[] = [
  { id: 'DEV-001', name: '1# 主轴电机', code: 'SP-M-001', type: '主轴电机', area: '加工一区', status: 'running', healthScore: 72, oee: 83 },
  { id: 'DEV-002', name: '2# 主轴电机', code: 'SP-M-002', type: '主轴电机', area: '加工一区', status: 'fault', healthScore: 45, oee: 62 },
  { id: 'DEV-003', name: '1# 驱动电机', code: 'DR-M-001', type: '驱动电机', area: '加工二区', status: 'running', healthScore: 88, oee: 91 },
  { id: 'DEV-004', name: '液压泵组', code: 'HP-001', type: '液压系统', area: '加工二区', status: 'idle', healthScore: 79, oee: 85 },
  { id: 'DEV-005', name: '冷却循环泵', code: 'CP-001', type: '冷却系统', area: '加工三区', status: 'running', healthScore: 92, oee: 94 },
  { id: 'DEV-006', name: '3# 主轴电机', code: 'SP-M-003', type: '主轴电机', area: '加工三区', status: 'maintenance', healthScore: 65, oee: 78 },
  { id: 'DEV-007', name: '传送带驱动', code: 'CB-001', type: '传送系统', area: '装配区', status: 'running', healthScore: 81, oee: 87 },
  { id: 'DEV-008', name: '空气压缩机', code: 'AC-001', type: '压缩空气', area: '公用工程', status: 'running', healthScore: 90, oee: 92 },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  running: { label: '运行中', color: '#22C55E' },
  idle: { label: '待机', color: '#6B7280' },
  fault: { label: '故障', color: '#EF4444' },
  maintenance: { label: '保养中', color: '#3B82F6' },
  repair: { label: '检修中', color: '#F97316' },
};

// ─── 模拟诊断数据（基于设备类型） ────────────────────────────────────

const getDiagnosisByDevice = (device: DeviceOption) => {
  const baseSteps: ReasoningStep[] = [
    { id: '1', content: `正在分析设备「${device.name}」(${device.code}) 的关键特征...`, type: 'thinking' },
    { id: '2', content: `设备类型: ${device.type} | 健康评分: ${device.healthScore}/100 | OEE: ${device.oee}%`, type: 'data' },
    { id: '3', content: '提取实时数据：电机电流 (A), 振动频率 (Hz), 轴承温度 (°C)', type: 'data' },
    { id: '4', content: `检索维修手册：查阅《${device.type}维护标准手册 V2.1》`, type: 'data' },
    { id: '5', content: '比对历史相似案例：识别到 3 起高度相似的异常模式', type: 'data' },
  ];

  if (device.status === 'fault') {
    return {
      steps: baseSteps,
      results: [
        {
          id: '1',
          reason: '轴承磨损',
          confidence: 85,
          evidence: ['振动频谱在 50Hz-60Hz 区间出现异常峰值', '历史案例 #CASE-882 表现一致'],
        },
        {
          id: '2',
          reason: '润滑不足',
          confidence: 10,
          evidence: ['温度趋势呈现缓慢上升趋势'],
        },
        {
          id: '3',
          reason: '驱动器故障',
          confidence: 5,
          evidence: ['当前电流波动处于正常范围'],
        },
      ],
    };
  }

  return {
    steps: baseSteps,
    results: [
      {
        id: '1',
        reason: '运行状态正常',
        confidence: 92,
        evidence: ['各项指标均在正常范围内', '无历史异常记录'],
      },
      {
        id: '2',
        reason: '轻微振动异常',
        confidence: 5,
        evidence: ['低频振动有轻微上升趋势'],
      },
      {
        id: '3',
        reason: '温度偏高',
        confidence: 3,
        evidence: ['轴承温度较基线高出 2°C'],
      },
    ],
  };
};

// ─── 子组件：增强型实时曲线（带网格 + 标注） ─────────────────

const EnhancedRealTimeCurve = ({ 
  color, label, unit, status, anomaly 
}: { 
  color: string; label: string; unit: string; status: string; anomaly?: boolean 
}) => {
  const [points, setPoints] = useState<{x: number, y: number}[]>([]);
  const [time, setTime] = useState(0);
  const isFault = status === 'fault';
  const lineColor = isFault ? '#EF4444' : color;

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => t + 1);
      setPoints(prev => {
        const newX = prev.length > 30 ? prev[prev.length - 1].x + 8 : 0;
        const amplitude = isFault ? 40 : 18;
        const noise = isFault ? Math.random() * 14 - 7 : Math.random() * 4 - 2;
        const trend = isFault ? Math.sin(Date.now() / 800) * 8 + 6 : 0;
        const newY = 50 + Math.sin(Date.now() / (isFault ? 350 : 500)) * amplitude + noise + trend;
        const next = [...prev, { x: newX, y: newY }];
        return next.length > 30 ? next.slice(1) : next;
      });
    }, 180);
    return () => clearInterval(interval);
  }, [isFault]);

  const pathData = points.length > 0 
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';

  // Grid lines
  const gridLines = [20, 50, 80];
  // Normal range zone
  const normalZone = !isFault ? null : (
    <rect x="0" y="32" width="100%" height="36" fill="#EF4444" opacity="0.08" rx="4" />
  );

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.9)',
      borderRadius: 10,
      padding: '14px 14px 10px',
      border: `1px solid ${isFault ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Label row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: lineColor, display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 11, color: '#64748B' }}>({unit})</span>
        </div>
        {isFault && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.2s ease infinite' }} />
            <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>异常</span>
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <svg width="100%" height="72" style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {gridLines.map((y, i) => (
          <g key={i}>
            <line x1="0" y1={y} x2="240" y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" strokeDasharray="3,3" />
            <text x="-4" y={y + 3} textAnchor="end" fontSize="8" fill="rgba(148,163,184,0.4)">{y}</text>
          </g>
        ))}

        {/* Anomaly zone */}
        {isFault && (
          <rect x="0" y="30" width="240" height="40" fill="rgba(239,68,68,0.06)" rx="2" />
        )}

        {/* Normal range indicator */}
        {!isFault && (
          <>
            <line x1="0" y1="35" x2="240" y2="35" stroke="rgba(34,197,94,0.15)" strokeWidth="1" strokeDasharray="2,4" />
            <line x1="0" y1="65" x2="240" y2="65" stroke="rgba(34,197,94,0.15)" strokeWidth="1" strokeDasharray="2,4" />
          </>
        )}

        {/* Data line */}
        <path
          d={pathData}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${lineColor}40)` }}
        />

        {/* Glow dot at the end */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3"
            fill={lineColor}
          />
        )}
      </svg>
    </div>
  );
};

// ─── 子组件：置信度进度条 ─────────────────

const ConfidenceBar = ({ value, color, label }: { value: number; color: string; label: string }) => {
  const barColor = value >= 80 ? '#22C55E' : value >= 30 ? '#F59E0B' : '#6B7280';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 60, fontSize: 13, color: '#CBD5E1', textAlign: 'right', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            borderRadius: 4,
            background: `linear-gradient(90deg, ${barColor}66, ${barColor})`,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
          }}
        >
          {value > 15 && (
            <div style={{
              position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)',
              width: 4, height: 4, borderRadius: '50%', background: '#fff', opacity: 0.7,
            }} />
          )}
        </div>
      </div>
      <span style={{
        width: 40, fontSize: 13, fontWeight: 700,
        color: barColor, fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
      }}>
        {value}%
      </span>
    </div>
  );
};

// ─── 子组件：设备选择器（优化版） ─────────────────

const DeviceSelector = ({ onSelect }: { onSelect: (device: DeviceOption) => void }) => {
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredDevices = MOCK_DEVICES.filter(d => {
    const matchesSearch = d.name.includes(searchText) || d.code.includes(searchText) || d.area.includes(searchText);
    const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: '全部状态' },
    ...Object.entries(STATUS_LABELS).map(([key, val]) => ({ value: key, label: val.label })),
  ];

  return (
    <div style={{ padding: 4 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, marginTop: 8 }}>
        <div style={{ 
          width: 56, height: 56, borderRadius: 16, 
          background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28, color: '#fff',
          boxShadow: '0 8px 24px rgba(59,130,246,0.25)',
        }}>
          <RobotOutlined />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', marginBottom: 6, letterSpacing: '0.02em' }}>
          AI 辅助诊断会诊
        </div>
        <Text style={{ color: '#64748B', fontSize: 13, display: 'block' }}>
          选择目标设备，系统将自动联动实时数据进行多维度智能分析
        </Text>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Input
          placeholder="搜索设备名称、编号或区域..."
          prefix={<SearchOutlined style={{ color: '#64748B' }} />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
          variant="borderless"
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 8,
            color: '#F1F5F9',
          }}
        />
        <Select
          value={filterStatus}
          onChange={setFilterStatus}
          options={statusOptions}
          style={{ width: 120 }}
          variant="borderless"
          popupMatchSelectWidth={false}
        />
      </div>

      {/* Device Grid */}
      <div className="aura-diag-scroll" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
        gap: 12,
        maxHeight: 380,
        overflowY: 'auto',
        paddingRight: 4,
      }}>
        {filteredDevices.map((device, idx) => {
          const statusCfg = STATUS_LABELS[device.status] || { label: device.status, color: '#6B7280' };
          const healthColor = device.healthScore >= 80 ? '#22C55E' : device.healthScore >= 60 ? '#F59E0B' : '#EF4444';
          const isFault = device.status === 'fault';
          
          return (
            <div
              key={device.id}
              onClick={() => onSelect(device)}
              style={{
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                border: `1px solid ${isFault ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                padding: 16,
                transition: 'all 0.25s ease',
                animation: `fadeInUp 0.4s ease ${idx * 0.06}s both`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.borderColor = isFault ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Top row: name + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#F1F5F9' }}>{device.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    {device.code}
                    <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
                    {device.area}
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '2px 10px', borderRadius: 20,
                  background: `${statusCfg.color}18`,
                  border: `1px solid ${statusCfg.color}30`,
                  fontSize: 11, fontWeight: 600, color: statusCfg.color,
                }}>
                  {isFault && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1.2s ease infinite' }} />
                  )}
                  {statusCfg.label}
                </div>
              </div>

              {/* Metrics row */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748B' }}>健康</span>
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: healthColor,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {device.healthScore}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: '#64748B' }}>OEE</span>
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: device.oee >= 85 ? '#22C55E' : device.oee >= 75 ? '#F59E0B' : '#EF4444',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {device.oee}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#475569', marginLeft: 'auto', alignSelf: 'flex-end' }}>
                  {device.type}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredDevices.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>
          <SearchOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block', opacity: 0.3 }} />
          未找到匹配的设备
        </div>
      )}
    </div>
  );
};

// ─── 子组件：可折叠证据卡片 ─────────────────

const EvidenceCard = ({ 
  result, rank, total 
}: { 
  result: DiagnosisResult; rank: number; total: number 
}) => {
  const [expanded, setExpanded] = useState(rank === 0);
  const isPrimary = rank === 0;
  const confColor = result.confidence >= 80 ? '#22C55E' : result.confidence >= 30 ? '#F59E0B' : '#6B7280';

  return (
    <div style={{
      background: isPrimary 
        ? 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))'
        : 'rgba(255,255,255,0.03)',
      borderRadius: 10,
      border: `1px solid ${isPrimary ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
      padding: '14px 16px',
      transition: 'all 0.2s ease',
    }}>
      {/* Header row */}
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isPrimary && (
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>
              {rank + 1}
            </div>
          )}
          {!isPrimary && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B', width: 22, textAlign: 'center' }}>
              {rank + 1}
            </span>
          )}
          <div>
            <Text strong style={{ fontSize: 14, color: '#F1F5F9' }}>{result.reason}</Text>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            padding: '2px 10px', borderRadius: 12,
            background: `${confColor}18`,
            fontSize: 12, fontWeight: 700, color: confColor,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {result.confidence}%
          </div>
          <DownOutlined style={{
            fontSize: 11, color: '#64748B',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }} />
        </div>
      </div>

      {/* Evidence list */}
      {expanded && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          animation: 'fadeIn 0.25s ease',
        }}>
          <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ExperimentOutlined style={{ fontSize: 11 }} />
            诊断依据
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, listStyle: 'none' }}>
            {result.evidence.map((e, i) => (
              <li key={i} style={{
                fontSize: 12, color: '#CBD5E1', lineHeight: 1.8,
                position: 'relative',
                paddingLeft: 14,
              }}>
                <span style={{
                  position: 'absolute', left: 0, top: 8,
                  width: 4, height: 4, borderRadius: '50%',
                  background: confColor, opacity: 0.6,
                }} />
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── 主组件 ──────────────────────────────────────

export default function AuraDiagnosticModal() {
  const { diagnosticModalOpen, setDiagnosticModalOpen } = useStore();
  const [selectedDevice, setSelectedDevice] = useState<DeviceOption | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [results, setResults] = useState<DiagnosisResult[]>([]);
  const [isMultimodalActive, setIsMultimodalActive] = useState(false);
  const [diagnosisPhase, setDiagnosisPhase] = useState<'select' | 'analyzing' | 'result'>('select');
  const [wordIndex, setWordIndex] = useState(0);

  const handleDeviceSelect = (device: DeviceOption) => {
    setSelectedDevice(device);
    setDiagnosisPhase('analyzing');
    startDiagnosis(device);
  };

  const startDiagnosis = async (device: DeviceOption) => {
    setIsAnalyzing(true);
    setSteps([]);
    setResults([]);
    setIsMultimodalActive(false);
    setWordIndex(0);

    const diagnosisData = getDiagnosisByDevice(device);

    for (const step of diagnosisData.steps) {
      await new Promise(r => setTimeout(r, 1000));
      setSteps(prev => [...prev, step]);
    }

    setResults(diagnosisData.results);
    setIsAnalyzing(false);
    setDiagnosisPhase('result');
  };

  const handleFileUpload = () => {
    setIsMultimodalActive(true);
    message.loading({ content: '正在进行多模态视觉识别...', key: 'vision', duration: 0 });
    
    setTimeout(() => {
      setResults(prev => prev.map((res, idx) => {
        if (idx === 0) {
          return {
            ...res,
            reason: `${res.reason} (视觉确认)`,
            confidence: Math.min(res.confidence + 13, 98),
            evidence: [...res.evidence, '视觉识别：轴承边缘发现金属碎屑'],
          };
        }
        return { ...res, confidence: Math.max(res.confidence - 9, 1) };
      }));
      message.success({ content: '多模态数据已融合，结论已更新', key: 'vision', duration: 2 });
    }, 2500);
  };

  const handleClose = () => {
    setSelectedDevice(null);
    setSteps([]);
    setResults([]);
    setIsMultimodalActive(false);
    setDiagnosisPhase('select');
    setDiagnosticModalOpen(false);
  };

  const handleReset = () => {
    if (selectedDevice) {
      setDiagnosisPhase('analyzing');
      startDiagnosis(selectedDevice);
    }
  };

  // ─── 分析阶段文字动画 ───
  const thinkingTexts = [
    'AI 正在分析设备运行数据...',
    '正在检索历史故障案例库...',
    '正在比对多维传感器特征...',
    '正在推理最可能的故障根因...',
  ];

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setWordIndex(i => (i + 1) % thinkingTexts.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  return (
    <Modal
      title={null}
      open={diagnosticModalOpen}
      onCancel={handleClose}
      width={selectedDevice ? 1200 : 780}
      centered
      footer={null}
      closable={false}
      maskClosable={false}
      destroyOnHidden
      styles={{
        body: { padding: 0, maxHeight: '88vh' },
        mask: { background: 'rgba(0,0,0,0.6)' },
      }}
      className="aura-diagnostic-modal"
    >
      <style>{`
        /* ─── 整体模态窗（暗色风格） ─── */
        .aura-diagnostic-modal .ant-modal-content {
          background: #0D1117;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05);
          overflow: hidden;
        }
        .aura-diagnostic-modal .ant-modal-header { display: none; }
        .aura-diagnostic-modal .ant-modal-body {
          padding: 0;
          background: transparent;
        }

        /* ─── 滚动条 ─── */
        .aura-diag-scroll::-webkit-scrollbar { width: 5px; }
        .aura-diag-scroll::-webkit-scrollbar-track { background: transparent; }
        .aura-diag-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 3px;
        }
        .aura-diag-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.35);
        }

        .aura-diag-terminal::-webkit-scrollbar { width: 4px; }
        .aura-diag-terminal::-webkit-scrollbar-track { background: transparent; }
        .aura-diag-terminal::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.15);
          border-radius: 2px;
        }

        /* ─── Select/Input 暗色适配 ─── */
        .aura-diagnostic-modal .ant-select-selector {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: #F1F5F9 !important;
          border-radius: 8px !important;
        }
        .aura-diagnostic-modal .ant-select-arrow {
          color: #64748B !important;
        }
        .aura-diagnostic-modal .ant-select-dropdown {
          background: #1A1D27 !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
        }
        .aura-diagnostic-modal .ant-select-item {
          color: #CBD5E1 !important;
        }
        .aura-diagnostic-modal .ant-select-item-option-selected {
          background: rgba(59,130,246,0.15) !important;
        }
        .aura-diagnostic-modal .ant-input {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          color: #F1F5F9 !important;
          border-radius: 8px !important;
        }
        .aura-diagnostic-modal .ant-input::placeholder {
          color: #475569 !important;
        }
        .aura-diagnostic-modal .ant-input-affix-wrapper {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          border-radius: 8px !important;
        }
        .aura-diagnostic-modal .ant-input-affix-wrapper input {
          background: transparent !important;
          border: none !important;
        }
        .aura-diagnostic-modal .ant-btn-default {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #CBD5E1 !important;
        }
        .aura-diagnostic-modal .ant-btn-default:hover {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.2) !important;
          color: #F1F5F9 !important;
        }

        /* ─── 动画 ─── */
        @keyframes fadeInLeft {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.2); }
          50% { box-shadow: 0 0 20px rgba(59,130,246,0.4); }
        }
        @keyframes scanLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 24px',
        background: 'linear-gradient(135deg, #0F1520 0%, #131A2A 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ 
            width: 38, height: 38, borderRadius: 10, 
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
            fontSize: 18,
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
          }}>
            <RobotOutlined />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F1F5F9', letterSpacing: '0.02em' }}>
              {selectedDevice ? 'AI 辅助诊断会诊' : 'AI 辅助诊断'}
            </div>
            {selectedDevice && (
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{selectedDevice.name}</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>{selectedDevice.code}</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>{selectedDevice.type}</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span>{selectedDevice.area}</span>
              </div>
            )}
          </div>
        </div>
        <div
          onClick={handleClose}
          style={{
            width: 32, height: 32, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#64748B',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#F1F5F9';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#64748B';
          }}
        >
          <CloseOutlined style={{ fontSize: 16 }} />
        </div>
      </div>

      {/* ─── 内容区域 ─── */}
      <div className="aura-diag-scroll" style={{ 
        padding: selectedDevice ? '24px' : '20px 24px 24px',
        overflowY: 'auto',
        maxHeight: selectedDevice ? 'calc(88vh - 160px)' : 'calc(88vh - 180px)',
      }}>
        {!selectedDevice ? (
          <DeviceSelector onSelect={handleDeviceSelect} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            
            {/* ─── 左侧：多维证据 + 视觉 ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* 实时数据证据 */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(6,182,212,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#06B6D4', fontSize: 14,
                  }}>
                    <BarChartOutlined />
                  </div>
                  <Text strong style={{ color: '#F1F5F9', fontSize: 14 }}>实时多维数据证据</Text>
                  <span style={{ fontSize: 11, color: '#475569' }}>Real-time Evidence</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <EnhancedRealTimeCurve color="#06B6D4" label="电机电流" unit="A" status={selectedDevice.status} />
                  <EnhancedRealTimeCurve color="#8B5CF6" label="振动频率" unit="Hz" status={selectedDevice.status} />
                  <EnhancedRealTimeCurve color="#F59E0B" label="轴承温度" unit="°C" status={selectedDevice.status} />
                  <EnhancedRealTimeCurve color="#EF4444" label="转速波动" unit="RPM" status={selectedDevice.status} />
                </div>
              </section>

              {/* 多模态视觉介入 */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(236,72,153,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#EC4899', fontSize: 14,
                  }}>
                    <CameraOutlined />
                  </div>
                  <Text strong style={{ color: '#F1F5F9', fontSize: 14 }}>多模态视觉介入</Text>
                  <span style={{ fontSize: 11, color: '#475569' }}>Multimodal Input</span>
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    border: `2px dashed ${isMultimodalActive ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    background: isMultimodalActive 
                      ? 'rgba(236,72,153,0.05)' 
                      : 'rgba(255,255,255,0.02)',
                    textAlign: 'center',
                    padding: '28px 20px',
                    transition: 'all 0.3s ease',
                    cursor: isMultimodalActive ? 'default' : 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={() => !isMultimodalActive && handleFileUpload()}
                >
                  {!isMultimodalActive ? (
                    <div>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'rgba(236,72,153,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px', color: '#EC4899', fontSize: 22,
                      }}>
                        <CameraOutlined />
                      </div>
                      <div style={{ fontSize: 14, color: '#94A3B8', marginBottom: 4 }}>
                        上传设备内部照片进行视觉辅助诊断
                      </div>
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        支持 JPG / PNG，可进一步提升诊断准确率
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: 'rgba(236,72,153,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 10px',
                      }}>
                        <LoadingOutlined style={{ fontSize: 22, color: '#EC4899' }} />
                      </div>
                      <div style={{ fontSize: 13, color: '#EC4899', fontWeight: 600 }}>
                        AI 正在分析图像特征...
                      </div>
                      {/* Scan line animation */}
                      <div style={{
                        position: 'absolute', left: 0, right: 0, height: '2px',
                        background: 'linear-gradient(90deg, transparent, #EC4899, transparent)',
                        animation: 'scanLine 1.5s ease infinite',
                        opacity: 0.5,
                      }} />
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ─── 右侧：推理 + 建议 ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* AI 推理过程 */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(139,92,246,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#8B5CF6', fontSize: 14,
                  }}>
                    <HistoryOutlined />
                  </div>
                  <Text strong style={{ color: '#F1F5F9', fontSize: 14 }}>AI 推理过程</Text>
                  <span style={{ fontSize: 11, color: '#475569' }}>Reasoning Chain</span>
                </div>
                <div className="aura-diag-terminal" style={{ 
                  background: 'rgba(11, 15, 25, 0.95)', 
                  borderRadius: 12, 
                  padding: 20, 
                  height: 300, 
                  overflowY: 'auto',
                  color: '#E2E8F0',
                  fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontSize: 13,
                  lineHeight: 1.7,
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {/* Header bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 16, paddingBottom: 12,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    fontSize: 11, color: '#475569',
                  }}>
                    <span style={{ color: '#8B5CF6' }}>$</span>
                    <span>推理引擎 v2.1 · 设备 {selectedDevice?.code}</span>
                  </div>

                  {steps.map((step, idx) => {
                    const iconMap = {
                      thinking: '⟐',
                      data: '✓',
                      conclusion: '◆',
                      warning: '⚠',
                    };
                    const colorMap = {
                      thinking: '#64748B',
                      data: '#38BDF8',
                      conclusion: '#10B981',
                      warning: '#F59E0B',
                    };
                    return (
                      <div
                        key={step.id}
                        style={{ 
                          marginBottom: 14, display: 'flex', gap: 10,
                          opacity: 0,
                          animation: `fadeInLeft 0.35s ease ${idx * 0.12}s forwards`
                        }}
                      >
                        <span style={{ color: colorMap[step.type], flexShrink: 0, width: 16 }}>
                          {iconMap[step.type]}
                        </span>
                        <span style={{ color: '#E2E8F0' }}>{step.content}</span>
                      </div>
                    );
                  })}

                  {isAnalyzing && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      color: '#64748B', marginTop: 4,
                      padding: '10px 0',
                    }}>
                      <LoadingOutlined style={{ color: '#8B5CF6' }} />
                      <span style={{ 
                        animation: 'fadeIn 0.5s ease',
                        color: '#94A3B8',
                        fontSize: 12,
                      }}>
                        {thinkingTexts[wordIndex]}
                      </span>
                    </div>
                  )}

                  {!isAnalyzing && steps.length > 0 && (
                    <div style={{ 
                      marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)',
                      opacity: 0,
                      animation: 'fadeIn 0.4s ease forwards'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981' }}>
                        <CheckCircleOutlined />
                        <span style={{ fontWeight: 500 }}>推理完成</span>
                        <span style={{ color: '#64748B', fontWeight: 400, fontSize: 12 }}>
                          · 已生成 TOP-{results.length} 诊断建议
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* TOP-N 诊断建议 */}
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(245,158,11,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#F59E0B', fontSize: 14,
                  }}>
                    <AimOutlined />
                  </div>
                  <Text strong style={{ color: '#F1F5F9', fontSize: 14 }}>TOP-{results.length} 诊断建议</Text>
                  <span style={{ fontSize: 11, color: '#475569' }}>Recommendations</span>
                </div>

                {/* 置信度概览条 */}
                {results.length > 0 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    padding: '14px 16px',
                    marginBottom: 12,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontSize: 11, color: '#64748B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BarChartOutlined style={{ fontSize: 11 }} />
                      置信度分布
                    </div>
                    {results.map((res, idx) => (
                      <div key={res.id} style={{ marginBottom: idx < results.length - 1 ? 8 : 0 }}>
                        <ConfidenceBar
                          value={res.confidence}
                          color="#1677ff"
                          label={res.reason.length > 10 ? res.reason.slice(0, 10) + '…' : res.reason}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* 详细诊断卡片 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {results.map((res, idx) => (
                    <div
                      key={res.id}
                      style={{
                        opacity: 0,
                        animation: `fadeInUp 0.35s ease ${idx * 0.15 + 0.2}s forwards`
                      }}
                    >
                      <EvidenceCard result={res} rank={idx} total={results.length} />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>

      {/* ─── 底部操作栏 ─── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 24px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(15, 21, 32, 0.9)',
        backdropFilter: 'blur(12px)',
      }}>
        {selectedDevice && (
          <div style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: diagnosisPhase === 'result' ? '#22C55E' : '#F59E0B',
              display: 'inline-block',
            }} />
            {diagnosisPhase === 'result' ? '诊断完成' : '分析中...'}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          {!selectedDevice ? (
            <Button onClick={handleClose} style={{ borderRadius: 8 }}>取消</Button>
          ) : (
            <>
              <Button 
                onClick={handleReset} 
                style={{ borderRadius: 8 }}
              >
                <HistoryOutlined /> 重新会诊
              </Button>
              <Button 
                type="primary" 
                onClick={handleClose} 
                style={{ 
                  borderRadius: 8, 
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                }}
              >
                <CheckCircleOutlined /> 完成诊断
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
