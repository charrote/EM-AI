import { Router, Request, Response } from 'express';
import { Readable } from 'stream';
import { loadAiConfig, resolveCompletionsUrl } from '../utils/llm';

const router = Router();

// POST /api/ai/chat — Aura 对话流式代理
// LLM 凭据只保存在服务端 settings.json，浏览器不再直连 LLM
router.post('/chat', async (req: Request, res: Response) => {
  const config = loadAiConfig();
  if (!config.apiKey) {
    return res.status(503).json({ error: 'LLM API Key not configured. Please configure it in Aura settings.' });
  }

  const { messages, stream = true, temperature = 0.7, max_tokens = 4096, model, ...rest } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing required field: messages' });
  }

  const body = JSON.stringify({
    model: model || config.modelId,
    messages,
    stream,
    temperature,
    max_tokens,
    ...rest, // 透传 enable_thinking 等扩展参数
  });

  try {
    const upstream = await fetch(resolveCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
      signal: AbortSignal.timeout(120000),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('LLM upstream error:', upstream.status, errText);
      return res.status(502).json({ error: 'LLM API request failed', detail: errText.slice(0, 500) });
    }

    if (!stream || !upstream.body) {
      return res.send(await upstream.text());
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    Readable.fromWeb(upstream.body as import('stream/web').ReadableStream).pipe(res);
  } catch (err: any) {
    console.error('LLM proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'LLM proxy failed', detail: err.message });
    } else {
      res.end();
    }
  }
});

export default router;
