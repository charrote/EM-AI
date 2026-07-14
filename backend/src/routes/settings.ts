import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const SETTINGS_FILE = path.join(__dirname, '../../../data/settings.json');

function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadSettings(): Record<string, any> {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return getDefaultSettings();
  }
}

function saveSettings(settings: Record<string, any>) {
  ensureDataDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

function getDefaultSettings() {
  return {
    dataMode: 'mock',
    auraAi: {
      provider: 'openai',
      baseUrl: '',
      apiKey: '',
      modelId: 'gpt-4o',
    },
  };
}

// ─── 通用设置 ───

// GET /api/settings — 获取所有设置
router.get('/', (_req: Request, res: Response) => {
  res.json({ data: loadSettings() });
});

// PUT /api/settings — 更新设置
router.put('/', (req: Request, res: Response) => {
  const current = loadSettings();
  const updates = req.body;
  const newSettings = { ...current, ...updates };
  saveSettings(newSettings);
  res.json({ data: newSettings });
});

// ─── 数据模式 ───

// GET /api/settings/dataMode — 获取数据模式
router.get('/dataMode', (_req: Request, res: Response) => {
  const settings = loadSettings();
  res.json({ data: { mode: settings.dataMode } });
});

// PUT /api/settings/dataMode — 更新数据模式
router.put('/dataMode', (req: Request, res: Response) => {
  const settings = loadSettings();
  const { mode } = req.body;
  if (mode !== 'mock' && mode !== 'real') {
    return res.status(400).json({ error: 'dataMode must be mock or real' });
  }
  settings.dataMode = mode;
  saveSettings(settings);
  res.json({ data: { mode: settings.dataMode } });
});

// ─── AI / LLM 配置 ───

// GET /api/settings/ai — 获取 AI 配置（隐藏 API Key）
router.get('/ai', (_req: Request, res: Response) => {
  const settings = loadSettings();
  const ai = settings.auraAi || getDefaultSettings().auraAi;
  // 不返回 apiKey
  const { apiKey, ...safeAi } = ai;
  res.json({ data: { ...safeAi, hasApiKey: !!apiKey } });
});

// PUT /api/settings/ai — 更新 AI 配置
router.put('/ai', (req: Request, res: Response) => {
  const settings = loadSettings();
  if (!settings.auraAi) settings.auraAi = getDefaultSettings().auraAi;
  const { provider, baseUrl, apiKey, modelId } = req.body;
  if (provider !== undefined) settings.auraAi.provider = provider;
  if (baseUrl !== undefined) settings.auraAi.baseUrl = baseUrl;
  if (apiKey !== undefined) settings.auraAi.apiKey = apiKey;
  if (modelId !== undefined) settings.auraAi.modelId = modelId;
  saveSettings(settings);
  const { apiKey: _, ...safeAi } = settings.auraAi;
  res.json({ data: safeAi });
});

export default router;