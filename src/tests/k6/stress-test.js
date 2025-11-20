// tests/k6/stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 for 3 minutes
    { duration: '1m', target: 200 },   // Spike to 200 users
    { duration: '2m', target: 200 },   // Stay at 200 for 2 minutes
    { duration: '1m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1 second
    http_req_failed: ['rate<0.1'],     // 10% error rate
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:3001';

function generateUser() {
  const id = Math.random().toString(36).substring(7);
  return {
    name: `stress_user_${id}`,
    email: `stress_user_${id}@test.com`,
    password: `pass_${id}`,
  };
}

export default function () {
  const user = generateUser();
  
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });
  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/auth/signin`, loginPayload, params);
  
  check(res, {
    'status is 200 or 400': (r) => r.status === 200 || r.status === 400,
  });

  sleep(0.5); // Reduced sleep for stress testing
}