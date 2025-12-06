import dotenv from "dotenv";
// Load environment variables
dotenv.config();

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
    // PostgreSQL connection URI (Aiven or other PostgreSQL provider)
    // Format: postgres://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
    uri: process.env.DATABASE_URI || null,
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
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

  // Validate PostgreSQL connection
  if (!config.database.uri) {
    throw new Error("DATABASE_URI is required in production");
  }
}
