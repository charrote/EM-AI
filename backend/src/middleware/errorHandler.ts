/**
 * 统一错误类
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 错误处理中间件
 */
export function errorHandler(
  err: Error,
  _req: any,
  res: any,
  _next: any
): void {
  // 默认错误
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err instanceof AppError ? err.message : 'Internal Server Error';

  // 数据库唯一冲突
  if (err.code === 'P2002') {
    statusCode = 409;
    message = '数据已存在，请勿重复提交';
  }

  // 无效参数
  if (err instanceof SyntaxError) {
    statusCode = 400;
    message = '请求格式错误';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 异步路由包装器
 * 自动捕获异步错误并传递给错误处理中间件
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}