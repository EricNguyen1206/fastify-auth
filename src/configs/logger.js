// src/configs/logger.js
// Logger configuration with pino-pretty for development and JSON output for production

import { config } from "./variables.js";

/**
 * Get Pino logger configuration based on environment
 * Development: Uses pino-pretty for human-readable console output
 * Production: Outputs structured JSON to stdout (collected by Vector)
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
        remotePort: req.socket?.remotePort,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: res.headers,
      }),
      err: (err) => ({
        type: err.type,
        message: err.message,
        stack: err.stack,
      }),
    },
  };

  // Development: use pino-pretty for beautiful console logs
  if (config.isDev) {
    return {
      ...baseConfig,
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
          colorize: true,
          singleLine: false,
          messageFormat: "{levelLabel} - {msg}",
          errorLikeObjectKeys: ["err", "error"],
        },
      },
    };
  }

  // Production: output structured JSON to stdout
  // Vector will collect logs from stdout and forward to Loki
  return baseConfig;
}
