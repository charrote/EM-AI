import { Router, Request, Response } from 'express';

const router = Router();

const LLM_API = 'http://nat.ywapi.com:9234/v1/chat/completions';
const LLM_KEY = 'ux-6CNP4MMKATVQSG1IP0EVJ3O32R65SQA4';
const MODEL = 'UANTEKDEV0';

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

    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 512,
    });

    const response = await fetch(LLM_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_KEY}`,
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
