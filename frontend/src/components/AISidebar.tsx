import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ThunderboltOutlined,
  EyeOutlined,
  BulbOutlined,
  BarChartOutlined,
  NodeIndexOutlined,
  RobotOutlined,
  SearchOutlined,
  CloseOutlined,
  RightOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Input } from 'antd';
import { Colors } from '../styles/theme';
import { useStore } from '../store/useStore';

/* ─── 类型定义 ──────────────────────────────── */

type FeatureStatus = 'ready' | 'developing' | 'planned';

interface SubFeature {
  key: string;
  label: string;
  desc: string;
  status: FeatureStatus;
  /** 可选的路由路径，点击后导航到对应页面 */
  route?: string;
}

interface AICategory {
  key: string;
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  color: string;
  children: SubFeature[];
}

/* ─── AI 功能数据（源自 EM-AI-Native 功能清单）─── */

const AI_FEATURES: AICategory[] = [
  {
    key: 'perception',
    icon: <EyeOutlined />,
    label: 'AI 感知与数据治理',
    subtitle: 'The Eyes',
    color: '#3B82F6',
    children: [
      { key: 'data-collection', label: '多源数据汇聚', desc: '消除数据孤岛，实现 OPC-UA/Modbus/MQTT 等多源数据统一接入', status: 'developing', route: '/aura/data-convergence' },
      { key: 'data-cleaning', label: 'AI 数据清洗', desc: '自动识别并修复跳变、死值、漂移、缺失等数据质量问题', status: 'developing', route: '/aura/data-cleaning' },
      { key: 'health-baseline', label: '设备健康基线', desc: '建立多维健康基线，从阈值报警升级到偏离报警', status: 'developing', route: '/aura/device-health' },
      { key: 'device-profile', label: '设备全景画像', desc: '集成实时数据、历史趋势、异常时间轴与健康评分', status: 'developing', route: '/aura/device-profile' },
    ],
  },
  {
    key: 'diagnosis',
    icon: <BulbOutlined />,
    label: '智能诊断与知识引擎',
    subtitle: 'The Brain',
    color: '#8B5CF6',
    children: [
      { key: 'nlr', label: '自然语言报修', desc: '支持语音/文字描述故障，自动提取设备、部位、现象等关键信息', status: 'developing', route: '/nlr-demo' },
      { key: 'ai-diagnosis', label: 'AI 辅助诊断', desc: '基于报修信息与实时数据，给出故障原因 TOP-3 及排查步骤', status: 'developing' },
      { key: 'knowledge-mining', label: '知识自动沉淀', desc: '维修完成后自动提取 "故障-原因-方案" 三元组', status: 'planned' },
      { key: 'qa', label: '智能问答', desc: '通过自然语言实时检索设备手册、故障代码及处理经验', status: 'developing' },
    ],
  },
  {
    key: 'predictive',
    icon: <NodeIndexOutlined />,
    label: '预测性维护',
    subtitle: 'Predictive',
    color: '#06B6D4',
    children: [
      { key: 'health-score', label: '健康评分系统', desc: '多维融合设备状态，生成 0-100 分连续健康图谱', status: 'planned' },
      { key: 'rul', label: 'RUL 寿命预测', desc: '预测轴承、电机等关键部件的剩余可用寿命及置信区间', status: 'planned' },
      { key: 'maintenance-optimize', label: '维护时机优化', desc: '综合生产计划、备件状态与设备健康度推荐最优维护窗口', status: 'planned' },
    ],
  },
  {
    key: 'dispatch',
    icon: <RobotOutlined />,
    label: '智能派工与调度',
    subtitle: 'The Hands',
    color: '#F59E0B',
    children: [
      { key: 'skill-profile', label: '技能画像构建', desc: '基于维修记录与修复率构建维修人员高维技能向量', status: 'planned' },
      { key: 'smart-dispatch', label: '智能派工调度', desc: '实现技能匹配、工作量均衡、响应距离的多目标自动派工', status: 'planned' },
      { key: 're-dispatch', label: '动态重调度', desc: '针对紧急插单或人员变动实时重新优化在途工单', status: 'planned' },
    ],
  },
  {
    key: 'oee',
    icon: <BarChartOutlined />,
    label: 'OEE 智能诊断',
    subtitle: 'Optimization',
    color: '#10B981',
    children: [
      { key: 'oee-attribution', label: 'OEE 归因分析', desc: '自动定位 OEE 下降的根因：可用性、性能或质量问题', status: 'planned' },
      { key: 'loss-pattern', label: '损失模式识别', desc: '识别重复出现的隐性损失模式（如换型后的低速运行）', status: 'planned' },
      { key: 'improvement-suggest', label: '改善建议生成', desc: '针对识别的损失自动生成基于最佳实践的改善方案', status: 'planned' },
    ],
  },
];

