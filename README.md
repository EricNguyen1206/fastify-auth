# Project Authentication with Fastify

This project is a Fastify-based authentication system that includes user registration, login, and protected routes. It uses SQLite as the database and bcrypt for password hashing. The logging is configured with pino-pretty for development and pino-loki for production environments.

## Features

- User Registration
- User Login with JWT
- Protected Routes
- SQLite Database Integration
- Environment-based Logging Configuration

## Prerequisites

- Node.js (version 18.15.0 or higher)
- pnpm (Package Manager)
- Docker or Podman (for production deployment)

## Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start development server
npm run dev
```

### Production (Docker)

```bash
# Configure environment
cp .env.example .env
# Edit .env with production values

# Start all services
cd infra
docker-compose up -d
```

See [PRODUCTION.md](PRODUCTION.md) for detailed deployment guide.

## How to Run

- Command to start the server in development mode with nodemon:

  ```bash
  npm run dev
  ```

- Command to start the server in production mode:
  ```bash
  npm start
  ```
- Command to start the server in production mode with PM2:
  ```bash
  pm2 start app.js
  ```

## Scale plan

1. PM2 Mode - Vertical Scaling

- Using Fat Container with multiple vCPU and large memory
- Config PM2 to use cluster mode
- Run only 1 Docker instance in PM2 with 4 processes
- No need to config Load Balancer, because PM2 will handle the load balancing between processes

2. K8s - Horizontal Scaling

- Using Light Container with single vCPU and small memory
- Config K8s to use horizontal pod auto-scaling
- Run multiple Docker instances in K8s with 4 processes each
- Need to config Load Balancer to distribute traffic between Docker instances

## Observability Architecture

**Simplified Production-Ready Stack** (Migrated 2025-11-25)

- **Prometheus** - Metrics collection and storage (scrapes `/metrics` endpoint)
- **Loki** - Log aggregation (via Vector agent)
- **Tempo** - Distributed tracing (via OpenTelemetry)
- **Vector** - Lightweight log collector and forwarder
- **Grafana** - Unified visualization dashboard

### How It Works

```
Fastify App
  ├── Logs → stdout → Vector → Loki
  ├── Metrics → prom-client → Prometheus (scrape /metrics)
  └── Traces → OpenTelemetry SDK → Tempo
```

**Access Points**:

- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090
- App Metrics: http://localhost:8000/metrics
- App Health: http://localhost:8000/health

**See Also**: `migration_notes.md` in docs for migration details

## Testing

- Jest for unit testing
- Supertest for integration testing
- K6 for load testing

## Common Commands

### Development

```bash
# Install dependencies
pnpm install

# Start development server with hot reload
npm run dev

# Start production server
npm start

# Start with PM2 (production cluster mode)
npm run pm2
```

### Observability Stack

```bash
# Start all observability services (Prometheus, Loki, Tempo, Vector, Grafana)
cd infra
podman-compose up -d

# Stop all services
podman-compose down

# View logs from a specific service
podman logs infra_app_1          # App logs
podman logs infra_prometheus_1   # Prometheus logs
podman logs infra_loki_1         # Loki logs
podman logs infra_vector_1       # Vector logs

# Check service status
podman ps
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Load Testing

```bash
# Run load test with pnpm (starts app + K6)
npm run perf:load:pnpm

# Run stress test with pnpm
npm run perf:stress:pnpm

# Run load test with PM2 (cluster mode)
npm run perf:load:pm2

# Run stress test with PM2
npm run perf:stress:pm2
```

### Database

```bash
# Generate Prisma client
prisma generate

# Push schema changes to database
prisma db push

# Backup database
npm run db:backup

# Backup database with compression
npm run db:backup:compress

# Restore database from backup
npm run db:restore
```

### Monitoring & Debugging

```bash
# View application metrics
curl http://localhost:8000/metrics

# Check application health
curl http://localhost:8000/health

# Query Prometheus metrics
curl "http://localhost:9090/api/v1/query?query=http_requests_total"

# Query Loki logs
curl "http://localhost:3101/loki/api/v1/query?query={application=\"fastify-auth\"}"

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets
```

### Environment Variables

```powershell
# Enable observability features
$env:LOKI_ENABLED='true'
$env:TEMPO_URL='http://localhost:3200'

# Set environment
$env:NODE_ENV='development'  # or 'production'

# Set custom port
$env:PORT='8000'
```

### Useful Development Commands

```bash
# View real-time logs from app (in Docker)
podman logs -f infra_app_1

# Restart a specific service
podman restart infra_prometheus_1

# Remove all containers and volumes (clean start)
podman-compose down -v

# Check Grafana datasource status
curl http://localhost:3001/api/datasources
```
