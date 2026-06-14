import { prisma } from '../db';
import fs from 'fs';
import path from 'path';

const DEMO_DATA_DIR = path.join(__dirname, '../../demo-data');

// ── 状态转移概率 ──────────────────────────────
// 每个状态可转移到的下一个状态及概率权重
const STATUS_TRANSITIONS: Record<string, { to: string; weight: number }[]> = {
  running: [
    { to: 'running', weight: 82 },
    { to: 'idle', weight: 10 },
    { to: 'fault', weight: 4 },
    { to: 'maintenance', weight: 4 },
  ],
  idle: [
    { to: 'idle', weight: 30 },
    { to: 'running', weight: 68 },
    { to: 'maintenance', weight: 2 },
  ],
  fault: [
    { to: 'fault', weight: 20 },
    { to: 'repair', weight: 80 },
  ],
  repair: [
    { to: 'repair', weight: 20 },
    { to: 'running', weight: 65 },
    { to: 'idle', weight: 10 },
    { to: 'maintenance', weight: 5 },
  ],
  maintenance: [
    { to: 'maintenance', weight: 15 },
    { to: 'running', weight: 80 },
    { to: 'idle', weight: 5 },
  ],
  changeover: [
    { to: 'changeover', weight: 10 },
    { to: 'running', weight: 85 },
    { to: 'idle', weight: 5 },
  ],
  retired: [
    { to: 'retired', weight: 100 },
  ],
};

function pickNextStatus(current: string): string {
  const transitions = STATUS_TRANSITIONS[current];
  if (!transitions) return current;
  const total = transitions.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of transitions) {
    r -= t.weight;
    if (r <= 0) return t.to;
  }
  return current;
}

// ── 健康度变化 ──────────────────────────────
function healthDelta(status: string): number {
  switch (status) {
    case 'running': return Math.round((Math.random() * 2 - 0.5) * 10) / 10; // -0.5 ~ +1.5
    case 'idle': return Math.round((Math.random() * 1) * 10) / 10; // 0 ~ +1
    case 'fault': return Math.round((-3 - Math.random() * 5) * 10) / 10; // -3 ~ -8
    case 'repair': return Math.round((1 + Math.random() * 2) * 10) / 10; // +1 ~ +3
    case 'maintenance': return Math.round((2 + Math.random() * 3) * 10) / 10; // +2 ~ +5
    default: return 0;
  }
}

function oeeDelta(status: string): number {
  switch (status) {
    case 'running': return Math.round((Math.random() * 2 - 0.5) * 10) / 10;
    case 'idle': return Math.round((-1 - Math.random() * 2) * 10) / 10;
    case 'fault': return Math.round((-5 - Math.random() * 5) * 10) / 10;
    case 'repair': return Math.round((1 + Math.random() * 2) * 10) / 10;
    case 'maintenance': return Math.round((2 + Math.random() * 3) * 10) / 10;
    default: return 0;
  }
}

// ── 模拟器类 ──────────────────────────────────
class DeviceSimulator {
  private intervalId: NodeJS.Timeout | null = null;
  private _tickCount = 0;
  private _startTime: Date;
  private _lastSnapshotDate: string = '';
  private _status: 'stopped' | 'running' = 'stopped';

  constructor() {
    this._startTime = new Date();
  }

  get tickCount() { return this._tickCount; }
  get status() { return this._status; }
  get startTime() { return this._startTime; }
  get uptime() { return Math.floor((Date.now() - this._startTime.getTime()) / 1000); }

  start() {
    if (this._status === 'running') return;
    this._status = 'running';
    this._startTime = new Date();
    console.log('📊 Device simulator started — tick every 30s');
    this.tick(); // Immediate first tick
    this.intervalId = setInterval(() => this.tick(), 30_000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._status = 'stopped';
    console.log('📊 Device simulator stopped');
  }

  private async tick() {
    this._tickCount++;
    try {
      const devices = await prisma.device.findMany({ select: { id: true, status: true, healthScore: true, oee: true, totalRunningTime: true } });
      const updates: { id: string; status: string; healthScore: number; oee: number; totalRunningTime: number }[] = [];

      for (const device of devices) {
        // 每次 tick 模拟 ~15% 的设备变化
        if (Math.random() > 0.15) continue;

        const newStatus = pickNextStatus(device.status);
        const newHealth = Math.max(5, Math.min(100, Math.round((device.healthScore || 70) + healthDelta(newStatus))));
        const newOee = Math.max(5, Math.min(100, Math.round((device.oee || 70) + oeeDelta(newStatus))));

        // Track running time (tick is 30s ≈ 0.00833h)
        const prevRunningTime = device.totalRunningTime || 0;
        const addHours = newStatus === 'running' ? 0.00833 : 0;

        updates.push({
          id: device.id,
          status: newStatus,
          healthScore: newHealth,
          oee: newOee,
          totalRunningTime: Math.round((prevRunningTime + addHours) * 100) / 100,
        });
      }

      // Batch update
      if (updates.length > 0) {
        await Promise.all(
          updates.map((u) =>
            prisma.device.update({
              where: { id: u.id },
              data: { status: u.status, healthScore: u.healthScore, oee: u.oee, totalRunningTime: u.totalRunningTime },
            })
          )
        );
        console.log(`  [Simulator tick #${this._tickCount}] Updated ${updates.length} devices`);
      }

      // 检查是否需要保存日快照
      await this.checkDailySnapshot();
    } catch (err) {
      console.error('  [Simulator] Tick error:', err);
    }
  }

  private async checkDailySnapshot() {
    const today = new Date().toISOString().slice(0, 10);
    if (this._lastSnapshotDate === today) return;

    // Save snapshot once per day
    try {
      if (!fs.existsSync(DEMO_DATA_DIR)) {
        fs.mkdirSync(DEMO_DATA_DIR, { recursive: true });
      }

      const devices = await prisma.device.findMany();
      const timestamp = new Date().toISOString();
      const snapshot = { timestamp, deviceCount: devices.length, devices };

      const filePath = path.join(DEMO_DATA_DIR, `${today}.json`);
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
      this._lastSnapshotDate = today;
      console.log(`  [Simulator] Daily snapshot saved: ${today}.json (${devices.length} devices)`);
    } catch (err) {
      console.error('  [Simulator] Snapshot save failed:', err);
    }
  }

  // 获取可用快照列表
  getSnapshots(): { date: string; size: number }[] {
    try {
      if (!fs.existsSync(DEMO_DATA_DIR)) return [];
      return fs.readdirSync(DEMO_DATA_DIR)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          const stat = fs.statSync(path.join(DEMO_DATA_DIR, f));
          return { date: f.replace('.json', ''), size: stat.size };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  }
}

export const simulator = new DeviceSimulator();
