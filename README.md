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

### 一键启动

#### macOS / Linux

```bash
# 首次需要添加执行权限
chmod +x *.sh

# 一键启动演示（自动安装依赖 + 初始化数据 + 启动前后端）
./start-demo.sh
```

#### Windows

```cmd
:: 开发模式（两个前台窗口，适合调试）
.\start-dev.bat

:: 生产模式（前台运行，带进程守护，Ctrl+C 停止）
.\start-service.bat

:: 停止服务
.\stop-service.bat

:: 构建生产版本
.\start-build.bat
```

后台守护模式（断开 SSH 后继续运行）：

```powershell
# 使用 PowerShell 启动隐藏守护进程
PowerShell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath cmd.exe -WindowStyle Hidden -ArgumentList '/c','start-service.bat'"
```

### 脚本对照

| 功能 | macOS / Linux | Windows |
|------|--------------|---------|
| 演示开发（一键启动） | `./start-demo.sh` | `start-demo.ps1` / `start-dev.bat` |
| 构建生产版本 | `./start-build.sh` | `start-build.bat` |
| 生产部署（进程守护） | — | `start-service.bat` |
| 停止服务 | `Ctrl+C` | `stop-demo.ps1` / `stop-service.bat` |

> 💡 Git clone 后如果遇到 `permission denied`，执行 `chmod +x *.sh` 即可。

### 访问地址

端口通过项目根目录的 `config.json` 统一管理，默认值：

```json
{
  "API_PORT": 5174,
  "FRONTEND_PORT": 5173
}
```

| 服务 | 地址 | 配置项 |
|------|------|--------|
| 前端界面 | http://localhost:5173 | `FRONTEND_PORT` |
| 后端 API | http://localhost:5174/api/health | `API_PORT` |
| 演示数据重置 | `POST http://localhost:5174/api/demo/reset` | — |

> ⚠️ 后端端口默认 5174（非传统 8080），如需修改请改 `config.json`，前端 Vite 代理会自动跟随。

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
| ⚙️ **管理员** | 系统设置 → 基础数据管理 | 数据模式切换、AI 模型配置、组织管理 |

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
├── config.json             # 统一端口配置（前后端共享）
├── config.bat              # 端口配置读取脚本 (Windows)
├── docker-compose.yml      # PostgreSQL + Redis（生产用）
├── start-demo.sh           # 一键启动脚本 (macOS/Linux)
├── start-build.sh          # 生产构建脚本 (macOS/Linux)
├── start-demo.ps1          # 一键启动脚本 (Windows PowerShell，带进程守护)
├── start-dev.bat           # 开发模式一键启动 (Windows，前台窗口)
├── start-service.bat       # 生产模式一键启动 (Windows，带进程守护)
├── stop-demo.ps1           # 停止服务脚本 (Windows PowerShell)
├── stop-service.bat        # 停止服务脚本 (Windows)
└── curl                    # API 调试 curl 命令集
```

---

## 跨平台说明

项目支持 **macOS（开发）** + **Windows Server（部署）** 双平台运行。

| 要点 | 说明 |
|------|------|
| **路径分隔符** | 代码中统一使用 `path.join()`，Node.js 自动适配系统分隔符 |
| **端口配置** | 所有端口写死在 `config.json` 中，各平台脚本均从该文件动态读取 |
| **macOS 脚本** | `.sh` 文件，需要 `chmod +x` 执行权限 |
| **Windows 脚本** | `.bat`（cmd）和 `.ps1`（PowerShell）两种格式 |
| **Docker 部署** | `docker-compose.yml` 配合 `Dockerfile`，容器内为 Linux 环境，不受宿主机影响 |
| **数据库** | 开发用 SQLite（文件路径 `file:./dev.db` 跨平台兼容），生产可切换 PostgreSQL |

> ⚠️ `backend/.env` 中不要设置 `PORT` 变量。Prisma Client 会自动加载 `.env` 导致 `process.env.PORT` 被覆盖，端口应统一由 `config.json` 管理。

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
| **测试框架** | Vitest + Jest | 前后端测试覆盖 |
| **中间件** | Helmet + CORS + Rate Limit | 安全与限流保护 |
| **设计系统** | Design Token 体系 | 7 种状态色、暗色模式预留 |

## 系统设置

EM-AI 提供完整的系统设置功能：

- **数据模式切换**：支持模拟数据 / 真实数据无缝切换
- **AI 模型配置**：支持 OpenAI / Anthropic / Azure / 本地部署
- **通知设置**：邮件 / 钉钉 / 企业微信 / 短信多渠道通知
- **备份与恢复**：数据备份、恢复、自动备份计划

## License

MIT

---


## License

MIT
