import { Router, Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../db';

const router = Router();

// ── LLM 配置 ──────────────────────────────────────────
const LLM_API_BASE = process.env.LLM_API_BASE || 'http://nat.ywapi.com:9234/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || 'ux-X2IQWMWLFNMRBZO2QJG8VQ314LW92EQ7';
const LLM_MODEL = process.env.LLM_MODEL || 'UANTEKDEV0';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// ── 系统 Prompt ───────────────────────────────────────
const SYSTEM_PROMPT = `你是友文科技 Aura 智能助手，专注于制造业设备运维领域。

你的职责：
1. 回答设备状态、OEE、工单、点检、工治具、知识库相关的问题
2. 基于后端返回的真实数据进行分析和回答
3. 回答客观简洁，不允许大长文，不允许过度渲染

重要规则：
- 如果问题涉及制造设备运维范围之外的内容，请说明不属于服务范畴
- 回答必须基于提供的事实数据，不要编造
- 回答要简洁直接，结构化展示关键信息`;

// ── 数据查询路由映射 ──────────────────────────────────
interface DataQuery {
  endpoint: string;
  params?: Record<string, string>;
  aggregator: 'stats' | 'list-top' | 'detail';
  description: string;
}

function buildDataQueries(userMessage: string): DataQuery[] {
  const queries: DataQuery[] = [];
  const lower = userMessage.toLowerCase();

  const hasDevice = /设备|machine|device|cnc|注塑|裁切|冲床|焊| станок|machining/i.test(lower);
  const hasOEE = /oee|综合效率|设备效率|利用率/i.test(lower);
  const hasOrder = /工单|work.?order|wo-|维修|工单/i.test(lower);
  const hasInspection = /点检|inspector|inspection|巡检/i.test(lower);
  const hasTooling = /治具|tooling|tool|夹具|模具/i.test(lower);
  const hasKnowledge = /知识|案例|故障案例|sop|知识库|knowledge|怎么修|如何/i.test(lower);
  const hasDashboard = /仪表盘|executive|全局|overview|统计|total|summary/i.test(lower);
  const hasFault = /故障|fault|停机|down|报警|alarm|报错/i.test(lower);
  const hasP1P0 = /p0|p1|p[01]/i.test(lower);
  const targetDeviceId = lower.match(/([a-z]{2,4}-?\d{2,4})/i)?.[1]?.toUpperCase();

  if (hasDashboard) {
    queries.push({
      endpoint: '/api/dashboard/executive',
      aggregator: 'stats',
      description: '全局仪表盘统计数据',
    });
  }

  if (hasOEE) {
    if (targetDeviceId) {
      queries.push({
        endpoint: `/api/dashboard/devices/${targetDeviceId}/oee`,
        aggregator: 'detail',
        description: `设备 ${targetDeviceId} 的 OEE 详情`,
      });
    } else {
      queries.push({
        endpoint: '/api/dashboard/oee',
        aggregator: 'stats',
        description: '全局 OEE 统计',
      });
    }
  }

  if (hasDevice) {
    if (targetDeviceId) {
      queries.push({
        endpoint: `/api/devices/${targetDeviceId}`,
        aggregator: 'detail',
        description: `设备 ${targetDeviceId} 详情`,
      });
    } else {
      queries.push({
        endpoint: '/api/devices',
        params: { limit: '50' },
        aggregator: 'stats',
        description: '设备总体统计（状态分布、类型分布）',
      });
    }
  }

  if (hasFault || hasOrder) {
    const params: Record<string, string> = {};
    if (hasP1P0) {
      params.status = 'pending,accepted,diagnosing';
      params.limit = '30';
    } else if (hasFault) {
      params.status = 'pending,accepted,diagnosing,repairing';
      params.limit = '20';
    } else {
      params.limit = '15';
    }
    queries.push({
      endpoint: '/api/work-orders',
      params,
      aggregator: 'list-top',
      description: hasP1P0 ? 'P0/P1 活跃工单' : '活跃工单列表',
    });
  }

  if (hasInspection) {
    queries.push({
      endpoint: '/api/inspections',
      params: { limit: '20' },
      aggregator: 'list-top',
      description: '最近点检记录',
    });
  }

  if (hasTooling) {
    queries.push({
      endpoint: '/api/toolings',
      params: { limit: '30' },
      aggregator: 'list-top',
      description: '工治具状态',
    });
  }

  if (hasKnowledge) {
    queries.push({
      endpoint: '/api/knowledge',
      params: { type: 'case', status: 'approved', limit: '10', sortBy: 'views' },
      aggregator: 'list-top',
      description: '相关故障案例',
    });
  }

  // 兜底：全局概览
  if (queries.length === 0) {
    queries.push({
      endpoint: '/api/dashboard/executive',
      aggregator: 'stats',
      description: '全局概览',
    });
  }

  return queries;
}

// ── 数据聚合 ──────────────────────────────────────────
function aggregateData(query: DataQuery, res: any): string {
  const data = res.data || res;

  switch (query.aggregator) {
    case 'stats': {
      if (query.endpoint === '/api/dashboard/executive') {
        const d = data.data || data;
        return `【全局概览】总设备: ${d.totalDevices || 'N/A'}台, 运行中: ${d.runningCount || 0}台 (${d.runningRate || 0}%), 故障: ${d.faultCount || 0}台, 待机: ${d.idleCount || 0}台, 平均健康分: ${d.avgHealth || 0}, 当前OEE: ${d.currentOEE || 'N/A'}%, 待处理工单: ${d.woPending || 0}, 总工单: ${d.woTotal || 0}`;
      }
      if (query.endpoint === '/api/dashboard/oee') {
        const d = data.data || data;
        return `【OEE统计】总设备: ${d.totalDevices || 'N/A'}, 整体OEE: ${d.overallOEE || 'N/A'}%, 预警工单: ${d.alertCount || 0}`;
      }
      const devices = data.data || [];
      const total = devices.length;
      const byStatus: Record<string, number> = {};
      for (const dev of devices) {
        byStatus[dev.status || 'unknown'] = (byStatus[dev.status || 'unknown'] || 0) + 1;
      }
      return `【设备统计】共 ${total} 台设备, 状态分布: ${Object.entries(byStatus).map(([k, v]) => `${k}:${v}`).join(', ')}`;
    }
    case 'list-top': {
      const items = data.data || [];
      if (items.length === 0) return '无数据';

      if (query.endpoint.includes('work-orders')) {
        const summary = `【工单列表】共 ${items.length} 条活跃工单:`;
        const list = items.slice(0, 10).map((w: any, i: number) =>
          `${i + 1}. ${w.code} | 优先级: ${w.priority} | 状态: ${w.status} | 设备: ${w.device?.name || w.deviceId} | 故障类型: ${w.faultType || 'N/A'} | 创建: ${new Date(w.createdAt).toLocaleString('zh-CN')}`
        ).join('\n');
        return summary + '\n' + list;
      }
      if (query.endpoint.includes('inspections')) {
        const summary = `【点检记录】共 ${items.length} 条:`;
        const list = items.slice(0, 10).map((ins: any, i: number) =>
          `${i + 1}. 设备: ${ins.device?.name || ins.deviceId} | 状态: ${ins.status} | 异常数: ${ins.abnormalCount || 0} | 时间: ${new Date(ins.doneAt || ins.createdAt).toLocaleString('zh-CN')}`
        ).join('\n');
        return summary + '\n' + list;
      }
      if (query.endpoint.includes('toolings')) {
        const summary = `【工治具】共 ${items.length} 件:`;
        const list = items.slice(0, 10).map((t: any, i: number) =>
          `${i + 1}. ${t.code} | ${t.name} | 状态: ${t.status} | 设备: ${t.device?.name || 'N/A'} | 寿命: ${t.lifeRemaining}/${t.theoreticalLife}`
        ).join('\n');
        return summary + '\n' + list;
      }
      if (query.endpoint.includes('knowledge')) {
        const summary = `【故障案例】共 ${items.length} 条:`;
        const list = items.slice(0, 10).map((k: any, i: number) =>
          `${i + 1}. ${k.title} | 类型: ${k.faultType || 'N/A'} | 部件: ${k.faultPart || 'N/A'} | 浏览量: ${k.views || 0}`
        ).join('\n');
        return summary + '\n' + list;
      }
      return `【列表】共 ${items.length} 条, 前5条: ${JSON.stringify(items.slice(0, 5)).slice(0, 500)}`;
    }
    case 'detail': {
      if (query.endpoint.includes('devices/') && query.endpoint.includes('oee')) {
        const d = data.data || data;
        return `【${d.deviceName || '设备'} OEE】设备ID: ${d.deviceId}, OEE: ${d.oee}%, 可用率: ${d.availability}%, 性能: ${d.performance}%, 质量: ${d.quality}%`;
      }
      return `【详情】${JSON.stringify(data.data || data).slice(0, 800)}`;
    }
    default:
      return `数据: ${JSON.stringify(data).slice(0, 2000)}`;
  }
}

// ── HTTP 辅助：发起 GET 请求 ──────────────────────────
function httpGet(urlStr: string, params: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const queryParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      queryParams.set(k, v);
    }
    const path = url.pathname + (queryParams.toString() ? '?' + queryParams.toString() : '');

    const options = {
      hostname: url.hostname,
      port: parseInt(url.port) || 80,
      path,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    import('http').then(({ get }) => {
      const req = get(options, (resp) => {
        let body = '';
        resp.on('data', (chunk: Buffer) => body += chunk.toString());
        resp.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); reject(new Error('HTTP timeout')); });
    }).catch(reject);
  });
}

