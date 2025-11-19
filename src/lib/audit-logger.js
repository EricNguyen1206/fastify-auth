// src/lib/audit-logger.js
// Professional audit logging utility with OpenTelemetry integration
import { trace, context as otelContext } from '@opentelemetry/api';

/**
 * Sensitive field keys that should be redacted from logs
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordConfirm',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'jwt',
  'secret',
  'apiKey',
  'authorization',
  'cookie',
  'sessionId',
  'ssn',
  'creditCard',
  'cvv',
]);

/**
 * Recursively redact sensitive fields from an object
 * @param {any} obj - Object to sanitize
 * @returns {any} Sanitized object
 */
function sanitizeData(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Check if this is a sensitive field
    if (SENSITIVE_FIELDS.has(lowerKey) || lowerKey.includes('password') || lowerKey.includes('token')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Get current trace context from OpenTelemetry
 * @returns {Object} Trace context with traceId and spanId
 */
function getTraceContext() {
  const span = trace.getSpan(otelContext.active());
  
  if (!span) {
    return {
      traceId: 'no-trace',
      spanId: 'no-span',
      traceFlags: '00',
    };
  }

  const spanContext = span.spanContext();
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: `0${spanContext.traceFlags.toString(16)}`,
  };
}

/**
 * Professional Audit Logger
 * Provides structured, secure logging with OpenTelemetry trace correlation
 */
export class AuditLogger {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Log authentication events (signin, signup, signout)
   * @param {string} action - Action type (e.g., 'signin', 'signup', 'signout')
   * @param {Object} details - Event details
   */
  auth(action, details) {
    const traceContext = getTraceContext();
    const sanitized = sanitizeData(details);

    this.logger.info({
      ...traceContext,
      audit: {
        category: 'authentication',
        action,
        ...sanitized,
        timestamp: new Date().toISOString(),
      },
    }, `AUTH: ${action}`);
  }

  /**
   * Log user profile operations (read, update, delete)
   * @param {string} action - Action type (e.g., 'read', 'update', 'delete')
   * @param {Object} details - Event details
   */
  user(action, details) {
    const traceContext = getTraceContext();
    const sanitized = sanitizeData(details);

    this.logger.info({
      ...traceContext,
      audit: {
        category: 'user_profile',
        action,
        ...sanitized,
        timestamp: new Date().toISOString(),
      },
    }, `USER: ${action}`);
  }

  /**
   * Log security events (rate limit, invalid token, etc.)
   * @param {string} event - Security event type
   * @param {Object} details - Event details
   */
  security(event, details) {
    const traceContext = getTraceContext();
    const sanitized = sanitizeData(details);

    this.logger.warn({
      ...traceContext,
      audit: {
        category: 'security',
        event,
        ...sanitized,
        timestamp: new Date().toISOString(),
      },
    }, `SECURITY: ${event}`);
  }

  /**
   * Log database operations for compliance
   * @param {string} operation - DB operation (e.g., 'create', 'read', 'update', 'delete')
   * @param {Object} details - Operation details
   */
  database(operation, details) {
    const traceContext = getTraceContext();
    const sanitized = sanitizeData(details);

    this.logger.info({
      ...traceContext,
      audit: {
        category: 'database',
        operation,
        ...sanitized,
        timestamp: new Date().toISOString(),
      },
    }, `DB: ${operation}`);
  }

  /**
   * Log error events with full context
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  error(error, context = {}) {
    const traceContext = getTraceContext();
    const sanitized = sanitizeData(context);

    this.logger.error({
      ...traceContext,
      audit: {
        category: 'error',
        errorType: error.name,
        errorMessage: error.message,
        stack: error.stack,
        ...sanitized,
        timestamp: new Date().toISOString(),
      },
    }, `ERROR: ${error.message}`);
  }

  /**
   * Log API requests with full details
   * @param {Object} request - Fastify request object
   */
  request(request) {
    const traceContext = getTraceContext();

    this.logger.info({
      ...traceContext,
      audit: {
        category: 'api_request',
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        // Don't log sensitive headers
        headers: sanitizeData(request.headers),
        timestamp: new Date().toISOString(),
      },
    }, `REQUEST: ${request.method} ${request.url}`);
  }

  /**
   * Log API responses with timing
   * @param {Object} request - Fastify request object
   * @param {Object} reply - Fastify reply object
   * @param {number} responseTime - Response time in ms
   */
  response(request, reply, responseTime) {
    const traceContext = getTraceContext();

    this.logger.info({
      ...traceContext,
      audit: {
        category: 'api_response',
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime,
        timestamp: new Date().toISOString(),
      },
    }, `RESPONSE: ${request.method} ${request.url} - ${reply.statusCode} (${responseTime}ms)`);
  }

  /**
   * Log access control events
   * @param {string} action - Access action (e.g., 'granted', 'denied')
   * @param {Object} details - Access details
   */
  access(action, details) {
    const traceContext = getTraceContext();
    const sanitized = sanitizeData(details);

    this.logger.info({
      ...traceContext,
      audit: {
        category: 'access_control',
        action,
        ...sanitized,
        timestamp: new Date().toISOString(),
      },
    }, `ACCESS: ${action}`);
  }
}

/**
 * Create audit logger instance
 * @param {Object} logger - Pino logger instance
 * @returns {AuditLogger} Audit logger instance
 */
export function createAuditLogger(logger) {
  return new AuditLogger(logger);
}
