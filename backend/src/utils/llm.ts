import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  provider: string;
}

// 从 settings.json 读取 Aura LLM 配置，回退到环境变量与内置默认值
export function loadAiConfig(): LlmConfig {
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

// baseUrl 统一按服务基地址处理（如 http://host:port/v1），拼出 completions 完整地址
export function resolveCompletionsUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '') + '/chat/completions';
}
