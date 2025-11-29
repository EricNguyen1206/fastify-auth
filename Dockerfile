# ====================================================================================
# Stage 1: Dependencies - Install all dependencies including dev dependencies
# ====================================================================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and Prisma schema (needed for postinstall hook)
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install ALL dependencies (including Prisma CLI needed for generation)
RUN pnpm install --frozen-lockfile

# ====================================================================================
# Stage 2: Builder - Generate Prisma Client
# ====================================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source and Prisma schema
COPY . .

# Generate Prisma Client (this is critical for runtime)
# The client was already generated during install, but regenerate to be sure
RUN pnpm exec prisma generate

# ====================================================================================
# Stage 3: Production - Minimal runtime image
# ====================================================================================
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
# - dumb-init: for proper signal handling
# - openssl: required by Prisma Client
RUN apk add --no-cache dumb-init openssl

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files and Prisma schema
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install ONLY production dependencies (skip scripts since we copy generated client)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && \
    pnpm store prune

# Copy generated Prisma Client from builder stage
# With pnpm, the client is in .pnpm directory
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# Copy application source
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=production \
    PORT=8080

# Expose port (Cloud Run uses PORT=8080)
EXPOSE 8080

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "src/server.js"]
