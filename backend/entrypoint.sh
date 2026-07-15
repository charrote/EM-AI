#!/bin/sh
# ── EM-AI Backend Entrypoint ──────────────────
# 以 root 运行，在启动应用前修复权限，然后降级到 nodejs 用户

set -e

# 确保目录存在并设置所有权
mkdir -p /app/data /app/uploads /app/demo-data
chown -R nodejs:nodejs /app/data /app/uploads /app/demo-data

# 初始化数据库 schema（幂等操作）
npx prisma db push --skip-generate --accept-data-loss 2>&1 | \
  grep -v "^$" | grep -v "Ready in" | grep -v "already" || true

# 降级到 nodejs 用户并启动应用
exec su-exec nodejs node dist/index.js
