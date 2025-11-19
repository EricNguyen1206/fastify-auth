// src/configs/logger.js
// Logger configuration with pino-pretty for development and pino-loki for production

import { config } from './variables.js';

/**
 * Get Pino logger configuration based on environment
 * Development: Uses pino-pretty for human-readable console output
 * Production: Uses pino-loki to send logs to Grafana Loki
 */
export function getLoggerConfig() {
  const baseConfig = {
    level: config.server.logLevel,
    // Add timestamp to all logs
    timestamp: () => `,\"time\":\"${new Date().toISOString()}\"`,
    // Format error objects properly
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
        hostname: req.hostname,
        remoteAddress: req.ip,
        remotePort: req.socket?.remotePort
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.headers
      }),
      err: (err) => ({
        type: err.type,
        message: err.message,
        stack: err.stack
      })
    }
  };

  const targets = [];

  // Development: use pino-pretty for beautiful console logs
  if (config.isDev) {
    targets.push({
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true,
        singleLine: false,
        messageFormat: '{levelLabel} - {msg}',
        errorLikeObjectKeys: ['err', 'error']
      }
    });
  }

  // Production or if enabled: send logs to Loki
  if (config.loki.enabled) {
    targets.push({
      target: 'pino-loki',
      options: {
        batching: true,
        interval: 5, // Send logs every 5 seconds
        host: config.loki.url,
        labels: {
          application: 'fastify-auth',
          environment: config.env,
          service: 'authentication'
        },
        // Add additional labels from context
        replaceTimestamp: true,
        // Retry configuration
        timeout: 30000,
        // Error handling
        silenceErrors: false
      }
    });
  }

  // If we have any transports configured
  if (targets.length > 0) {
    return {
      ...baseConfig,
      transport: {
        targets: targets
      }
    };
  }

  // Production without Loki: use standard JSON output
  return baseConfig;
}
