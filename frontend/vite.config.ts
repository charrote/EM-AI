import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'fs'

// Fallback when config.json is missing (e.g., Docker build)
const cfg = existsSync('../config.json')
  ? JSON.parse(readFileSync('../config.json', 'utf-8'))
  : { FRONTEND_PORT: 5173, API_PORT: 5174 };

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: cfg.FRONTEND_PORT || 5173,
    allowedHosts: ['uantekemai.frp.ywapi.com'],
    proxy: {
      '/api': {
        target: `http://localhost:${cfg.API_PORT || 5273}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) {
            return 'vendor-antd';
          }
          if (id.includes('node_modules/echarts')) {
            return 'vendor-echarts';
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
        },
      },
    },
  },
})
