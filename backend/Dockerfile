# ── EM-AI Backend Dockerfile ──────────────────
FROM node:20-alpine

WORKDIR /app

# Install build dependencies for Prisma
RUN apk add --no-cache openssl

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY prisma/ ./prisma/

# Install all dependencies (need devDeps for seed entry)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# Create demo-data directory for simulator snapshots
RUN mkdir -p demo-data

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port (docker-compose overrides to 5273)
EXPOSE 5273

ENTRYPOINT ["/docker-entrypoint.sh"]
