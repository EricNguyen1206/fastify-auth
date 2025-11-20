
export const config = {
  BASE_URL: __ENV.BASE_URL || 'http://host.docker.internal:8000',
  HEADERS: {
    'Content-Type': 'application/json',
  },
  THRESHOLDS: {
    SMOKE: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.01'],
    },
    LOAD: {
      http_req_duration: ['p(95)<500', 'p(99)<1000'],
      http_req_failed: ['rate<0.05'],
    },
    STRESS: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.1'],
    },
  },
};
