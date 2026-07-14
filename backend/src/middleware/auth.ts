import { Request, Response, NextFunction } from 'express';

/**
 * 认证中间件（占位实现）
 * 当前为 Demo 模式，后续替换为 JWT 验证
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Demo 模式：自动注入 demo token
  const token = (req.headers.authorization as string)?.replace('Bearer ', '') || 'demo-token';
  
  if (token) {
    (req as any).user = {
      id: 'demo-user',
      name: '管理员',
      role: 'admin',
    };
  }
  
  next();
}

/**
 * 角色授权中间件
 * 检查用户是否有指定角色
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    
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