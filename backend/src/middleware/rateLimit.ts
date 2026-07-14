import rateLimit from 'express-rate-limit';

/**
 * 全局请求限流
 * 默认：100 请求/15 分钟
 */
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.',
  },
});

/**
 * 认证接口限流（更严格）
 * 登录/注册等接口：10 请求/15 分钟
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts, please try again later.',
  },
});