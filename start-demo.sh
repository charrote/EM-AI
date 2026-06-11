#!/bin/bash

# EM-AI Demo Startup Script (SQLite mode - no Docker needed)
# Usage: ./start-demo.sh

set -e

echo "================================================"
echo "  EM-AI 演示系统启动脚本"
echo "================================================"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
echo -e "\n${YELLOW}[1/4] 检查环境...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}需要安装 Node.js${NC}"; exit 1; }
echo -e "  ${GREEN}✓${NC} Node.js $(node --version)"

# Install backend deps
echo -e "\n${YELLOW}[2/4] 安装后端依赖 & 初始化数据库...${NC}"
cd backend
npm install --silent 2>/dev/null
npx prisma generate 2>/dev/null
npx prisma db push --accept-data-loss 2>/dev/null
echo -e "  ${GREEN}✓${NC} 数据库初始化完成"

# Seed demo data
echo -e "\n${YELLOW}[3/4] 注入演示数据...${NC}"
npx tsx src/utils/seed.ts
echo -e "  ${GREEN}✓${NC} 演示数据就绪"
cd ..

# Start both servers
echo -e "\n${YELLOW}[4/4] 启动服务...${NC}"

# Start backend in background
cd backend && npx tsx src/index.ts &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo -e "  ${GREEN}✅ EM-AI 演示系统启动中...${NC}"
echo ""
# Read ports from config.json
API_PORT=$(node -e "console.log(require('./config.json').API_PORT || 5174)" 2>/dev/null || echo 5174)
FRONTEND_PORT=$(node -e "console.log(require('./config.json').FRONTEND_PORT || 5173)" 2>/dev/null || echo 5173)

echo "  前端:  http://localhost:${FRONTEND_PORT}"
echo "  后端:  http://localhost:${API_PORT}/api/health"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "================================================"

# Wait for both
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
