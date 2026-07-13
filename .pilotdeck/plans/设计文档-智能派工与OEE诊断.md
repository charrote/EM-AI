# 设计文档 — 智能派工与调度 & OEE智能诊断

> Aura 一级功能 4 & 5 — DEMO 级开发设计
> 文档版本: v1.1 | 日期: 2026-07-02
> **修正说明**: v1.1 对齐现有 Aura 技术栈——纯前端自包含，无后端 API，Mock 数据硬编码

---

## 目录

1. [功能概览](#1-功能概览)
2. [智能派工与调度](#2-智能派工与调度)
3. [OEE智能诊断](#3-oee智能诊断)
4. [技术实现方案](#4-技术实现方案)
5. [数据模型与Mock策略](#5-数据模型与mock策略)
6. [开发任务清单](#6-开发任务清单)

---

## 1. 功能概览

### 1.1 定位

两个功能均为 **Aura AI 能力层** 的核心组成，定位于 **差异化竞争优势**，目标是：

- **智能派工与调度**：打破传统"派单/抢单"的二元模式，构建 AI 驱动的 **预测性+自适应+动态优化** 派工体系
- **OEE智能诊断**：超越传统"看数据+人工分析"，构建 AI 驱动的 **端到端智能分析链路**，从异常发现到改善建议全程闭环

### 1.2 用户旅程

| 功能 | 核心用户 | 触发场景 | 期望结果 |
|------|---------|---------|---------|
| 智能派工 | 设备主管/维修工程师 | 工单产生时、工单排队时 | AI推荐最优接单人 + 一键确认 |
| 智能派工 | 设备主管 | 工单执行中 | 自动监控执行进度 + 异常预警 + 动态重调度建议 |
| OEE智能诊断 | 设备主管/决策层 | 日常查看OEE / OEE异常波动时 | AI自动识别损失因子 + 根因追溯 + 改善路径规划 |

### 1.3 技术约束（与现有 Aura 一致）

| 项目 | 方案 | 依据 |
|------|------|------|
| 后端 API | **无** | 所有现有 Aura 功能均为纯前端 |
| 数据源 | **组件内硬编码 Mock 数据** | AuraDataConvergence / AuraHealthScoreModal / AuraDiagnosticModal 均无 API 调用 |
| UI 风格 | **暗色科技风 (#070A1A)** | 与所有 Aura 模态窗一致 |
| 图表库 | **ECharts 6** | 项目统一使用 |
| 组件库 | **Ant Design 6** (Tabs, Card, Statistic, Progress, etc.) | 项目统一使用 |
| 状态管理 | **Zustand** | 新增 `dispatchModalOpen` / `oeeDiagnosisModalOpen` |
| 模态窗 | **Ant Design Modal** (94vw, 暗色背景) | 与 AuraDataCleaningModal 等一致 |
| 入口 | **AISidebar** | 已有 dispatch/oee 分类，仅需扩展点击处理 |

---

## 2. 智能派工与调度

### 2.1 核心创新点

#### 2.1.1 创新对比

| 传统模式 | Aura AI 创新模式 |
|---------|----------------|
| 主管手动派工，或维修工自选 | **AI三层混合引擎**：P0自动派工 + P1 AI推荐+人工确认 + P2/P3 智能抢单池 |
| 派工后无跟踪 | **动态重调度**：执行超时/负载失衡时自动触发重派 |
| 技能匹配仅看标签 | **多维技能画像**：技能矩阵 + 响应速度 + 位置接近度 + 历史成功率 |
| 被动响应故障 | **预测性待命**：基于设备健康评分，提前安排最佳技师待命 |

#### 2.1.2 三层混合派工引擎

```
┌──────────────────────────────────────────────────────┐
│                Aura 智能派工引擎                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│  P0 紧急工单  ──→  自动派工引擎                        │
│  (SLA 30min)     · 技能匹配度 > 80%                    │
│                   · 当前负载最轻的匹配技师              │
│                   · 位置最近（基于车间/产线）            │
│                   · 一键推送，不可拒绝                   │
│                                                       │
│  P1 重要工单  ──→  AI 推荐 + 人工确认                   │
│  (SLA 60min)     · 推荐 TOP3 候选人                     │
│                   · 每人展示匹配理由                    │
│                   · 主管确认后派发                      │
│                                                       │
│  P2/P3 普通工单 ──→ 智能抢单池                         │
│  (SLA 240min)    · 技师按推荐度自选                     │
│                   · AI提示最优选择                      │
│                   · 超时无人抢则自动升级派工              │
│                                                       │
└──────────────────────────────────────────────────────┘
```

#### 2.1.3 动态重调度

```
触发条件:
  1. 接单后超时未响应 (P0: 15min, P1: 30min)
  2. 处理时长超SLA预期 (实际 > 预期 × 1.5)
  3. 技师负载过载 (> 4个并行工单)
  4. 更优技师变为可用 (匹配度提升 > 20%)

动作:
  · 生成重调度建议卡片
  · 显示原技师 → 新技师 + 预期时间节省
  · 主管一键确认
```

#### 2.1.4 预测性待命

```
输入: 设备健康评分 + 故障概率预测 + 值班安排
输出: 建议待命技师 + 待命时段 + 关注设备列表

示例:
  "CNC-102 主轴健康评分从82降至65，故障概率30天内55%
   建议：安排高级技师张某在 6/20-6/21 优先关注该区域"
```

### 2.2 页面设计 — AuraDispatch

**进入方式**：Aura AI侧栏 → 展开「智能派工与调度」→ 点击任意子功能

#### 2.2.1 页面结构（三Tab）

```
┌─────────────────────────────────────────────┐
│  Aura 智能派工与调度  [RobotOutlined]    [×]  │
├─────────────────────────────────────────────┤
│ [📋 待调度工单] [👤 技师画像] [📊 调度优化]    │
├─────────────────────────────────────────────┤
│                                             │
│  左侧：待调度工单列表                           │
│  ┌─────────────────────────────────────┐     │
│  │ WO-20260702-0003  P0 🔴              │     │
│  │ CNC-102 主轴异响 · 加工区A             │     │
│  │ ── AI 推荐 ──                         │     │
│  │ ① 张工(98%) ② 李工(85%) ③ 王工(72%)   │     │
│  │ [直接派工] [选择其他]                 │     │
│  ├─────────────────────────────────────┤     │
│  │ WO-20260702-0004  P1 🟡              │     │
│  │ ...                                  │     │
│  └─────────────────────────────────────┘     │
│                                             │
│  右侧：技师实时负载看板                        │
│  ┌─────────────────────────────────────┐     │
│  │ 👷 张工 · 可用                        │     │
│  │ 技能: 机械95 电气70 液压60            │     │
│  │ 在办: 1单 · 本周完成: 12单            │     │
│  │ 响应SLA: 8.2min (优于均值45%)          │     │
│  ├─────────────────────────────────────┤     │
│  │ 👷 李工 · 忙碌(2单进行中)              │     │
│  │ ...                                  │     │
│  └─────────────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

#### 2.2.2 Tab 1: 待调度工单

| 组件 | 说明 |
|------|------|
| **工单列表** | 按 P0→P3 优先级排列，P0红色高亮，带 SLA 倒计时 |
| **AI 推荐卡片** | 每个工单展示 TOP3 推荐技师 + 匹配百分比 + 匹配理由 |
| **批量操作** | 一键确认全部推荐 / 批量派工 |
| **历史调度** | 已完成派工的列表，展示实际接单人、实际用时、SLA达成情况 |

#### 2.2.3 Tab 2: 技师技能画像

| 组件 | 说明 |
|------|------|
| **技师卡片** | 头像、技能雷达图、在办工单数、本周完成数、平均响应SLA |
| **技能雷达图** | 5维：机械/电气/液压/气动/软件 |
| **技能成长曲线** | 近3个月技能评分趋势（基于维修记录自动更新） |
| **技能缺口分析** | 团队整体技能短板识别 → 培训建议 |
| **技师对比** | 多技师并列对比视图 |

#### 2.2.4 Tab 3: 调度优化

| 组件 | 说明 |
|------|------|
| **预测性待命** | 基于设备健康评分，推荐未来3天需关注的设备 + 建议待命技师 |
| **动态重调度** | 当前执行中的工单，哪些触发重调度条件 + 建议动作 |
| **调度效果分析** | 本周调度统计：平均响应时间 vs 历史、SLA达成率、技师负载均衡度 |
| **What-if 模拟** | "如果增加1名液压技师，SLA达成率预计提升X%" |

### 2.3 Mock 数据模型

```typescript
// 技师
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

// 待调度工单（含 AI 推荐）
interface DispatchTask {
  woId: string;
  woCode: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  faultType: string;
  deviceId: string;
  deviceName: string;
  slaMin: number;
  slaRemainingMin: number;
  candidates: {
    techId: string;
    techName: string;
    matchScore: number;
    reasons: string[];
    currentLoad: number;
    availability: boolean;
  }[];
  recommended: string;
  assignMode: 'auto' | 'confirm' | 'pool';
}

// 调度效果
interface DispatchMetrics {
  avgResponseMin: number;
  slaComplianceRate: number;
  totalDispatched: number;
  autoDispatched: number;
  aiRecommended: number;
  poolClaimed: number;
  rescheduled: number;
  loadBalanceIndex: number;
}

// 预测性待命
interface PredictiveStandby {
  deviceId: string;
  deviceName: string;
  healthScore: number;
  failureProb30d: number;
  recommendedTechnician: string;
  reason: string;
}
```

---

## 3. OEE智能诊断

### 3.1 核心创新点

#### 3.1.1 创新对比

| 传统 OEE 分析 | Aura AI OEE 诊断 |
|-------------|-----------------|
| 人工查看六大损失柱状图 | **AI 自动诊断损失因子** + 多维归因 |
| 帕累托图人工解读 | **智能损失链追溯**：损失→工单→根因→历史趋势 |
| 改善建议靠经验 | **AI 生成改善路径规划** + 预期收益量化 |
| 设备间无关联分析 | **设备族群对标**：同类设备排名 + 标杆识别 |
| 静态历史分析 | **What-if 损失推演**：交互式模拟改善效果 |

#### 3.1.2 诊断链路

```
[OEE 数据] → [AI 损失因子识别] → [根因追溯] → [改善建议] → [效果模拟]
     ↓              ↓                ↓            ↓            ↓
  设备OEE矩阵    智能归因分析      关联工单链      路径规划      What-if引擎
  趋势检测       外部因素加权       知识库匹配      优先级排序     ROI估算
  异常标记       多维度交叉验证      历史案例对比    资源匹配      瓶颈转移
```

### 3.2 页面设计 — AuraOEE

**进入方式**：Aura AI侧栏 → 展开「OEE 智能诊断」→ 点击任意子功能

#### 3.2.1 页面结构（三Tab）

```
┌─────────────────────────────────────────────┐
│  Aura OEE 智能诊断  [BarChartOutlined]    [×] │
├─────────────────────────────────────────────┤
│ [📊 损失诊断] [🔍 根因追溯] [💡 改善推演]    │
├─────────────────────────────────────────────┤
│                                             │
│  顶部：OEE 全景卡片                           │
│  ┌──────┬──────┬──────┬──────┬──────┐        │
│  │全厂OEE│可用率 │性能率│质量率│损失额 │        │
│  │72.3% │85.2% │91.4% │93.1%│¥42.8万│        │
│  └──────┴──────┴──────┴──────┴──────┘        │
│                                             │
│  中间：AI 诊断摘要                            │
│  ┌─────────────────────────────────────┐     │
│  │ ⚠️ AI诊断结果                         │     │
│  │ 最大损失因子：换型/调整 (占比45%)      │     │
│  │ 根因定位：CNC-102 换型耗时平均38min    │     │
│  │    (同类设备均值22min，高出73%)        │     │
│  │ 改善建议：实施SMED快速换模，预期OEE提升 │     │
│  │    +6.2%，年收益约¥38万               │     │
│  │ [查看详细根因] [查看改善路径]          │     │
│  └─────────────────────────────────────┘     │
│                                             │
│  下方：六大损失热力图 + 设备OEE散点图          │
│                                             │
└─────────────────────────────────────────────┘
```

#### 3.2.2 Tab 1: 损失诊断

| 组件 | 说明 |
|------|------|
| **AI 诊断摘要** | 一句话总结当前最大损失 + 根因 + 改善潜力 |
| **六大损失雷达图** | 全厂/车间/产线/设备四级对比雷达 |
| **损失热力图** | 设备×损失类型的热力矩阵，快速定位高损失设备 |
| **OEE 散点气泡图** | X=可用率, Y=性能率, 气泡大小=质量率, 颜色=OEE等级 |
| **损失趋势预测** | 基于近30天趋势，预测下周各损失因子走向 |
| **异常标记** | AI 标记的异常波动点 + 自动关联的事件 |

#### 3.2.3 Tab 2: 根因追溯

| 组件 | 说明 |
|------|------|
| **损失因子钻取** | 点击损失因子 → 展示TOP5贡献设备 + 时间线 |
| **关联工单链** | 展示与该损失相关的历史工单 + 知识库匹配结果 |
| **多维归因分析** | 按 班次/产品/季节/操作员 等维度拆解损失 |
| **设备族群对标** | 同类设备OEE排名 + 标杆设备识别 |
| **外部因素加权** | 天气、节假日、原材料批次等外部因素对损失的影响分析 |

#### 3.2.4 Tab 3: 改善推演

| 组件 | 说明 |
|------|------|
| **改善路径规划** | AI 生成的分步骤改善计划，每步标注预期OEE增益 |
| **What-if 模拟器** | 交互式滑块："换型时间 -30%" → OEE +X%，损失因子排序变化 |
| **改善优先级矩阵** | 影响度×实施难度的四象限图，推荐优先改善项 |
| **ROI 估算** | 改善投入 vs 预期收益，自动计算回收期 |
| **改善闭环追踪** | 已创建改善项目的效果跟踪 + AI 效果验证 |

### 3.3 Mock 数据模型

```typescript
// OEE 诊断结果
interface OEEDiagnosis {
  overallOEE: number;
  availability: number;
  performance: number;
  quality: number;
  lossAmount: number;
  topLossFactor: string;
  topLossPercentage: number;
  rootCause: {
    deviceCode: string;
    deviceName: string;
    specificIssue: string;
    severity: number;
    benchmarkComparison: string;
  };
  improvementSuggestion: {
    action: string;
    expectedOEEDelta: number;
    estimatedROI: number;
    estimatedInvestment: number;
  };
}

// 六大损失数据
interface LossData {
  type: string;
  value: number;
  percentage: number;
  category: string;
  trend: 'up' | 'down' | 'flat';
  devices: { deviceId: string; deviceName: string; value: number }[];
}

// 设备OEE矩阵
interface DeviceOEEItem {
  deviceId: string;
  deviceName: string;
  status: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  losses: { type: string; value: number }[];
}

// 改善路径
interface ImprovementPath {
  title: string;
  steps: {
    step: number;
    action: string;
    responsible: string;
    expectedDelta: number;
    effort: number;
    duration: string;
    dependencies: string[];
  }[];
  totalExpectedDelta: number;
  totalInvestment: number;
  estimatedROI: number;
  paybackMonths: number;
}

// What-if 模拟
interface WhatIfSimulation {
  scenario: string;
  parameters: { name: string; original: number; adjusted: number }[];
  result: {
    overallOEE: number;
    availability: number;
    performance: number;
    quality: number;
    lossRank: { type: string; rank: number; delta: number }[];
  };
}
```

---

## 4. 技术实现方案

### 4.1 前端 — 新增页面与组件

| 文件 | 说明 |
|------|------|
| `frontend/src/pages/AuraDispatch.tsx` | 智能派工主页面（暗色科技风，三Tab） |
| `frontend/src/pages/AuraOEE.tsx` | OEE诊断主页面（暗色科技风，三Tab） |
| `frontend/src/components/AuraDispatchModal.tsx` | AuraDispatch 模态窗封装（94vw, #070A1A） |
| `frontend/src/components/AuraOEEModal.tsx` | AuraOEE 模态窗封装（94vw, #070A1A） |
| `frontend/src/components/DispatchCandidates.tsx` | 派工候选人推荐卡片组件 |
| `frontend/src/components/SkillRadarChart.tsx` | 技师技能雷达图组件（ECharts） |
| `frontend/src/components/OEELossHeatmap.tsx` | OEE损失热力图组件（ECharts） |
| `frontend/src/components/WhatIfSimulator.tsx` | What-if 模拟器组件（Ant Design Slider + ECharts） |

### 4.2 修改文件

| 文件 | 变更说明 |
|------|---------|
| `frontend/src/store/useStore.ts` | 添加 `dispatchModalOpen` / `oeeDiagnosisModalOpen` 状态对 |
| `frontend/src/components/AISidebar.tsx` | 扩展 `handleFeatureClick` 处理 dispatch/oee 子功能点击 |
| `frontend/src/App.tsx` | 懒加载 AuraDispatch + AuraOEE，注册两个 Modal 组件 |

### 4.3 技术栈（与现有 Aura 完全一致）

| 层级 | 技术 | 与现有对比 |
|------|------|-----------|
| 前端框架 | React 19 + TypeScript | ✅ 一致 |
| UI 组件 | Ant Design 6 | ✅ 一致 |
| 图表 | ECharts 6 | ✅ 一致 |
| 状态管理 | Zustand | ✅ 一致 |
| 后端 API | **无（纯前端）** | ✅ 一致 |
| Mock 数据 | 组件内硬编码 | ✅ 一致 |
| 暗色主题 | #070A1A | ✅ 一致 |
| 模态窗 | Ant Design Modal 94vw | ✅ 一致 |

---

## 5. 数据模型与 Mock 策略

### 5.1 Mock 数据来源策略

| 数据 | 生成方式 | 参考 |
|------|---------|------|
| 待调度工单列表 | 基于现有 WorkOrder mock 数据增强（从 WorkOrderList 页面已有的工单中提取） | WorkOrderList.tsx mockWOs |
| 技师信息 | 基于现有 Team mock 数据增强（从 teams API 或 TeamPage 获取的人员列表 + Mock 技能评分） | TeamPage.tsx |
| 技师技能评分 | 按团队类型映射（机加工→机械高，装配→综合，维修→全栈） + 随机波动 | 静态映射 |
| OEE 诊断摘要 | 从现有 OEE 数据（OEEDashboard 已有 12 台设备的 OEE/损失数据）聚合分析 | OEEDashboard.tsx |
| 损失数据 | 从 OEEDashboard 已有的 mockLosses 数据复用 | OEEDashboard.tsx |
| 改善路径 | Mock 数据（基于损失类型映射标准改善模板） | 静态映射 |
| What-if 模拟 | 前端公式计算（基于损失数据的参数调整公式） | 静态函数 |

### 5.2 Mock AI 逻辑

**派工推荐算法（Mock）**：
```
matchScore = skillMatch × 0.4 + loadFactor × 0.3 + locationFactor × 0.2 + slaHistory × 0.1
```

**OEE 诊断逻辑（Mock）**：
```
topLoss = losses.sort((a, b) => b.value - a.value)[0]
rootCause = 关联 topLoss 的工单 + 知识库匹配
improvement = 损失类型 → 标准改善模板映射
```

---

## 6. 开发任务清单

### 阶段 1：基础设施

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 1.1 | useStore.ts 添加状态 | `frontend/src/store/useStore.ts` | 0.3h |
| 1.2 | AISidebar 扩展点击处理 | `frontend/src/components/AISidebar.tsx` | 0.3h |
| 1.3 | App.tsx 注册新组件 | `frontend/src/App.tsx` | 0.3h |

**阶段 1 合计: 0.9h**

### 阶段 2：AuraDispatch

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 2.1 | 创建 `AuraDispatch.tsx` 主页面骨架 | `frontend/src/pages/AuraDispatch.tsx` | 3h |
| 2.2 | Tab1: 待调度工单 + AI 推荐卡片 | Mock 工单数据 + 候选人推荐逻辑 | 2.5h |
| 2.3 | Tab2: 技师技能画像 + 雷达图 | 创建 `SkillRadarChart` + Mock 技师数据 | 2h |
| 2.4 | Tab3: 调度优化 | Mock 指标数据 + ECharts 图表 | 2h |
| 2.5 | 创建 `AuraDispatchModal.tsx` | `frontend/src/components/` | 0.5h |

**阶段 2 合计: 10h**

### 阶段 3：AuraOEE

| # | 任务 | 文件 | 预估工时 |
|---|------|------|---------|
| 3.1 | 创建 `AuraOEE.tsx` 主页面骨架 | `frontend/src/pages/AuraOEE.tsx` | 3h |
| 3.2 | Tab1: 损失诊断 | 创建 `OEELossHeatmap` + Mock 损失数据 | 2.5h |
| 3.3 | Tab2: 根因追溯 | Mock 工单链 + 散点图 | 2h |
| 3.4 | Tab3: 改善推演 | 创建 `WhatIfSimulator` + Mock 改善路径 | 2.5h |
| 3.5 | 创建 `AuraOEEModal.tsx` | `frontend/src/components/` | 0.5h |

**阶段 3 合计: 10.5h**

### 阶段 4：集成测试

| # | 任务 | 说明 | 预估工时 |
|---|------|------|---------|
| 4.1 | 端到端联调 | AISidebar → Modal 打开 → Tab切换 → Mock 数据展示 | 1.5h |
| 4.2 | 响应式适配 | 移动端/平板/桌面 | 1h |
| 4.3 | DEMO 数据调优 | Mock 数据真实性 + 冲击力 | 1h |
| 4.4 | 文档更新 | README 功能介绍 | 0.5h |

**阶段 4 合计: 4h**

---

### 总工时估算

| 阶段 | 工时 |
|------|------|
| 阶段 1: 基础设施 | 0.9h |
| 阶段 2: AuraDispatch | 10.0h |
| 阶段 3: AuraOEE | 10.5h |
| 阶段 4: 集成测试 | 4.0h |
| **合计** | **约 25.4h** |

建议 3 个开发日完成。

---

## 附录：现有 Aura 模式参考

### 模态窗模板

```tsx
// AuraDispatchModal.tsx — 参考 AuraDataCleaningModal 模式
import React, { useState } from 'react';
import { Modal } from 'antd';
import { useStore } from '../store/useStore';
import AuraDispatch from '../pages/AuraDispatch';

const AuraDispatchModal: React.FC = () => {
  const { dispatchModalOpen, setDispatchModalOpen } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (dispatchModalOpen) setMounted(true);
    else setMounted(false);
  }, [dispatchModalOpen]);

  return (
    <Modal
      open={dispatchModalOpen}
      onCancel={() => setDispatchModalOpen(false)}
      footer={null}
      width="94vw"
      styles={{ content: { background: '#070A1A', padding: 0, minHeight: '96vh' } }}
      ...
    >
      {mounted && <AuraDispatch onClose={() => setDispatchModalOpen(false)} />}
    </Modal>
  );
};
```

### AISidebar 点击处理扩展

```tsx
// AISidebar.tsx — handleFeatureClick 添加
const handleFeatureClick = useCallback((key: string) => {
  if (key === 'skill-profile' || key === 'smart-dispatch' || key === 're-dispatch') {
    setDispatchModalOpen(true);
  } else if (key === 'oee-attribution' || key === 'loss-pattern' || key === 'improvement-suggest') {
    setOeeDiagnosisModalOpen(true);
  }
  // ... 现有处理
}, [...]);
```