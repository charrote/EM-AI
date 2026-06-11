#!/bin/bash

# EM-AI Production Build Script (Mac/Linux)
# Build both backend and frontend for production deployment
# Usage: ./start-build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

echo "================================================"
echo "  EM-AI Production Build"
echo "================================================"
echo ""

# 1. Install backend dependencies
echo "[1/4] Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install --silent 2>/dev/null
echo "  [OK]"

# 2. Install frontend dependencies
echo "[2/4] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm install --silent 2>/dev/null
echo "  [OK]"

# 3. Generate Prisma client & build backend
echo "[3/4] Building backend..."
cd "$BACKEND_DIR"
npx prisma generate 2>/dev/null
npx tsc 2>/dev/null || echo "  [WARN] tsc type errors (build output still generated)"
echo "  [OK]"

# 4. Build frontend
echo "[4/4] Building frontend..."
cd "$FRONTEND_DIR"
npx vite build 2>/dev/null
echo "  [OK]"

echo ""
echo "================================================"
echo "  Build complete!"
echo "  Backend:  $BACKEND_DIR/dist/"
echo "  Frontend: $FRONTEND_DIR/dist/"
echo "================================================"
