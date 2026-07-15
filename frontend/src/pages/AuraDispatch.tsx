// @ts-nocheck - Dynamic data types with complex column definitions
import { useMemo, useState, useCallback } from 'react';
import { Button, Typography, Tag, Tabs, Progress, Slider } from 'antd';
import {
  RobotOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined,
  AimOutlined,
  StarOutlined,
  BarChartOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import ReactECharts from '../components/ReactECharts';
import { useResponsive } from '../hooks/useResponsive';

const { Text } = Typography;

/* ─── 类型定义 ──────────────────────────────── */

interface Technician {
  id: string;
  name: string;
  avatar: string;
  skills: {
    mechanical: number;
    electrical: number;
    hydraulic: number;
    pneumatic: number;
    software: number;
  };
  currentLoad: number;
  weeklyCompleted: number;
  avgResponseMin: number;
  workshopId: string;
  status: 'available' | 'busy' | 'overtime' | 'absent';
  location: string;
  skillTrend: { date: string; score: number }[];
}

interface DispatchCandidate {
  techId: string;
  techName: string;
  matchScore: number;
  reasons: string[];
  currentLoad: number;
  availability: boolean;
}

interface DispatchTask {
  woId: string;
  woCode: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  faultType: string;
  deviceId: string;
  deviceName: string;
  location: string;
  slaMin: number;
  slaRemainingMin: number;
  candidates: DispatchCandidate[];
  recommended: string;
  assignMode: 'auto' | 'confirm' | 'pool';
  assignedTech?: string;
}

/* ─── Mock 技师数据 ─────────────────────────── */

const mockTechnicians: Technician[] = [
  {
    id: 't1', name: '张工', avatar: '👨‍🔧',
    skills: { mechanical: 95, electrical: 70, hydraulic: 60, pneumatic: 50, software: 40 },
    currentLoad: 1, weeklyCompleted: 12, avgResponseMin: 8.2,
    workshopId: 'W1', status: 'available', location: '加工区A',
    skillTrend: Array.from({ length: 12 }, (_, i) => ({ date: `${i + 1}月`, score: 85 + Math.sin(i) * 5 + i * 0.5 })),
  },
  {
    id: 't2', name: '李工', avatar: '👨‍💼',
    skills: { mechanical: 75, electrical: 90, hydraulic: 70, pneumatic: 55, software: 70 },
    currentLoad: 2, weeklyCompleted: 8, avgResponseMin: 12.5,
    workshopId: 'W2', status: 'busy', location: '电气区B',
    skillTrend: Array.from({ length: 12 }, (_, i) => ({ date: `${i + 1}月`, score: 80 + Math.cos(i) * 4 + i * 0.4 })),
  },
  {
    id: 't3', name: '王工', avatar: '👷',
    skills: { mechanical: 80, electrical: 60, hydraulic: 95, pneumatic: 70, software: 45 },
    currentLoad: 0, weeklyCompleted: 15, avgResponseMin: 6.8,
    workshopId: 'W1', status: 'available', location: '液压区C',
    skillTrend: Array.from({ length: 12 }, (_, i) => ({ date: `${i + 1}月`, score: 88 + Math.sin(i * 0.8) * 6 + i * 0.6 })),
  },
  {
    id: 't4', name: '赵工', avatar: '👩‍🔧',
    skills: { mechanical: 60, electrical: 65, hydraulic: 55, pneumatic: 90, software: 80 },
    currentLoad: 3, weeklyCompleted: 6, avgResponseMin: 15.2,
    workshopId: 'W3', status: 'busy', location: '装配区D',
    skillTrend: Array.from({ length: 12 }, (_, i) => ({ date: `${i + 1}月`, score: 75 + Math.sin(i * 0.6) * 5 + i * 0.3 })),
  },
  {
    id: 't5', name: '孙工', avatar: '👨‍💻',
    skills: { mechanical: 55, electrical: 85, hydraulic: 65, pneumatic: 70, software: 92 },
    currentLoad: 1, weeklyCompleted: 10, avgResponseMin: 9.1,
    workshopId: 'W2', status: 'available', location: '数控区E',
    skillTrend: Array.from({ length: 12 }, (_, i) => ({ date: `${i + 1}月`, score: 82 + Math.cos(i * 0.7) * 5 + i * 0.5 })),
  },
  {
    id: 't6', name: '刘工', avatar: '🧑‍🔧',
    skills: { mechanical: 90, electrical: 55, hydraulic: 70, pneumatic: 60, software: 50 },
    currentLoad: 0, weeklyCompleted: 18, avgResponseMin: 5.3,
    workshopId: 'W1', status: 'available', location: '机加工F',
    skillTrend: Array.from({ length: 12 }, (_, i) => ({ date: `${i + 1}月`, score: 92 + Math.sin(i) * 3 + i * 0.4 })),
  },
];

/* ─── Mock 待调度工单数据 ───────────────────── */

const mockDispatchTasks: DispatchTask[] = [
  {
    woId: 'wo1', woCode: 'WO-20260702-0003',
    priority: 'P0', faultType: '主轴异响', deviceId: 'd1', deviceName: 'CNC-102',
    location: '加工区A', slaMin: 30, slaRemainingMin: 12,
    candidates: [
      { techId: 't1', techName: '张工', matchScore: 98, reasons: ['机械技能95，最匹配', '加工区A，距离最近', 'SLA响应8.2min'], currentLoad: 1, availability: true },
      { techId: 't6', techName: '刘工', matchScore: 92, reasons: ['机械技能90', '机加工F，同区', 'SLA响应5.3min'], currentLoad: 0, availability: true },
      { techId: 't3', techName: '王工', matchScore: 75, reasons: ['机械技能80', '加工区A，距离近'], currentLoad: 0, availability: true },
    ],
    recommended: 't1', assignMode: 'auto',
  },
  {
    woId: 'wo2', woCode: 'WO-20260702-0004',
    priority: 'P0', faultType: '变频器故障', deviceId: 'd5', deviceName: 'Pump-08',
    location: '电气区B', slaMin: 30, slaRemainingMin: 22,
    candidates: [
      { techId: 't2', techName: '李工', matchScore: 95, reasons: ['电气技能90，最匹配', '电气区B，距离最近'], currentLoad: 2, availability: true },
      { techId: 't5', techName: '孙工', matchScore: 88, reasons: ['电气技能85', '数控区E，邻近'], currentLoad: 1, availability: true },
      { techId: 't1', techName: '张工', matchScore: 65, reasons: ['电气技能70', '加工区A，需移动'], currentLoad: 1, availability: true },
    ],
    recommended: 't2', assignMode: 'auto',
  },
  {
    woId: 'wo3', woCode: 'WO-20260702-0005',
    priority: 'P1', faultType: '液压缸泄漏', deviceId: 'd3', deviceName: 'Press-15',
    location: '液压区C', slaMin: 60, slaRemainingMin: 45,
    candidates: [
      { techId: 't3', techName: '王工', matchScore: 96, reasons: ['液压技能95，最匹配', '液压区C，距离最近', 'SLA响应6.8min'], currentLoad: 0, availability: true },
      { techId: 't6', techName: '刘工', matchScore: 72, reasons: ['液压技能70', '机加工F，需移动'], currentLoad: 0, availability: true },
      { techId: 't1', techName: '张工', matchScore: 65, reasons: ['液压技能60', '加工区A，邻近'], currentLoad: 1, availability: true },
    ],
    recommended: 't3', assignMode: 'confirm',
  },
  {
    woId: 'wo4', woCode: 'WO-20260702-0006',
    priority: 'P1', faultType: '数控系统报警', deviceId: 'd7', deviceName: 'CNC-205',
    location: '数控区E', slaMin: 60, slaRemainingMin: 55,
    candidates: [
      { techId: 't5', techName: '孙工', matchScore: 94, reasons: ['软件技能92，最匹配', '数控区E，距离最近', '电气技能85'], currentLoad: 1, availability: true },
      { techId: 't2', techName: '李工', matchScore: 82, reasons: ['软件技能70', '电气区B，邻近'], currentLoad: 2, availability: true },
      { techId: 't1', techName: '张工', matchScore: 40, reasons: ['软件技能40，不匹配'], currentLoad: 1, availability: true },
    ],
    recommended: 't5', assignMode: 'confirm',
  },
  {
    woId: 'wo5', woCode: 'WO-20260702-0007',
    priority: 'P2', faultType: '气动阀门卡滞', deviceId: 'd9', deviceName: 'Valve-33',
    location: '装配区D', slaMin: 240, slaRemainingMin: 180,
    candidates: [
      { techId: 't4', techName: '赵工', matchScore: 90, reasons: ['气动技能90，最匹配', '装配区D，距离最近'], currentLoad: 3, availability: true },
      { techId: 't3', techName: '王工', matchScore: 68, reasons: ['气动技能70', '液压区C，需移动'], currentLoad: 0, availability: true },
      { techId: 't1', techName: '张工', matchScore: 50, reasons: ['气动技能50'], currentLoad: 1, availability: true },
    ],
    recommended: 't4', assignMode: 'pool',
  },
  {
    woId: 'wo6', woCode: 'WO-20260702-0008',
    priority: 'P3', faultType: '润滑系统保养', deviceId: 'd11', deviceName: 'Lathe-07',
    location: '机加工F', slaMin: 240, slaRemainingMin: 220,
    candidates: [
      { techId: 't6', techName: '刘工', matchScore: 88, reasons: ['机械技能90', '机加工F，距离最近', '空闲可接'], currentLoad: 0, availability: true },
      { techId: 't1', techName: '张工', matchScore: 82, reasons: ['机械技能95', '加工区A，邻近'], currentLoad: 1, availability: true },
      { techId: 't3', techName: '王工', matchScore: 75, reasons: ['机械技能80', '液压区C，需移动'], currentLoad: 0, availability: true },
    ],
    recommended: 't6', assignMode: 'pool',
  },
];

/* ─── Mock 调度指标 ─────────────────────────── */

const mockMetrics = {
  avgResponseMin: 8.4,
  avgResponseLastWeek: 12.1,
  slaComplianceRate: 87.5,
  slaComplianceLastWeek: 76.2,
  totalDispatched: 48,
  autoDispatched: 12,
  aiRecommended: 24,
  poolClaimed: 12,
  rescheduled: 3,
  loadBalanceIndex: 0.82,
};

/* ─── Mock 预测性待命 ───────────────────────── */

const mockPredictiveStandby = [
  {
    deviceId: 'd1', deviceName: 'CNC-102',
    healthScore: 62, failureProb30d: 55,
    recommendedTechnician: '张工',
    reason: '主轴健康评分从82降至62，轴承磨损加剧，30天内故障概率55%',
  },
  {
    deviceId: 'd3', deviceName: 'Press-15',
    healthScore: 58, failureProb30d: 62,
    recommendedTechnician: '王工',
    reason: '液压系统泄漏率持续上升，液压泵预计45天内需更换',
  },
  {
    deviceId: 'd7', deviceName: 'CNC-205',
    healthScore: 45, failureProb30d: 78,
    recommendedTechnician: '孙工',
    reason: '数控系统异常报警频率30天增长300%，主轴伺服驱动老化',
  },
];

/* ─── Mock 动态重调度 ───────────────────────── */

const mockReschedules = [
  {
    woId: 'wo-res1', woCode: 'WO-20260701-0021',
    deviceName: 'Robot-12', faultType: '夹具故障',
    currentTech: '赵工', reason: '已接单45min未响应（SLA预期15min）',
    suggestedTech: '王工', timeSave: '预计节省30min',
  },
  {
    woId: 'wo-res2', woCode: 'WO-20260701-0019',
    deviceName: 'Conveyor-05', faultType: '传送带偏移',
    currentTech: '李工', reason: '处理时长超SLA预期（实际50min > 预期35min）',
    suggestedTech: '孙工', timeSave: '预计节省15min',
  },
];

/* ─── 优先级样式 ────────────────────────────── */

const PRIORITY_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  P0: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: '紧急' },
  P1: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: '重要' },
  P2: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', label: '一般' },
  P3: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: '低' },
};

