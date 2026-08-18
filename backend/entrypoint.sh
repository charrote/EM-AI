#!/bin/sh
# ── EM-AI Backend Entrypoint ──────────────────
# 以 root 运行：初始化数据库并填充演示数据，然后降级到 nodejs 用户

set -e

# 确保目录存在
mkdir -p /app/data /app/uploads /app/demo-data

# 初始化数据库 schema（幂等操作）
npx prisma db push --skip-generate --accept-data-loss 2>&1 | \
  grep -v "^$" | grep -v "Ready in" | grep -v "already" || true

# 数据库为空时填充演示数据（含 admin/admin123 管理员账户）
DEVICE_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.device.count().then(c => { console.log(c); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$DEVICE_COUNT" = "0" ]; then
  echo "=== Database empty — seeding demo data ==="
  node dist/utils/seed.js
fi

# 修复所有权（必须在 db push/seed 之后，覆盖 root 创建的数据库文件）
chown -R nodejs:nodejs /app/data /app/uploads /app/demo-data

# 降级到 nodejs 用户并启动应用
exec su-exec nodejs node dist/index.js
