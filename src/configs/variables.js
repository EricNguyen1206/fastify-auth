import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  env: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV !== "production",

  server: {
    port: parseInt(process.env.PORT, 10) || 8000,
    host: process.env.HOST || "0.0.0.0",
    logLevel: process.env.LOG_LEVEL || "info",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  cookie: {
    secret: process.env.COOKIE_SECRET || "dev-cookie-secret",
  },

  database: {
    type: process.env.DB_TYPE || "sqlite", // 'sqlite' or 'sqlitecloud'
    // Extract path from DATABASE_URL if it's a file protocol, otherwise use default
    path: process.env.DATABASE_URL?.startsWith("file:")
      ? process.env.DATABASE_URL.replace("file:", "")
      : join(__dirname, "../../data/app.db"),
    connectionString: process.env.DB_CONNECTION_STRING || null,
    // Prisma DATABASE_URL - Single Source of Truth
    // For SQLiteCloud: use sqlitecloud:// connection string
    // For local SQLite: use file: protocol
    url: (() => {
      const dbType = process.env.DB_TYPE || "sqlite";
      if (dbType === "sqlitecloud") {
        // SQLiteCloud connection string format: sqlitecloud://user:pass@host:port/database
        // Or use DB_CONNECTION_STRING if provided
        return process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING || null;
      }
      // Local SQLite
      return process.env.DATABASE_URL || `file:${join(__dirname, "../../data/app.db")}`;
    })(),
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
  },

  loki: {
    enabled: process.env.LOKI_ENABLED === "true",
    url: process.env.LOKI_URL || "http://localhost:3101",
  },

  grafanaCloud: {
    loki: {
      url: process.env.GRAFANA_CLOUD_LOKI_URL || null,
      username: process.env.GRAFANA_CLOUD_LOKI_USERNAME || null,
      password: process.env.GRAFANA_CLOUD_LOKI_PASSWORD || null,
    },
    prometheus: {
      url: process.env.GRAFANA_CLOUD_PROMETHEUS_URL || null,
      username: process.env.GRAFANA_CLOUD_PROMETHEUS_USERNAME || null,
      password: process.env.GRAFANA_CLOUD_PROMETHEUS_PASSWORD || null,
    },
    tempo: {
      url: process.env.GRAFANA_CLOUD_TEMPO_URL || null,
      username: process.env.GRAFANA_CLOUD_TEMPO_USERNAME || null,
      password: process.env.GRAFANA_CLOUD_TEMPO_PASSWORD || null,
    },
  },
};

// Validate required config in production
if (!config.isDev) {
  console.log("Validating production config...");
  const required = ["JWT_SECRET", "COOKIE_SECRET"];
  const missing = required.filter((key) => !process.env[key]);
  console.log("Missing environment variables:", missing);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  if (config.jwt.secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }

  // Validate database config
  if (
    config.database.type === "sqlitecloud" &&
    !config.database.connectionString
  ) {
    throw new Error(
      "DB_CONNECTION_STRING is required when DB_TYPE is sqlitecloud"
    );
  }
}
