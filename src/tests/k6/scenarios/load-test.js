// src/tests/k6/scenarios/load-test.js
// Load testing scenario: Simulates normal production traffic

import http from "k6/http";
import { sleep } from "k6";
import { config } from "../config.js";
import {
  generateRandomUser,
  validateAuthResponse,
  validateProfileResponse,
  extractAccessToken,
  randomSleep,
  authDuration,
  signupCounter,
  signinCounter,
} from "../utils/helpers.js";

// Test configuration
export const options = {
  stages: config.profiles.load.stages,
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
    http_reqs: ["rate>100"], // Ensure at least 100 req/s
  },
  tags: {
    type: "load",
  },
};

// Test lifecycle setup
export function setup() {
  console.log("🚀 Starting Load Test");
  console.log(`📍 Target: ${config.baseURL}`);
  console.log(`⏱️  Duration: 5 minutes`);
  console.log(`👥 Max VUs: 100`);

  // Create a few test users that all VUs can use
  const testUsers = [];
  for (let i = 0; i < 10; i++) {
    const user = generateRandomUser();
    const signupRes = http.post(
      `${config.baseURL}/auth/signup`,
      JSON.stringify(user),
      { headers: { "Content-Type": "application/json" } }
    );

    if (signupRes.status === 200 || signupRes.status === 201) {
      testUsers.push(user);
    }
  }

  return { testUsers };
}

// Main test function - executed by each VU
export default function (data) {
  const { testUsers } = data;

  // Randomly select operation based on realistic distribution
  const rand = Math.random();

  if (rand < 0.1) {
    // 10% - Signup new user
    performSignup();
  } else if (rand < 0.5) {
    // 40% - Signin with existing user
    performSignin(testUsers);
  } else if (rand < 0.8) {
    // 30% - Get user profile
    performGetProfile(testUsers);
  } else if (rand < 0.95) {
    // 15% - Refresh token
    performRefreshToken(testUsers);
  } else {
    // 5% - Signout
    performSignout(testUsers);
  }

  // Random think time between requests (1-3 seconds)
  sleep(randomSleep(1, 3));
}

// Test operations

function performSignup() {
  const startTime = Date.now();
  const user = generateRandomUser();

  const response = http.post(
    `${config.baseURL}/auth/signup`,
    JSON.stringify(user),
    {
      headers: { "Content-Type": "application/json" },
      tags: { operation: "signup" },
    }
  );

  const success = validateAuthResponse(response, "signup");
  if (success) {
    signupCounter.add(1);
    authDuration.add(Date.now() - startTime);
  }
}

function performSignin(testUsers) {
  if (!testUsers || testUsers.length === 0) return;

  const startTime = Date.now();
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  const response = http.post(
    `${config.baseURL}/auth/signin`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { operation: "signin" },
    }
  );

  const success = validateAuthResponse(response, "signin");
  if (success) {
    signinCounter.add(1);
    authDuration.add(Date.now() - startTime);
  }
}

function performGetProfile(testUsers) {
  if (!testUsers || testUsers.length === 0) return;

  // First signin to get token
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const signinRes = http.post(
    `${config.baseURL}/auth/signin`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { "Content-Type": "application/json" } }
  );

  const accessToken = extractAccessToken(signinRes);
  if (!accessToken) return;

  // Get profile with token
  const response = http.get(`${config.baseURL}/user/profile`, {
    cookies: { accessToken },
    tags: { operation: "get_profile" },
  });

  validateProfileResponse(response);
}

function performRefreshToken(testUsers) {
  if (!testUsers || testUsers.length === 0) return;

  // First signin to get refresh token
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const signinRes = http.post(
    `${config.baseURL}/auth/signin`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (signinRes.cookies && signinRes.cookies.refreshToken) {
    const refreshToken = signinRes.cookies.refreshToken[0].value;

    const response = http.post(`${config.baseURL}/auth/refresh`, null, {
      cookies: { refreshToken },
      tags: { operation: "refresh_token" },
    });

    validateAuthResponse(response, "refresh");
  }
}

function performSignout(testUsers) {
  if (!testUsers || testUsers.length === 0) return;

  // First signin to get tokens
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const signinRes = http.post(
    `${config.baseURL}/auth/signin`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: { "Content-Type": "application/json" } }
  );

  if (signinRes.cookies) {
    const accessToken = extractAccessToken(signinRes);
    const refreshToken = signinRes.cookies.refreshToken
      ? signinRes.cookies.refreshToken[0].value
      : null;

    http.post(`${config.baseURL}/auth/signout`, null, {
      cookies: { accessToken, refreshToken },
      tags: { operation: "signout" },
    });
  }
}

// Teardown - cleanup after test
export function teardown(data) {
  console.log("✅ Load Test Complete");
}
