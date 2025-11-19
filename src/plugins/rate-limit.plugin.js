// src/plugins/rate-limit.plugin.js
// Rate limit plugin (Production only)

import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { config } from '../configs/variables.js';

async function rateLimitPlugin(fastify, options) {
  // Only register in production or if explicitly enabled
  if (!config.isDev) {
    await fastify.register(rateLimit, {
      max: config.rateLimit.max,
      timeWindow: config.rateLimit.timeWindow,
      errorResponseBuilder: (request, context) => {
        return {
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Rate limit exceeded, retry in ${context.after} seconds`
        };
      }
    });
    
    fastify.log.info(`Rate limiting enabled: ${config.rateLimit.max} req / ${config.rateLimit.timeWindow}ms`);
  } else {
    fastify.log.info('Rate limiting disabled in development');
  }
}

export default fp(rateLimitPlugin);
