// k6-tests/smoke-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1, // 1 virtual user
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3001';

export default function () {
  // Test health endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check is 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test login endpoint
  const loginPayload = JSON.stringify({
    username: 'testuser',
    password: 'testpass',
  });

  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  });

  sleep(1);
}