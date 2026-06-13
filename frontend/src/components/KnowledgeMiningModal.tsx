import { useState, useEffect, useRef } from 'react';
import { Modal, Button, Typography } from 'antd';
import {
  CheckCircleOutlined,
  CloseOutlined,
  ToolOutlined,
  ThunderboltOutlined,
  NodeIndexOutlined,
  LoadingOutlined,
  RightOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { useStore } from '../store/useStore';

const { Text } = Typography;

/* ─── 类型定义 ──────────────────────────────── */

type Phase = 'idle' | 'selecting' | 'extracting' | 'complete';

interface CauseOption {
  id: string;
  label: string;
  rootCause: string;
  solution: string;
}

/* ─── 默认兜底数据 ──────────────────────────── */

const FALLBACK_WO = {
  id: 'WO-2024-0082',
  device: '3# 主轴电机',
  deviceCode: 'SP-M-003',
  area: '加工三区',
  faultDesc: '运行时异响，振动值偏高',
  faultType: '机械',
  aiDiagnosis: '轴承磨损',
  aiConfidence: 85,
  aiAdvice: '建议更换轴承，检查润滑系统',
};

/** 根据工单数据生成可选原因列表 */
function buildCauseOptions(wo: any): CauseOption[] {
  const type = wo.faultType || '机械';
  const desc = wo.description || wo.faultDesc || '';
  const deviceName = wo.device?.name || wo.device || '';
  const rootCause = wo.rootCause || '';
  const resolution = wo.resolution || '';

  // 如果工单已有根因和方案，优先作为第一个选项
  const options: CauseOption[] = [];
  if (rootCause && resolution) {
    options.push({
      id: '1',
      label: `${rootCause}，${resolution}后恢复正常`,
      rootCause,
      solution: resolution,
    });
  }

  // 根据故障类型生成补充选项
  const typeOptionMap: Record<string, CauseOption[]> = {
    '机械': [
      { id: '2', label: '轴承磨损，更换轴承后恢复正常', rootCause: '轴承磨损', solution: '更换轴承' },
      { id: '3', label: '润滑不足，补充润滑脂后恢复正常', rootCause: '润滑不足', solution: '补充润滑脂' },
      { id: '4', label: '转子动平衡偏移，重新校正后恢复', rootCause: '转子不平衡', solution: '动平衡校正' },
    ],
    '电气': [
      { id: '2', label: '线路接触不良，重新接线后恢复正常', rootCause: '线路接触不良', solution: '重新接线' },
      { id: '3', label: '传感器故障，更换传感器后恢复正常', rootCause: '传感器故障', solution: '更换传感器' },
      { id: '4', label: '控制器参数异常，重新校准后恢复', rootCause: '参数异常', solution: '重新校准' },
    ],
    '液压': [
      { id: '2', label: '液压油泄漏，更换密封件后恢复正常', rootCause: '密封件老化', solution: '更换密封件' },
      { id: '3', label: '油路堵塞，清洗油路后恢复正常', rootCause: '油路堵塞', solution: '清洗油路' },
    ],
    '气动': [
      { id: '2', label: '气路泄漏，更换气管接头后恢复正常', rootCause: '气管泄漏', solution: '更换接头' },
      { id: '3', label: '气缸密封老化，更换气缸后恢复正常', rootCause: '气缸密封老化', solution: '更换气缸' },
    ],
  };

  const typeOptions = typeOptionMap[type] || typeOptionMap['机械'];
  for (const opt of typeOptions) {
    // 如果已有根因选项,跳过冲突项
    if (rootCause && opt.rootCause === rootCause) continue;
    options.push(opt);
  }

  // 确保至少有 1-3 个选项
  return options.slice(0, 3);
}

/* ─── 子组件：Neo4j 风格知识图谱 ──────────────── */

interface GraphProps {
  deviceName: string;
  symptom: string;
  rootCause: string;
  solution: string;
}

const KnowledgeGraph = ({ deviceName, symptom, rootCause, solution }: GraphProps) => {
  const nodes = [
    { id: 'device', label: deviceName, x: 200, y: 44, color: '#3B82F6', icon: '⚙' },
    { id: 'symptom', label: symptom, x: 200, y: 122, color: '#F59E0B', icon: '⚠' },
    { id: 'cause', label: rootCause, x: 200, y: 200, color: '#EF4444', icon: '🔧' },
    { id: 'solution', label: solution, x: 200, y: 278, color: '#22C55E', icon: '✓' },
  ];

  const edges = [
    { from: 'device', to: 'symptom', label: '故障表现' },
    { from: 'symptom', to: 'cause', label: '根因' },
    { from: 'cause', to: 'solution', label: '解决方案' },
  ];

  return (
    <svg width="400" height="320" viewBox="0 0 400 320" style={{ display: 'block' }}>
      <defs>
        <filter id="nodeGlow">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="edgeGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="rgba(148,163,184,0.4)" />
        </marker>
      </defs>

      {/* 连接线 */}
      {edges.map((edge, i) => {
        const from = nodes.find((n) => n.id === edge.from)!;
        const to = nodes.find((n) => n.id === edge.to)!;
        const midY = (from.y + to.y) / 2;

        return (
          <g key={i}>
            <line
              x1={from.x} y1={from.y + 26}
              x2={to.x} y2={to.y - 26}
              stroke="rgba(148,163,184,0.25)"
              strokeWidth="1.5"
              strokeDasharray="5,3"
              markerEnd="url(#arrowhead)"
              filter="url(#edgeGlow)"
            />
            <rect
              x={from.x - 32} y={midY - 10}
              width={64} height={20} rx={10}
              fill="#0D1117"
            />
            <text
              x={from.x} y={midY + 4}
              fill="#64748B"
              fontSize={11}
              textAnchor="middle"
              fontWeight={500}
            >
              {edge.label}
            </text>
          </g>
        );
      })}

      {/* 节点 */}
      {nodes.map((node, i) => (
        <g key={node.id}>
          {/* 外发光光环 */}
          <circle
            cx={node.x} cy={node.y} r="30"
            fill="none"
            stroke={node.color}
            strokeWidth="1"
            opacity="0.15"
            filter="url(#nodeGlow)"
          >
            <animate
              attributeName="r"
              values="28;32;28"
              dur="3s"
              begin={`${i * 0.5}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.15;0.3;0.15"
              dur="3s"
              begin={`${i * 0.5}s`}
              repeatCount="indefinite"
            />
          </circle>

          {/* 节点本体 */}
          <circle
            cx={node.x} cy={node.y} r="26"
            fill={`${node.color}18`}
            stroke={node.color}
            strokeWidth="2"
            filter="url(#nodeGlow)"
          />
          <circle
            cx={node.x} cy={node.y} r="26"
            fill="none"
            stroke={node.color}
            strokeWidth="1"
            opacity="0.4"
          />

          {/* 节点图标 */}
          <text
            x={node.x} y={node.y - 5}
            fill={node.color}
            fontSize={10}
            textAnchor="middle"
            fontWeight={700}
            opacity={0.7}
          >
            {node.icon}
          </text>

          {/* 节点标签 */}
          <text
            x={node.x} y={node.y + 11}
            fill="#F1F5F9"
            fontSize={12}
            textAnchor="middle"
            fontWeight={600}
          >
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

/* ─── 子组件：流光粒子管道 ──────────────────── */

const FlowParticles = ({ progress }: { progress: number }) => {
  const particleCount = 8;
  const activeCount = Math.ceil((progress / 100) * particleCount);

  return (
    <div style={{ position: 'relative', width: 60, height: 80, flexShrink: 0 }}>
      {/* 管道背景 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 3,
          transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 2,
        }}
      />
      {/* 流光管道 */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: 3,
          transform: 'translateX(-50%)',
          background: `linear-gradient(to bottom, rgba(59,130,246,0.6), rgba(139,92,246,0.6), rgba(6,182,212,0.6))`,
          borderRadius: 2,
          height: `${progress}%`,
          transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 0 8px rgba(59,130,246,0.3)',
        }}
      />
      {/* 粒子 */}
      {Array.from({ length: particleCount }).map((_, i) => {
        const isActive = i < activeCount;
        const delay = (i / particleCount) * 1.2;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: `${(i / (particleCount - 1)) * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: isActive ? 10 : 6,
              height: isActive ? 10 : 6,
              borderRadius: '50%',
              background: isActive
                ? 'linear-gradient(135deg, #3B82F6, #8B5CF6)'
                : 'rgba(255,255,255,0.08)',
              boxShadow: isActive ? '0 0 12px rgba(59,130,246,0.5)' : 'none',
              opacity: isActive ? 1 : 0.3,
              transition: 'all 0.5s ease',
              animation: isActive
                ? `particlePulse 1.5s ease ${delay}s infinite`
                : 'none',
            }}
          />
        );
      })}
      {/* 样式注入 */}
      <style>{`
        @keyframes particlePulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

/* ─── 主组件 ────────────────────────────────── */

export default function KnowledgeMiningModal() {
  const { knowledgeMiningModalOpen, setKnowledgeMiningModalOpen, knowledgeMiningWorkOrder } = useStore();
  const [phase, setPhase] = useState<Phase>('idle');
  const [selectedCause, setSelectedCause] = useState<CauseOption | null>(null);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionText, setExtractionText] = useState('');
  const [particlesVisible, setParticlesVisible] = useState(false);

  // 动态计算工单数据：从 store 取或使用兜底数据
  const woData = knowledgeMiningWorkOrder || FALLBACK_WO;
  const woDeviceName = woData.device?.name || woData.device || '';
  const woDeviceCode = woData.device?.code || woData.deviceCode || '';
  const woArea = woData.area || woData.device?.area || '';
  const woFaultDesc = woData.description || woData.faultDesc || '';
  const woId = woData.code || woData.id || '';
  const woFaultType = woData.faultType || '机械';
  const woAiDiagnosis = woData.aiRecommendation?.diagnosis || woData.aiDiagnosis || '';
  const woAiConfidence = woData.aiRecommendation?.confidence ?? woData.aiConfidence ?? 85;
  const woAiAdvice = woData.aiRecommendation?.advice || woData.aiAdvice || '';
  const causeOptions = buildCauseOptions(woData);

  // 重置状态
  const resetState = () => {
    setPhase('idle');
    setSelectedCause(null);
    setExtractionProgress(0);
    setExtractionText('');
    setParticlesVisible(false);
  };

  const handleClose = () => {
    resetState();
    setKnowledgeMiningModalOpen(false);
  };

  const handleCompleteRepair = () => {
    setPhase('selecting');
  };

  const handleCauseSelect = (cause: CauseOption) => {
    setSelectedCause(cause);
    setPhase('extracting');
    setParticlesVisible(true);
  };

  // 知识提取动画序列
  useEffect(() => {
    if (phase !== 'extracting') return;

    const symptomText = woFaultDesc.split(/[，,、]/)[0] || woFaultDesc;
    const rootCauseText = selectedCause?.rootCause || woData.rootCause || woFaultType;
    const solutionText = selectedCause?.solution || woData.resolution || '已修复';
    const steps = [
      { at: 0, text: '正在解析工单文本...' },
      { at: 15, text: '正在提取故障实体...' },
      { at: 30, text: `正在识别故障表现 → ${symptomText.substring(0, 10)}` },
      { at: 45, text: `正在关联根因 → ${rootCauseText.substring(0, 10)}` },
      { at: 60, text: `正在映射解决方案 → ${solutionText.substring(0, 10)}` },
      { at: 75, text: '正在构建知识图谱连接...' },
      { at: 90, text: '知识入库完成 ✓' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      setExtractionProgress((prev) => {
        const next = prev + 2;
        // 更新文字
        while (currentStep < steps.length - 1 && next >= steps[currentStep + 1].at) {
          currentStep++;
          setExtractionText(steps[currentStep].text);
        }
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase('complete'), 400);
          return 100;
        }
        return next;
      });
    }, 70);

    return () => clearInterval(interval);
  }, [phase]);

  /* ─── 阶段渲染 ────────────────────────────── */

  const renderIdle = () => (
    <div style={{ padding: 28 }}>
      {/* 头部说明 */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
            color: '#fff',
            boxShadow: '0 8px 24px rgba(6,182,212,0.25)',
          }}
        >
          <ToolOutlined />
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#F1F5F9',
            marginBottom: 6,
            letterSpacing: '0.02em',
          }}
        >
          维修完成确认
        </div>
        <Text style={{ color: '#64748B', fontSize: 13, display: 'block' }}>
          根据 AI 诊断建议完成维修后，系统将自动沉淀知识到知识库
        </Text>
      </div>

      {/* 工单卡片 */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)',
          padding: 20,
          marginBottom: 20,
        }}
      >
        {/* 工单头 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(59,130,246,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
                fontSize: 16,
              }}
            >
              <ToolOutlined />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>
                {woId}
              </div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                {woDeviceName} · {woDeviceCode} · {woArea}
              </div>
            </div>
          </div>
          <div
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: '#F59E0B',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            维修中
          </div>
        </div>

        {/* 故障描述 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>故障描述</div>
          <div style={{ fontSize: 14, color: '#CBD5E1', lineHeight: 1.6 }}>
            「{woFaultDesc}」
          </div>
        </div>

        {/* AI 诊断结果 */}
        <div
          style={{
            background: 'rgba(59,130,246,0.06)',
            borderRadius: 10,
            border: '1px solid rgba(59,130,246,0.15)',
            padding: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 12,
              }}
            >
              <ThunderboltOutlined />
            </div>
            <Text strong style={{ color: '#F1F5F9', fontSize: 13 }}>
              AI 辅助诊断建议
            </Text>
            <span
              style={{
                fontSize: 11,
                color: '#64748B',
                marginLeft: 'auto',
              }}
            >
               置信度 {woAiConfidence}%
            </span>
          </div>
          <div style={{ fontSize: 14, color: '#F1F5F9', fontWeight: 600, marginBottom: 4 }}>
            {woAiDiagnosis}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8' }}>{woAiAdvice}</div>
        </div>
      </div>

      {/* 完成维修按钮 */}
      <Button
        type="primary"
        size="large"
        block
        onClick={handleCompleteRepair}
        style={{
          height: 48,
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
          border: 'none',
          boxShadow: '0 4px 16px rgba(6,182,212,0.3)',
        }}
      >
        <CheckCircleOutlined /> 完成维修
      </Button>
    </div>
  );

  /* ──────────────────────────────────────────── */

  const renderSelecting = () => (
    <div style={{ padding: 28 }}>
      {/* 头部 */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
            color: '#fff',
            boxShadow: '0 8px 24px rgba(239,68,68,0.25)',
          }}
        >
          <NodeIndexOutlined />
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#F1F5F9',
            marginBottom: 6,
            letterSpacing: '0.02em',
          }}
        >
          确认维修结果
        </div>
        <Text style={{ color: '#64748B', fontSize: 13, display: 'block' }}>
          请选择本次维修的实际原因与处理方式，系统将沉淀为可复用的知识
        </Text>
      </div>

      {/* 原因选项 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {causeOptions.map((cause) => (
          <div
            key={cause.id}
            onClick={() => handleCauseSelect(cause)}
            style={{
              cursor: 'pointer',
              background:
                selectedCause?.id === cause.id
                  ? 'rgba(59,130,246,0.08)'
                  : 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              border:
                selectedCause?.id === cause.id
                  ? '1px solid rgba(59,130,246,0.3)'
                  : '1px solid rgba(255,255,255,0.06)',
              padding: '16px 18px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (selectedCause?.id !== cause.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedCause?.id !== cause.id) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: `2px solid ${
                    selectedCause?.id === cause.id ? '#3B82F6' : 'rgba(255,255,255,0.15)'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                {selectedCause?.id === cause.id && (
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#3B82F6',
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#F1F5F9',
                    lineHeight: 1.5,
                  }}
                >
                  {cause.label}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      background: 'rgba(239,68,68,0.12)',
                      color: '#EF4444',
                      fontWeight: 500,
                    }}
                  >
                    根因: {cause.rootCause}
                  </span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      background: 'rgba(34,197,94,0.12)',
                      color: '#22C55E',
                      fontWeight: 500,
                    }}
                  >
                    方案: {cause.solution}
                  </span>
                </div>
              </div>
              <RightOutlined style={{ color: '#475569', fontSize: 12 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ──────────────────────────────────────────── */

  const renderExtracting = () => (
    <div style={{ padding: 32 }}>
      {/* 流光标题 */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div
          className="knowledge-shimmer"
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
            letterSpacing: '0.04em',
          }}
        >
          <LoadingOutlined style={{ marginRight: 10, fontSize: 20 }} />
          知识入库中...
        </div>
        <Text style={{ color: '#64748B', fontSize: 13, display: 'block' }}>
          正在将 {woDeviceName} 的维修经验转化为结构化的知识图谱
        </Text>
      </div>

      {/* 流转换动画区域 */}
      <div
        style={{
          background: 'rgba(11, 15, 25, 0.8)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          padding: '28px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景网格 */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.04,
          }}
        >
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#3B82F6" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* 左侧：工单文本 */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 16,
              opacity: extractionProgress < 80 ? 1 : 0.4,
              transition: 'opacity 0.5s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
                fontSize: 11,
                color: '#64748B',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#3B82F6',
                  display: 'inline-block',
                }}
              />
              工单文本 · Source
            </div>
            <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.7 }}>
            「{woFaultDesc}」
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {[woDeviceName, woFaultType, woFaultDesc.split(/[，,、]/)[0] || '故障'].filter(Boolean).map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '2px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                    background: 'rgba(59,130,246,0.12)',
                    color: '#60A5FA',
                    border: '1px solid rgba(59,130,246,0.15)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 管道动画 */}
          <FlowParticles progress={extractionProgress} />

          {/* 右侧：知识图谱节点 */}
          <div
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 10,
                fontSize: 11,
                color: '#64748B',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#8B5CF6',
                  display: 'inline-block',
                }}
              />
              知识图谱节点 · Target
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: '故障设备', value: woDeviceName, color: '#3B82F6', progress: 30 },
                { label: '故障表现', value: woFaultDesc.split(/[，,、]/)[0] || woFaultDesc, color: '#F59E0B', progress: 50 },
                { label: '根因', value: selectedCause?.rootCause || woData.rootCause || woFaultType, color: '#EF4444', progress: 70 },
                { label: '解决方案', value: selectedCause?.solution || woData.resolution || '已修复', color: '#22C55E', progress: 85 },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    opacity: extractionProgress >= item.progress ? 1 : 0.2,
                    transition: 'all 0.5s ease',
                    transform:
                      extractionProgress >= item.progress
                        ? 'translateX(0)'
                        : 'translateX(10px)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: item.color,
                      flexShrink: 0,
                      boxShadow: `0 0 6px ${item.color}60`,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#64748B', width: 60, flexShrink: 0 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 进度条 */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            height: 4,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${extractionProgress}%`,
              borderRadius: 2,
              background:
                'linear-gradient(90deg, #3B82F6, #8B5CF6, #06B6D4, #22C55E)',
              transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              boxShadow: '0 0 12px rgba(59,130,246,0.3)',
            }}
          >
            {/* 进度头光晕 */}
            <div
              style={{
                position: 'absolute',
                right: -4,
                top: -4,
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: '#8B5CF6',
                opacity: 0.6,
                filter: 'blur(4px)',
              }}
            />
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: 12, color: '#475569' }}>0%</span>
          <span
            style={{
              fontSize: 13,
              color: '#94A3B8',
              fontWeight: 500,
              transition: 'all 0.3s',
            }}
          >
            {extractionText || '准备开始...'}
          </span>
          <span style={{ fontSize: 12, color: '#475569' }}>100%</span>
        </div>
      </div>
    </div>
  );

  /* ──────────────────────────────────────────── */

  const renderComplete = () => (
    <div style={{ padding: '24px 28px' }}>
      {/* 成功头部 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid rgba(34,197,94,0.2)',
              animation: 'successRing 2s ease-out infinite',
            }}
          />
          <CheckCircleOutlined
            style={{ fontSize: 32, color: '#22C55E' }}
          />
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#F1F5F9',
            marginBottom: 6,
          }}
        >
          知识沉淀完成
        </div>
        <Text style={{ color: '#64748B', fontSize: 13, display: 'block' }}>
          本次维修经验已成功纳入知识图谱，AI 将持续学习优化
        </Text>
      </div>

      {/* 知识图谱预览 */}
      <div
        style={{
          background: '#0D1117',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        {/* 图谱头 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <ApartmentOutlined style={{ color: '#8B5CF6', fontSize: 16 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>
            知识图谱预览
          </span>
          <span style={{ fontSize: 11, color: '#475569' }}>Neo4j Graph</span>
          <div
            style={{
              marginLeft: 'auto',
              display: 'flex',
              gap: 6,
            }}
          >
            {[
              { label: '设备', color: '#3B82F6' },
              { label: '现象', color: '#F59E0B' },
              { label: '根因', color: '#EF4444' },
              { label: '方案', color: '#22C55E' },
            ].map((item) => (
              <span
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  color: '#64748B',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: item.color,
                    display: 'inline-block',
                  }}
                />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* 图谱区域 */}
        <div
          style={{
            padding: '8px 0',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <KnowledgeGraph
            deviceName={woDeviceName}
            symptom={woFaultDesc.length > 4 ? woFaultDesc.substring(0, 8) : woFaultDesc}
            rootCause={selectedCause?.rootCause || woData.rootCause || woFaultType}
            solution={selectedCause?.solution || woData.resolution || '已修复'}
          />
        </div>
      </div>

      {/* 成功提示条 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'rgba(34,197,94,0.06)',
          borderRadius: 12,
          border: '1px solid rgba(34,197,94,0.15)',
          padding: '14px 18px',
          animation: 'fadeInUp 0.5s ease 0.3s both',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(34,197,94,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22C55E',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          <ThunderboltOutlined />
        </div>
        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#F1F5F9',
              lineHeight: 1.4,
            }}
          >
            新知识已沉淀，下次遇到类似异响，AI 将优先推荐此方案。
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
            此知识可通过「知识库」模块进行审核与管理
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── 完整模态窗 ────────────────────────────── */

  return (
    <Modal
      title={null}
      open={knowledgeMiningModalOpen}
      onCancel={handleClose}
      width={720}
      centered
      footer={null}
      closable={false}
      maskClosable={false}
      destroyOnHidden
      styles={{
        body: { padding: 0, maxHeight: '88vh' },
        mask: { background: 'rgba(0,0,0,0.6)' },
      }}
      className="knowledge-mining-modal"
    >
      <style>{`
        /* ─── 整体模态窗（暗色风格） ─── */
        .knowledge-mining-modal .ant-modal-content {
          background: #0F1520;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05);
          overflow: hidden;
        }
        .knowledge-mining-modal .ant-modal-header { display: none; }
        .knowledge-mining-modal .ant-modal-body {
          padding: 0;
          background: transparent;
        }

        /* ─── 滚动条 ─── */
        .knowledge-mining-modal .km-scroll::-webkit-scrollbar { width: 5px; }
        .knowledge-mining-modal .km-scroll::-webkit-scrollbar-track { background: transparent; }
        .knowledge-mining-modal .km-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.2);
          border-radius: 3px;
        }

        /* ─── 流光文字动画 ─── */
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .knowledge-shimmer {
          background: linear-gradient(90deg, #3B82F6, #8B5CF6, #06B6D4, #22C55E, #3B82F6);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2.5s linear infinite;
        }

        /* ─── 通用动画 ─── */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes successRing {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ─── Header ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          background: 'linear-gradient(135deg, #0F1520 0%, #131A2A 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
            }}
          >
            <NodeIndexOutlined />
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#F1F5F9',
                letterSpacing: '0.02em',
              }}
            >
              知识自动沉淀
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {phase === 'idle' && 'Knowledge Mining · 维修完成确认'}
              {phase === 'selecting' && 'Knowledge Mining · 确认维修结果'}
              {phase === 'extracting' && 'Knowledge Mining · 知识入库中'}
              {phase === 'complete' && 'Knowledge Mining · 沉淀完成'}
            </div>
          </div>
        </div>
        <div
          onClick={handleClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748B',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = '#F1F5F9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#64748B';
          }}
        >
          <CloseOutlined style={{ fontSize: 16 }} />
        </div>
      </div>

      {/* ─── 内容区域 ─── */}
      <div
        className="km-scroll"
        style={{
          overflowY: 'auto',
          maxHeight: 'calc(88vh - 140px)',
        }}
      >
        {phase === 'idle' && renderIdle()}
        {phase === 'selecting' && renderSelecting()}
        {phase === 'extracting' && renderExtracting()}
        {phase === 'complete' && renderComplete()}
      </div>

      {/* ─── 底部操作栏 ─── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(15, 21, 32, 0.9)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background:
                phase === 'complete'
                  ? '#22C55E'
                  : phase === 'extracting'
                  ? '#8B5CF6'
                  : '#F59E0B',
              display: 'inline-block',
              animation: phase === 'extracting' ? 'pulse 1.2s ease infinite' : 'none',
            }}
          />
          {phase === 'idle' && '等待维修确认'}
          {phase === 'selecting' && '请选择维修结果'}
          {phase === 'extracting' && '正在沉淀知识...'}
          {phase === 'complete' && '沉淀完成'}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {phase === 'complete' && (
            <Button
              type="primary"
              onClick={handleClose}
              style={{
                borderRadius: 8,
                background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
              }}
            >
              <CheckCircleOutlined /> 关闭
            </Button>
          )}
          {(phase === 'idle' || phase === 'selecting') && (
            <Button
              onClick={handleClose}
              style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', background: 'rgba(255,255,255,0.06)' }}
            >
              取消
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
