# Production-Ready Dockerfile for Fastify Authentication Service
# Multi-stage build for optimized image size

# Stage 1: Builder
FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL 1.1 compatibility for Prisma
RUN apk add --no-cache openssl1.1-compat

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install pnpm and dependencies
RUN npm install -g pnpm@10.21.0
RUN pnpm install --frozen-lockfile --prod=false

# Copy application source
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Install OpenSSL 1.1 compatibility for Prisma
RUN apk add --no-cache openssl1.1-compat

# Install pnpm
RUN npm install -g pnpm@10.21.0

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built files and generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy application source
COPY src ./src

# Create data directory for SQLite (for local development)
RUN mkdir -p /app/data && chown -R node:node /app/data

# Use non-root user
USER node

# Expose port
EXPOSE 8000

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "src/server.js"]
