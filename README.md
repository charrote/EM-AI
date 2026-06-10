# EM-AI — AI 智能设备管理系统

> 基于 TPM 体系 + AI 预测性维护，从"被动救火"到"主动健康管理"

---

## 项目简介

EM-AI 是一套面向离散制造/流程制造企业的 **AI 驱动的设备智能管理系统**，覆盖设备管理全生命周期：

| 模块 | 核心功能 | AI 增强 |
|------|---------|---------|
| **故障管理** | 状态看板、扫码报修、工单流转、SLA 管理 | AI 分类、辅助诊断、知识匹配 |
| **预防管理** | 点检标准、移动点检、保养计划 | 预测性保养、点检频率优化 |
| **效率管理** | OEE 实时计算、六大损失可视化、帕累托分析 | 根因分析、改善建议 |
| **工治具管理** | 一物一码、全生命周期、寿命分析 | 剩余寿命预测 |
| **工作日历** | 工作日/休息日设定、班次管理 | 智能排产日历 |
| **AI 智能分析** | 健康度评分、故障预测、异常检测 | 多目标智能排程 |

---

## 快速启动

### 环境要求

- **Node.js** >= 18
- **npm** >= 9
- 不需要 Docker（开发模式使用 SQLite）

### 一键启动 (Linux / macOS)

```bash
# 1. 安装依赖 & 初始化数据库
cd backend && npm install && npx prisma generate && npx prisma db push --accept-data-loss && cd ..

# 2. 注入演示数据
cd backend && npx tsx src/utils/seed.ts && cd ..

# 3. 启动后端 (终端 1)
cd backend && npm run dev

# 4. 启动前端 (终端 2)
cd frontend && npm run dev
```

### 一键启动 (Windows / SSH)

支持 SSH 远程执行，**进程守护**会自动重启崩溃的服务，断开 SSH 连接后服务不停止。

```cmd
:: 启动服务（前台运行，带进程守护，Ctrl+C 停止）
.\start-service.bat

:: 停止服务
.\stop-service.bat
```

后台守护模式（断开 SSH 后继续运行）：

```powershell
# 使用 PowerShell 启动隐藏守护进程
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath cmd.exe -WindowStyle Hidden -ArgumentList '/c','start-service.bat'"
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 前端界面 | http://localhost:5173 |
| 后端 API | http://localhost:8080/api/health |
| 演示数据重置 | `POST http://localhost:8080/api/demo/reset` |

---

## 演示指南

### 角色切换

页面顶部下拉菜单可随时切换 4 个角色视角：

| 角色 | 对应页面 | 演示重点 |
|------|---------|---------|
| 👷 **操作员** | 设备总览 → 点检执行 → 扫码报修 | 移动端点检、异常自动建单 |
| 🔧 **维修工程师** | 工单管理 → 工单详情 → AI 诊断 → 知识库 | AI 诊断、维修记录、知识沉淀 |
| 📊 **设备主管** | OEE 看板 → 损失分析 → 改善项目 | 数据驱动决策、改善闭环 |
| 🎯 **决策层** | 决策仪表盘 | ROI 分析、健康度总览 |

### 3 条演示旅程

1. **操作员**：扫码点检 → 填写异常值 → 系统自动创建工单
2. **维修工**：接单 → AI 推荐诊断方案 → 记录维修过程 → 知识自动沉淀
3. **主管**：OEE 看板发现异常 → 下钻帕累托分析 → 创建改善项目 → 追踪效果

---

## 项目结构

```
EM-AI/
├── frontend/               # React + Vite + TypeScript 前端
│   └── src/
│       ├── pages/          # 页面组件
│       ├── layouts/        # 布局组件
│       ├── store/          # Zustand 状态管理
│       └── services/       # API 封装
├── backend/                # Node.js + Express + Prisma 后端
│   └── src/
│       ├── routes/         # REST API 路由
│       ├── utils/          # 工具函数 & 种子数据
│       └── db.ts           # Prisma 客户端
├── docs/                   # 设计文档 & 开发计划
│   ├── EM-AI产品设计.md        # v1 产品设计
│   ├── EM-AI产品设计_v2.md     # v2 优化版（含旅程/技术选型/NFR/竞品等）
│   └── 功能清单与开发计划_v2.md # 功能清单 & 逐日任务清单
├── docker-compose.yml      # PostgreSQL + Redis（生产用）
├── start-demo.sh           # 一键启动脚本 (Linux/macOS)
├── start-demo.ps1          # 一键启动脚本 (Windows PowerShell)
├── start-service.bat       # 一键启动脚本 (Windows，带进程守护)
├── stop-demo.ps1           # 停止服务脚本 (Windows PowerShell)
├── stop-service.bat        # 停止服务脚本 (Windows)
└── curl                    # API 调试 curl 命令集
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | React 19 + TypeScript | Vite 8 构建 |
| **UI 组件库** | Ant Design 6 | 企业级组件，深度定制 |
| **图表** | ECharts 6 + echarts-for-react | OEE 看板、帕累托图 |
| **状态管理** | Zustand 5 | 轻量、类型安全 |
| **后端框架** | Express 5 + TypeScript | 类型安全，开发效率高 |
| **ORM** | Prisma 6 | 支持多数据库，类型安全 |
| **数据库** | SQLite（开发）→ PostgreSQL（生产） | 平滑迁移 |
| **设计系统** | Design Token 体系 | 7 种状态色、暗色模式预留 |

---

## 开发路线图

| 阶段 | 工期 | 目标 |
|:----:|:----:|------|
| **Demo Sprint** | 2 周 | 可演示的 3 条用户旅程原型（Mock 数据）← **当前** |
| **Phase 1: MVP** | 4 周 | 真实 IoT 接入、认证系统、工单闭环 |
| **Phase 2: V1.0 AI** | 4 周 | 故障预测、健康度评分、AI 诊断 |
| **Phase 3: V2.0 优化** | 4 周 | 智能排程、寿命分析、异常检测 |

详细任务清单见 [`docs/功能清单与开发计划_v2.md`](docs/功能清单与开发计划_v2.md)

---

## 核心设计文档

- [产品设计 v1](docs/EM-AI产品设计.md) — 原始业务功能定义
- [产品设计 v2（优化版）](docs/EM-AI产品设计_v2.md) — 含用户旅程、技术选型、数据模型、NFR、竞品定位等
- [功能清单与开发计划 v2](docs/功能清单与开发计划_v2.md) — 功能清单 & 逐日可执行任务清单

---

## License

MIT
