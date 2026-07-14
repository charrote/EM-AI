import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadSettings(): any {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return getDefaultSettings();
  }
}

function saveSettings(settings: any) {
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

// GET /api/settings/dataMode — 获取数据模式
router.get('/dataMode', (req: Request, res: Response) => {
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

// GET /api/settings/ai — 获取AI配置
router.get('/ai', (req: Request, res: Response) => {
  const settings = loadSettings();
  res.json({ data: settings.auraAi || getDefaultSettings().auraAi });
});

// PUT /api/settings/ai — 更新AI配置
router.put('/ai', (req: Request, res: Response) => {
  const settings = loadSettings();
  const { provider, baseUrl, apiKey, modelId } = req.body;
  if (!settings.auraAi) settings.auraAi = getDefaultSettings().auraAi;
  settings.auraAi.provider = provider || settings.auraAi.provider;
  settings.auraAi.baseUrl = baseUrl !== undefined ? baseUrl : settings.auraAi.baseUrl;
  settings.auraAi.apiKey = apiKey !== undefined ? apiKey : settings.auraAi.apiKey;
  settings.auraAi.modelId = modelId || settings.auraAi.modelId;
  saveSettings(settings);
  res.json({ data: settings.auraAi });
});

export default router;
