import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * 安全头中间件
 * 添加常见安全头
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // 安全头（helmet 已在主入口配置）
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS 头（cors 已在主入口配置）
  next();
}

/**
 * 请求日志中间件
 * 记录请求方法、路径、状态码和耗时
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // 捕获响应结束
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  
  next();
}