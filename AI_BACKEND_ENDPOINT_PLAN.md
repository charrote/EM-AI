# Aura 后端 AI 路由 — 实施方案

## 一、目标

让 Aura 助手在 `AuraChat.tsx` 零改动的前提下，能够基于 EM-AI 后台的真实模拟数据进行数据层面的问答。

## 二、架构设计

```
用户输入 → AuraChat.tsx → POST /api/ai/query → 后端路由
                                           ├── 意图解析 → 构建数据查询
                                           ├── 并行调用已有 REST API → 获取实时数据
                                           ├── 数据聚合 → 生成结构化摘要
                                           ├── 注入 System Prompt → 调用 LLM (UANTEKDEV0)
                                           └── 流式转发 LLM 响应 → 用户看到回答
```

## 三、实现细节

### 3.1 新增文件

**文件**: `backend/src/routes/ai.ts`

### 3.2 功能模块

#### 模块 A: 意图解析 (`buildDataQueries`)

根据用户问题关键词，映射到需要调用的数据接口：

| 问题关键词 | 调用接口 | 聚合策略 |
|-----------|---------|---------|
| 全局/仪表盘/统计 | `/api/dashboard/executive` | 只返回关键统计值 |
| OEE / 设备效率 | `/api/dashboard/oee` 或 `/api/dashboard/devices/{id}/oee` | 只返回 OEE 值 |
| 设备状态 | `/api/devices` (limit=50) | 状态分布统计 |
| 工单 / 维修 | `/api/work-orders` | Top 10 列表 |
| 点检 | `/api/inspections` (limit=20) | 最近记录 |
| 治具 | `/api/toolings` (limit=30) | 状态列表 |
| 故障案例 / SOP | `/api/knowledge?type=case&status=approved` (limit=10) | 按浏览量排序 |

**设备 ID 提取逻辑**: 从用户问题中提取 `CNC-001`、`INJ-023` 等格式的设备 ID，精确查询该设备详情。

#### 模块 B: 数据聚合 (`aggregateData`)

每个接口返回后，**不做全量数据注入**，而是生成结构化摘要：

```
【全局概览】总设备: 300台, 运行中: 210台 (70%), 故障: 30台, 待机: 60台, 平均健康分: 75, 当前OEE: 82%, 待处理工单: 15
```

工单列表示例：
```
【工单列表】共 8 条活跃工单:
1. WO-20260614-0001 | 优先级: P1 | 状态: pending | 设备: CNC-001 | 故障类型: 电气 | 创建: 2026-06-14 09:30
2. WO-20260614-0002 | 优先级: P0 | 状态: accepting | 设备: INJ-005 | 故障类型: 液压 | 创建: 2026-06-14 09:15
...
```

**设计原则**:
- 统计类查询: 只聚合关键指标 (不返回 300 台设备全量)
- 列表类查询: 只取 Top N (10-30 条), 按优先级/时间排序
- 详情类查询: 截断到 800 字符

#### 模块 C: LLM 调用

```typescript
const augmentedSystemPrompt = `
你是友文科技 Aura 智能助手，专注于制造业设备运维领域。

[SYSTEM_PROMPT 原有内容...]

你拥有以下实时数据，请基于这些数据进行回答：
${dataContext}
`;

// 调用 LLM
await axios.post(
  `${LLM_API_BASE}/chat/completions`,
  {
    model: LLM_MODEL,           // UANTEKDEV0
    messages: [
      { role: 'system', content: augmentedSystemPrompt },
      ...conversationHistory,
    ],
    stream: true,
    max_tokens: 4096,
    enable_thinking: thinking,
  },
  {
    headers: { Authorization: `Bearer ${LLM_API_KEY}` },
    responseType: 'stream',
  }
);
```

#### 模块 D: 流式响应转发

后端将 LLM 的 SSE 流直接转发给前端：

```
data: {"type":"content","content":"当前"}
data: {"type":"content","content":"全局"}
data: {"type":"content","content":"OEE"}
data: {"type":"content","content":"为"}
data: {"type":"content","content":"82"}
data: {"type":"content","content":"%"}
data: {"type":"done"}
```

前端 `AuraChat.tsx` 已具备流式解析能力（SSE reader + delta 处理），**无需任何改动**。

#### 模块 E: 快捷状态端点 (`GET /api/ai/status`)

非 LLM 调用的轻量接口，直接查库返回系统状态摘要：

```json
{
  "devices": { "total": 300, "byStatus": {"running": 210, "fault": 30, "idle": 60}, "avgOEE": 82, "avgHealth": 75 },
  "workOrders": { "pending": 5, "accepted": 3, "diagnosing": 2 },
  "knowledge": { "total": 20, "pending": 3, "approved": 17 },
  "timestamp": "2026-06-14T10:00:00Z"
}
```

可用于前端快速展示 AI 助手可用状态或调试。

### 3.3 路由注册

在 `backend/src/index.ts` 中添加：

```typescript
import aiRouter from './routes/ai';
app.use('/api/ai', aiRouter);
```

## 四、环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `BACKEND_URL` | `http://localhost:8080` | 后端 API 基础地址（用于内部 HTTP 调用） |
| `LLM_API_BASE` | `http://nat.ywapi.com:9234/v1` | LLM API 地址 |
| `LLM_API_KEY` | (硬编码) | LLM API Key |
| `LLM_MODEL` | `UANTEKDEV0` | 使用的模型 |

## 五、文件依赖

### 新增依赖

`backend/package.json` 需添加:
```json
{
  "dependencies": {
    "axios": "^1.7.0"
  }
}
```

### 已有文件（无需修改）

- `backend/src/routes/demo.ts` — 参考请求/响应模式
- `backend/src/db.ts` — Prisma 客户端
- `backend/src/index.ts` — 只需添加 1 行路由注册
- `frontend/src/components/AuraChat.tsx` — 零改动（已有 SSE 处理能力）

## 六、实施步骤

### Step 1: 创建 ai.ts 路由文件 (60 分钟)
- 编写完整代码
- 添加 TypeScript 类型

### Step 2: 注册路由 (15 分钟)
- 在 `index.ts` 添加 `app.use('/api/ai', aiRouter)`

### Step 3: 安装 axios (5 分钟)
```bash
cd backend && npm install axios
```

### Step 4: 启动测试 (30 分钟)
```bash
cd backend && npm run dev
# 测试:
curl -X POST http://localhost:8080/api/ai/query \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"当前全局 OEE 是多少？"}]}'
```

### Step 5: 前端验证 (30 分钟)
- 打开前端页面，点击 AuraChat 气泡
- 输入设备运维相关问题，验证回答是否基于实时数据

## 七、后续优化方向

1. **缓存层**: 对热数据接口（如 `/api/dashboard/executive`）做 60s 内存缓存
2. **意图路由增强**: 支持更复杂的多轮对话上下文理解
3. **数据增强查询**: 当用户问"CNC-001 最近的工单是什么？"时，自动查设备关联工单
4. **MCP Server**: 验证可行后，将数据查询能力封装为标准 MCP Server，供外部 Agent 调用
5. **Webhook 通知**: 设备故障时，主动推送异常信息

## 八、风险与注意

| 风险 | 缓解措施 |
|------|---------|
| 数据量过大导致 LLM 超时 | 严格限制聚合结果长度 (Top N / 字符截断) |
| 后端 API 不可用 | 错误时返回 fallback 消息，不阻断 LLM 回复 |
| 并发查询性能 | 使用 `Promise.all` 并行获取数据 |
| LLM API 延迟 | 流式响应，用户先看到加载状态 |