/* ─── 技能维度 ──────────────────────────────── */

const SKILL_DIMS = [
  { key: 'mechanical', label: '机械' },
  { key: 'electrical', label: '电气' },
  { key: 'hydraulic', label: '液压' },
  { key: 'pneumatic', label: '气动' },
  { key: 'software', label: '软件' },
];

/* ─── 技师状态标签 ──────────────────────────── */

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  available: { color: '#10B981', label: '可用' },
  busy: { color: '#F59E0B', label: '忙碌' },
  overtime: { color: '#EF4444', label: '加班' },
  absent: { color: '#6B7280', label: '缺勤' },
};

/* ═══════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════ */
export default function AuraDispatch() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;
  const [activeTab, setActiveTab] = useState('0');
  const [assignedTasks, setAssignedTasks] = useState<Set<string>>(new Set());
  const [selectedTechnician, setSelectedTechnician] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [trendExpanded, setTrendExpanded] = useState<Record<string, boolean>>({});
  const [expandedEngineers, setExpandedEngineers] = useState<Set<string>>(new Set());

  const tabItems = useMemo(() => [
    { key: '0', label: <span><RobotOutlined style={{ marginRight: 4 }} />待调度工单</span> },
    { key: '1', label: <span><TeamOutlined style={{ marginRight: 4 }} />技师画像</span> },
    { key: '2', label: <span><BarChartOutlined style={{ marginRight: 4 }} />调度优化</span> },
  ], []);

  // 调度效果柱状图配置（在组件顶层使用 useMemo）
  const dispatchBarOption = useMemo(() => {
    const responseTrend = Array.from({ length: 7 }, (_, i) => {
      const day = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i];
      return { name: day, value: 10 + Math.sin(i) * 3 - i * 0.3 };
    });
    return {
      backgroundColor: 'transparent',
      grid: { left: 40, right: 10, top: 20, bottom: 25 },
      xAxis: {
        type: 'category' as const,
        data: responseTrend.map(d => d.name),
        axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.12)' } },
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        name: '分钟',
        nameTextStyle: { color: 'rgba(255,255,255,0.25)', fontSize: 9 },
      },
      series: [
        {
          type: 'line' as const,
          data: responseTrend.map(d => d.value),
          smooth: true,
          lineStyle: { color: '#3B82F6', width: 2 },
          itemStyle: { color: '#3B82F6' },
          areaStyle: {
            color: {
              type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(59,130,246,0.3)' },
                { offset: 1, color: 'rgba(59,130,246,0.02)' },
              ],
            },
          },
        },
      ],
    };
  }, []);

  // ── 确认派工 ──
  const handleAssign = useCallback((task: DispatchTask) => {
    setAssignedTasks(prev => new Set(prev).add(task.woId));
  }, []);

  // ── 取消选中技师 ──
  const handleSelectTech = useCallback((techId: string) => {
    setSelectedTechnician(prev => prev === techId ? null : techId);
  }, []);

  /* ═════════════════════════════════════════════
     Tab 0: 待调度工单
     ═════════════════════════════════════════════ */
  const renderTaskList = () => {
    const activeTasks = mockDispatchTasks.filter(t => !assignedTasks.has(t.woId));
    const assignedTaskDetails = mockDispatchTasks.filter(t => assignedTasks.has(t.woId));

    return (
      <div style={{
        display: 'flex', flex: 1, minHeight: 0, gap: isCompact ? 8 : 12,
        padding: isCompact ? '6px 12px 6px' : '8px 20px 12px',
      }}>
        {/* 左侧：工单列表 */}
        <div style={{ flex: isCompact ? 1 : 7, display: 'flex', flexDirection: 'column', gap: isCompact ? 6 : 8, minWidth: 0, overflow: 'auto' }}>
          {/* 批量操作 */}
          {activeTasks.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              padding: '6px 10px',
              background: 'rgba(59,130,246,0.06)',
              borderRadius: 6,
              border: '1px solid rgba(59,130,246,0.15)',
            }}>
              <Text style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.6)', flex: 1 }}>
                {activeTasks.length} 个工单待调度
              </Text>
              <Button
                type="primary"
                size={isCompact ? 'small' : 'middle'}
                icon={<AimOutlined />}
                onClick={() => {
                  const allIds = new Set(activeTasks.map(t => t.woId));
                  setAssignedTasks(prev => {
                    const next = new Set(prev);
                    allIds.forEach(id => next.add(id));
                    return next;
                  });
                }}
                style={{
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  border: 'none', borderRadius: 6,
                  fontSize: isCompact ? 10 : 11, height: isCompact ? 24 : 28,
                }}
              >
                一键确认全部推荐
              </Button>
            </div>
          )}

          {/* 待调度工单 */}
          {activeTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              ✅ 所有工单已调度完成
            </div>
          ) : (
            activeTasks.map((task) => {
              const pStyle = PRIORITY_STYLE[task.priority];
              const isP0 = task.priority === 'P0';
              const assigned = assignedTasks.has(task.woId);

              return (
                <div
                  key={task.woId}
                  style={{
                    background: isP0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isP0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: isCompact ? '8px 10px' : '10px 14px',
                    opacity: assigned ? 0.5 : 1,
                    transition: 'opacity 0.3s',
                  }}
                >
                  {/* 工单头部 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 10, marginBottom: isCompact ? 4 : 6 }}>
                    <Tag
                      color={task.priority === 'P0' ? 'error' : task.priority === 'P1' ? 'warning' : 'blue'}
                      style={{ borderRadius: 4, fontSize: isCompact ? 9 : 10, padding: '0 6px', lineHeight: '18px', fontWeight: 700, border: 'none' }}
                    >
                      {pStyle.label} {task.priority}
                    </Tag>
                    <Text style={{ fontSize: isCompact ? 11 : 12, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      {task.woCode}
                    </Text>
                    <Text style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.5)' }}>
                      · {task.deviceName}
                    </Text>
                    <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)' }}>
                      {task.faultType}
                    </Text>
                    {isP0 && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: isCompact ? 9 : 10, color: '#EF4444' }}>
                        <ClockCircleOutlined />
                        <span>SLA剩余 {task.slaRemainingMin}min</span>
                      </div>
                    )}
                    {assigned && (
                      <Tag color="success" style={{ borderRadius: 4, fontSize: isCompact ? 9 : 10, padding: '0 6px', lineHeight: '18px', border: 'none' }}>
                        <CheckCircleOutlined /> 已派工
                      </Tag>
                    )}
                  </div>

                  {/* AI 推荐候选人 */}
                  {!assigned && task.assignMode !== 'pool' && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: isCompact ? 4 : 8,
                      flexWrap: 'wrap',
                      padding: isCompact ? '4px 6px' : '6px 8px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 6,
                    }}>
                      <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(124,58,237,0.9)', fontWeight: 600 }}>
                        AI推荐
                      </Text>
                      {task.candidates.slice(0, 3).map((c, idx) => (
                        <div key={c.techId} style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          padding: isCompact ? '2px 6px' : '3px 8px',
                          background: idx === 0 ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.05)',
                          border: idx === 0 ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 4,
                          fontSize: isCompact ? 9 : 10,
                          cursor: 'pointer',
                        }}
                        onClick={() => { handleSelectTech(c.techId); handleAssign(task); }}
                      >
                          <span style={{ color: 'rgba(255,255,255,0.7)' }}>{c.techName}</span>
                          <span style={{ color: '#3B82F6', fontWeight: 700 }}>{c.matchScore}%</span>
                        </div>
                      ))}
                      {task.candidates[0]?.reasons[0] && (
                        <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.35)', marginLeft: 2 }}>
                          · {task.candidates[0].reasons[0]}
                        </Text>
                      )}
                    </div>
                  )}

                  {/* 操作按钮 */}
                  {!assigned && task.assignMode !== 'pool' && (
                    <div style={{ display: 'flex', gap: 6, marginTop: isCompact ? 4 : 6 }}>
                      <Button
                        type="primary"
                        size={isCompact ? 'small' : 'middle'}
                        icon={<AimOutlined />}
                        onClick={() => handleAssign(task)}
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', border: 'none', borderRadius: 6, fontSize: isCompact ? 10 : 11, height: isCompact ? 24 : 28, paddingInline: isCompact ? 8 : 12 }}
                      >
                        派工给 {task.candidates.find(c => c.techId === task.recommended)?.techName || '推荐技师'}
                      </Button>

                    </div>
                  )}
                  {task.assignMode === 'pool' && !assigned && (
                    <div style={{ marginTop: isCompact ? 4 : 6 }}>
                      <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(16,185,129,0.7)' }}>
                        🏷️ 智能抢单池 · 技师可自选接单
                      </Text>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* 历史调度 */}
          {assignedTaskDetails.length > 0 && (
            <div style={{
              padding: isCompact ? '8px 10px' : '10px 14px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <Text style={{ fontSize: isCompact ? 11 : 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />历史调度 · {assignedTaskDetails.length}单已完成
              </Text>
              {assignedTaskDetails.map((task) => {
                const rec = task.candidates.find(c => c.techId === task.recommended);
                return (
                  <div key={task.woId} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    fontSize: isCompact ? 9 : 10,
                  }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', width: 130 }}>{task.woCode}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)' }}>{rec?.techName || '-'}</Text>
                    <Tag color="success" style={{ borderRadius: 4, fontSize: 9, padding: '0 4px', lineHeight: '18px', border: 'none', marginLeft: 'auto' }}>
                      SLA {task.slaMin}min达标
                    </Tag>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 右侧：技师实时负载看板 */}
        {!isCompact && (
          <div style={{
            flex: 3, display: 'flex', flexDirection: 'column', gap: 6,
            overflow: 'auto',
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              <TeamOutlined style={{ marginRight: 4 }} />工程师实时负载 · {mockTechnicians.filter(t => t.status === 'available').length}人可用
            </Text>
            {mockTechnicians.map((tech) => {
              const sc = STATUS_CONFIG[tech.status];
              const techWorkOrders = mockDispatchTasks.filter(t => t.candidates.some(c => c.techId === tech.id));
              const showOrders = expandedEngineers.has(tech.id);
              const overallScore = Math.round(Object.values(tech.skills).reduce((a, b) => a + b, 0) / 5);
              return (
                <div key={tech.id} style={{
                  display: 'flex', flexDirection: 'column', gap: 3,
                  padding: '6px 8px',
                  background: selectedTechnician === tech.id ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 6,
                  border: selectedTechnician === tech.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                }}
                onClick={() => { handleSelectTech(tech.id); setExpandedEngineers(prev => { const next = new Set(prev); if (next.has(tech.id)) next.delete(tech.id); else next.add(tech.id); return next; }); }}
              >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #3B82F6, #1E40AF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                      {tech.avatar}
                    </div>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{tech.name}</Text>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.color, display: 'inline-block' }} />
                    <Text style={{ fontSize: 9, color: sc.color }}>{sc.label}</Text>
                    <Text style={{ fontSize: 9, color: '#3B82F6', fontWeight: 700, marginLeft: 'auto' }}>{overallScore}</Text>
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {SKILL_DIMS.map(dim => (
                      <span key={dim.key} style={{
                        fontSize: 8, color: 'rgba(255,255,255,0.4)',
                        background: 'rgba(255,255,255,0.04)', borderRadius: 3, padding: '0 4px',
                      }}>
                        {dim.label}:{tech.skills[dim.key as keyof typeof tech.skills]}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>
                    <span>在办: {tech.currentLoad}</span>
                    <span>本周: {tech.weeklyCompleted}</span>
                    <span>SLA: {tech.avgResponseMin}min</span>
                  </div>
                  {showOrders && (
                    <div style={{ marginTop: 4, padding: '4px 6px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, fontSize: 8 }}>
                      <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 2 }}>关联工单</Text>
                      {techWorkOrders.map(wo => (
                        <div key={wo.woId} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: 'rgba(255,255,255,0.6)' }}>
                          <span>{wo.woCode}</span>
                          <span style={{ color: PRIORITY_STYLE[wo.priority].color }}>{wo.priority}</span>
                        </div>
                      ))}
                      {techWorkOrders.length === 0 && <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>暂无关联工单</Text>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTechnicians = () => {
    // 技能缺口分析
    const teamAvg = SKILL_DIMS.map(dim => ({
      dim: dim.label,
      score: Math.round(mockTechnicians.reduce((s, t) => s + t.skills[dim.key as keyof typeof t.skills], 0) / mockTechnicians.length),
    }));
    const weakest = [...teamAvg].sort((a, b) => a.score - b.score);

    // 对比模式（状态已提升到组件层级）

    const toggleCompare = (techId: string) => {
      setSelectedForCompare((prev: string[]) =>
        prev.includes(techId) ? prev.filter(id => id !== techId) : [...prev, techId]
      );
    };

    const radarOption = (skills: { mechanical: number; electrical: number; hydraulic: number; pneumatic: number; software: number }) => ({
      backgroundColor: 'transparent',
      radar: {
        indicator: [
          { name: '机械', max: 100 }, { name: '电气', max: 100 },
          { name: '液压', max: 100 }, { name: '气动', max: 100 }, { name: '软件', max: 100 },
        ],
        shape: 'polygon' as const,
        center: ['50%', '50%'],
        radius: '60%',
        axisName: { color: 'rgba(255,255,255,0.5)', fontSize: 8 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      },
      series: [{
        type: 'radar' as const,
        data: [{ value: [skills.mechanical, skills.electrical, skills.hydraulic, skills.pneumatic, skills.software], name: '技能', areaStyle: { color: 'rgba(59,130,246,0.2)' }, lineStyle: { color: '#3B82F6', width: 2 }, itemStyle: { color: '#3B82F6' } }],
      }],
    });

    const trendOption = (skillTrend: { date: string; score: number }[]) => ({
      backgroundColor: 'transparent',
      grid: { left: 30, right: 5, top: 10, bottom: 15 },
      xAxis: { type: 'category' as const, data: skillTrend.map(d => d.date), axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8, interval: 2 }, axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } } },
      yAxis: { type: 'value' as const, min: 60, max: 100, axisLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 8 }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
      series: [{ type: 'line' as const, data: skillTrend.map(d => d.score), smooth: true, lineStyle: { color: '#10B981', width: 1.5 }, areaStyle: { color: { type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(16,185,129,0.2)' }, { offset: 1, color: 'rgba(16,185,129,0.01)' }] } }, symbolSize: 3, itemStyle: { color: '#10B981' } }],
    });

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: isCompact ? 6 : 10,
        padding: isCompact ? '6px 12px 6px' : '8px 20px 12px',
        flex: 1, minHeight: 0,
      }}>
        {/* 技能缺口 + 对比模式切换 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: isCompact ? 8 : 16,
          padding: isCompact ? '8px 10px' : '10px 16px',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(139,92,246,0.05) 100%)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: isCompact ? 10 : 12, color: '#F59E0B' }}><StarOutlined /></span>
            <Text style={{ fontSize: isCompact ? 10 : 11, color: '#F59E0B', fontWeight: 600 }}>技能缺口分析</Text>
          </div>
          <div style={{ display: 'flex', gap: isCompact ? 8 : 16, flex: 1, flexWrap: 'wrap' }}>
            {teamAvg.map(d => (
              <div key={d.dim} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.5)' }}>{d.dim}</Text>
                <Progress percent={d.score} size={isCompact ? 'small' : 32} strokeColor={d.score < 60 ? '#EF4444' : d.score < 75 ? '#F59E0B' : '#10B981'} showInfo={false} style={{ width: isCompact ? 30 : 50 }} />
                <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.7)' }}>{d.score}</Text>
              </div>
            ))}
          </div>
          <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)' }}>建议培训: {weakest[0]?.dim}</Text>
          <Button
            size="small"
            type={compareMode ? 'primary' : 'default'}
            onClick={() => { setCompareMode(v => !v); if (compareMode) setSelectedForCompare([]); }}
            style={{ fontSize: 9, height: 22, paddingInline: 8 }}
          >
            {compareMode ? '退出对比' : '对比模式'}
          </Button>
        </div>

        {/* 对比视图（选中技师并排雷达图） */}
        {compareMode && selectedForCompare.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(selectedForCompare.length, 3)}, 1fr)`,
            gap: 8,
            padding: '8px 10px',
            background: 'rgba(59,130,246,0.06)',
            borderRadius: 8,
            border: '1px solid rgba(59,130,246,0.15)',
          }}>
            {selectedForCompare.map(id => {
              const tech = mockTechnicians.find(t => t.id === id);
              if (!tech) return null;
              return (
                <div key={tech.id} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{tech.name}</Text>
                  <ReactECharts option={radarOption(tech.skills)} style={{ height: 140 }} />
                </div>
              );
            })}
          </div>
        )}

        {/* 技师网格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? '1fr' : 'repeat(3, 1fr)',
          gap: isCompact ? 8 : 10,
          flex: 1, minHeight: 0,
        }}>
          {mockTechnicians.map((tech) => {
            const isSelected = selectedTechnician === tech.id;
            const statusConfig = STATUS_CONFIG[tech.status];
            const overallScore = Math.round(Object.values(tech.skills).reduce((a, b) => a + b, 0) / 5);
            const showTrend = trendExpanded[tech.id] ?? false;

            return (
              <div
                key={tech.id}
                style={{
                  background: isSelected ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                  border: isSelected ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: isCompact ? '8px 10px' : '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {/* 技师头部 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isCompact ? 6 : 8 }}>
                  <div
                    onClick={() => {
                      handleSelectTech(tech.id);
                      if (compareMode) toggleCompare(tech.id);
                    }}
                    style={{
                      width: isCompact ? 32 : 38, height: isCompact ? 32 : 38,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isCompact ? 16 : 18, flexShrink: 0,
                    }}
                  >
                    {tech.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: isCompact ? 12 : 13, color: '#FFFFFF', fontWeight: 600 }}>
                      {tech.name} {compareMode && (
                        <span
                          onClick={(e) => { e.stopPropagation(); toggleCompare(tech.id); }}
                          style={{
                            display: 'inline-block', width: 14, height: 14, borderRadius: 3,
                            border: selectedForCompare.includes(tech.id) ? 'none' : '1px solid rgba(255,255,255,0.3)',
                            background: selectedForCompare.includes(tech.id) ? '#3B82F6' : 'transparent',
                            textAlign: 'center', lineHeight: '14px', fontSize: 9, marginLeft: 4, cursor: 'pointer',
                          }}
                        >
                          {selectedForCompare.includes(tech.id) ? '✓' : ''}
                        </span>
                      )}
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusConfig.color, display: 'inline-block' }} />
                      <Text style={{ fontSize: isCompact ? 9 : 10, color: statusConfig.color }}>{statusConfig.label}</Text>
                      <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.3)' }}>· {tech.location}</Text>
                    </div>
                  </div>
                  <Text style={{ fontSize: isCompact ? 11 : 12, color: '#3B82F6', fontWeight: 700 }}>{overallScore}</Text>
                </div>

                {/* 技能雷达图 + 技能条 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                    <ReactECharts option={radarOption(tech.skills)} style={{ height: '100%', width: '100%' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
                    {SKILL_DIMS.map(dim => (
                      <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)', width: isCompact ? 22 : 28, flexShrink: 0 }}>{dim.label}</Text>
                        <Progress percent={tech.skills[dim.key as keyof typeof tech.skills]} size={isCompact ? 'small' : 16} strokeColor={tech.skills[dim.key as keyof typeof tech.skills] >= 80 ? '#10B981' : '#3B82F6'} showInfo={false} style={{ flex: 1, minWidth: 0 }} />
                        <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.6)', width: isCompact ? 18 : 22, textAlign: 'right' }}>{tech.skills[dim.key as keyof typeof tech.skills]}</Text>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 绩效数据 */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', marginTop: isCompact ? 4 : 6,
                  padding: isCompact ? '4px 0' : '6px 0',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div>
                    <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)' }}>在办</Text>
                    <Text style={{ fontSize: isCompact ? 10 : 11, color: tech.currentLoad >= 3 ? '#EF4444' : '#FFFFFF', fontWeight: 600, marginLeft: 4 }}>{tech.currentLoad}</Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)' }}>本周</Text>
                    <Text style={{ fontSize: isCompact ? 10 : 11, color: '#10B981', fontWeight: 600, marginLeft: 4 }}>{tech.weeklyCompleted}</Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)' }}>SLA</Text>
                    <Text style={{ fontSize: isCompact ? 10 : 11, color: tech.avgResponseMin < 10 ? '#10B981' : '#F59E0B', fontWeight: 600, marginLeft: 4 }}>{tech.avgResponseMin}m</Text>
                  </div>
                  <div>
                    <span
                      onClick={() => setTrendExpanded(prev => ({...prev, [tech.id]: !showTrend}))}
                      style={{ fontSize: isCompact ? 9 : 10, color: '#3B82F6', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {showTrend ? '收起' : '趋势'}
                    </span>
                  </div>
                </div>

                {/* 技能成长曲线 */}
                {showTrend && (
                  <div style={{ marginTop: 4, height: 80 }}>
                    <ReactECharts option={trendOption(tech.skillTrend)} style={{ height: 80 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderOptimization = () => {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: isCompact ? 6 : 10,
        padding: isCompact ? '6px 12px 6px' : '8px 20px 12px',
        flex: 1, minHeight: 0,
      }}>
        {/* 调度效果卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: isCompact ? 6 : 8,
        }}>
          <StatCard
            label="平均响应"
            value={`${mockMetrics.avgResponseMin}min`}
            change={`↑${(mockMetrics.avgResponseLastWeek - mockMetrics.avgResponseMin).toFixed(1)}min 较上周`}
            trend="up"
            icon={<ClockCircleOutlined />}
            iconColor="#3B82F6"
            isCompact={isCompact}
          />
          <StatCard
            label="SLA达成率"
            value={`${mockMetrics.slaComplianceRate}%`}
            change={`↑${(mockMetrics.slaComplianceRate - mockMetrics.slaComplianceLastWeek).toFixed(1)}% 较上周`}
            trend="up"
            icon={<CheckCircleOutlined />}
            iconColor="#10B981"
            isCompact={isCompact}
          />
          <StatCard
            label="本周调度"
            value={`${mockMetrics.totalDispatched}单`}
            change={`自动${mockMetrics.autoDispatched} · AI推荐${mockMetrics.aiRecommended} · 抢单${mockMetrics.poolClaimed}`}
            trend="neutral"
            icon={<RobotOutlined />}
            iconColor="#8B5CF6"
            isCompact={isCompact}
          />
          <StatCard
            label="负载均衡度"
            value={`${Math.round(mockMetrics.loadBalanceIndex * 100)}%`}
            change="技师负载分布均匀"
            trend="up"
            icon={<TeamOutlined />}
            iconColor="#06B6D4"
            isCompact={isCompact}
          />
        </div>

        {/* 响应趋势图表 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: isCompact ? '8px 10px' : '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCompact ? 4 : 6 }}>
            <span style={{ fontSize: isCompact ? 11 : 12, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              <BarChartOutlined style={{ marginRight: 4 }} />本周平均响应时间趋势
            </span>
            <Text style={{ fontSize: isCompact ? 9 : 10, color: '#10B981' }}>
              持续下降中
            </Text>
          </div>
          <div style={{ height: isCompact ? 100 : 150 }}>
            <ReactECharts option={dispatchBarOption} style={{ height: '100%' }} notMerge lazyUpdate />
          </div>
        </div>

        {/* 预测性待命 */}
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 8,
          padding: isCompact ? '8px 10px' : '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCompact ? 6 : 8 }}>
            <span style={{ fontSize: isCompact ? 11 : 12, color: '#EF4444', fontWeight: 600 }}>
              <ThunderboltOutlined style={{ marginRight: 4 }} />预测性待命
            </span>
            <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)' }}>
              基于设备健康评分的提前预警
            </Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 4 : 6 }}>
            {mockPredictiveStandby.map((s) => (
              <div key={s.deviceId} style={{
                display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 10,
                padding: isCompact ? '4px 8px' : '6px 10px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 6,
              }}>
                <Text style={{ fontSize: isCompact ? 10 : 11, color: '#FFFFFF', fontWeight: 600 }}>
                  {s.deviceName}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: isCompact ? 9 : 10, color: '#EF4444' }}>
                    健康{s.healthScore}
                  </Text>
                  <Text style={{ fontSize: isCompact ? 9 : 10, color: '#F59E0B' }}>
                    故障概率{s.failureProb30d}%
                  </Text>
                </div>
                <ArrowRightOutlined style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                <Text style={{ fontSize: isCompact ? 10 : 11, color: '#3B82F6' }}>
                  建议: {s.recommendedTechnician}
                </Text>
                <Text style={{
                  fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)',
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.reason}
                </Text>
              </div>
            ))}
          </div>
        </div>

        {/* 动态重调度 */}
        <div style={{
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 8,
          padding: isCompact ? '8px 10px' : '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCompact ? 6 : 8 }}>
            <span style={{ fontSize: isCompact ? 11 : 12, color: '#F59E0B', fontWeight: 600 }}>
              <SyncOutlined style={{ marginRight: 4 }} />动态重调度建议
            </span>
            <Tag color="warning" style={{ borderRadius: 4, fontSize: isCompact ? 9 : 10, padding: '0 4px', lineHeight: '18px', border: 'none' }}>
              {mockReschedules.length}条待处理
            </Tag>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 4 : 6 }}>
            {mockReschedules.map((r) => (
              <div key={r.woId} style={{
                display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 10,
                padding: isCompact ? '4px 8px' : '6px 10px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 6,
              }}>
                <Text style={{ fontSize: isCompact ? 10 : 11, color: '#FFFFFF', fontWeight: 600 }}>
                  {r.deviceName}
                </Text>
                <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)' }}>
                  {r.faultType}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: isCompact ? 9 : 10, color: '#EF4444' }}>
                    {r.currentTech}
                  </Text>
                  <ArrowRightOutlined style={{ color: '#F59E0B', fontSize: 10 }} />
                  <Text style={{ fontSize: isCompact ? 9 : 10, color: '#10B981' }}>
                    {r.suggestedTech}
                  </Text>
                </div>
                <Text style={{
                  fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.5)',
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.reason}
                </Text>
                <Text style={{ fontSize: isCompact ? 8 : 9, color: '#F59E0B' }}>
                  {r.timeSave}
                </Text>
              </div>
            ))}
          </div>

        {/* 调度优化模拟 (What-if) */}
        <div style={{
          background: 'rgba(139,92,246,0.06)',
          border: '1px solid rgba(139,92,246,0.15)',
          borderRadius: 8,
          padding: isCompact ? '8px 10px' : '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCompact ? 6 : 8 }}>
            <span style={{ fontSize: isCompact ? 11 : 12, color: '#8B5CF6', fontWeight: 600 }}>
              <ExperimentOutlined style={{ marginRight: 4 }} />调度优化模拟
            </span>
            <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.4)' }}>
              调节参数看调度效果变化
            </Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? 4 : 6 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: isCompact ? 8 : 16,
              padding: isCompact ? '4px 8px' : '6px 10px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 6,
            }}>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.5)', width: 70, flexShrink: 0 }}>新增技师数</Text>
              <Slider min={0} max={5} defaultValue={0} style={{ flex: 1 }} />
              <Text style={{ fontSize: isCompact ? 9 : 10, color: '#3B82F6', width: 30, textAlign: 'right' }}>+0人</Text>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: isCompact ? 8 : 16,
              padding: isCompact ? '4px 8px' : '6px 10px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 6,
            }}>
              <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.5)', width: 70, flexShrink: 0 }}>技能提升</Text>
              <Slider min={0} max={30} defaultValue={0} style={{ flex: 1 }} />
              <Text style={{ fontSize: isCompact ? 9 : 10, color: '#10B981', width: 30, textAlign: 'right' }}>+0%</Text>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
              marginTop: 4,
            }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)', display: 'block' }}>SLA达成率</Text>
                <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 700, color: '#10B981' }}>{mockMetrics.slaComplianceRate}%</Text>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)', display: 'block' }}>平均响应</Text>
                <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 700, color: '#3B82F6' }}>{mockMetrics.avgResponseMin}min</Text>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                <Text style={{ fontSize: isCompact ? 8 : 9, color: 'rgba(255,255,255,0.4)', display: 'block' }}>负载均衡度</Text>
                <Text style={{ fontSize: isCompact ? 12 : 14, fontWeight: 700, color: '#06B6D4' }}>{Math.round(mockMetrics.loadBalanceIndex * 100)}%</Text>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  };

  /* ═════════════════════════════════════════════
     渲染
     ═════════════════════════════════════════════ */
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#070A1A',
        color: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: isCompact ? '12px 16px' : '14px 24px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #F59E0B, #EF4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF', fontSize: 18, flexShrink: 0,
          }}
        >
          <RobotOutlined />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: isCompact ? 16 : 18, fontWeight: 700, lineHeight: 1.3, color: '#FFFFFF' }}>
            智能派工与调度
          </div>
          <div style={{ fontSize: isCompact ? 11 : 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.3, marginTop: 2 }}>
            AURA Smart Dispatch · AI驱动的预测性+自适应+动态优化派工体系
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: isCompact ? 10 : 11, color: '#10B981' }}>
            <CheckCircleOutlined /> {assignedTasks.size}/{mockDispatchTasks.length} 已派工
          </Text>
          <Text style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.4)' }}>
            <TeamOutlined /> {mockTechnicians.filter(t => t.status === 'available').length} 人可用
          </Text>
        </div>
      </div>

      {/* Tab 切换 */}
      <div style={{
        padding: isCompact ? '0 12px' : '0 20px',
        flexShrink: 0,
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size={isCompact ? 'small' : 'middle'}
          style={{ background: 'transparent' }}
          tabBarStyle={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          renderTabBar={(props, DefaultTabBar) => (
            <DefaultTabBar {...props} style={{
              background: 'transparent',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              padding: 0,
            }} />
          )}
        />
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {activeTab === '0' && renderTaskList()}
        {activeTab === '1' && renderTechnicians()}
        {activeTab === '2' && renderOptimization()}
      </div>

      {/* 底部信息 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isCompact ? '6px 16px 8px' : '8px 24px 10px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? 6 : 12 }}>
          {['P0', 'P1', 'P2', 'P3'].map(p => (
            <span key={p} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.35)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: PRIORITY_STYLE[p].color,
              }} />
              {PRIORITY_STYLE[p].label}
            </span>
          ))}
        </div>
        <Text style={{ fontSize: isCompact ? 9 : 10, color: 'rgba(255,255,255,0.2)' }}>
          基于 AURA AI 引擎 · 三层混合派工 · 动态重调度
        </Text>
      </div>
    </div>
  );
}

/* ─── 统计卡片子组件 ────────────────────────── */

function StatCard({
  label, value, change, trend, icon, iconColor, isCompact,
}: {
  label: string; value: string; change: string; trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode; iconColor: string; isCompact: boolean;
}) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: isCompact ? '8px 10px' : '10px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: isCompact ? 4 : 6 }}>
        <span style={{ color: iconColor, fontSize: isCompact ? 12 : 14 }}>{icon}</span>
        <Text style={{ fontSize: isCompact ? 10 : 11, color: 'rgba(255,255,255,0.5)' }}>
          {label}
        </Text>
      </div>
      <Text style={{
        fontSize: isCompact ? 18 : 24, fontWeight: 700, color: '#FFFFFF', lineHeight: 1.2,
      }}>
        {value}
      </Text>
      <Text style={{
        fontSize: isCompact ? 8 : 9,
        color: trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : 'rgba(255,255,255,0.4)',
        marginTop: isCompact ? 2 : 4,
        lineHeight: 1.3,
      }}>
        {change}
      </Text>
    </div>
  );
}