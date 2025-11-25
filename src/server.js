// src/server.js
// OpenTelemetry must be initialized FIRST, before any other imports
import { initializeOpenTelemetry } from "./configs/otel.js";
initializeOpenTelemetry();

console.log("Server file loaded");

import Fastify from "fastify";
import { config } from "./configs/variables.js";
import { getLoggerConfig } from "./configs/logger.js";

// Plugins
import databasePlugin from "./plugins/database.plugin.js";
import authPlugin from "./plugins/auth.plugin.js";
import rateLimitPlugin from "./plugins/rate-limit.plugin.js";
import auditPlugin from "./plugins/audit.plugin.js";
import securityPlugin from "./plugins/security.plugin.js";

// Routes
import authRoutes from "./routes/auth/index.js";
import userRoutes from "./routes/user/index.js";

// Metrics
import { metricsHandler } from "./configs/metrics.js";

const fastify = Fastify({
  logger: getLoggerConfig(),
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  fastify.log.info(`${signal} received, closing server...`);
  try {
    await fastify.close();
    process.exit(0);
  } catch (err) {
    fastify.log.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
const start = async () => {
  console.log("Starting server initialization...");
  try {
    // Register plugins
    console.log("Registering plugins...");
    await fastify.register(securityPlugin); // Security headers (Helmet + CORS)
    await fastify.register(databasePlugin); // SQLite database connection
    await fastify.register(auditPlugin); // Otel audit plugin
    await fastify.register(authPlugin); // Fastify authentication custom plugin with cookie + JWT + auth middleware
    await fastify.register(rateLimitPlugin); // Fastify rate limit plugin

    // Register routes
    await fastify.register(authRoutes);
    await fastify.register(userRoutes);

    // Metrics endpoint for Prometheus scraping
    fastify.get("/metrics", metricsHandler);

    // Health check
    fastify.get("/health", async (request, reply) => {
      return {
        status: "ok",
        environment: config.env,
        timestamp: new Date().toISOString(),
      };
    });

    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    fastify.log.info(`Server running in ${config.env} mode`);
    fastify.log.info(
      `Server listening on http://${config.server.host}:${config.server.port}`
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