// ── AI 回复端点 ───────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, thinking = false, query: userQuery } = req.body;

    if (!userQuery && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: 'Missing query or messages' });
    }

    const query = userQuery || (messages[messages.length - 1]?.content || '');

    // 1. 构建数据查询
    const dataQueries = buildDataQueries(query);
    console.log(`AI Query: "${query.substring(0, 80)}" → ${dataQueries.length} data queries`);

    // 2. 并行获取所有数据
    const fetchDataPromises = dataQueries.map(async (dq) => {
      try {
        const fullUrl = `${BACKEND_URL}${dq.endpoint}`;
        const params: Record<string, string> = { ...(dq.params || {}) };
        const data = await httpGet(fullUrl, params);
        return aggregateData(dq, data);
      } catch (err: any) {
        console.error(`Data fetch error for ${dq.endpoint}:`, err.message);
        return `[数据获取失败] ${dq.endpoint}: ${err.message}`;
      }
    });

    const summaries = await Promise.all(fetchDataPromises);

    // 3. 构建系统提示词（注入实时数据）
    const dataContext = summaries
      .map((s, i) => `\n--- ${dataQueries[i].description} ---\n${s}`)
      .join('\n');

    const augmentedSystemPrompt = `${SYSTEM_PROMPT}\n\n你拥有以下实时数据，请基于这些数据进行回答：\n${dataContext}`;

    // 4. 调用 LLM（流式）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const llmMessages = [
      { role: 'system', content: augmentedSystemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const response = await axios.post(
      `${LLM_API_BASE}/chat/completions`,
      {
        model: LLM_MODEL,
        messages: llmMessages,
        stream: true,
        max_tokens: 4096,
        enable_thinking: thinking,
      },
      { headers: { Authorization: `Bearer ${LLM_API_KEY}`, 'Content-Type': 'application/json' }, responseType: 'stream' }
    );

    // 5. 转发 LLM 流式输出
    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6).trim();
        if (payload === '[DONE]') {
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
          return;
        }
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed.choices?.[0]?.delta || {};
          if (thinking && delta.reasoning_content) {
            res.write(`data: ${JSON.stringify({ type: 'thinking', content: delta.reasoning_content })}\n\n`);
          }
          if (delta.content) {
            res.write(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`);
          }
        } catch {}
      }
    });

    response.data.on('end', () => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      }
    });

    response.data.on('error', (err: Error) => {
      console.error('LLM stream error:', err);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
        res.end();
      }
    });

  } catch (err: any) {
    console.error('AI query error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI query failed: ' + err.message });
    }
  }
});

// ── 快捷状态端点 ──────────────────────────────────────
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const devices = await prisma.device.findMany({ select: { status: true, oee: true, healthScore: true } });
    const byStatus: Record<string, number> = {};
    for (const d of devices) byStatus[d.status || 'unknown'] = (byStatus[d.status || 'unknown'] || 0) + 1;
    const oeeValues = devices.filter(d => d.oee != null).map(d => d.oee!);
    const healthValues = devices.filter(d => d.healthScore != null).map(d => d.healthScore!);

    const woCounts = await prisma.workOrder.groupBy({ by: ['status'], _count: true });
    const woStats = Object.fromEntries(woCounts.map(c => [c.status, c._count]));

    const knowledgeTotal = await prisma.knowledgeEntry.count();
    const knowledgePending = await prisma.knowledgeEntry.count({ where: { status: 'pending' } });
    const knowledgeApproved = await prisma.knowledgeEntry.count({ where: { status: 'approved' } });

    res.json({
      devices: {
        total: devices.length,
        byStatus,
        avgOEE: oeeValues.length > 0 ? Math.round(oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length * 100) / 100 : 0,
        avgHealth: healthValues.length > 0 ? Math.round(healthValues.reduce((a, b) => a + b, 0) / healthValues.length * 10) / 10 : 0,
      },
      workOrders: woStats,
      knowledge: { total: knowledgeTotal, pending: knowledgePending, approved: knowledgeApproved },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
