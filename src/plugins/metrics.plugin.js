// src/plugins/metrics.plugin.js
import fp from 'fastify-plugin';
import { Registry, collectDefaultMetrics, Counter } from 'prom-client';
import { config } from '../configs/variables.js';

// Prometheus registry create
const register = new Registry();

// Default labels add
register.setDefaultLabels({
  app: 'auth-service',
  environment: config.env,
});

// Request counter metric
const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'statusCode'],
});

// Collect automatic system metrics (CPU, memory, process, event loop, etc.)
collectDefaultMetrics({
  register,
});

register.registerMetric(requestCounter);

async function metricsPlugin(fastify, _options) {
  // Metrics endpoint - exposed for Prometheus scraping with basic auth
  fastify.get('/metrics', {
    preHandler: async (request, reply) => {
      // Basic authentication for metrics endpoint
      const authHeader = request.headers.authorization;
      
      // Get credentials from environment variables
      const metricsUser = process.env.METRICS_USER || 'prometheus';
      const metricsPassword = process.env.METRICS_PASSWORD;
      
      // If no password is set, allow public access (for backward compatibility)
      if (!metricsPassword) {
        return;
      }
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        reply.code(401);
        reply.header('WWW-Authenticate', 'Basic realm="Metrics"');
        throw new Error('Authentication required');
      }
      
      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
      const [username, password] = credentials.split(':');
      
      if (username !== metricsUser || password !== metricsPassword) {
        reply.code(401);
        reply.header('WWW-Authenticate', 'Basic realm="Metrics"');
        throw new Error('Invalid credentials');
      }
    }
  }, async (request, reply) => {
    reply.type('text/plain; version=0.0.4; charset=utf-8');
    return register.metrics();
  });

  // Expose registry to Fastify instance for custom metrics
  fastify.decorate('metrics', { register, requestCounter });

  fastify.log.info('Metrics plugin registered - /metrics endpoint available for scraping');
}

export default fp(metricsPlugin);
