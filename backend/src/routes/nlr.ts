import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const SETTINGS_FILE = path.join(__dirname, '../../../data/settings.json');

function loadAiConfig(): { baseUrl: string; apiKey: string; modelId: string; provider: string } {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(raw);
    const ai = settings.auraAi || {};
    return {
      baseUrl: ai.baseUrl || process.env.LLM_BASE_URL || 'http://nat.ywapi.com:9234/v1',
      apiKey: ai.apiKey || process.env.LLM_API_KEY || '',
      modelId: ai.modelId || process.env.LLM_MODEL_ID || 'UANTEKDEV0',
      provider: ai.provider || 'openai',
    };
  } catch {
    return {
      baseUrl: process.env.LLM_BASE_URL || 'http://nat.ywapi.com:9234/v1',
      apiKey: process.env.LLM_API_KEY || '',
      modelId: process.env.LLM_MODEL_ID || 'UANTEKDEV0',
      provider: 'openai',
    };
  }
}

const SYSTEM_PROMPT = `你是一个设备故障报修信息提取助手。从用户的自然语言描述中提取结构化的维修需求信息。

请分析以下维度：
1. deviceName: 提取具体的设备名称，如"3号生产线驱动电机"、"2号空压机"等。如果提到产线编号，结合上下文推断完整设备名。
2. faultPhenomenon: 故障现象列表，提取具体的异常表现（如"声音刺耳"、"转动阻力大"、"温度偏高"等），每项简洁明确。
3. urgency: 紧急程度，根据语义判断：
   - 高：涉及停产、安全风险、关键设备完全失效等
   - 中：设备运行异常但未完全停机，或描述中使用"可能"、"好像"等不确定用词
   - 低：轻微异常、观察项、计划外保养等
4. estimatedFaultType: 故障类型分类，从以下选择：机械、电气、液压、气动、软件、其他
5. confidence: 对提取结果的置信度，0-1之间

请思考用户的描述语言习惯——维修工常用口语化、碎片化表达，需要结合上下文理解真实意图。

仅输出JSON格式，不要包含markdown代码块标记或其他说明文字。JSON字段：deviceName, faultPhenomenon, urgency, estimatedFaultType, confidence`;

router.post('/parse', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const config = loadAiConfig();
    if (!config.apiKey) {
      return res.status(503).json({ error: 'LLM API Key not configured. Please set it in System Settings.' });
    }

    const body = JSON.stringify({
      model: config.modelId,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 512,
    });

    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('LLM API error:', response.status, errText);
      return res.status(502).json({ error: 'LLM API request failed', detail: errText });
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Try to parse JSON from the response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          parsed = { raw: content, error: 'Failed to parse LLM response as JSON' };
        }
      } else {
        parsed = { raw: content, error: 'Failed to parse LLM response as JSON' };
      }
    }

    res.json({
      data: {
        ...parsed,
        raw: content,
      },
    });
  } catch (err: any) {
    console.error('NLR parse error:', err);
    res.status(500).json({ error: 'Failed to parse repair description', message: err.message });
  }
});

export default router;