/* ─── 样式常量 ──────────────────────────────── */

const SIDEBAR_WIDTH = 340;
const FLOATING_BTN_SIZE = 44;

/* ─── 组件 ──────────────────────────────────── */

export default function AISidebar() {
  const { aiSidebarOpen, setAISidebarOpen, setAuraModalOpen, setDataCleaningModalOpen, setDeviceHealthModalOpen, setDeviceProfileModalOpen, setNlrModalOpen, setDiagnosticModalOpen } = useStore();
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(['perception', 'diagnosis']));
  const [searchText, setSearchText] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleFeatureClick = useCallback((key: string, route: string) => {
    setAISidebarOpen(false);
    if (key === 'data-cleaning') {
      setDataCleaningModalOpen(true);
    } else if (key === 'health-baseline') {
      setDeviceHealthModalOpen(true);
    } else if (key === 'device-profile') {
      setDeviceProfileModalOpen(true);
    } else if (key === 'nlr') {
      setNlrModalOpen(true);
    } else if (key === 'ai-diagnosis') {
      setDiagnosticModalOpen(true);
    } else if (key === 'data-collection' || key === 'qa') {
      setAuraModalOpen(true);
    }
  }, [setAISidebarOpen, setDataCleaningModalOpen, setDeviceHealthModalOpen, setDeviceProfileModalOpen, setNlrModalOpen, setAuraModalOpen, setDiagnosticModalOpen]);
  const inputRef = useRef<any>(null);

  // 边栏打开时自动聚焦搜索框
  useEffect(() => {
    if (aiSidebarOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [aiSidebarOpen]);

  // 点击遮罩关闭
  const handleOverlayClick = useCallback(() => {
    setAISidebarOpen(false);
  }, [setAISidebarOpen]);

  // 展开/折叠
  const toggleExpand = useCallback((key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // 搜索过滤
  const filteredFeatures = AI_FEATURES.map((cat) => {
    if (!searchText.trim()) return { ...cat, children: cat.children };
    const q = searchText.toLowerCase();
    const matchedChildren = cat.children.filter(
      (child) =>
        child.label.toLowerCase().includes(q) ||
        child.desc.toLowerCase().includes(q),
    );
    return { ...cat, children: matchedChildren };
  }).filter((cat) => cat.children.length > 0);

  // ── 浮标按钮 ──────────────────────────────
  const renderFloatingButton = () => (
    <div
      onClick={() => setAISidebarOpen(true)}
      className="aura-float-btn"
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        width: FLOATING_BTN_SIZE,
        height: 80,
        borderRadius: '8px 0 0 8px',
        background: `linear-gradient(135deg, ${Colors.primary}, #7C3AED)`,
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)',
        transition: 'all 0.25s ease',
        gap: 2,
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.width = '52px';
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(29, 78, 216, 0.45)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.width = '44px';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(29, 78, 216, 0.3)';
      }}
    >
      <ThunderboltOutlined style={{ fontSize: 20 }} />
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1,
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          marginTop: 2,
        }}
      >
        AURA
      </span>
    </div>
  );

  // ── 边栏面板 ──────────────────────────────
  const renderSidebar = () => (
    <>
      {/* 遮罩 */}
      <div
        className="aura-overlay"
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.15)',
          opacity: aiSidebarOpen ? 1 : 0,
          pointerEvents: aiSidebarOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* 面板 */}
      <div
        ref={sidebarRef}
        className="aura-sidebar"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          maxWidth: '100vw',
          zIndex: 1001,
          background: '#FFFFFF',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          transform: aiSidebarOpen ? 'translateX(0)' : `translateX(${SIDEBAR_WIDTH}px)`,
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* 头部 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 20px 16px',
            borderBottom: `1px solid ${Colors.gray100}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${Colors.primary}, #7C3AED)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: 16,
              }}
            >
              <ThunderboltOutlined />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: Colors.gray800, lineHeight: 1.3 }}>
                Uantek Aura
              </div>
              <div style={{ fontSize: 11, color: Colors.gray400, lineHeight: 1.3 }}>
                AI Unified Resource Assistant
              </div>
            </div>
          </div>
          <div
            onClick={() => setAISidebarOpen(false)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: Colors.gray400,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = Colors.gray100;
              e.currentTarget.style.color = Colors.gray600;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = Colors.gray400;
            }}
          >
            <CloseOutlined style={{ fontSize: 14 }} />
          </div>
        </div>

        {/* 搜索栏 */}
        <div style={{ padding: '12px 20px', flexShrink: 0 }}>
          <Input
            ref={inputRef}
            prefix={<SearchOutlined style={{ color: Colors.gray400 }} />}
            placeholder="搜索 AI 功能..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            variant="borderless"
            style={{
              background: Colors.gray100,
              borderRadius: 8,
              fontSize: 13,
              height: 36,
            }}
          />
        </div>

        {/* 功能列表 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '0 12px 20px',
          }}
        >
          {filteredFeatures.map((category) => {
            const isExpanded = expandedKeys.has(category.key);
            return (
              <div key={category.key} style={{ marginBottom: 4 }}>
                {/* 类别头部 */}
                <div
                  onClick={() => toggleExpand(category.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = Colors.gray100; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `${category.color}15`,
                      color: category.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      flexShrink: 0,
                    }}
                  >
                    {category.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: Colors.gray800 }}>
                      {category.label}
                    </div>
                    <div style={{ fontSize: 10, color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {category.subtitle}
                    </div>
                  </div>
                  <div style={{ color: Colors.gray300, fontSize: 11 }}>
                    {isExpanded ? <DownOutlined /> : <RightOutlined />}
                  </div>
                </div>

                {/* 子项列表 */}
                {isExpanded && (
                  <div style={{ paddingLeft: 38, paddingRight: 4 }}>
                    {category.children.map((child) => {
                      return (
                        <div
                          key={child.key}
                          onClick={() => {
                             if (child.key === 'nlr') {
                               setAISidebarOpen(false);
                               setNlrModalOpen(true);
                             } else if (child.key === 'ai-diagnosis') {
                               setAISidebarOpen(false);
                               setDiagnosticModalOpen(true);
                             } else if (child.route) {
                               handleFeatureClick(child.key, child.route);
                             }
                           }}
                          data-testid={child.key}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                            padding: '8px 8px',
                            borderRadius: 6,
                            cursor: child.route ? 'pointer' : 'default',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = Colors.gray50; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: category.color,
                              marginTop: 6,
                              flexShrink: 0,
                              opacity: 0.5,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: Colors.gray700 }}>
                              {child.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 空搜索 */}
          {filteredFeatures.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: Colors.gray400,
                fontSize: 13,
              }}
            >
              未找到匹配的 AI 功能
            </div>
          )}
        </div>

        {/* 底部注脚 */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: `1px solid ${Colors.gray100}`,
            textAlign: 'center',
            fontSize: 11,
            color: Colors.gray400,
            flexShrink: 0,
          }}
        >
          Uantek AI Crew Engine
        </div>
      </div>
    </>
  );

  return (
    <>
      {!aiSidebarOpen && renderFloatingButton()}
      {renderSidebar()}
    </>
  );
}
