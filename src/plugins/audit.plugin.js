// src/plugins/audit.plugin.js
// Audit logging plugin with OpenTelemetry integration
import { createAuditLogger } from '../lib/audit-logger.js';
import fp from 'fastify-plugin';

/**
 * Audit logging plugin
 * Automatically logs all requests and responses with trace correlation
 */
async function auditPlugin(fastify, options) {
  // Create audit logger instance
  const auditLogger = createAuditLogger(fastify.log);

  // Decorate fastify instance with audit logger
  fastify.decorate('audit', auditLogger);

  // Hook: onRequest - Log incoming requests
  fastify.addHook('onRequest', async (request, reply) => {
    // Skip health check endpoint
    if (request.url === '/health') {
      return;
    }

    // Store request start time for response time calculation
    request.startTime = Date.now();

    // Log the incoming request
    auditLogger.request(request);
  });

  // Hook: onResponse - Log outgoing responses with timing
  fastify.addHook('onResponse', async (request, reply) => {
    // Skip health check endpoint
    if (request.url === '/health') {
      return;
    }

    const responseTime = Date.now() - (request.startTime || Date.now());
    
    // Log the response
    auditLogger.response(request, reply, responseTime);
  });

  // Hook: onError - Log errors with context
  fastify.addHook('onError', async (request, reply, error) => {
    auditLogger.error(error, {
      url: request.url,
      method: request.method,
      userId: request.user?.id,
      ip: request.ip,
    });
  });

  fastify.log.info('✅ Audit logging plugin registered');
}

export default fp(auditPlugin, {
  name: 'audit-plugin',
  dependencies: [],
});
