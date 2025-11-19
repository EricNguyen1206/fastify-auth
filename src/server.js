// src/server.js
// OpenTelemetry must be initialized FIRST, before any other imports
import { initializeOpenTelemetry } from './configs/otel.js';
initializeOpenTelemetry();

// Install dependencies: npm install
// Run dev mode: npm run dev
// Run production: npm start

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJWT from '@fastify/jwt';
import sqlite3 from 'sqlite3';
import { Database as SQLiteCloudDatabase } from '@sqlitecloud/drivers';
import bcrypt from 'bcrypt';
// import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { config } from './configs/variables.js';
import { getLoggerConfig } from './configs/logger.js';

const fastify = Fastify({ 
  logger: getLoggerConfig()
});

// Register plugins
fastify.register(fastifyCookie, {
  secret: config.cookie.secret
});

fastify.register(fastifyJWT, {
  secret: config.jwt.secret,
  cookie: {
    cookieName: 'token',
    signed: false
  }
});

// Initialize database connection
let db;
let dbGet;
let dbRun;

async function initDatabase() {
  if (config.database.type === 'sqlitecloud') {
    // SQLite Cloud connection
    fastify.log.info('Connecting to SQLite Cloud...');
    
    db = new SQLiteCloudDatabase(config.database.connectionString);
    
    // Wrapper functions for SQLite Cloud
    dbGet = async (query, params = []) => {
      const result = await db.sql(query, ...params);
      return Array.isArray(result) && result.length > 0 ? result[0] : undefined;
    };

    dbRun = async (query, params = []) => {
      const result = await db.sql(query, ...params);
      return { 
        lastID: result?.lastID || result?.changes || 0,
        changes: result?.changes || 0 
      };
    };

    fastify.log.info('Connected to SQLite Cloud');
  } else {
    // Local SQLite file connection
    if (config.database.path !== ':memory:') {
      await mkdir(dirname(config.database.path), { recursive: true });
    }

    db = new sqlite3.Database(
      config.isDev ? ':memory:' : config.database.path,
      (err) => {
        if (err) {
          fastify.log.error('Database connection failed:', err);
          throw err;
        }
        fastify.log.info(`Database connected: ${config.isDev ? 'in-memory' : config.database.path}`);
      }
    );

    // Wrapper functions for local SQLite
    dbGet = (query, params = []) => {
      return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    };

    dbRun = (query, params = []) => {
      return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    };
  }

  // Create tables (works for both local and cloud)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  fastify.log.info('Database tables initialized');
}

// Authentication decorator
fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify({ onlyCookie: true });
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// Register route
fastify.post('/register', async (request, reply) => {
  const { email, password, name } = request.body;

  if (!email || !password || !name) {
    return reply.code(400).send({ error: 'Email, password, and name are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await dbRun(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );

    fastify.log.info(`User registered: ${email}`);

    return reply.code(201).send({ 
      message: 'User registered successfully',
      userId: result.lastID 
    });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed') || err.message.includes('UNIQUE')) {
      return reply.code(409).send({ error: 'Email already exists' });
    }
    throw err;
  }
});

// Login route
fastify.post('/login', async (request, reply) => {
  const { email, password } = request.body;

  if (!email || !password) {
    return reply.code(400).send({ error: 'Email and password are required' });
  }

  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);

  if (!user) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  // Create access token
  const accessToken = fastify.jwt.sign(
    { userId: user.id, email: user.email },
    { expiresIn: config.jwt.accessExpiry }
  );

  // Create refresh token
  const refreshToken = fastify.jwt.sign(
    { userId: user.id, type: 'refresh' },
    { expiresIn: config.jwt.refreshExpiry }
  );

  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await dbRun(
    'INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES (?, ?, ?)',
    [user.id, refreshToken, expiresAt.toISOString()]
  );

  // Set access token in httpOnly cookie
  reply.setCookie('token', accessToken, {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: 'strict',
    maxAge: 15 * 60 // 15 minutes
  });

  // Set refresh token in httpOnly cookie as well
  reply.setCookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });

  fastify.log.info(`User logged in: ${email}`);

  return reply.send({ 
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

// Refresh token route
fastify.post('/refresh', async (request, reply) => {
  const refreshToken = request.cookies.refreshToken;

  if (!refreshToken) {
    return reply.code(400).send({ error: 'Refresh token is required' });
  }

  try {
    // Verify refresh token
    const decoded = fastify.jwt.verify(refreshToken);

    if (decoded.type !== 'refresh') {
      return reply.code(401).send({ error: 'Invalid token type' });
    }

    // Check if refresh token exists in database
    const session = await dbGet(
      'SELECT * FROM sessions WHERE refresh_token = ? AND user_id = ? AND expires_at > datetime("now")',
      [refreshToken, decoded.userId]
    );

    if (!session) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    // Get user data
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [decoded.userId]);

    // Create new access token
    const accessToken = fastify.jwt.sign(
      { userId: user.id, email: user.email },
      { expiresIn: config.jwt.accessExpiry }
    );

    // Set new access token in cookie
    reply.setCookie('token', accessToken, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: 'strict',
      maxAge: 15 * 60
    });

    fastify.log.info(`Token refreshed for user: ${user.email}`);

    return reply.send({ message: 'Token refreshed successfully' });
  } catch (err) {
    return reply.code(401).send({ error: 'Invalid refresh token' });
  }
});

// Logout route
fastify.post('/logout', { preHandler: fastify.authenticate }, async (request, reply) => {
  const refreshToken = request.cookies.refreshToken;

  // Delete refresh token from database
  if (refreshToken) {
    await dbRun('DELETE FROM sessions WHERE refresh_token = ?', [refreshToken]);
  }

  // Clear cookies
  reply.clearCookie('token');
  reply.clearCookie('refreshToken');

  fastify.log.info(`User logged out: ${request.user.email}`);

  return reply.send({ message: 'Logged out successfully' });
});

// Protected profile route
fastify.get('/profile', { preHandler: fastify.authenticate }, async (request, reply) => {
  const userId = request.user.userId;

  const user = await dbGet(
    'SELECT id, email, name, created_at FROM users WHERE id = ?',
    [userId]
  );

  if (!user) {
    return reply.code(404).send({ error: 'User not found' });
  }

  return reply.send({ user });
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok',
    environment: config.env,
    database: config.database.type,
    timestamp: new Date().toISOString()
  };
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  fastify.log.info(`${signal} received, closing server...`);
  
  try {
    await fastify.close();
    
    if (db) {
      if (config.database.type === 'sqlitecloud') {
        await db.disconnect();
        fastify.log.info('SQLite Cloud disconnected');
      } else {
        db.close((err) => {
          if (err) {
            fastify.log.error('Error closing database:', err);
          }
        });
      }
    }
    
    process.exit(0);
  } catch (err) {
    fastify.log.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    await initDatabase();
    await fastify.listen({ 
      port: config.server.port, 
      host: config.server.host 
    });
    
    fastify.log.info(`Server running in ${config.env} mode`);
    fastify.log.info(`Database type: ${config.database.type}`);
    fastify.log.info(`Server listening on http://${config.server.host}:${config.server.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();