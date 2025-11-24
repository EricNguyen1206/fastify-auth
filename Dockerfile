# Dockerfile for Fastify Authentication Service
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install ALL dependencies (need prisma CLI)
RUN npm ci

# Copy application code
COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Set environment variables
ENV NODE_ENV=development
ENV PORT=8000

# Use entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
