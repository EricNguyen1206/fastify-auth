# ----------------------------
# 1. Base build stage
# ----------------------------
FROM node:20-alpine AS builder

# Tạo thư mục làm việc
WORKDIR /app

# Copy file package.json và package-lock.json
COPY package*.json ./

# Cài dependencies (production)
RUN npm ci --omit=dev

# Copy toàn bộ project vào container
COPY . .

# ----------------------------
# 2. Runtime stage (image nhỏ, chạy nhanh)
# ----------------------------
FROM node:20-alpine

WORKDIR /app

# Copy node_modules và source từ build stage
COPY --from=builder /app /app

# Set môi trường
ENV NODE_ENV=production

# Cloud Run sử dụng PORT=8080, nhưng EXPOSE là tùy chọn
EXPOSE 8080

# CMD khởi động app Fastify
CMD ["node", "src/server.js"]
