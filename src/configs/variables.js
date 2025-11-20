import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  
  server: {
    port: parseInt(process.env.PORT, 10) || 8000,
    host: process.env.HOST || '0.0.0.0',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d'
  },
  
  cookie: {
    secret: process.env.COOKIE_SECRET || 'dev-cookie-secret',
  },
  
  database: {
    type: process.env.DB_TYPE || 'sqlite', // 'sqlite' or 'sqlitecloud'
    path: process.env.DB_PATH || join(__dirname, '../../data/app.db'),
    connectionString: process.env.DB_CONNECTION_STRING || null,
    // Prisma DATABASE_URL - construct from DB_TYPE and DB_PATH if not set
    url: process.env.DATABASE_URL || (
      process.env.DB_TYPE === 'sqlitecloud' 
        ? process.env.DB_CONNECTION_STRING 
        : `file:${process.env.DB_PATH || './data/app.db'}`
    )
  },
  
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
  },
  
  loki: {
    enabled: process.env.LOKI_ENABLED === 'true',
    url: process.env.LOKI_URL || 'http://localhost:3101'
  }
};

// Validate required config in production
if (!config.isDev) {
  console.log('Validating production config...');
  const required = ['JWT_SECRET', 'COOKIE_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (config.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  
  // Validate database config
  if (config.database.type === 'sqlitecloud' && !config.database.connectionString) {
    throw new Error('DB_CONNECTION_STRING is required when DB_TYPE is sqlitecloud');
  }
}