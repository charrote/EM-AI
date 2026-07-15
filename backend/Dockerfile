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

# 安装运行时依赖
RUN apk add --no-cache sqlite su-exec wget

# 复制构建产物
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# 创建数据/上传目录 + 复制入口脚本
COPY --chown=nodejs:nodejs entrypoint.sh /app/entrypoint.sh
RUN mkdir -p /app/data /app/uploads && chown -R nodejs:nodejs /app/data /app/uploads && chmod +x /app/entrypoint.sh

# 暴露端口
EXPOSE 5273

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5273/api/health || exit 1

# 入口脚本（以 root 运行，修复权限后降权到 nodejs）
ENTRYPOINT ["/app/entrypoint.sh"]