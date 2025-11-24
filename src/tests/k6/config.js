// src/tests/k6/config.js
// Shared configuration for K6 performance tests

export const config = {
  // Base URL for all API requests
  // Use 'app' hostname when running in container, localhost otherwise
  baseURL: __ENV.BASE_URL || "http://app:8000",

  // Common thresholds for all tests
  thresholds: {
    // 95% of requests must complete within 500ms
    "http_req_duration{type:load}": ["p(95)<500"],
    // 99% of requests must complete within 1000ms
    "http_req_duration{type:load}": ["p(99)<1000"],
    // Error rate must be below 1%
    "http_req_failed{type:load}": ["rate<0.01"],
    // For stress tests, allow higher error rates at peak
    "http_req_failed{type:stress}": ["rate<0.05"],
  },

  // VU (Virtual User) profiles
  profiles: {
    load: {
      // 5-minute load test
      stages: [
        { duration: "1m", target: 50 }, // Ramp up to 50 VUs
        { duration: "2m", target: 50 }, // Stay at 50 VUs
        { duration: "1m", target: 100 }, // Ramp up to 100 VUs
        { duration: "1m", target: 0 }, // Ramp down to 0
      ],
    },
    stress: {
      // Stress test to find breaking point
      stages: [
        { duration: "1m", target: 100 }, // Warm up
        { duration: "2m", target: 500 }, // Spike to 500
        { duration: "2m", target: 1000 }, // Spike to 1000
        { duration: "2m", target: 2000 }, // Spike to 2000 (expected failure)
        { duration: "2m", target: 100 }, // Recovery test
        { duration: "1m", target: 0 }, // Cool down
      ],
    },
  },

  // Test data pools
  testData: {
    // Pre-generated test users for signup/signin
    users: [
      {
        email: "loadtest1@example.com",
        password: "TestPass123!",
        name: "Load Test User 1",
      },
      {
        email: "loadtest2@example.com",
        password: "TestPass123!",
        name: "Load Test User 2",
      },
      {
        email: "loadtest3@example.com",
        password: "TestPass123!",
        name: "Load Test User 3",
      },
    ],
  },
};

export default config;
