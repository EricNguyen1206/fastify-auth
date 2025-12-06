// Security plugin with Helmet and CORS
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import fp from "fastify-plugin";
import { config } from "../configs/variables.js";

/**
 * Security plugin
 * Configures security headers and CORS
 */
async function securityPlugin(fastify, _options) {
  // Register Helmet for security headers
  await fastify.register(helmet, {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    // HTTP Strict Transport Security (HSTS)
    hsts:
      config.env === "production"
        ? {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
          }
        : false,
    // X-Content-Type-Options
    noSniff: true,
    // X-Frame-Options
    frameguard: {
      action: "deny",
    },
  });

  // Register CORS
  const corsOrigin =
    config.env === "production"
      ? (process.env.CORS_ORIGIN || "http://localhost:3000").split(",")
      : /localhost/; // Allow all localhost in development

  await fastify.register(cors, {
    origin: corsOrigin,
    credentials: true, // Allow cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  fastify.log.info("✅・Security plugin registered (Helmet + CORS)");
}

export default fp(securityPlugin, {
  name: "security-plugin",
  dependencies: [],
});
