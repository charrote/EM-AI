import { useEffect, useRef, useState, useCallback } from 'react';
import { Tag, Typography } from 'antd';
import {
  ThunderboltOutlined,
  ApiOutlined,
  CloudServerOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useResponsive } from '../hooks/useResponsive';

const { Text } = Typography;

/* ─── 协议颜色映射 ─────────────────────────── */
const PROTOCOL_COLORS: Record<string, string> = {
  MQTT: '#3B82F6',     // 蓝
  Modbus: '#10B981',   // 绿
  'OPC-UA': '#8B5CF6', // 紫
  HTTP: '#F59E0B',     // 橙
};

/* ─── 设备配置 ──────────────────────────────── */
interface DeviceConfig {
  id: string;
  name: string;
  shortName: string;
  protocol: string;
  color: string;
  icon: React.ReactNode;
  angle: number; // 角度（弧度），用于在椭圆轨道上定位
  metrics: string[];
  unit: string[];
  valueRange: [number, number];
}

const DEVICES: DeviceConfig[] = [
  {
    id: 'plc',
    name: 'PLC 控制器',
    shortName: 'PLC',
    protocol: 'Modbus',
    color: PROTOCOL_COLORS['Modbus'],
    icon: <ApiOutlined />,
    angle: -2.2,
    metrics: ['主轴转速', '进给速度', '扭矩', '功率'],
    unit: ['rpm', 'mm/min', 'N·m', 'kW'],
    valueRange: [0, 2000],
  },
  {
    id: 'scada',
    name: 'SCADA 系统',
    shortName: 'SCADA',
    protocol: 'OPC-UA',
    color: PROTOCOL_COLORS['OPC-UA'],
    icon: <CloudServerOutlined />,
    angle: -0.8,
    metrics: ['产线速度', '良品率', 'OEE', '能耗'],
    unit: ['m/min', '%', '%', 'kWh'],
    valueRange: [50, 100],
  },
  {
    id: 'sensor',
    name: '传感器阵列',
    shortName: '传感器',
    protocol: 'MQTT',
    color: PROTOCOL_COLORS['MQTT'],
    icon: <RocketOutlined />,
    angle: 0.8,
    metrics: ['温度', '振动', '电流', '电压'],
    unit: ['℃', 'mm/s', 'A', 'V'],
    valueRange: [0, 500],
  },
  {
    id: 'manual',
    name: '人工录入终端',
    shortName: '录入终端',
    protocol: 'HTTP',
    color: PROTOCOL_COLORS['HTTP'],
    icon: <ThunderboltOutlined />,
    angle: 2.2,
    metrics: ['批次号', '产量', '不良数', '操作员ID'],
    unit: ['', '件', '件', ''],
    valueRange: [0, 1000],
  },
];

/* ─── 粒子类型 ──────────────────────────────── */
interface Particle {
  x: number;
  y: number;
  progress: number;   // 0 → 1
  speed: number;
  color: string;
  size: number;
  protocol: string;
  deviceId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  cpX: number;        // 贝塞尔控制点
  cpY: number;
  opacity: number;
}

/* ─── 仪表盘条目 ────────────────────────────── */
interface DashboardEntry {
  id: number;
  time: string;
  protocol: string;
  device: string;
  metric: string;
  value: string;
  status: 'OK' | '警告' | '报警';
}

/* ─── 涟漪效果 ──────────────────────────────── */
interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

/* ─── 实用工具 ──────────────────────────────── */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function quadraticBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function formatTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatMs(ms: number): string {
  return String(Math.floor(ms)).padStart(3, '0');
}

