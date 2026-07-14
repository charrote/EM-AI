import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

describe('Authentication E2E Tests', () => {
  beforeAll(async () => {
    // 创建测试用户
    await prisma.user.deleteMany();
    const hashedPassword = await bcrypt.hash('test123', 10);
    await prisma.user.create({
      data: {
        username: 'testuser',
        password: hashedPassword,
        name: '测试用户',
        role: 'operator',
        email: 'test@example.com',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('应该能够登录并获取 JWT token', async () => {
    const response = await fetch('http://localhost:5273/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'test123',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveProperty('token');
    expect(data.data.user).toHaveProperty('username', 'testuser');
    expect(data.data.user).toHaveProperty('role', 'operator');
  });

  it('应该拒绝错误的密码', async () => {
    const response = await fetch('http://localhost:5273/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'wrongpassword',
      }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('用户名或密码错误');
  });

  it('应该拒绝不存在的用户', async () => {
    const response = await fetch('http://localhost:5273/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'nonexistent',
        password: 'any',
      }),
    });

    expect(response.status).toBe(401);
  });

  it('应该通过 JWT token 访问受保护的 API', async () => {
    // 先登录获取 token
    const loginRes = await fetch('http://localhost:5273/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'test123',
      }),
    });
    const { token } = await loginRes.json().then(r => r.data);

    // 使用 token 访问设备 API
    const response = await fetch('http://localhost:5273/api/devices', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(200);
  });

  it('应该拒绝没有 token 的请求', async () => {
    const response = await fetch('http://localhost:5273/api/devices');

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('应该拒绝无效的 token', async () => {
    const response = await fetch('http://localhost:5273/api/devices', {
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
    });

    expect(response.status).toBe(401);
  });
});

describe('Settings API Tests', () => {
  beforeAll(async () => {
    // 确保数据目录存在
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, '../../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // 清理测试数据
    const fs = require('fs');
    const path = require('path');
    const settingsFile = path.join(__dirname, '../../../data/settings.json');
    if (fs.existsSync(settingsFile)) {
      fs.unlinkSync(settingsFile);
    }
  });

  it('应该能够获取默认设置', async () => {
    const response = await fetch('http://localhost:5273/api/settings', {
      headers: { 'Authorization': 'Bearer test-token' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toHaveProperty('dataMode');
    expect(data.data).toHaveProperty('auraAi');
  });

  it('应该能够更新 AI 配置', async () => {
    const response = await fetch('http://localhost:5273/api/settings/ai', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({
        provider: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        modelId: 'gpt-4',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    // API Key 不应该返回
    expect(data.data).not.toHaveProperty('apiKey');
    expect(data.data.provider).toBe('openai');
    expect(data.data.modelId).toBe('gpt-4');
  });

  it('应该能够切换数据模式', async () => {
    const response = await fetch('http://localhost:5273/api/settings/dataMode', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
      },
      body: JSON.stringify({ mode: 'real' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.mode).toBe('real');
  });
});

describe('Health Check', () => {
  it('应该返回健康状态', async () => {
    const response = await fetch('http://localhost:5273/api/health');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('timestamp');
  });
});