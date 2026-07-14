import { describe, it, expect } from 'vitest';
import { AppError, handleError } from './error';

describe('AppError', () => {
  it('应该创建正确的错误对象', () => {
    const error = new AppError('测试错误', 400);
    expect(error.message).toBe('测试错误');
    expect(error.statusCode).toBe(400);
    expect(error.isOperational).toBe(true);
  });

  it('应该正确识别系统错误', () => {
    const error = new AppError('系统错误', 500);
    expect(error.isOperational).toBe(false);
  });
});

describe('handleError', () => {
  it('应该返回正确的错误格式', () => {
    const error = new Error('测试错误');
    const result = handleError(error, '内部错误', 500);
    
    expect(result.error).toBeDefined();
    expect(result.message).toBe('内部错误');
  });
});