/* ─── 仪表盘数据生成器 ──────────────────────── */
function generateEntry(id: number, now: Date): DashboardEntry {
  const protocols = ['MQTT', 'Modbus', 'OPC-UA', 'HTTP'];
  const protocol = protocols[Math.floor(Math.random() * protocols.length)];

  let device: string;
  let metric: string;
  let value: string;
  const deviceIdx = Math.floor(Math.random() * DEVICES.length);
  const dev = DEVICES[deviceIdx];
  device = `${dev.shortName}_${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;
  const mi = Math.floor(Math.random() * dev.metrics.length);
  metric = dev.metrics[mi];
  const rawVal = randomBetween(dev.valueRange[0], dev.valueRange[1]);
  value = dev.unit[mi] ? `${rawVal.toFixed(1)}${dev.unit[mi]}` : String(Math.floor(rawVal));

  // 状态：85% OK, 10% 警告, 5% 报警
  const rand = Math.random();
  let status: DashboardEntry['status'];
  if (rand < 0.85) status = 'OK';
  else if (rand < 0.95) status = '警告';
  else status = '报警';

  const time = `${formatTime()}.${formatMs(now.getMilliseconds())}`;
  return { id, time, protocol, device, metric, value, status };
}

/* ─── 状态样式 ──────────────────────────────── */
const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  OK: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  警告: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  报警: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

/* ═══════════════════════════════════════════════
   主组件
   ═══════════════════════════════════════════════ */
export default function AuraDataConvergence() {
  const { isMobile, isTablet } = useResponsive();
  const isCompact = isMobile || isTablet;

  /* ── refs ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number[]>([]);
  const entryIdRef = useRef<number>(0);

  /* ── 状态 ── */
  const [dashboardData, setDashboardData] = useState<DashboardEntry[]>([]);
  const [statsData, setStatsData] = useState({
    totalDevices: 86,
    activeDevices: 72,
    protocols: 4,
    dataPointsToday: 28473,
  });

  /* ── 动态统计更新 ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setStatsData((prev) => ({
        ...prev,
        dataPointsToday: prev.dataPointsToday + Math.floor(Math.random() * 50 + 10),
        activeDevices: prev.activeDevices + (Math.random() > 0.9 ? 1 : Math.random() > 0.95 ? -1 : 0),
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ── 仪表盘数据生成 ── */
  useEffect(() => {
    const interval = setInterval(() => {
      entryIdRef.current += 1;
      const entry = generateEntry(entryIdRef.current, new Date());
      setDashboardData((prev) => {
        const next = [...prev, entry];
        if (next.length > 300) return next.slice(-200);
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  /* ── 仪表盘自动滚动 ── */
  useEffect(() => {
    const el = dashboardRef.current;
    if (!el) return;
    // 如果用户没有手动向上滚动，则自动滚到底部
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [dashboardData]);

  /* ── Canvas 动画 ── */
  const getCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { w: 800, h: 600 };
    const rect = container.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }, []);

  const drawScene = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, time: number, dt: number) => {
      const cx = w / 2;
      const cy = h / 2;

      // 设备节点位置（椭圆轨道）
      const rx = Math.min(w, h) * 0.32;
      const ry = Math.min(w, h) * 0.28;

      const devicePositions: Record<string, { x: number; y: number }> = {};
      DEVICES.forEach((dev) => {
        devicePositions[dev.id] = {
          x: cx + rx * Math.cos(dev.angle),
          y: cy + ry * Math.sin(dev.angle),
        };
      });

      /* ── 1. 背景 ── */
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, '#141838');
      bgGrad.addColorStop(0.5, '#0E1230');
      bgGrad.addColorStop(1, '#070A1A');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 底部光晕
      const glowGrad = ctx.createRadialGradient(cx, cy + h * 0.15, 0, cx, cy + h * 0.15, h * 0.5);
      glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.03)');
      glowGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, w, h);

      /* ── 2. 连接线 ── */
      DEVICES.forEach((dev) => {
        const pos = devicePositions[dev.id];
        if (!pos) return;

        const cp = {
          x: cx + (pos.x - cx) * 0.4 + (pos.y - cy) * 0.15,
          y: cy + (pos.y - cy) * 0.4 + (cx - pos.x) * 0.15,
        };

        // 主连接线（虚线光晕）
        ctx.save();
        ctx.shadowColor = dev.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.quadraticCurveTo(cp.x, cp.y, cx, cy);
        ctx.strokeStyle = dev.color + '30';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.stroke();
        ctx.restore();

        // 实心底线
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.quadraticCurveTo(cp.x, cp.y, cx, cy);
        ctx.strokeStyle = dev.color + '15';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.restore();
      });

      /* ── 3. 粒子更新与绘制 ── */
      const particles = particlesRef.current;

      // 生成新粒子
      DEVICES.forEach((dev, idx) => {
        const pos = devicePositions[dev.id];
        if (!pos) return;

        spawnTimerRef.current[idx] = (spawnTimerRef.current[idx] || 0) + dt;
        const interval = randomBetween(300, 800);
        if (spawnTimerRef.current[idx] >= interval) {
          spawnTimerRef.current[idx] = 0;

          const cp = {
            x: cx + (pos.x - cx) * 0.35 + (pos.y - cy) * 0.2,
            y: cy + (pos.y - cy) * 0.35 + (cx - pos.x) * 0.2,
          };

          particles.push({
            x: pos.x,
            y: pos.y,
            progress: 0,
            speed: randomBetween(0.004, 0.01),
            color: dev.color,
            size: randomBetween(2, 4),
            protocol: dev.protocol,
            deviceId: dev.id,
            startX: pos.x,
            startY: pos.y,
            endX: cx,
            endY: cy,
            cpX: cp.x,
            cpY: cp.y,
            opacity: 1,
          });
        }
      });

      // 更新粒子
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.progress += p.speed;
        p.opacity = 1 - p.progress * 0.5;

        if (p.progress >= 1) {
          // 到达中心 → 产生涟漪
          ripplesRef.current.push({
            x: p.endX,
            y: p.endY,
            radius: 2,
            maxRadius: randomBetween(30, 60),
            opacity: 0.6,
            color: p.color,
          });
          particles.splice(i, 1);
          continue;
        }

        const pos = quadraticBezier(
          { x: p.startX, y: p.startY },
          { x: p.cpX, y: p.cpY },
          { x: p.endX, y: p.endY },
          p.progress,
        );
        p.x = pos.x;
        p.y = pos.y;
      }

      // 绘制粒子
      particles.forEach((p) => {
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 180).toString(16).padStart(2, '0');
        ctx.fill();
        ctx.restore();

        // 粒子拖尾
        for (let t = 0.1; t <= 0.4; t += 0.1) {
          const backProgress = Math.max(0, p.progress - t);
          const backPos = quadraticBezier(
            { x: p.startX, y: p.startY },
            { x: p.cpX, y: p.cpY },
            { x: p.endX, y: p.endY },
            backProgress,
          );
          ctx.beginPath();
          ctx.arc(backPos.x, backPos.y, p.size * (1 - t), 0, Math.PI * 2);
          ctx.fillStyle = p.color + Math.floor((1 - t) * 60).toString(16).padStart(2, '0');
          ctx.fill();
        }
      });

      /* ── 4. 涟漪 ── */
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 1.2;
        r.opacity -= 0.015;
        if (r.opacity <= 0 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color + Math.floor(r.opacity * 180).toString(16).padStart(2, '0');
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      /* ── 5. 中心数据总线 ── */
      // 外光环（脉冲）
      const pulseSize = 0.1 * Math.sin(time * 0.002) + 0.9;
      ctx.save();
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(cx, cy, 42 * pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6, 182, 212, ${0.08 * pulseSize})`;
      ctx.fill();
      ctx.restore();

      // 中环
      ctx.save();
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // 内圆
      const innerGrad = ctx.createRadialGradient(cx - 8, cy - 8, 0, cx, cy, 28);
      innerGrad.addColorStop(0, '#1E2A5E');
      innerGrad.addColorStop(0.7, '#0F1640');
      innerGrad.addColorStop(1, '#080C20');
      ctx.save();
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 26, 0, Math.PI * 2);
      ctx.fillStyle = innerGrad;
      ctx.fill();
      ctx.restore();

      // 中心文字
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#06B6D4';
      ctx.shadowBlur = 10;

      ctx.font = 'bold 12px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('EM-AI', cx, cy - 6);

      ctx.font = '10px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('数据总线', cx, cy + 10);
      ctx.restore();

      /* ── 6. 设备节点 ── */
      DEVICES.forEach((dev) => {
        const pos = devicePositions[dev.id];
        if (!pos) return;

        const nodeRadius = isCompact ? 28 : 34;
        const pulse = 0.08 * Math.sin(time * 0.003 + dev.angle * 2) + 1;

        // 外发光
        ctx.save();
        ctx.shadowColor = dev.color;
        ctx.shadowBlur = 20 * pulse;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = dev.color + '20';
        ctx.fill();
        ctx.restore();

        // 节点圆
        const nodeGrad = ctx.createRadialGradient(
          pos.x - nodeRadius * 0.3, pos.y - nodeRadius * 0.3, 0,
          pos.x, pos.y, nodeRadius,
        );
        nodeGrad.addColorStop(0, '#1E293B');
        nodeGrad.addColorStop(0.6, '#0F172A');
        nodeGrad.addColorStop(1, '#020617');
        ctx.save();
        ctx.shadowColor = dev.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeGrad;
        ctx.fill();
        ctx.strokeStyle = dev.color + '60';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // 设备缩写文字
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${isCompact ? 10 : 12}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle = dev.color;
        ctx.fillText(dev.shortName, pos.x, pos.y);
        ctx.restore();

        // 设备名标签
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.font = `${isCompact ? 9 : 11}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(dev.name, pos.x, pos.y + nodeRadius + 6);
        ctx.restore();

        // 协议标签
        const tagW = isCompact ? 36 : 48;
        const tagH = isCompact ? 16 : 18;
        const tagX = pos.x - tagW / 2;
        const tagY = pos.y + nodeRadius + (isCompact ? 18 : 22);
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 4);
        ctx.fillStyle = dev.color + '25';
        ctx.fill();
        ctx.strokeStyle = dev.color + '40';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${isCompact ? 8 : 9}px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.fillStyle = dev.color;
        ctx.fillText(dev.protocol, pos.x, tagY + tagH / 2);
        ctx.restore();
      });
    },
    [isCompact],
  );

  /* ── 动画循环 ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const { w, h } = getCanvasSize();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    lastTimeRef.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, 50); // cap at 50ms
      lastTimeRef.current = now;

      const { w, h } = getCanvasSize();
      ctx.save();
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      drawScene(ctx, w, h, now, dt);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
    };
  }, [getCanvasSize, drawScene]);

  /* ── 渲染 ── */
  const dashboardPanelWidth = isCompact ? '100%' : 380;
  const leftPanelStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    background: '#070A1A',
  };

  const rightPanelStyle: React.CSSProperties = {
    width: dashboardPanelWidth,
    flexShrink: 0,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(180deg, #0E1230 0%, #0A0E27 100%)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const statCardStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ─── 头部标题 ─── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #06B6D4, #3B82F6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
            }}
          >
            <ThunderboltOutlined />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
              多元数据汇聚
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
              AURA Multi-Protocol Data Convergence
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10B981',
              display: 'inline-block',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>实时接收中</span>
        </div>
      </div>

      {/* ─── 统计卡片行 ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isCompact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={statCardStyle}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>接入设备</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
            {statsData.totalDevices}
          </div>
          <div style={{ fontSize: 10, color: '#10B981' }}>
            {statsData.activeDevices} 台在线
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>支持协议</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
            {statsData.protocols}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            MQTT / Modbus / OPC-UA / HTTP
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>今日数据点</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
            {statsData.dataPointsToday.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: '#3B82F6' }}>
            持续增长中
          </div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>系统状态</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#10B981' }}>
            正常运行
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
            数据吞吐: 1.2k msg/s
          </div>
        </div>
      </div>

      {/* ─── 主体：Canvas + 看板 ─── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isCompact ? 'column' : 'row',
          gap: 12,
          minHeight: 0,
        }}
      >
        {/* 左：Canvas 拓扑 */}
        <div ref={containerRef} style={leftPanelStyle}>
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
            }}
          />
          {/* 左下角水印图例 */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {Object.entries(PROTOCOL_COLORS).map(([protocol, color]) => (
              <div
                key={protocol}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    display: 'inline-block',
                  }}
                />
                {protocol}
              </div>
            ))}
          </div>
        </div>

        {/* 右：实时接入看板 */}
        <div style={rightPanelStyle}>
          {/* 看板头部 */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10B981',
                  display: 'inline-block',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF' }}>
                实时数据接入
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {dashboardData.length} 条
            </span>
          </div>

          {/* 看板列表 */}
          <div
            ref={dashboardRef}
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '4px 0',
            }}
          >
            {dashboardData.length === 0 && (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 13,
                }}
              >
                等待数据接入...
              </div>
            )}
            {dashboardData.map((entry) => {
              const sStyle = STATUS_STYLES[entry.status];
              return (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 16px',
                    fontSize: 11,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    transition: 'background 0.15s',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {/* 时间戳 */}
                  <span style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0, width: 68 }}>
                    {entry.time}
                  </span>

                  {/* 协议标签 */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1px 6px',
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 600,
                      color: PROTOCOL_COLORS[entry.protocol] || '#FFF',
                      background: (PROTOCOL_COLORS[entry.protocol] || '#FFF') + '20',
                      flexShrink: 0,
                      minWidth: 42,
                    }}
                  >
                    {entry.protocol}
                  </span>

                  {/* 设备名 */}
                  <span style={{ color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
                    {entry.device}
                  </span>

                  {/* 指标 */}
                  <span style={{ color: 'rgba(255,255,255,0.5)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.metric}: {entry.value}
                  </span>

                  {/* 状态 */}
                  <span
                    style={{
                      flexShrink: 0,
                      padding: '1px 6px',
                      borderRadius: 3,
                      fontSize: 9,
                      fontWeight: 600,
                      color: sStyle.color,
                      background: sStyle.bg,
                    }}
                  >
                    {entry.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── 注入关键帧动画 ─── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dashboard-entry {
          animation: fadeInUp 0.2s ease-out;
        }
        canvas {
          animation: fadeInUp 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
