// TODO: require('./config/opentelemetry.config');

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyJWT from '@fastify/jwt';
import sqlite3 from 'sqlite3';
import { Database as SQLiteCloudDatabase } from '@sqlitecloud/drivers';
import bcrypt from 'bcrypt';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { config } from './config/index.js';

dotenv.config();

// Khởi tạo Fastify Server
const server = Fastify({ 
  logger: {
    level: config.server.logLevel,
    transport: config.isDev ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
});

const PORT = config.server.port;
/**
 * Hàm khởi động server
 */
async function startServer() {
  try {
    // Register plugins
    server.register(fastifyCookie, {
    secret: config.cookie.secret
    });

    server.register(fastifyJWT, {
    secret: config.jwt.secret,
    cookie: {
        cookieName: 'token',
        signed: false
    }
    });

    server.decorate("authenticate", async function (request, reply) {
      try {
        await request.jwtVerify({ onlyCookie: true });
      } catch (err) {
        reply
          .code(401)
          .send(new Error("Authentication failed: Invalid or missing token."));
      }
    });

    // Đăng ký Routes
    server.register(require("./routes/auth.routes"), {
      prefix: "/api/v1/auth",
    });

    server.register(require("./routes/user.routes"), {
      prefix: "/api/v1/user",
    });

    // Health check
    server.get("/health", async (_request, _reply) => {
      return { status: "ok" };
    });

    await server.listen({ port: PORT, host: "0.0.0.0" });
    server.log.info(
      `Server đang chạy trên cổng ${PORT} - Instance ID: ${process.pid}`
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

startServer();
