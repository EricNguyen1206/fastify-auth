// src/configs/metrics.js
// Native Prometheus client for metrics collection (replaced OpenTelemetry metrics)
import promClient from "prom-client";

// Create a Registry to register all metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: "nodejs_",
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// Custom Metrics

// Authentication Metrics
export const authMetrics = {
  registrationAttempts: new promClient.Counter({
    name: "auth_registration_attempts_total",
    help: "Total number of user registration attempts",
    labelNames: ["status"],
    registers: [register],
  }),

  loginAttempts: new promClient.Counter({
    name: "auth_login_attempts_total",
    help: "Total number of login attempts",
    labelNames: ["status"],
    registers: [register],
  }),

  tokenGeneration: new promClient.Counter({
    name: "auth_token_generated_total",
    help: "Total number of JWT tokens generated",
    registers: [register],
  }),

  loginDuration: new promClient.Histogram({
    name: "auth_login_duration_seconds",
    help: "Duration of login operations",
    labelNames: ["status"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register],
  }),

  registrationDuration: new promClient.Histogram({
    name: "auth_registration_duration_seconds",
    help: "Duration of registration operations",
    labelNames: ["status"],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register],
  }),
};

// User Profile Metrics
export const userMetrics = {
  profileViews: new promClient.Counter({
    name: "user_profile_views_total",
    help: "Total number of profile view requests",
    registers: [register],
  }),

  profileUpdates: new promClient.Counter({
    name: "user_profile_updates_total",
    help: "Total number of profile update requests",
    labelNames: ["status"],
    registers: [register],
  }),
};

// Database Metrics
export const dbMetrics = {
  queryCount: new promClient.Counter({
    name: "db_query_total",
    help: "Total number of database queries",
    labelNames: ["operation", "table", "status"],
    registers: [register],
  }),

  queryDuration: new promClient.Histogram({
    name: "db_query_duration_seconds",
    help: "Duration of database queries",
    labelNames: ["operation", "table"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
  }),

  queryErrors: new promClient.Counter({
    name: "db_query_errors_total",
    help: "Total number of database query errors",
    labelNames: ["operation", "table"],
    registers: [register],
  }),
};

// HTTP Metrics
export const httpMetrics = {
  requestCount: new promClient.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
  }),

  requestDuration: new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register],
  }),

  errorCount: new promClient.Counter({
    name: "http_errors_total",
    help: "Total number of HTTP error responses (4xx, 5xx)",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
  }),
};

/**
 * Helper function to record authentication metrics
 */
export function recordAuthMetric(
  operation,
  status,
  duration = null,
  attributes = {}
) {
  switch (operation) {
    case "register":
      authMetrics.registrationAttempts.inc({ status });
      if (duration) {
        authMetrics.registrationDuration.observe({ status }, duration / 1000); // Convert ms to seconds
      }
      break;

    case "login":
      authMetrics.loginAttempts.inc({ status });
      if (status === "success") {
        authMetrics.tokenGeneration.inc();
      }
      if (duration) {
        authMetrics.loginDuration.observe({ status }, duration / 1000); // Convert ms to seconds
      }
      break;

    default:
      console.warn(`Unknown auth operation: ${operation}`);
  }
}

/**
 * Helper function to record database metrics
 */
export function recordDbMetric(
  operation,
  duration,
  status = "success",
  attributes = {}
) {
  const { table = "unknown" } = attributes;

  dbMetrics.queryCount.inc({ operation, table, status });
  dbMetrics.queryDuration.observe({ operation, table }, duration / 1000); // Convert ms to seconds

  if (status === "error") {
    dbMetrics.queryErrors.inc({ operation, table });
  }
}

/**
 * Helper function to record HTTP metrics
 */
export function recordHttpMetric(
  method,
  route,
  statusCode,
  duration,
  attributes = {}
) {
  const labels = { method, route, status_code: statusCode };

  httpMetrics.requestCount.inc(labels);
  httpMetrics.requestDuration.observe(labels, duration / 1000); // Convert ms to seconds

  if (statusCode >= 400) {
    httpMetrics.errorCount.inc(labels);
  }
}

/**
 * Get metrics endpoint handler for Fastify
 * Register this as a route: fastify.get('/metrics', metricsHandler)
 */
export async function metricsHandler(request, reply) {
  try {
    reply.header("Content-Type", register.contentType);
    const metrics = await register.metrics();
    return metrics;
  } catch (error) {
    reply.code(500);
    return { error: "Failed to collect metrics" };
  }
}

/**
 * Get Prometheus metrics registry
 * @returns {promClient.Registry}
 */
export function getMetricsRegistry() {
  return register;
}
