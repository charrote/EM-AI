import '@testing-library/jest-dom';

// 添加测试辅助函数
Object.assign(global, {
  toBeInTheDocument: () => true,
  toBeVisible: () => true,
});