# 计划跟踪 — 智能派工与调度 & OEE智能诊断

> 项目: EM-AI (Aura 功能 4 & 5)
> 文档版本: v1.1 | 日期: 2026-07-02
> **修正**: 纯前端方案，无后端 API，Mock 数据硬编码，与现有 Aura 模式一致

---

## 总体进度

- [ ] 阶段 1: 基础设施（3 项）
- [ ] 阶段 2: AuraDispatch（5 项）
- [ ] 阶段 3: AuraOEE（5 项）
- [ ] 阶段 4: 集成测试（4 项）

---

## 阶段 1：基础设施

> 预计 0.9h

- [ ] 1.1 `useStore.ts` 添加 `dispatchModalOpen` / `oeeDiagnosisModalOpen` 状态对
- [ ] 1.2 `AISidebar.tsx` 扩展 `handleFeatureClick` 处理 dispatch/oee 子功能点击
- [ ] 1.3 `App.tsx` 懒加载 AuraDispatch + AuraOEE，注册两个 Modal 组件

**验收标准**:
- [ ] 从 AISidebar 点击「智能派工与调度」→「智能派工调度」能打开 AuraDispatchModal
- [ ] 从 AISidebar 点击「OEE 智能诊断」→「OEE 归因分析」能打开 AuraOEEModal
- [ ] Modal 关闭后状态重置

---

## 阶段 2：AuraDispatch

> 预计 10h

- [ ] 2.1 创建 `frontend/src/pages/AuraDispatch.tsx` 主页面骨架
  - 暗色科技风 (#070A1A)，三Tab布局
  - Tab1: 待调度工单 / Tab2: 技师画像 / Tab3: 调度优化
- [ ] 2.2 实现 Tab1: 待调度工单 + AI 推荐卡片
  - Mock 工单数据（8-12条，含P0/P1/P2各若干）
  - AI 推荐逻辑：基于 mock 技师技能 + loadFactor 计算 matchScore
  - P0 红色高亮 + SLA 倒计时
  - 一键派工按钮（模拟状态切换动画）
- [ ] 2.3 实现 Tab2: 技师技能画像 + 雷达图
  - 创建 `frontend/src/components/SkillRadarChart.tsx`
  - Mock 技师数据（6-8人，含技能评分 + 在办数 + SLA历史）
  - 技能缺口分析（团队短板可视化）
- [ ] 2.4 实现 Tab3: 调度优化
  - 预测性待命看板（Mock 3-5条设备预警）
  - 动态重调度建议（Mock 2-3条）
  - 调度效果分析（ECharts 柱状图/折线图）
- [ ] 2.5 创建 `frontend/src/components/AuraDispatchModal.tsx`
  - Ant Design Modal 94vw, #070A1A 背景
  - 参考 AuraDataCleaningModal 模式

**验收标准**:
- [ ] AuraDispatch 三Tab可正常切换，Mock数据完整展示
- [ ] AI推荐卡片显示TOP3候选人 + 匹配百分比 + 理由
- [ ] 技师雷达图正常渲染（5维）
- [ ] 调度效果图表正常显示
- [ ] 移动端响应式布局正常

---

## 阶段 3：AuraOEE

> 预计 10.5h

- [ ] 3.1 创建 `frontend/src/pages/AuraOEE.tsx` 主页面骨架
  - 暗色科技风 (#070A1A)，三Tab布局
  - Tab1: 损失诊断 / Tab2: 根因追溯 / Tab3: 改善推演
- [ ] 3.2 实现 Tab1: 损失诊断
  - AI 诊断摘要卡片（一句话 + 根因 + 改善潜力）
  - 创建 `frontend/src/components/OEELossHeatmap.tsx`
  - 六大损失雷达图（ECharts radar）
  - OEE 散点气泡图（ECharts scatter）
  - 损失趋势预测（ECharts line）
  - Mock 损失数据（复用 OEEDashboard 已有 mockLosses）
- [ ] 3.3 实现 Tab2: 根因追溯
  - 损失因子钻取（点击 → TOP5贡献设备）
  - 关联工单链展示
  - 多维归因分析
  - 设备族群对标
- [ ] 3.4 实现 Tab3: 改善推演
  - 创建 `frontend/src/components/WhatIfSimulator.tsx`
  - 改善路径规划（AI生成步骤卡片）
  - 交互式滑块推演（换型时间 -X% → OEE +Y%）
  - 改善优先级矩阵（四象限图）
  - ROI 估算卡片
- [ ] 3.5 创建 `frontend/src/components/AuraOEEModal.tsx`
  - Ant Design Modal 94vw, #070A1A 背景

**验收标准**:
- [ ] AuraOEE 三Tab可正常切换，Mock数据完整展示
- [ ] AI 诊断摘要正确识别最大损失因子
- [ ] What-if 滑块交互正常，结果实时更新
- [ ] 损失热力图正确展示设备×损失类型矩阵
- [ ] 移动端响应式布局正常

---

## 阶段 4：集成测试

> 预计 4h

- [ ] 4.1 端到端联调
  - AISidebar → 点击子功能 → Modal 打开 → Tab切换 → 数据展示
  - AuraDispatch 和 AuraOEE 均可正常打开/关闭
- [ ] 4.2 响应式适配
  - 桌面端 (>1024px): 完整布局
  - 平板端 (768-1024px): 紧凑布局
  - 移动端 (<768px): 单列/Tab切换
- [ ] 4.3 DEMO 数据调优
  - 工单数据有 P0/P1/P2 混合分布
  - 技师技能数据有差异（便于推荐算法展示）
  - OEE 数据有明显异常点（便于诊断展示）
  - What-if 模拟结果有显著变化（有冲击力）
- [ ] 4.4 文档更新
  - README 添加功能介绍

---

## 文件清单

### 新建文件

| 文件 | 阶段 | 说明 |
|------|------|------|
| `frontend/src/pages/AuraDispatch.tsx` | 2 | 智能派工主页面 |
| `frontend/src/pages/AuraOEE.tsx` | 3 | OEE诊断主页面 |
| `frontend/src/components/AuraDispatchModal.tsx` | 2 | AuraDispatch 模态窗 |
| `frontend/src/components/AuraOEEModal.tsx` | 3 | AuraOEE 模态窗 |
| `frontend/src/components/SkillRadarChart.tsx` | 2 | 技师技能雷达图 |
| `frontend/src/components/OEELossHeatmap.tsx` | 3 | OEE损失热力图 |
| `frontend/src/components/WhatIfSimulator.tsx` | 3 | What-if 模拟器 |

### 修改文件

| 文件 | 说明 |
|------|------|
| `frontend/src/store/useStore.ts` | 添加 dispatchModalOpen + oeeDiagnosisModalOpen |
| `frontend/src/components/AISidebar.tsx` | 扩展 handleFeatureClick 处理 dispatch/oee |
| `frontend/src/App.tsx` | 懒加载 + Modal 注册 |
| `README.md` | 添加功能介绍 |

---

## 备注

- 本计划基于 DEMO 级开发，纯前端方案，无后端 API
- 所有 AI 逻辑为前端 Mock 实现，可后续替换为真实 AI 接口
- 遵循项目现有代码风格：暗色科技风 Aura 模态窗 (#070A1A)
- 数据复用：工单数据取自 WorkOrderList mock，OEE数据取自 OEEDashboard mock
- ECharts 图表使用项目已有版本 (echarts 6)
- Mock 数据总量：AuraDispatch ~8工单+8技师，AuraOEE ~12设备OEE+6损失因子