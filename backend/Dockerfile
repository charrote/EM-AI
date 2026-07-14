# ── 多阶段构建 ──

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci

# 安装 Prisma CLI
RUN npm install -D prisma

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 安装 SQLite（运行时依赖）
RUN apk add --no-cache sqlite

# 复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# 创建数据目录
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 5273

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5273/api/health || exit 1

# 启动命令
CMD ["node", "dist/index.js"]