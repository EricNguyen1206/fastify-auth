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
  prefix: 'auth_service_',
});

register.registerMetric(requestCounter);

async function metricsPlugin(fastify, options) {
  // Metrics endpoint - exposed for Prometheus scraping
  fastify.get('/metrics', async (request, reply) => {
    reply.type('text/plain');
    return register.metrics();
  });

  // Expose registry to Fastify instance for custom metrics
  fastify.decorate('metrics', { register, requestCounter });

  fastify.log.info('Metrics plugin registered - /metrics endpoint available for scraping');
}

export default fp(metricsPlugin);
