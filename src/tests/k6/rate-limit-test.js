
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 10,
};

export default function () {
  const url = 'http://localhost:8000/auth/signin';
  const payload = JSON.stringify({
    email: 'test@rate-limit.com',
    password: 'password123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  // First 5 requests should be 200 or 401 (invalid creds), subsequent should be 429
  if (__ITER < 5) {
    check(res, {
      'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
  } else {
    check(res, {
      'status is 429': (r) => r.status === 429,
    });
  }
  sleep(0.1);
}
