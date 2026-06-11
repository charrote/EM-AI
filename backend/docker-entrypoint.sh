#!/bin/sh
# ── EM-AI Backend Entrypoint ──────────────────
set -e

echo "=== Running Prisma schema sync ==="
npx prisma db push --accept-data-loss

# Check if database needs seeding
DEVICE_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.device.count().then(c => { console.log(c); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$DEVICE_COUNT" = "0" ]; then
  echo "=== Database empty — seeding demo data ==="
  node dist/utils/seed.js
else
  echo "=== Database has $DEVICE_COUNT devices — skipping seed ==="
fi

echo "=== Starting backend ==="
exec node dist/index.js
