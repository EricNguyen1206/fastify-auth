// src/configs/metrics.js
// Custom business metrics for Fastify Auth Service
import { metrics } from '@opentelemetry/api';

// Get the meter instance
const meter = metrics.getMeter('fastify-auth-metrics', '1.0.0');

/**
 * Authentication Metrics
 */
export const authMetrics = {
  // Counter: Total registration attempts
  registrationAttempts: meter.createCounter('auth.registration.attempts', {
    description: 'Total number of user registration attempts',
    unit: '1',
  }),

  // Counter: Successful registrations
  registrationSuccess: meter.createCounter('auth.registration.success', {
    description: 'Total number of successful user registrations',
    unit: '1',
  }),

  // Counter: Failed registrations
  registrationFailure: meter.createCounter('auth.registration.failure', {
    description: 'Total number of failed user registrations',
    unit: '1',
  }),

  // Counter: Total login attempts
  loginAttempts: meter.createCounter('auth.login.attempts', {
    description: 'Total number of login attempts',
    unit: '1',
  }),

  // Counter: Successful logins
  loginSuccess: meter.createCounter('auth.login.success', {
    description: 'Total number of successful logins',
    unit: '1',
  }),

  // Counter: Failed logins
  loginFailure: meter.createCounter('auth.login.failure', {
    description: 'Total number of failed logins',
    unit: '1',
  }),

  // Counter: Token generation
  tokenGeneration: meter.createCounter('auth.token.generated', {
    description: 'Total number of JWT tokens generated',
    unit: '1',
  }),

  // Histogram: Login duration
  loginDuration: meter.createHistogram('auth.login.duration', {
    description: 'Duration of login operations',
    unit: 'ms',
  }),

  // Histogram: Registration duration
  registrationDuration: meter.createHistogram('auth.registration.duration', {
    description: 'Duration of registration operations',
    unit: 'ms',
  }),
};

/**
 * User Profile Metrics
 */
export const userMetrics = {
  // Counter: Profile views
  profileViews: meter.createCounter('user.profile.views', {
    description: 'Total number of profile view requests',
    unit: '1',
  }),

  // Counter: Profile updates
  profileUpdates: meter.createCounter('user.profile.updates', {
    description: 'Total number of profile update requests',
    unit: '1',
  }),

  // Gauge: Active users (observable - will be updated periodically)
  activeUsers: meter.createObservableGauge('user.active.count', {
    description: 'Number of active user sessions',
    unit: '1',
  }),
};

/**
 * Database Metrics
 */
export const dbMetrics = {
  // Counter: Total queries
  queryCount: meter.createCounter('db.query.count', {
    description: 'Total number of database queries',
    unit: '1',
  }),

  // Histogram: Query duration
  queryDuration: meter.createHistogram('db.query.duration', {
    description: 'Duration of database queries',
    unit: 'ms',
  }),

  // Counter: Query errors
  queryErrors: meter.createCounter('db.query.errors', {
    description: 'Total number of database query errors',
    unit: '1',
  }),
};

/**
 * HTTP Metrics (complement to auto-instrumentation)
 */
export const httpMetrics = {
  // Counter: Request count by status code
  requestCount: meter.createCounter('http.request.count', {
    description: 'Total number of HTTP requests',
    unit: '1',
  }),

  // Histogram: Request duration
  requestDuration: meter.createHistogram('http.request.duration', {
    description: 'Duration of HTTP requests',
    unit: 'ms',
  }),

  // Counter: Error responses
  errorCount: meter.createCounter('http.error.count', {
    description: 'Total number of HTTP error responses (4xx, 5xx)',
    unit: '1',
  }),
};

/**
 * Helper function to record authentication metrics
 */
export function recordAuthMetric(operation, status, duration = null, attributes = {}) {
  const baseAttributes = { operation, status, ...attributes };

  switch (operation) {
    case 'register':
      authMetrics.registrationAttempts.add(1, baseAttributes);
      if (status === 'success') {
        authMetrics.registrationSuccess.add(1, baseAttributes);
      } else {
        authMetrics.registrationFailure.add(1, baseAttributes);
      }
      if (duration) {
        authMetrics.registrationDuration.record(duration, baseAttributes);
      }
      break;

    case 'login':
      authMetrics.loginAttempts.add(1, baseAttributes);
      if (status === 'success') {
        authMetrics.loginSuccess.add(1, baseAttributes);
        authMetrics.tokenGeneration.add(1, baseAttributes);
      } else {
        authMetrics.loginFailure.add(1, baseAttributes);
      }
      if (duration) {
        authMetrics.loginDuration.record(duration, baseAttributes);
      }
      break;

    default:
      console.warn(`Unknown auth operation: ${operation}`);
  }
}

/**
 * Helper function to record database metrics
 */
export function recordDbMetric(operation, duration, status = 'success', attributes = {}) {
  const baseAttributes = { operation, status, ...attributes };

  dbMetrics.queryCount.add(1, baseAttributes);
  dbMetrics.queryDuration.record(duration, baseAttributes);

  if (status === 'error') {
    dbMetrics.queryErrors.add(1, baseAttributes);
  }
}

/**
 * Helper function to record HTTP metrics
 */
export function recordHttpMetric(method, route, statusCode, duration, attributes = {}) {
  const baseAttributes = { 
    method, 
    route, 
    status_code: statusCode,
    ...attributes 
  };

  httpMetrics.requestCount.add(1, baseAttributes);
  httpMetrics.requestDuration.record(duration, baseAttributes);

  if (statusCode >= 400) {
    httpMetrics.errorCount.add(1, baseAttributes);
  }
}
