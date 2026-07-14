import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'em-ai-dev-secret-change-in-production';
const JWT_EXPIRY = '24h';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    name: string;
    role: string;
  };
}

/**
 * JWT 认证中间件
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  // 健康检查和其他公开端点不需要认证
  if (req.path === '/api/health') {
    return next();
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: '未提供认证令牌，请先登录',
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      username: string;
      name: string;
      role: string;
    };

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: '认证令牌无效或已过期',
    });
  }
}

/**
 * 角色授权中间件
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: '请先登录',
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: '没有权限执行此操作',
      });
      return;
    }

    next();
  };
}

/**
 * 公开 API 列表（不需要认证）
 */
export const publicPaths = [
  '/api/health',
  '/api/auth/login',
];