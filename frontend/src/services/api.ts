import axios from 'axios';
import { useStore } from '../store/useStore';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 认证 token 拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('demo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 — 处理 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 认证失效，清除本地状态并跳转登录
      useStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
    }
    return Promise.reject(error);
  }
);

export default api;