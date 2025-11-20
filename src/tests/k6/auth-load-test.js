// k6-tests/auth-load-test.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const loginAttempts = new Counter('login_attempts');
const loginFailures = new Rate('login_failures');
const loginDuration = new Trend('login_duration');
const registerAttempts = new Counter('register_attempts');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Spike to 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.05'],                  // Error rate under 5%
    login_failures: ['rate<0.1'],                     // Login failure rate under 10%
    checks: ['rate>0.95'],                            // 95% of checks pass
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

// Generate random user data
function generateUser() {
  const id = Math.random().toString(36).substring(7);
  return {
    name: `user_${id}`,
    email: `user_${id}@test.com`,
    password: `pass_${id}`,
  };
}

// Test scenarios
export default function () {
  // Scenario 1: Health check
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health check status is 200': (r) => r.status === 200,
      'health check returns healthy': (r) => r.json('status') === 'healthy',
    });
  });

  sleep(1);

  // Scenario 2: User Registration
  group('User Registration', () => {
    const user = generateUser();
    const payload = JSON.stringify(user);
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${BASE_URL}/auth/signup`, payload, params);
    
    registerAttempts.add(1);
    
    check(res, {
      'registration status is 200': (r) => r.status === 200,
      'registration returns success': (r) => r.json('success') === true,
      'registration returns user': (r) => r.json('user.name') === user.name,
    });
  });

  sleep(2);

  // Scenario 3: User Login
  group('User Login', () => {
    const user = generateUser();
    const payload = JSON.stringify({
      email: user.email,
      password: user.password,
    });
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const start = new Date();
    const res = http.post(`${BASE_URL}/auth/signin`, payload, params);
    const duration = new Date() - start;

    loginAttempts.add(1);
    loginDuration.add(duration);

    const checkResult = check(res, {
      'login status is 200': (r) => r.status === 200,
      'login returns token': (r) => r.json('token') !== undefined,
      'login returns user': (r) => r.json('user.name') === user.name,
    });

    if (!checkResult) {
      loginFailures.add(1);
    }
  });

  sleep(1);

  // Scenario 4: Missing credentials (error scenario)
  group('Invalid Login', () => {
    const payload = JSON.stringify({
      email: 'test',
      password: 'test',
    });
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${BASE_URL}/auth/signin`, payload, params);
    
    check(res, {
      'invalid login returns 400': (r) => r.status === 400,
      'invalid login returns error': (r) => r.json('error') !== undefined,
    });
  });

  sleep(1);
}

// Summary handler
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = `
${indent}Test Summary:
${indent}=============
${indent}Total Requests: ${data.metrics.http_reqs.values.count}
${indent}Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
${indent}
${indent}Response Times:
${indent}  avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
${indent}  min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms
${indent}  max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms
${indent}  p(95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
${indent}  p(99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
${indent}
${indent}Custom Metrics:
${indent}  Login Attempts: ${data.metrics.login_attempts ? data.metrics.login_attempts.values.count : 0}
${indent}  Login Failures: ${data.metrics.login_failures ? (data.metrics.login_failures.values.rate * 100).toFixed(2) : 0}%
${indent}  Register Attempts: ${data.metrics.register_attempts ? data.metrics.register_attempts.values.count : 0}
  `;
  
  return summary;
}