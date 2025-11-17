# Fastify Authentication Service - AI Coding Agent Instructions

## Project Overview
This is a **Fastify-based authentication microservice** using SQLite (cloud-hosted), JWT tokens, and PM2 for cluster management. The project is in **early development** with placeholder routes that need implementation.

## Architecture & Key Components

### Database Strategy
- **Plugin Pattern**: Database connection uses `fastify-plugin` wrapper (`src/configs/db.js`)
- **Cloud SQLite**: Connects to `sqlitecloud://cq3bxqoivz.g2.sqlite.cloud:8860/test` with API key
- **Decoration**: DB is exposed via `fastify.decorate('sqlite', sqlite)` for access across routes
- **Schema**: Currently only defines a `user` table with `id`, `title`, `completed` fields (likely needs restructuring for auth)

### Server Configuration (`src/server.js`)
- **Service Registration**: Uses `server.decorate('db', require('./services/db.service'))` pattern (but `db.service.js` doesn't exist yet)
- **Route Prefix**: Auth routes mounted at `/api/v1/auth`
- **Logging**: Fastify's built-in logger is enabled
- **OTel Placeholder**: Comments indicate OpenTelemetry instrumentation is planned but not implemented

### Authentication Routes (`src/routes/auth.routes.js`)
All routes are **TODO stubs** returning placeholder responses:
- `POST /signup` - Needs user creation with bcrypt password hashing
- `POST /signin` - Calls undefined `fastify.db.generateAccessToken()` and `generateRefreshToken()` 
- `POST /refresh-token` - Token refresh logic missing
- `POST /signout` - Session cleanup not implemented

**Critical Gap**: Routes reference `fastify.db.generateAccessToken()` but this service doesn't exist. Need to create `src/services/db.service.js` with JWT generation using `jsonwebtoken` package.

## Development Workflows

### Running the Application
```powershell
npm run dev          # Development with nodemon
npm start            # Production single instance
npm run pm2          # Cluster mode with PM2 (see ecosystem.config.js)
```

### PM2 Cluster Configuration
- **Mode**: Cluster with `instances: "max"` (uses all CPU cores)
- **Process Name**: `fastify-auth`
- **Environments**: Supports `development` and `production` env configs
- **Port**: Default 3000 (configurable via `PORT` env var)

## Project-Specific Conventions

### Code Style
- **Comments**: Vietnamese comments throughout (e.g., "Đăng ký thành công")
- **Plugin Architecture**: Follow Fastify's decorator/plugin pattern for shared services
- **Async Routes**: All route handlers use `async` functions

### Missing Implementation Pattern
When implementing TODOs, follow this sequence:
1. Create `src/services/db.service.js` with JWT generation/verification methods
2. Create `src/controllers/auth.controller.js` for business logic
3. Update routes to delegate to controllers (thin route handlers)
4. Align database schema with auth requirements (username, password_hash, refresh_tokens)

## Dependencies & Integration Points

### Key Libraries
- **fastify**: v5.6.2 - Web framework
- **bcrypt**: v6.0.0 - Password hashing (not yet used)
- **jsonwebtoken**: v9.0.2 - JWT tokens (not yet used)
- **sqlite3**: v5.1.7 - Database driver
- **@opentelemetry/instrumentation-fastify**: v0.53.0 - Observability (planned)

### External Services
- **SQLite Cloud**: Production database (credentials hardcoded - needs env vars)
- **Grafana/Observability**: Keywords suggest monitoring integration planned

## Critical Issues to Address

1. **Service Mismatch**: `server.js` requires `./services/db.service` but file doesn't exist
2. **Hardcoded Credentials**: Database connection string with API key is in source code
3. **Schema Misalignment**: Current `user` table doesn't match auth requirements
4. **Missing JWT Implementation**: Token generation methods are called but undefined
5. **No Environment Configuration**: `.env` file doesn't exist, no environment variable usage

## Next Implementation Steps

When adding auth logic:
- Create `.env` file with `JWT_SECRET`, `JWT_EXPIRES_IN`, `SQLITE_CONNECTION_STRING`
- Build `src/services/db.service.js` with token generation/verification using `jsonwebtoken`
- Restructure database schema for proper user authentication (username, password_hash, created_at)
- Add refresh token storage table with expiration tracking
- Implement bcrypt password hashing in signup flow
- Add JWT verification middleware for protected routes
