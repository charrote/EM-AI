import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'em-ai-dev-secret-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * POST /api/auth/login
 * 用户登录，返回 JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: '账户已被禁用' });
    }

    // 验证密码
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // 生成 JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    res.json({
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
          email: user.email,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      name: string;
      role: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        email: true,
        isActive: true,
        lastLogin: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ data: user });
  } catch {
    res.status(401).json({ error: '认证令牌无效' });
  }
});

/**
 * POST /api/auth/register
 * 管理员注册用户（仅 admin 可调用）
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, name, role, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: '用户名、密码和姓名为必填项' });
    }

    // 检查用户名是否已存在
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: role || 'operator',
        email,
      },
    });

    res.status(201).json({
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

/**
 * PUT /api/auth/change-password
 * 修改密码
 */
router.put('/change-password', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请输入旧密码和新密码' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const validPassword = await bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '旧密码不正确' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.json({ message: '密码修改成功' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: '密码修改失败' });
  }
});

export default router;