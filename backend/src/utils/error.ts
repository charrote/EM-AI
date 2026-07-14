/**
 * 统一错误处理
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = statusCode >= 400 && statusCode < 500;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 错误处理工具
 */
export function handleError(
  error: Error,
  message: string,
  statusCode: number = 500
): { error: string; message: string } {
  console.error(`[Error] ${message}:`, error);
  
  // 生产环境不暴露详细错误信息
  const isProd = process.env.NODE_ENV === 'production';
  
  return {
    error: isProd ? 'Internal Server Error' : error.name || 'Error',
    message: isProd ? message : error.message,
  };
}