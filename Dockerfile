# Ultra-optimized Dockerfile with Distroless
# Image size: ~50-70MB vs ~120-150MB Alpine
# Security: No shell, no package manager in final image

# Stage 1: Dependencies
FROM node:18-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10.21.0
COPY package.json pnpm-lock.yaml ./
# Disable postinstall script for production deps (prisma generate needs dev deps)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.21.0
COPY package.json pnpm-lock.yaml ./
# Disable postinstall script (prisma generate will be done manually)
RUN pnpm install --frozen-lockfile --ignore-scripts
# Copy source code
COPY src ./src
# Copy prisma folder (now exists, even if empty)
COPY prisma ./prisma
# Check if prisma schema exists and generate client
RUN if [ -f "prisma/schema.prisma" ]; then \
      echo "Prisma schema found, generating client..."; \
      pnpm prisma generate; \
    else \
      echo "Prisma schema not found, skipping generate"; \
    fi && \
    mkdir -p ./node_modules/.prisma || true

# Stage 3: Distroless (ultra-minimal)
FROM gcr.io/distroless/nodejs18-debian11

WORKDIR /app

# Copy from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy Prisma client (if exists)
# Distroless doesn't have shell, so create dirs in builder stage
# These directories are created in builder stage, so COPY will work even if empty
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy source and package.json
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src ./src

# Distroless runs as non-root by default (uid 65532)
# No USER command needed

# Environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

EXPOSE 8080

# Distroless doesn't support HEALTHCHECK
# Cloud Run will handle health checks

# Start application
# Distroless nodejs image has node as entrypoint, but we need to specify it explicitly
CMD ["node", "src/server.js"]