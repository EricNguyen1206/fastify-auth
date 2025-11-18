# Fastify Authentication Service - AI Coding Agent Instructions

## Project Overview
This is a **Fastify-based authentication microservice** using SQLite with UUID primary keys, JWT tokens (cookie-based), bcrypt password hashing, and PM2 for cluster management. The project uses CommonJS modules throughout.

## Architecture & Key Components

### Database Strategy
- **Plugin Pattern**: Database connection uses `fastify-plugin` wrapper (`src/configs/db.js`)
- **SQLite Database**: Connects to local SQLite file via `process.env.DB_PATH` or in-memory database
- **UUID Implementation**: Uses `uuid@9` library (CommonJS compatible) for generating v4 UUIDs
- **Decoration**: DB is exposed via `fastify.decorate('sqlite', { db, generateUUID })` for access across routes
- **Schema**: Two tables with TEXT-based UUID primary keys:
  - `users`: id (UUID), email, username, password (bcrypt hash), created_at
  - `sessions`: id (UUID), user_id (FK to users), token, expires_at, created_at

### Server Configuration (`src/server.js`)
- **Database Registration**: Uses `server.decorate("db", sqliteDB)` where `sqliteDB` is the required `./configs/db` module
- **JWT Plugin**: Registered with `@fastify/jwt` using `JWT_SECRET` from env (defaults to "default_secret_key")
- **Cookie Plugin**: `@fastify/cookie` registered for cookie-based token storage
- **Authentication Decorator**: `server.decorate("authenticate", ...)` provides JWT verification via `request.jwtVerify({ onlyCookie: true })`
- **Route Prefixes**: 
  - Auth routes: `/api/v1/auth`
  - User routes: `/api/v1/user`
- **Health Check**: `GET /health` returns `{ status: "ok" }`
- **Port**: Runs on `process.env.PORT` or 8000 (not 3000)

### Authentication Flow
- **Token Storage**: JWT tokens stored in HTTP-only cookies (not in Authorization headers)
- **Verification**: Protected routes use `fastify.authenticate` decorator which calls `request.jwtVerify({ onlyCookie: true })`
- **Session Management**: Sessions table tracks active tokens with expiration timestamps
- **Password Security**: bcrypt for hashing (not yet implemented in routes)

### Current Route Structure
- **Auth Routes** (`src/routes/auth.routes.js`):
  - `POST /signup` - User registration (needs bcrypt + UUID implementation)
  - `POST /signin` - User login (needs bcrypt verification + JWT cookie generation)
  - `POST /refresh-token` - Token refresh (needs session table lookup)
  - `POST /signout` - Logout (needs cookie clearing + session deletion)

- **User Routes** (`src/routes/user.routes.js`):
  - Protected routes requiring authentication decorator

## Development Workflows

### Running the Application
```powershell
npm run dev          # Development with nodemon
npm start            # Production single instance
npm run pm2          # Cluster mode with PM2 (see ecosystem.config.js)
```

### Database Access Pattern
```javascript
// In routes/controllers, access DB via:
const { db, generateUUID } = fastify.sqlite;

// Generate UUID for new records:
const userId = fastify.sqlite.generateUUID();

// Execute queries:
db.run("INSERT INTO users (id, email, username, password) VALUES (?, ?, ?, ?)", 
  [userId, email, username, hashedPassword], 
  callback);
```

### PM2 Cluster Configuration
- **Mode**: Cluster with `instances: "max"` (uses all CPU cores)
- **Process Name**: `fastify-auth`
- **Environments**: Supports `development` and `production` env configs
- **Port**: Default 8000 (configurable via `PORT` env var)

## Project-Specific Conventions

### Code Style
- **Comments**: Vietnamese comments throughout (e.g., "Đăng ký thành công", "Server đang chạy")
- **Module System**: CommonJS (`require`/`module.exports`) - do NOT use ES modules
- **Plugin Architecture**: Follow Fastify's decorator/plugin pattern for shared services
- **Async Routes**: All route handlers use `async` functions
- **Error Handling**: Use `reply.code(statusCode).send(new Error(message))` pattern

### UUID Pattern
- **Primary Keys**: Always use `fastify.sqlite.generateUUID()` for id fields
- **Type**: TEXT columns for UUIDs (not INTEGER)
- **Foreign Keys**: user_id in sessions table references users.id (both TEXT)

### JWT Cookie Pattern
- **Storage**: Tokens stored in cookies, NOT Authorization headers
- **Verification**: Always use `{ onlyCookie: true }` option with `jwtVerify()`
- **Protected Routes**: Apply `{ preHandler: fastify.authenticate }` to secure endpoints

## Dependencies & Integration Points

### Key Libraries
- **fastify**: v4.24.3 - Web framework
- **@fastify/jwt**: v7.2.2 - JWT token management
- **@fastify/cookie**: v9.1.0 - Cookie handling
- **bcrypt**: v5.1.1 - Password hashing (installed but not yet used)
- **uuid**: v9.0.1 - UUID generation (CommonJS compatible)
- **sqlite3**: v5.1.6 - Database driver
- **dotenv**: v16.3.1 - Environment variables

### Environment Variables Required
```env
PORT=8000
DB_PATH=./database.sqlite
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
```

## Implementation Priorities

### Immediate TODOs
1. **Signup Route Implementation**:
   ```javascript
   - Generate UUID for user id
   - Hash password with bcrypt
   - Insert into users table with email, username, hashed password
   - Return success response (no auto-login)
   ```

2. **Signin Route Implementation**:
   ```javascript
   - Query user by email/username
   - Verify password with bcrypt.compare()
   - Generate JWT token with fastify.jwt.sign()
   - Create session record with UUID, user_id, token, expires_at
   - Set HTTP-only cookie with reply.setCookie()
   - Return user data (exclude password)
   ```

3. **Refresh Token Route**:
   ```javascript
   - Verify existing token from cookie
   - Check session validity (not expired)
   - Generate new token
   - Update session record
   - Set new cookie
   ```

4. **Signout Route**:
   ```javascript
   - Delete session from database
   - Clear cookie with reply.clearCookie()
   ```

### Missing Components
- **Controllers**: Consider creating `src/controllers/auth.controller.js` to separate business logic from routes
- **Middleware**: Password validation, email validation utilities
- **Error Handling**: Centralized error handler plugin
- **.env File**: Create with required environment variables
- **Database Initialization**: Add seed data or migration scripts

## Critical Notes

- **UUID Library Version**: Must use uuid@9 (CommonJS). v10+ is ESM-only and will cause `ERR_REQUIRE_ESM`
- **Token Storage**: This project uses cookie-based auth, not bearer tokens
- **Database Decorator**: Access via `fastify.sqlite.db`, NOT `fastify.db`
- **Port Mismatch**: Server runs on 8000, not 3000 as mentioned in old docs
- **Vietnamese Comments**: Maintain Vietnamese comments for consistency with existing codebase